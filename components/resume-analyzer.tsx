"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LATEST_YEAR } from "@/lib/era-data";
import { SAMPLE_RESUMES } from "@/lib/sample-resumes";
import {
  analyzeResume,
  analyzeSkillList,
  extractPdfText,
  type AnalyzeResult,
} from "@/app/era/actions";

const chartConfig = { score: { label: "내 스택 주류도", color: "var(--chart-1)" } } satisfies ChartConfig;

// DS §2 DataRow: 추세는 색이 아니라 화살표·굵기. 가장 진한 줄 = 할 말이 가장 많은 줄(뚜렷한 감소).
const TREND_LABEL: Record<string, { text: string; cls: string }> = {
  rising: { text: "↑ 상승", cls: "text-[#4A4B4F] dark:text-[#B9BBBF]" },
  stable: { text: "→ 유지", cls: "text-muted-foreground" },
  easing: { text: "↘ 완만한 감소", cls: "text-muted-foreground" },
  declining: { text: "↓ 뚜렷한 감소", cls: "text-foreground font-medium" },
  modern: { text: "신생 · 현역", cls: "text-muted-foreground" },
};

// 레거시 스택 데모용 (실이력서 샘플과 별개 — 시대 격차가 크게 나오는 예시)
const LEGACY_SAMPLE = `프론트엔드 개발자. jQuery와 PHP로 사내 웹 유지보수, Java Spring 백엔드 경험.
AngularJS SPA 마이그레이션, MySQL 쿼리 최적화. 최근 React, TypeScript 학습 중.`;

