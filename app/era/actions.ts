"use server";

import { extractResumeProfile, summarizeDiagnosis } from "@/lib/extract";
import { analyzeEra, EraResult } from "@/lib/era";
import { skillGap, coOccurring, marketEra } from "@/lib/aggregate";
import { normalizeSkill, isStopSkill } from "@/lib/skills";

export type AnalyzeResult = {
  skills: string[];
  era: EraResult | null;
  gap: Awaited<ReturnType<typeof skillGap>> | null;
  together: { name: string; count: number }[]; // 내 스택과 같은 공고에서 함께 요구된 기술
  comment: string | null; // AI 총평 (없어도 동작)
  marketEraAvg: number | null; // 시장이 요구하는 스택의 무게중심 (비교용)
  persona: { years: number | null; role: string | null } | null; // 익명 정체성 ("3년차 풀스택"님)
  error?: string;
};

const EMPTY: AnalyzeResult = {
  skills: [],
  era: null,
  gap: null,
  together: [],
  comment: null,
  marketEraAvg: null,
  persona: null,
};

// 공용 진단: 스킬 배열 → 시대 + 시장 갭 + 동반수요 + AI 총평
async function diagnose(
  skills: string[],
  region?: string,
  persona: AnalyzeResult["persona"] = null,
): Promise<AnalyzeResult> {
  const era = analyzeEra(skills);
  const reg = region === "kr" || region === "global" ? region : undefined;
  const [gap, mkt] = await Promise.all([skillGap(skills, reg), marketEra(reg)]);

  // 개인화 추천: 내 스킬들과 '같은 공고'에 등장한 기술을 합산 → 내가 없는 것만.
  const mine = new Set(skills);
  const coCounts = new Map<string, number>();
  const coLists = await Promise.all(skills.slice(0, 12).map((s) => coOccurring(s, reg, 15)));
  for (const list of coLists) {
    for (const { name, count } of list) {
      if (mine.has(name)) continue;
      coCounts.set(name, (coCounts.get(name) ?? 0) + count);
    }
  }
  const together = [...coCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // AI 총평 — 실패해도 진단은 그대로 (부가 기능)
  let comment: string | null = null;
  try {
    comment = await summarizeDiagnosis({
      centroidYear: era?.centroidYear ?? null,
      gapYears: era?.gapYears ?? null,
      declining: era?.matched
        .filter((m) => m.trend === "declining")
        .map((m) => ({ name: m.name, peakYear: m.peakYear, successor: m.successor })) ?? [],
      rising: era?.matched.filter((m) => m.trend === "rising").map((m) => m.name) ?? [],
      together: together.map((t) => t.name),
      missing: gap?.missing.slice(0, 5).map((s) => s.name) ?? [],
    });
  } catch (e) {
    console.error("[comment] 총평 생성 실패(무시):", e);
  }

  return { skills, era, gap, together, comment, marketEraAvg: mkt?.avg ?? null, persona };
}

// 이력서 텍스트 → 스킬 추출 → 진단.
export async function analyzeResume(
  resumeText: string,
  region?: string,
): Promise<AnalyzeResult> {
  const text = (resumeText ?? "").trim();
  if (text.length < 20) {
    return { ...EMPTY, error: "이력서 내용이 너무 짧아요." };
  }
  if (text.length > 20000) {
    return { ...EMPTY, error: "너무 길어요. 기술이 드러나는 부분 위주로 2만자 이내로 넣어줘." };
  }
  const profile = await extractResumeProfile(text);
  if (profile.skills.length === 0) {
    return { ...EMPTY, error: "기술 스킬을 찾지 못했어요. 스택이 드러나게 붙여넣어봐." };
  }
  return diagnose(profile.skills, region, { years: profile.years, role: profile.role });
}

// 공유 URL(?s=React,PHP)용: 스킬 배열로 바로 진단 (Gemini 추출 생략 → 재현 빠름·무료)
export async function analyzeSkillList(
  rawSkills: string[],
  region?: string,
): Promise<AnalyzeResult> {
  const skills = [...new Set(rawSkills.map(normalizeSkill))]
    .filter((s) => s && !isStopSkill(s))
    .slice(0, 40);
  if (skills.length === 0) return { ...EMPTY, error: "유효한 기술이 없어요." };
  return diagnose(skills, region);
}

// 이력서 PDF → 텍스트 (클라이언트에서 FormData로 전달)
export async function extractPdfText(formData: FormData): Promise<{ text?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "파일이 없어요." };
  if (file.size > 5 * 1024 * 1024) return { error: "5MB 이하 PDF만 올려줘." };
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
    const result = await parser.getText();
    const text = (result.text ?? "").replace(/\s+\n/g, "\n").trim();
    if (text.length < 20) return { error: "PDF에서 텍스트를 못 읽었어요. (스캔 이미지 PDF는 지원 안 됨)" };
    return { text: text.slice(0, 20000) };
  } catch (e) {
    console.error("[pdf] 파싱 실패:", e);
    return { error: "PDF를 읽지 못했어요. 텍스트를 직접 붙여넣어봐." };
  }
}
