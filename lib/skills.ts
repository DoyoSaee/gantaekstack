// 기술명 정규화. LLM이 뽑은 스킬을 통일된 표기로 모은다.
// (React=리액트=react.js → "React") — 집계 정확도의 핵심.
// 별칭은 계속 늘려나간다.

const ALIASES: Record<string, string> = {
  "리액트": "React",
  "react.js": "React",
  "reactjs": "React",
  "넥스트": "Next.js",
  "next": "Next.js",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "뷰": "Vue",
  "vue.js": "Vue",
  "vuejs": "Vue",
  "앵귤러": "Angular",
  "angularjs": "Angular",
  "angular.js": "Angular",
  "노드": "Node.js",
  "node": "Node.js",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "타입스크립트": "TypeScript",
  "ts": "TypeScript",
  "자바스크립트": "JavaScript",
  "js": "JavaScript",
  "자바": "Java",
  "코틀린": "Kotlin",
  "스프링": "Spring",
  "springboot": "Spring Boot",
  "spring boot": "Spring Boot",
  "파이썬": "Python",
  "장고": "Django",
  "플라스크": "Flask",
  "aws": "AWS",
  "gcp": "GCP",
  "도커": "Docker",
  "쿠버네티스": "Kubernetes",
  "k8s": "Kubernetes",
  "포스트그레": "PostgreSQL",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "마이sql": "MySQL",
  "mysql": "MySQL",
  "몽고": "MongoDB",
  "mongodb": "MongoDB",
  "레디스": "Redis",
  "graphql": "GraphQL",
  "리덕스": "Redux",
  "테일윈드": "Tailwind CSS",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  // 신생 FE/BE 스택 (MODERN_TECH와 표기 일치)
  "react query": "TanStack Query",
  "react-query": "TanStack Query",
  "tanstack query": "TanStack Query",
  "tanstack-query": "TanStack Query",
  "redux toolkit": "Redux Toolkit",
  "rtk": "Redux Toolkit",
  "zustand": "Zustand",
  "shadcn": "shadcn/ui",
  "shadcn ui": "shadcn/ui",
  "shadcn/ui": "shadcn/ui",
  "nest": "NestJS",
  "nestjs": "NestJS",
  "nest.js": "NestJS",
  "prisma": "Prisma",
  "trpc": "tRPC",
  "vitest": "Vitest",
  "playwright": "Playwright",
  "msw": "MSW",
  "remix": "Remix",
  "astro": "Astro",
  "sveltekit": "SvelteKit",
  "svelte kit": "SvelteKit",
  "turborepo": "Turborepo",
  "pnpm": "pnpm",
  "bun": "Bun",
  "deno": "Deno",
};

export function normalizeSkill(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  return ALIASES[lower] ?? ALIASES[t] ?? t;
}

// LLM 키가 없을 때 쓰는 키워드 폴백용 정규 스킬 목록.
const CANONICAL = [
  "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "TypeScript",
  "JavaScript", "Java", "Kotlin", "Spring", "Spring Boot", "Python", "Django",
  "Flask", "FastAPI", "Go", "Rust", "C++", "C#", "Swift", "PHP", "Ruby",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "PostgreSQL",
  "MySQL", "MongoDB", "Redis", "Elasticsearch", "Kafka", "GraphQL", "REST",
  "Redux", "Tailwind CSS", "Airflow", "Spark", "Hadoop", "TensorFlow",
  "PyTorch", "SQL", "GitHub Actions", "Jenkins",
];

// 공고 본문에서 알려진 스킬을 스캔(키워드 폴백). LLM 없이도 파이프라인이 돈다.
export function scanSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const c of CANONICAL) {
    if (lower.includes(c.toLowerCase())) found.add(c);
  }
  for (const [alias, canon] of Object.entries(ALIASES)) {
    if (lower.includes(alias.toLowerCase())) found.add(canon);
  }
  return [...found];
}

// "경력 3년", "5년 이상" 같은 표현에서 최소 경력(년) 추출.
export function extractExperienceYears(text: string): number | null {
  const m = text.match(/경력\s*(\d+)\s*년|(\d+)\s*년\s*이상/);
  if (m) return parseInt(m[1] ?? m[2], 10);
  return null;
}

// 스킬 아닌 것(회화 언어·너무 일반적인 단어) 걸러내는 안전망.
const STOP = new Set([
  "english", "german", "deutsch", "englisch", "korean", "korea", "영어", "독일어",
  "한국어", "일본어", "중국어", "ai", "software", "소프트웨어", "개발", "development",
  "backend", "frontend", "백엔드", "프론트엔드", "it", "programming", "coding",
  "engineering", "engineer", "web", "api", "cloud", "database", "framework",
]);

export function isStopSkill(name: string): boolean {
  return STOP.has(name.trim().toLowerCase());
}

// 기술 카테고리 (프론트/백엔드/데브옵스...) — 직접 만든 분류(크롤 X)
const ALLOWED_CATS = new Set([
  "frontend", "backend", "mobile", "devops", "cloud", "data", "database",
  "language", "tool", "etc",
]);

export function normCategory(c?: string): string {
  const t = (c ?? "").trim().toLowerCase();
  return ALLOWED_CATS.has(t) ? t : "etc";
}

// 키워드 폴백(키 없을 때)용 카테고리 맵
const CAT_MAP: Record<string, string> = {
  React: "frontend", "Next.js": "frontend", Vue: "frontend", Angular: "frontend",
  Svelte: "frontend", Redux: "frontend", "Tailwind CSS": "frontend", jQuery: "frontend",
  Zustand: "frontend", "TanStack Query": "frontend", "Redux Toolkit": "frontend",
  "shadcn/ui": "frontend", Remix: "frontend", Astro: "frontend", SvelteKit: "frontend",
  NestJS: "backend", Prisma: "backend", tRPC: "backend", Bun: "backend", Deno: "backend",
  Vitest: "tool", Playwright: "tool", MSW: "tool", Turborepo: "tool", pnpm: "tool",
  "Node.js": "backend", Spring: "backend", "Spring Boot": "backend", Express: "backend",
  "ASP.NET Core": "backend", Laravel: "backend",
  Django: "backend", Flask: "backend", FastAPI: "backend", GraphQL: "backend", REST: "backend",
  TypeScript: "language", JavaScript: "language", Python: "language", Java: "language",
  Kotlin: "language", Go: "language", Rust: "language", "C++": "language",
  "C#": "language", PHP: "language", Ruby: "language", Swift: "language",
  PostgreSQL: "database", MySQL: "database", MongoDB: "database", Redis: "database",
  Elasticsearch: "database", Oracle: "database", SQLite: "database", MariaDB: "database",
  AWS: "cloud", GCP: "cloud", Azure: "cloud", Heroku: "cloud",
  Vite: "tool", Webpack: "tool",
  Docker: "devops", Kubernetes: "devops", Terraform: "devops", Jenkins: "devops",
  "GitHub Actions": "devops", Kafka: "devops",
  Spark: "data", Airflow: "data", Hadoop: "data", TensorFlow: "data", PyTorch: "data",
};

export function guessCategory(name: string): string {
  return CAT_MAP[name] ?? "etc";
}