export function ResumeAnalyzer({ initialSkills = [] }: { initialSkills?: string[] }) {
  const [text, setText] = useState("");
  const [res, setRes] = useState<AnalyzeResult | null>(null);
  const [pending, start] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bootedRef = useRef(false);

  // 공유 링크(?s=...)로 진입 시 자동 분석 (Gemini 추출 생략, 스킬로 바로)
  useEffect(() => {
    if (bootedRef.current || initialSkills.length === 0) return;
    bootedRef.current = true;
    start(async () => setRes(await analyzeSkillList(initialSkills)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    start(async () => setRes(await analyzeResume(text)));
  }

  async function onFile(file: File) {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setPdfBusy(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const r = await extractPdfText(fd);
        if (r.text) {
          setText(r.text);
          start(async () => setRes(await analyzeResume(r.text!)));
        } else {
          setRes({
            skills: [],
            era: null,
            gap: null,
            together: [],
            comment: null,
            marketEraAvg: null,
            error: r.error,
          });
        }
      } finally {
        setPdfBusy(false);
      }
    } else {
      const t = await file.text();
      setText(t.slice(0, 20000));
    }
  }

  async function share() {
    if (!res || res.skills.length === 0) return;
    const url = `${location.origin}/?s=${encodeURIComponent(res.skills.join(","))}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const era = res?.era;
  const busy = pending || pdfBusy;
  // 곡선 위 격차 구간(액센트): 무게중심에 가장 가까운 실제 눈금 ~ 최신 연도
  const gapAnchor = era
    ? era.yearScores
        .map((s) => s.year)
        .reduce((b, y) => (Math.abs(y - era.centroidYear) < Math.abs(b - era.centroidYear) ? y : b))
    : 0;
  const yTop = era ? Math.max(...era.yearScores.map((s) => s.score)) : 0;

  return (
    <div className="space-y-6">
      {/* 입력 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">이력서 / 경력기술서</CardTitle>
          <CardDescription>텍스트를 붙여넣거나 PDF를 끌어다 놓으면 AI가 기술만 추출해</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={`rounded-md border border-dashed transition ${
              dragOver ? "border-foreground bg-muted/60" : "border-transparent"
            }`}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={"예) React, TypeScript 기반 SPA 개발. Node.js/Express API, PostgreSQL. AWS 배포…\n\n또는 이력서 PDF를 여기로 드래그"}
              className="w-full resize-y rounded-md border bg-transparent p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={run}
              disabled={busy || text.trim().length < 20}
              className="rounded-md bg-[var(--raspberry)] px-4 py-2 text-base font-bold text-[#FEFEFE] transition hover:opacity-90 disabled:opacity-40"
            >
              {busy ? (
                <>
                  <span aria-hidden>ㅡㅅㅡ</span> {pdfBusy ? "PDF 읽는 중…" : "분석 중…"}
                </>
              ) : (
                "내 스택 시대 진단"
              )}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-md border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              PDF 업로드
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <select
              value=""
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "legacy") setText(LEGACY_SAMPLE);
                else if (v) setText(SAMPLE_RESUMES[Number(v)]?.text ?? "");
              }}
              className="h-10 rounded-lg border bg-transparent px-2.5 text-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="샘플 이력서 선택"
            >
              <option value="" disabled>
                샘플 이력서 넣기…
              </option>
              {SAMPLE_RESUMES.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
              <option value="legacy">레거시 스택 예시 (격차 데모)</option>
            </select>
            {res?.error && <span className="text-sm text-red-500">{res.error}</span>}
          </div>
        </CardContent>
      </Card>

      {/* AI가 읽어낸 스택 — 근거 투명화 */}
      {res && res.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">AI가 읽어낸 스택 ({res.skills.length}개)</CardTitle>
                <CardDescription className="mt-1">
                  이게 아래 모든 진단의 근거야 — 잘못 읽었으면 문구를 다듬어 다시 돌려봐
                </CardDescription>
              </div>
              <button
                onClick={share}
                className="shrink-0 rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
              >
                {copied ? "복사됨 ✓" : "결과 공유 링크"}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {res.skills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 총평 */}
      {res?.comment && (
        <Card className="border-l-4 border-l-foreground">
          <CardContent className="py-4">
            <p className="text-[15px] leading-relaxed">
              <span className="mr-1.5 select-none font-black" aria-hidden>ㅇㅅㅇ</span>
              {res.comment}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">AI 총평 — 판단이 아니라 방향이야</p>
          </CardContent>
        </Card>
      )}

      {/* 시대 데이터 미매칭 안내 (조용한 실패 방지) */}
      {res && !res.error && res.skills.length > 0 && !era && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            추출된 기술이 시대 곡선 데이터(주요 기술 40여 종)와 겹치지 않아 시대 진단은 못 했어.
            아래 시장 갭 분석은 그대로 유효해.
          </CardContent>
        </Card>
      )}

      {era && res && (
        <>
          {/* 무게중심 */}
          <Card>
            <CardHeader className="pb-2">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Era
              </p>
              <CardDescription>내 스택의 시대 무게중심</CardDescription>
              <CardTitle className="text-5xl font-black tracking-[-0.04em]">
                <span className="mr-2 select-none" aria-hidden>
                  {era.gapYears > 0.4 ? "ㅌㅅㅌ" : "^ㅅ^"}
                </span>
                <span className="font-mono font-medium tracking-[-0.02em]">
                  ≈ {Math.round(era.centroidYear)}년
                </span>
              </CardTitle>
              <p className="mt-1 text-base text-muted-foreground">
                {era.gapYears > 0.4
                  ? `최신 설문(${LATEST_YEAR})보다 ${era.gapYears}년 이전`
                  : "최신 설문 시점과 근접"}
                {res.marketEraAvg != null && (
                  <>
                    {" · "}시장이 요구하는 스택 <span className="font-mono">≈ {res.marketEraAvg}년</span>
                    {Math.abs(res.marketEraAvg - era.centroidYear) >= 0.5 && (
                      <>
                        {" — 실질 격차 "}
                        <span className="font-mono text-foreground">
                          {Math.abs(Math.round((res.marketEraAvg - era.centroidYear) * 10) / 10)}년
                        </span>
                      </>
                    )}
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {era.byCategory.length > 1 && (
                <div>
                  <p className="mb-2 text-sm font-medium">직군별로 나눠 보면</p>
                  <div className="flex flex-wrap gap-2">
                    {era.byCategory.map((c) => (
                      <Badge key={c.category} variant="outline" className="font-normal" title={c.techs.join(", ")}>
                        {c.label} ≈ {Math.round(c.centroidYear)}년
                        <span className="ml-1 text-muted-foreground">({c.techs.length})</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    한 숫자로 뭉뚱그리면 왜곡돼서, 직군 축을 따로 계산했어 — 예를 들어 백엔드 축이
                    과거고 프론트 축이 현재면, 프론트 전환이 이미 진행 중이라는 뜻
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                입력한 기술 {res.skills.length}개 중 {era.matched.length}개를 시대 곡선(Stack Overflow
                설문 2017~2025 · 2026 설문은 결과 미공개, 공개 시 반영)과 대조했어. 아래 곡선은{" "}
                <b>내 스택이 시장에서 가장 주류였던 시기</b>야.
              </p>
            </CardContent>
          </Card>

          {/* 시대 곡선 */}
          <Card>
            <CardHeader>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Curve
              </p>
              <CardTitle className="text-base">내 스택의 주류도 곡선</CardTitle>
              <CardDescription>봉우리가 왼쪽일수록 과거 스택, 오른쪽일수록 현재 스택</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <LineChart data={era.yearScores} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    x={gapAnchor}
                    stroke="var(--chart-3)"
                    strokeDasharray="4 4"
                    label={{ value: "무게중심", position: "insideBottomLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  {/* 화면의 액센트: 격차 구간 (DS §5 — 연도가 아니라 "지금과 얼마나 떨어져 있나"가 답) */}
                  {era.gapYears > 0.4 && gapAnchor < LATEST_YEAR && (
                    <ReferenceLine
                      segment={[
                        { x: gapAnchor, y: yTop },
                        { x: LATEST_YEAR, y: yTop },
                      ]}
                      stroke="var(--raspberry)"
                      strokeWidth={2.5}
                      label={{
                        value: `격차 ${era.gapYears}년`,
                        position: "top",
                        fontSize: 11,
                        fontWeight: 500,
                        fill: "var(--foreground)",
                      }}
                    />
                  )}
                  <Line
                    dataKey="score"
                    type="monotone"
                    stroke="var(--color-score)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 기술별 시대 진단 */}
          <Card>
            <CardHeader>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                By Tech
              </p>
              <CardTitle className="text-base">기술별 시대 진단</CardTitle>
              <CardDescription>
                각 기술의 정점 연도와 현재 사용률 — &ldquo;감소&rdquo;는 신규 채택 비중이 줄었다는 뜻이지,
                사장된 기술이란 뜻이 아니야 (정점 연도 순)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y text-sm">
                {era.matched.map((m) => {
                  const t = TREND_LABEL[m.trend];
                  return (
                    <div key={m.name} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        <span className={`text-xs ${t.cls}`}>{t.text}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
                        {m.trend !== "modern" && (
                          <span className="font-mono text-xs">현재 {Math.round(m.latest)}%</span>
                        )}
                        <span className="font-mono text-xs">
                          {m.trend === "modern" ? `등장 ${m.peakYear}년~` : `정점 ${m.peakYear}년`}
                        </span>
                        {m.trend === "declining" && m.successor && (
                          <Badge variant="outline" className="font-normal">
                            신규 수요는 → {m.successor}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {era.unmatched.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  시대 데이터 없음(참고): {era.unmatched.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 현재 시장 갭 */}
          {res.gap && (
            <Card>
              <CardHeader>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Next
                </p>
                <CardTitle className="text-base">지금 시장에 맞추려면</CardTitle>
                <CardDescription>
                  2026년 지금 수집한 채용공고 AI 분석 기준(주로 글로벌 · 한국 소스 승인 대기) — 내 이력서에 없는 것부터
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {res.together.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">내 스택과 같은 공고에서 함께 요구된 기술</p>
                    <div className="flex flex-wrap gap-2">
                      {res.together.map((s) => (
                        <Badge key={s.name} variant="secondary" className="font-mono">
                          {s.name}{" "}
                          <span className="ml-1 text-[#4A4B4F] dark:text-[#B9BBBF]">{s.count}회 동반</span>
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      내 기술을 뽑는 공고들이 같이 찾은 기술 — 지금 스택에서 가장 가까운 다음 걸음
                    </p>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-medium">시장 전체 수요 대비 부족한 기술</p>
                  {res.gap.missing.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      상위 수요를 이미 다 갖췄어. <span aria-hidden>^ㅅ^</span>
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {res.gap.missing.slice(0, 10).map((s) => (
                        <Badge key={s.name} variant="secondary" className="font-mono">
                          {s.name}{" "}
                          <span className="ml-1 text-[#4A4B4F] dark:text-[#B9BBBF]">{s.share}%</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">이미 시장이 원하는 내 기술</p>
                  {res.gap.have.length === 0 ? (
                    <p className="text-sm text-muted-foreground">상위 수요와 겹치는 게 아직 안 보여.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {res.gap.have.map((s) => (
                        <Badge key={s.name} variant="outline" className="font-normal">
                          {s.name} <span className="ml-1 text-muted-foreground">{s.share}%</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
