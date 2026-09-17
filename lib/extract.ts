import { ExtractedRequirements } from "./sources/types";
import {
  normalizeSkill,
  scanSkills,
  extractExperienceYears,
  isStopSkill,
  normCategory,
  guessCategory,
} from "./skills";

// 프로젝트의 심장: 공고 본문 → 정형 데이터.
// GEMINI_API_KEY 있으면 스킬+카테고리+숨은요구 추출, 없으면 키워드 폴백.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const KEY = process.env.GEMINI_API_KEY;

const INSTRUCTION = `너는 채용공고 분석기다. 공고 원문에서 JSON으로 추출해라.
- skills: 요구하는 **기술 스킬만** 배열. 각 항목은 { name, category }.
  name: 짧은 정규 명칭(예: "React", "PostgreSQL", "AWS"). ⚠️ 회화 언어(영어·독일어 등)·일반어(AI·소프트웨어·개발·웹)는 제외.
  category: 다음 중 하나 — frontend, backend, mobile, devops, cloud, data, database, language, tool, etc.
- experienceYears: 요구 최소 경력(년). 없으면 null.
- hiddenRequirements: 기술명이 아닌, 문장 속 실제 요구 역량(예: "SSR 경험", "대규모 트래픽 대응", "직접 배포 경험"). 짧은 구절.
반드시 공고에 근거한 것만. 추측 금지.`;

export async function extractRequirements(
  rawText: string,
): Promise<ExtractedRequirements> {
  if (KEY) {
    try {
      return await extractWithGemini(rawText);
    } catch (e) {
      console.error("[extract] Gemini 실패 → 키워드 폴백:", e);
    }
  }
  // 폴백: 키워드 스캔 (키 없거나 실패해도 파이프라인 계속)
  const names = [...new Set(scanSkills(rawText).map(normalizeSkill))].filter(
    (s) => s && !isStopSkill(s),
  );
  return {
    skills: names.map((n) => ({ name: n, category: guessCategory(n) })),
    experienceYears: extractExperienceYears(rawText),
    hiddenRequirements: [],
  };
}

// ── 이력서용: 보유 스킬 + 연차·직군(익명 페르소나) 추출 ──
export type ResumeProfile = {
  skills: string[];
  years: number | null;
  role: string | null; // 프론트엔드|백엔드|풀스택|모바일|데이터|데브옵스|기타
};

const RESUME_INSTRUCTION = `너는 이력서 분석기다. 이력서·경력기술서 원문에서 JSON으로 추출해라.
- skills: 지원자가 실제 사용·보유한 기술 스킬 name 배열. 짧은 정규 명칭(예: "React","PostgreSQL","AWS","Docker"). ⚠️ 회화 언어(영어·독일어 등)·일반어(개발·소프트웨어·엔지니어)는 제외.
- 복합 표기는 낱개로 분리해라: "Java Spring" → "Java","Spring" / "React/Next.js" → "React","Next.js".
- years: 총 경력 연차(숫자). 신입/판단불가면 null.
- role: 주 직군 — "프론트엔드"|"백엔드"|"풀스택"|"모바일"|"데이터"|"데브옵스"|"기타" 중 하나. 판단불가면 null.
반드시 이력서에 근거한 것만. 추측 금지(연차·직군 추정은 허용).`;

export async function extractResumeProfile(resumeText: string): Promise<ResumeProfile> {
  if (KEY) {
    try {
      return await resumeProfileGemini(resumeText);
    } catch (e) {
      console.error("[resume] Gemini 실패 → 키워드 폴백:", e);
    }
  }
  const skills = [...new Set(scanSkills(resumeText).map(normalizeSkill))].filter(
    (s) => s && !isStopSkill(s),
  );
  return { skills, years: extractExperienceYears(resumeText), role: null };
}

async function resumeProfileGemini(resumeText: string): Promise<ResumeProfile> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RESUME_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: resumeText.slice(0, 12000) }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              skills: { type: "ARRAY", items: { type: "STRING" } },
              years: { type: "INTEGER", nullable: true },
              role: { type: "STRING", nullable: true },
            },
            required: ["skills"],
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text);
  const skills = [...new Set(((parsed.skills ?? []) as string[]).map(normalizeSkill))].filter(
    (s) => s && !isStopSkill(s),
  );
  const ROLES = new Set(["프론트엔드", "백엔드", "풀스택", "모바일", "데이터", "데브옵스", "기타"]);
  return {
    skills,
    years: typeof parsed.years === "number" ? parsed.years : null,
    role: ROLES.has(parsed.role) ? parsed.role : null,
  };
}

// ── AI 총평: 진단 수치를 사람의 언어로 (판단 아니라 방향) ──
const SUMMARY_INSTRUCTION = `너는 개발자 커리어 데이터를 담백하게 읽어주는 조력자다.
주어진 진단 JSON(스택의 시대 무게중심, 하락/상승 기술, 시장 동반수요, 부족 기술)을 보고 한국어 해요체로 2~3문장 총평을 써라.
규칙:
- 절대 사람을 평가·채점하지 마라("뒤처졌다","늦었다" 금지). 스택의 위치와 다음 방향만 담백하게.
- declining이어도 "사장된 기술" 취급 금지 — Java·PHP 등은 여전히 주류다. "신규 채택 비중이 줄고 있다" 수준으로.
- 구체적 기술명을 넣어라. 빈 형용사("멋진","훌륭한") 금지.
- 가장 효율적인 다음 한 걸음을 하나만 짚어라(동반수요 1순위 우선).
- 연도 표현: 시대 데이터의 최신 연도는 2025(Stack Overflow 설문)다. "지금"이라 단정하지 말고 "최신 데이터 기준"으로 써라.
- 데이터에 없는 내용 추측 금지. 총평 텍스트만 출력.`;

export async function summarizeDiagnosis(payload: {
  centroidYear: number | null;
  gapYears: number | null;
  declining: { name: string; peakYear: number; successor?: string }[];
  rising: string[];
  together: string[];
  missing: string[];
}): Promise<string | null> {
  if (!KEY) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SUMMARY_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 300 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim() || null;
}

async function extractWithGemini(rawText: string): Promise<ExtractedRequirements> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: rawText.slice(0, 8000) }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 }, // 추출엔 thinking 불필요 → 속도·비용↓
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              skills: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    category: { type: "STRING" },
                  },
                  required: ["name", "category"],
                },
              },
              experienceYears: { type: "INTEGER", nullable: true },
              hiddenRequirements: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["skills", "hiddenRequirements"],
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text);
  const seen = new Set<string>();
  const skills = ((parsed.skills ?? []) as { name?: string; category?: string }[])
    .map((s) => ({
      name: normalizeSkill(s.name ?? ""),
      category: normCategory(s.category),
    }))
    .filter(
      (s) => s.name && !isStopSkill(s.name) && !seen.has(s.name) && seen.add(s.name),
    );
  return {
    skills,
    experienceYears: parsed.experienceYears ?? null,
    hiddenRequirements: parsed.hiddenRequirements ?? [],
  };
}
