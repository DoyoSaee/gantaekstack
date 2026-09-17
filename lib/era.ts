import { TECH_ERA, MODERN_TECH, ERA_YEARS, LATEST_YEAR, EraCurve } from "./era-data";
import { normalizeSkill, guessCategory } from "./skills";

// 이력서 스택 → "시대 무게중심 연도" 진단.
// 원리: 각 기술의 연도별 인기 곡선(SO 설문)을 정규화해, 그 기술이 '자기 역사상 언제 주류였나'로 각 연도에 투표.
// 단, 시대 판별력(변동폭)이 큰 기술일수록 가중 — jQuery↓/Docker↑는 강하게, JavaScript(늘 1위)는 약하게.

function years(curve: EraCurve): number[] {
  return ERA_YEARS.filter((y) => curve[y] != null);
}

// easing=완만한 감소(여전히 주류일 수 있음) / declining=뚜렷한 감소(정점 대비 40%↓)
// modern=SO 설문 항목엔 없는 신생·현역 기술(등장 연도 기반 최신 신호)
export type TechTrend = "rising" | "stable" | "easing" | "declining" | "modern";

export type MatchedTech = {
  name: string;
  peakYear: number; // 우리 데이터 범위 내 인기 정점 연도
  trend: TechTrend;
  first: number; // 첫 관측 %
  latest: number; // 최신(2025 또는 마지막 관측) %
  successor?: string; // 하락 기술일 때, 시장이 이동한 같은 카테고리의 상승 기술
};

function firstLatest(curve: EraCurve): { first: number; latest: number } {
  const ys = years(curve);
  const vals = ys.map((y) => curve[y] as number);
  return { first: vals[0], latest: curve[LATEST_YEAR] ?? vals[vals.length - 1] };
}

// 시장 이동 방향: 같은 카테고리에서 가장 세게 상승 중인 기술(데이터 기반, 편집 의견 아님).
function successorOf(name: string): string | undefined {
  const cat = guessCategory(name);
  if (cat === "etc") return undefined;
  let best: string | undefined;
  let bestLatest = 0;
  for (const t of Object.keys(TECH_ERA)) {
    if (t === name || guessCategory(t) !== cat) continue;
    const { first, latest } = firstLatest(TECH_ERA[t]);
    if (latest > first * 1.15 && latest > bestLatest) {
      best = t;
      bestLatest = latest;
    }
  }
  return best;
}

export type CategoryCentroid = {
  category: string;
  label: string;
  centroidYear: number;
  techs: string[];
};

export type EraResult = {
  centroidYear: number; // 무게중심 연도(소수)
  gapYears: number; // LATEST_YEAR - centroid
  yearScores: { year: number; score: number }[]; // 연도별 정규화 점수(차트)
  matched: MatchedTech[];
  unmatched: string[]; // 시대 데이터가 없는 스킬
  byCategory: CategoryCentroid[]; // 직군별 무게중심 — 절대 기준의 애매함 보완
};

const CAT_LABEL: Record<string, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  language: "언어",
  database: "DB",
  cloud: "클라우드",
  devops: "데브옵스",
  data: "데이터",
  tool: "툴",
};

export function analyzeEra(rawSkills: string[]): EraResult | null {
  const skills = [...new Set(rawSkills.map(normalizeSkill).filter(Boolean))];
  const matched: MatchedTech[] = [];
  const unmatched: string[] = [];

  const perYear = new Map<number, number>();
  ERA_YEARS.forEach((y) => perYear.set(y, 0));

  // 무게중심은 '각 기술의 정점 연도'를 판별력(변동폭)으로 가중평균 — 봉우리가 뭉개지지 않게.
  let peakNum = 0;
  let peakDen = 0;
  // 직군별 무게중심용 누적 (category → {num, den, techs})
  const catAcc = new Map<string, { num: number; den: number; techs: string[] }>();

  for (const s of skills) {
    const curve = TECH_ERA[s];
    if (!curve) {
      const advent = MODERN_TECH[s];
      if (advent) {
        // 신생 현역 기술 = 최신 신호. 설문 %가 없으니 보수적 가중치(0.4)로 최신 연도에 투표.
        const w = 0.4;
        peakNum += LATEST_YEAR * w;
        peakDen += w;
        const cat = guessCategory(s);
        const acc = catAcc.get(cat) ?? { num: 0, den: 0, techs: [] };
        acc.num += LATEST_YEAR * w;
        acc.den += w;
        acc.techs.push(s);
        catAcc.set(cat, acc);
        matched.push({ name: s, peakYear: advent, trend: "modern", first: 0, latest: 0 });
        continue;
      }
      unmatched.push(s);
      continue;
    }
    const ys = years(curve);
    const vals = ys.map((y) => curve[y] as number);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    if (max <= 0) continue;

    // 판별력 가중치 = 변동폭 / 최대값 (0~1). 곡선이 평평하면(JS 등) 시대 신호가 약함.
    const weight = (max - min) / max;
    const peakYear = ys[vals.indexOf(max)];

    // 차트용: 곡선 전체를 자기 최대값으로 정규화해 '연도별 주류도'로 합산
    for (const y of ys) {
      perYear.set(y, (perYear.get(y) as number) + (curve[y] as number) / max);
    }
    // 무게중심용: 정점 연도에만 판별력만큼 투표
    peakNum += peakYear * weight;
    peakDen += weight;
    const cat = guessCategory(s);
    const acc = catAcc.get(cat) ?? { num: 0, den: 0, techs: [] };
    acc.num += peakYear * weight;
    acc.den += weight;
    acc.techs.push(s);
    catAcc.set(cat, acc);

    const first = vals[0];
    const latest = curve[LATEST_YEAR] ?? vals[vals.length - 1];
    // 감소 판정은 '정점 대비'로 — 뚜렷한 감소(정점의 60% 미만)만 시장 이동으로 본다.
    const vsPeak = latest / max;
    const trend: TechTrend =
      latest > first * 1.15
        ? "rising"
        : vsPeak < 0.6
          ? "declining"
          : latest < first * 0.85
            ? "easing"
            : "stable";
    matched.push({
      name: s,
      peakYear,
      trend,
      first,
      latest,
      successor: trend === "declining" ? successorOf(s) : undefined,
    });
  }

  if (matched.length === 0) return null;

  const yearScores = ERA_YEARS.map((y) => ({
    year: y,
    score: Math.round((perYear.get(y) as number) * 100) / 100,
  }));
  const centroidYear = peakDen ? Math.round((peakNum / peakDen) * 10) / 10 : LATEST_YEAR;

  // 정렬: 지는 기술(과거 신호) 먼저 보여주면 "무엇이 나를 과거로 당기나"가 드러남
  matched.sort((a, b) => a.peakYear - b.peakYear || a.name.localeCompare(b.name));

  // 직군별 무게중심 — 판별력 합이 유의미한(den>0.15) 직군만, 과거순
  const byCategory: CategoryCentroid[] = [...catAcc.entries()]
    .filter(([cat, a]) => a.den > 0.15 && CAT_LABEL[cat])
    .map(([cat, a]) => ({
      category: cat,
      label: CAT_LABEL[cat],
      centroidYear: Math.round((a.num / a.den) * 10) / 10,
      techs: a.techs,
    }))
    .sort((x, y) => x.centroidYear - y.centroidYear);

  return {
    centroidYear,
    gapYears: Math.round((LATEST_YEAR - centroidYear) * 10) / 10,
    yearScores,
    matched,
    unmatched,
    byCategory,
  };
}
