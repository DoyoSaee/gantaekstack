"use server";

import { prisma } from "@/lib/db";
import { extractRequirements } from "@/lib/extract";
import { analyzeEra } from "@/lib/era";
import { normalizeSkill, isStopSkill } from "@/lib/skills";

export type MatchResult = {
  required: { name: string; have: boolean }[]; // 공고 요구 스킬 × 보유 여부
  hidden: string[]; // 숨은 요구
  experienceYears: number | null;
  postingEra: { centroidYear: number; gapYears: number } | null; // 이 공고가 요구하는 스택의 시대
  matched: number;
  total: number;
  saved: boolean; // 데이터셋 기여 여부
  error?: string;
};

const EMPTY: MatchResult = {
  required: [],
  hidden: [],
  experienceYears: null,
  postingEra: null,
  matched: 0,
  total: 0,
  saved: false,
};

// 공고 원문 + 내 스택 → 요구스택 추출·대조·공고 시대 진단. contribute=true면 데이터셋에 저장.
export async function matchPosting(
  postingText: string,
  mySkillsRaw: string[],
  contribute: boolean,
): Promise<MatchResult> {
  const text = (postingText ?? "").trim();
  if (text.length < 40) return { ...EMPTY, error: "공고 내용이 너무 짧아요." };
  if (text.length > 20000) return { ...EMPTY, error: "2만자 이내로 붙여넣어줘." };

  const ext = await extractRequirements(text);
  if (ext.skills.length === 0) {
    return { ...EMPTY, error: "이 공고에서 기술 요구를 찾지 못했어요." };
  }

  const mine = new Set(
    mySkillsRaw.map(normalizeSkill).filter((s) => s && !isStopSkill(s)),
  );
  const required = ext.skills.map((s) => ({ name: s.name, have: mine.has(s.name) }));
  const era = analyzeEra(ext.skills.map((s) => s.name));

  let saved = false;
  if (contribute) {
    try {
      // 유저 제공 공고 = 합법 수동 수집. 원문 해시로 멱등(같은 공고 중복 저장 방지).
      const { createHash } = await import("crypto");
      const sourceId = createHash("sha256").update(text).digest("hex").slice(0, 24);
      const posting = await prisma.jobPosting.upsert({
        where: { source_sourceId: { source: "contributed", sourceId } },
        update: {},
        create: {
          source: "contributed",
          region: "kr", // 한국 데이터 성장이 목적 — 유저 대부분 한국 공고
          sourceId,
          title: text.split("\n")[0].slice(0, 120) || "유저 제공 공고",
          rawText: text.slice(0, 8000),
          extracted: ext as unknown as import("@prisma/client").Prisma.InputJsonValue,
        },
      });
      for (const { name, category } of ext.skills) {
        const skill = await prisma.skill.upsert({
          where: { name },
          update: { category },
          create: { name, category },
        });
        await prisma.postingSkill.upsert({
          where: { postingId_skillId: { postingId: posting.id, skillId: skill.id } },
          update: {},
          create: { postingId: posting.id, skillId: skill.id },
        });
      }
      saved = true;
    } catch (e) {
      console.error("[match] 기여 저장 실패(무시):", e);
    }
  }

  return {
    required,
    hidden: ext.hiddenRequirements,
    experienceYears: ext.experienceYears,
    postingEra: era
      ? { centroidYear: era.centroidYear, gapYears: era.gapYears }
      : null,
    matched: required.filter((r) => r.have).length,
    total: required.length,
    saved,
  };
}
