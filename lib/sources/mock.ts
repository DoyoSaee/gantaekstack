import { JobSource, NormalizedPosting } from "./types";

// 승인 대기와 무관하게 파이프라인/UI를 개발·검증하기 위한 mock 소스.
// 실제 소스(사람인/공공)가 붙으면 이 어댑터만 교체하면 된다.
// rawText는 실제 공고처럼 "표면 스택 + 문장 속 암묵 요구"를 섞어둠(추출 테스트용).

const SAMPLES: Omit<NormalizedPosting, "source" | "region">[] = [
  {
    sourceId: "mock-1",
    title: "프론트엔드 개발자 (React)",
    company: "테크스타트업 A",
    location: "서울 강남",
    rawText:
      "React, TypeScript 기반 웹 서비스 개발. Next.js 활용 SSR 경험 우대. " +
      "대규모 트래픽 환경에서의 성능 최적화 경험 필요. 상태관리(Redux/Zustand) 능숙. " +
      "경력 3년 이상. Tailwind CSS, 디자인 시스템 구축 경험 우대.",
  },
  {
    sourceId: "mock-2",
    title: "백엔드 개발자 (Node.js)",
    company: "핀테크 B",
    location: "서울 성수",
    rawText:
      "Node.js, TypeScript로 API 서버 개발. PostgreSQL, Redis 사용. " +
      "AWS 기반 인프라 운영 및 직접 배포 경험 필수. Docker, Kubernetes 경험 우대. " +
      "MSA 환경 설계 경험 우대. 경력 5년 이상.",
  },
  {
    sourceId: "mock-3",
    title: "풀스택 개발자",
    company: "커머스 C",
    location: "경기 성남",
    rawText:
      "Next.js 풀스택 개발. React + Node.js. GraphQL API 설계. " +
      "PostgreSQL 스키마 설계 경험. AWS 배포. 스타트업에서 0->1 제품 경험 우대. " +
      "경력 2년 이상.",
  },
  {
    sourceId: "mock-4",
    title: "데이터 엔지니어",
    company: "AI 스타트업 D",
    location: "서울 서초",
    rawText:
      "Python 기반 데이터 파이프라인 구축. Airflow, Spark 경험. " +
      "대용량 데이터 처리 및 최적화 경험 필요. AWS, Docker. SQL 능숙. " +
      "경력 4년 이상.",
  },
  {
    sourceId: "mock-5",
    title: "DevOps 엔지니어",
    company: "SaaS E",
    location: "서울 마포",
    rawText:
      "Kubernetes, Docker 기반 인프라 운영. AWS, Terraform으로 IaC 구성. " +
      "CI/CD 파이프라인 구축 경험 필수. 모니터링(Prometheus/Grafana) 경험 우대. " +
      "온콜 대응 경험. 경력 3년 이상.",
  },
];

export const mockSource: JobSource = {
  name: "mock",
  async fetchRecent({ limit = 20 } = {}) {
    return SAMPLES.slice(0, limit).map((s) => ({
      ...s,
      source: "mock",
      region: "kr" as const,
    }));
  },
};
