import Link from "next/link";
import { topSkills, counts, topHiddenRequirements } from "@/lib/aggregate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillChart } from "@/components/skill-chart";

const REGIONS = [
  { key: "", label: "전체" },
  { key: "kr", label: "🇰🇷 한국" },
  { key: "global", label: "🌐 글로벌" },
];

const CATEGORIES = [
  { key: "", label: "전체 개발기술" },
  { key: "frontend", label: "프론트엔드" },
  { key: "backend", label: "백엔드" },
  { key: "language", label: "언어" },
  { key: "database", label: "DB" },
  { key: "devops", label: "데브옵스" },
  { key: "cloud", label: "클라우드" },
  { key: "data", label: "데이터/AI" },
];

function href(region?: string, category?: string) {
  const p = new URLSearchParams();
  if (region) p.set("region", region);
  if (category) p.set("category", category);
  const q = p.toString();
  return q ? `/market?${q}` : "/market";
}

export const dynamic = "force-dynamic";

export default async function Market({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; category?: string }>;
}) {
  const { region: rawR, category: rawC } = await searchParams;
  const region = rawR === "kr" || rawR === "global" ? rawR : undefined;
  const category = rawC || undefined;
  const [skills, meta, hidden] = await Promise.all([
    topSkills(region, category, 20),
    counts(region),
    topHiddenRequirements(region, 24),
  ]);
  const catLabel =
    CATEGORIES.find((c) => (c.key || undefined) === category)?.label ?? "전체 개발기술";

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      {/* AppShell: 되돌아가기(좌측 최상단) + 마크 · 현재 위치 */}
      <div className="mb-10 flex items-center gap-2.5 text-sm">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium text-foreground transition hover:border-foreground"
        >
          ← 이력서 시대 진단
        </Link>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="간택스택 마크" className="h-7 w-7 dark:invert" />
            <span className="font-black tracking-[-0.02em]">간택스택</span>
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-muted-foreground" aria-current="page">시장 대시보드</span>
        </div>
      </div>
      <header className="mb-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Market
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">시장 대시보드</h1>
        <p className="mt-2 text-muted-foreground">
          채용시장이 <span className="font-medium text-foreground">간택</span>하는 기술 —
          지금 뜨는 스택을 데이터로.
        </p>
      </header>

      {/* 지역 탭 */}
      <div className="mb-3 flex gap-2">
        {REGIONS.map((t) => {
          const active = (t.key || undefined) === region;
          return (
            <Link
              key={t.key}
              href={href(t.key || undefined, category)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* 카테고리 탭 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((t) => {
          const active = (t.key || undefined) === category;
          return (
            <Link
              key={t.key}
              href={href(region, t.key || undefined)}
              className={`rounded-md border px-3 py-1 text-xs transition ${
                active ? "border-foreground font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* 스탯 카드 */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[13px]">분석한 개발공고</CardDescription>
            <CardTitle className="font-mono text-3xl font-medium">
              {meta.postings.toLocaleString()}
              <span className="ml-1 text-base text-muted-foreground">건</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[13px]">추출된 기술</CardDescription>
            <CardTitle className="font-mono text-3xl font-medium">
              {meta.skills.toLocaleString()}
              <span className="ml-1 text-base text-muted-foreground">종</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[13px]">{catLabel} 1위</CardDescription>
            <CardTitle className="font-mono text-2xl font-medium">{skills[0]?.name ?? "-"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* TOP 기술 */}
      <Card>
        <CardHeader>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Ranking
          </p>
          <CardTitle>{catLabel} — 요구 기술 TOP 20</CardTitle>
          <CardDescription>
            공고 본문에서 AI가 추출·정규화·분류한 기술을 세어 정렬
          </CardDescription>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">이 조건엔 데이터가 없어요.</p>
          ) : (
            <>
              <SkillChart data={skills.map((s) => ({ name: s.name, count: s.count }))} />
              <div className="mt-6 divide-y">
                {skills.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-right font-mono text-sm text-muted-foreground">{i + 1}</span>
                      <span className="font-mono text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{s.count}건</span>
                      <span className="w-14 text-right font-mono text-sm">{s.share}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 숨은 요구 (차별점) */}
      {hidden.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Hidden
            </p>
            <CardTitle>AI가 포착한 &ldquo;숨은 요구&rdquo;</CardTitle>
            <CardDescription>
              표면 키워드가 아니라, 공고 문장 속에 숨은 실제 요구 역량 — 이게 단순 통계와의 차이
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hidden.map((h) => (
                <Badge key={h.text} variant="outline" className="font-normal">
                  {h.text}
                  {h.count > 1 && <span className="ml-1 text-muted-foreground">·{h.count}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        데이터:{" "}
        <a href="https://www.arbeitnow.com" className="underline" rel="noreferrer" target="_blank">Arbeitnow</a>{" · "}
        <a href="https://remoteok.com" className="underline" rel="noreferrer" target="_blank">RemoteOK</a>{" · "}
        <a href="https://remotive.com" className="underline" rel="noreferrer" target="_blank">Remotive</a>
        {" "}(글로벌·개발직 필터) + 직접 지원하며 수집한 한국 공고 · 사람인 승인 시 한국 민간 추가 · 원티드 AI Championship 2026
      </footer>
    </main>
  );
}
