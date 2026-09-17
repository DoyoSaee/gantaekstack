// 소스-무관 공통 스키마. 어떤 채용 소스(사람인/공공/워크넷/mock)든
// 이 형태로 정규화해서 파이프라인에 넣는다 → 소스 교체가 자유롭다.

export interface NormalizedPosting {
  source: string; // "saramin" | "arbeitnow" | "public" | "mock"
  region: "kr" | "global";
  sourceId: string;
  title: string;
  company?: string;
  url?: string;
  location?: string;
  postedAt?: Date;
  rawText: string; // 제목 + 본문/직무내용 (LLM 추출 입력)
}

export interface JobSource {
  name: string;
  fetchRecent(opts?: { limit?: number }): Promise<NormalizedPosting[]>;
}

export interface SkillItem {
  name: string; // 정규화된 기술명
  category: string; // frontend|backend|mobile|devops|cloud|data|database|language|tool|etc
}

// LLM이 공고 본문에서 뽑아내는 구조화 결과
export interface ExtractedRequirements {
  skills: SkillItem[];
  experienceYears: number | null; // 요구 최소 경력(년)
  hiddenRequirements: string[]; // 문장 속 암묵 요구 ("SSR 경험", "대규모 트래픽")
}

// 개발 직군 공고만 거르기 — 일반 잡보드(Arbeitnow)의 비개발직 노이즈 제거.
// 이걸로 분모가 "개발 공고"가 되어 기술 비율이 현실적으로 나온다.
const DEV_KW = [
  "developer", "engineer", "development", "software", "backend", "back-end",
  "frontend", "front-end", "full-stack", "fullstack", "full stack", "devops",
  "sre", "data engineer", "data scientist", "machine learning", "ai engineer",
  "programmer", "sdet", "qa engineer", "ios", "android", "mobile dev",
  "web dev", "cloud engineer", "platform engineer", "infrastructure",
  "개발", "엔지니어", "프로그래머",
];

export function isDevPosting(title: string, tags: string[] = []): boolean {
  const hay = `${title} ${tags.join(" ")}`.toLowerCase();
  return DEV_KW.some((k) => hay.includes(k));
}
