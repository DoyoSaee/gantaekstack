import "dotenv/config";
import { runCollection } from "../lib/pipeline";
import { arbeitnowSource } from "../lib/sources/arbeitnow";
import { mockSource } from "../lib/sources/mock";
import { prisma } from "../lib/db";

async function main() {
  const delay = process.env.GEMINI_API_KEY ? 1500 : 0; // 프리티어 RPM 회피 (thinking off라 빠름)
  console.log(`→ 글로벌(Arbeitnow) 수집... (Gemini=${!!process.env.GEMINI_API_KEY})`);
  console.log(await runCollection(arbeitnowSource, 100, delay));

  console.log("→ 한국(mock, 사람인 대체) 수집...");
  console.log(await runCollection(mockSource, 50, delay));

  const [postings, skills] = await Promise.all([
    prisma.jobPosting.count(),
    prisma.skill.count(),
  ]);
  console.log(`\n✅ 시드 완료 — 공고 ${postings}건 / 스킬 ${skills}종`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
