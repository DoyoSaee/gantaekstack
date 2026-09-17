"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LATEST_YEAR } from "@/lib/era-data";
import { matchPosting, type MatchResult } from "@/app/match/actions";

// 공고 매칭: 지원 직전의 질문 "이 공고, 나랑 맞나"에 답하는 화면.
export function PostingMatcher({ initialSkills = [] }: { initialSkills?: string[] }) {
  const [posting, setPosting] = useState("");
  const [mySkills, setMySkills] = useState(initialSkills.join(", "));
  const [fromLast, setFromLast] = useState(false);
  const [contribute, setContribute] = useState(true);
  const [res, setRes] = useState<MatchResult | null>(null);
  const [pending, start] = useTransition();

  // URL로 안 넘어왔으면 최근 진단 스택을 이어받는다 (탭 이동으로 와도 연결)
  useEffect(() => {
    if (initialSkills.length > 0) return;
    try {
      const last = localStorage.getItem("gantaek:lastSkills");
      if (last) {
        setMySkills(last.split(",").join(", "));
        setFromLast(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    const skills = mySkills.split(",").map((s) => s.trim()).filter(Boolean);
    start(async () => setRes(await matchPosting(posting, skills, contribute)));
  }

  const pct = res && res.total ? Math.round((res.matched / res.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">지원하려는 공고</CardTitle>
          <CardDescription>공고 본문을 붙여넣으면 요구 스택을 읽고 내 스택과 대조해</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            rows={7}
            placeholder="예) [자격요건] React, TypeScript 3년 이상. Next.js SSR 경험. AWS 배포 경험 우대…"
            className="w-full resize-y rounded-md border bg-transparent p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">내 스택 (쉼표로 구분)</label>
            <input
              value={mySkills}
              onChange={(e) => setMySkills(e.target.value)}
              placeholder="React, TypeScript, Node.js, PostgreSQL"
              className="h-10 w-full rounded-md border bg-transparent px-3 font-mono text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {fromLast
                ? "최근 이력서 진단에서 이어받았어 ✓ (수정 가능)"
                : "이력서 진단을 먼저 하고 오면 자동으로 채워져"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={run}
              disabled={pending || posting.trim().length < 40}
              className="rounded-md bg-[var(--raspberry)] px-4 py-2 text-base font-bold text-[#FEFEFE] transition hover:opacity-90 disabled:opacity-40"
            >
              {pending ? (
                <>
                  <span aria-hidden>ㅡㅅㅡ</span> 대조 중…
                </>
              ) : (
                "이 공고, 나랑 맞나"
              )}
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={contribute}
                onChange={(e) => setContribute(e.target.checked)}
                className="h-4 w-4 accent-[#28272A]"
              />
              이 공고를 한국 데이터셋에 익명 기여 (시장 통계가 자라요)
            </label>
            {res?.error && <span className="text-sm text-red-500">{res.error}</span>}
          </div>
        </CardContent>
      </Card>

      {res && !res.error && (
        <>
          {/* 매칭률 — 화면의 답 */}
          <Card>
            <CardHeader className="pb-2">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Match
              </p>
              <CardDescription>요구 기술 대비 내 스택</CardDescription>
              <CardTitle className="text-5xl font-black tracking-[-0.04em]">
                <span className="mr-2 select-none" aria-hidden>
                  {pct >= 70 ? "^ㅅ^" : "ㅌㅅㅌ"}
                </span>
                <span className="font-mono font-medium">
                  {res.matched}
                  <span className="text-2xl text-muted-foreground">/{res.total}</span>
                </span>
              </CardTitle>
              <p className="mt-1 text-base text-muted-foreground">
                요구 기술 {res.total}개 중 {res.matched}개 보유 ({pct}%)
                {res.experienceYears != null && (
                  <>
                    {" · "}요구 경력 <span className="font-mono">{res.experienceYears}년+</span>
                  </>
                )}
                {res.postingEra && (
                  <>
                    {" · "}이 공고의 요구 스택 시대{" "}
                    <span className="font-mono">≈ {Math.round(res.postingEra.centroidYear)}년</span>
                    {res.postingEra.gapYears > 2 && (
                      <span> — 최신({LATEST_YEAR})보다 {res.postingEra.gapYears}년 이전 스택을 쓰는 팀일 수 있어</span>
                    )}
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">요구 기술 — 채워진 건 보유, 빈 건 미보유</p>
                <div className="flex flex-wrap gap-2">
                  {res.required.map((r) => (
                    <span
                      key={r.name}
                      className={
                        r.have
                          ? "rounded-md bg-foreground px-2.5 py-1 font-mono text-sm font-medium text-background"
                          : "rounded-md border border-border px-2.5 py-1 font-mono text-sm text-muted-foreground"
                      }
                    >
                      {r.name}
                      {r.have ? " ✓" : ""}
                    </span>
                  ))}
                </div>
              </div>
              {res.hidden.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">문장 속 숨은 요구</p>
                  <div className="flex flex-wrap gap-2">
                    {res.hidden.map((h) => (
                      <Badge key={h} variant="outline" className="font-normal">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {res.saved && (
                <p className="text-xs text-muted-foreground">
                  이 공고는 익명으로 한국 데이터셋에 더해졌어 — 시장 대시보드의 🇰🇷 통계가 그만큼
                  정확해져. <span aria-hidden>^ㅅ^</span>
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
