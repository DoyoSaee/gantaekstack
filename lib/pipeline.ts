import { prisma } from "./db";
import { extractRequirements } from "./extract";
import { JobSource } from "./sources/types";

// 수집 파이프라인: 소스(무관) → 정규화 → 저장 → AI추출 → 스킬 집계.
export async function runCollection(source: JobSource, limit = 50, delayMs = 0) {
  const postings = await source.fetchRecent({ limit });
  let processed = 0;

  for (const p of postings) {
    const posting = await prisma.jobPosting.upsert({
      where: { source_sourceId: { source: p.source, sourceId: p.sourceId } },
      update: {},
      create: {
        source: p.source,
        region: p.region,
        sourceId: p.sourceId,
        title: p.title,
        company: p.company,
        url: p.url,
        location: p.location,
        postedAt: p.postedAt,
        rawText: p.rawText,
      },
    });

    if (posting.extracted) continue; // 이미 추출됨 → skip (멱등)

    const ext = await extractRequirements(p.rawText);
    await prisma.jobPosting.update({
      where: { id: posting.id },
      data: {
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
    processed++;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs)); // Gemini RPM 회피
  }

  return { source: source.name, fetched: postings.length, processed };
}
