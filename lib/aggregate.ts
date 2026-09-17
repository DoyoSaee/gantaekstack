import { prisma } from "./db";
import { normalizeSkill } from "./skills";

// 집계는 전부 코드(결정론). AI는 '구조화'에만, 통계는 세는 것.
// region 지정 시 해당 지역(kr|global)만, 없으면 전체.

export async function topSkills(region?: string, category?: string, limit = 20) {
  const rows = await prisma.postingSkill.groupBy({
    by: ["skillId"],
    where: {
      ...(region ? { posting: { region } } : {}),
      // 카테고리 지정 시 해당 직군만, 없으면 개발 기술만(오피스 tool·etc 제외)
      skill: category ? { category } : { category: { notIn: ["tool", "etc"] } },
    },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: limit,
  });
  const skills = await prisma.skill.findMany({
    where: { id: { in: rows.map((r) => r.skillId) } },
  });
  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  const total = await prisma.jobPosting.count({
    where: region ? { region } : undefined,
  });
  return rows.map((r) => ({
    name: nameById.get(r.skillId) ?? "?",
    count: r._count.skillId,
    share: total ? Math.round((r._count.skillId / total) * 1000) / 10 : 0, // %
  }));
}

export async function coOccurring(skillName: string, region?: string, limit = 10) {
  const skill = await prisma.skill.findUnique({ where: { name: skillName } });
  if (!skill) return [];
  const links = await prisma.postingSkill.findMany({
    where: { skillId: skill.id, ...(region ? { posting: { region } } : {}) },
    select: { postingId: true },
  });
  const postingIds = links.map((l) => l.postingId);
  if (postingIds.length === 0) return [];
  const rows = await prisma.postingSkill.groupBy({
    by: ["skillId"],
    where: { postingId: { in: postingIds }, skillId: { not: skill.id } },
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: limit,
  });
  const skills = await prisma.skill.findMany({
    where: { id: { in: rows.map((r) => r.skillId) } },
  });
  const nameById = new Map(skills.map((s) => [s.id, s.name]));
  return rows.map((r) => ({
    name: nameById.get(r.skillId) ?? "?",
    count: r._count.skillId,
  }));
}

export async function counts(region?: string) {
  const [postings, skills] = await Promise.all([
    prisma.jobPosting.count({ where: region ? { region } : undefined }),
    prisma.skill.count(),
  ]);
  return { postings, skills };
}

// B화면: 내 스택 vs 시장 수요 격차. 사람을 채점하지 않는다 —
// "무엇을 갖췄고, 다음에 무엇을 배우면 지원 가능 공고가 느는가"만 데이터로 보여준다.
export async function skillGap(userSkillsRaw: string[], region?: string) {
  const userSet = new Set(userSkillsRaw.map(normalizeSkill).filter(Boolean));
  const demanded = await topSkills(region, undefined, 50); // {name,count,share}
  const demandedNames = new Set(demanded.map((d) => d.name));

  const have = demanded.filter((d) => userSet.has(d.name)); // 보유 & 시장이 원함
  const missing = demanded.filter((d) => !userSet.has(d.name)); // 다음 학습 후보
  const niche = [...userSet].filter((n) => !demandedNames.has(n)); // 수요목록 밖

  const top20 = demanded.slice(0, 20);
  const inTop20 = top20.filter((d) => userSet.has(d.name)).length;
  const matchRate = top20.length ? Math.round((inTop20 / top20.length) * 100) : 0;

  return { have, missing, niche, matchRate, inTop20, top20n: top20.length };
}

// 차별점: 공고 문장 속 '숨은 요구'를 모아 빈도순으로. (표면 키워드가 아님)
export async function topHiddenRequirements(region?: string, limit = 24) {
  const postings = await prisma.jobPosting.findMany({
    where: region ? { region } : {},
    select: { extracted: true },
  });
  const counts = new Map<string, number>();
  for (const p of postings) {
    const hr = (p.extracted as { hiddenRequirements?: string[] } | null)
      ?.hiddenRequirements;
    for (const h of hr ?? []) {
      const t = h.trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}
