import Link from "next/link";
import { skillGap } from "@/lib/aggregate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StackInput } from "@/components/stack-input";

const REGIONS = [
  { key: "", label: "전체" },
  { key: "kr", label: "🇰🇷 한국" },
  { key: "global", label: "🌐 글로벌" },
];

export const dynamic = "force-dynamic";

export default async function Gap({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string; region?: string }>;
}) {
  const { skills: rawSkills, region: rawR } = await searchParams;
  const region = rawR === "kr" || rawR === "global" ? rawR : undefined;
  const userSkills = (rawSkills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const gap = userSkills.length ? await skillGap(userSkills, region) : null;

  function regionHref(r?: string) {
    const p = new URLSearchParams();
    if (rawSkills) p.set("skills", rawSkills);
    if (r) p.set("region", r);
    const q = p.toString();
    return q ? `/gap?${q}` : "/gap";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">내 스택 격차</h1>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← 시장 대시보드
          </Link>
        </div>
        <p className="mt-1 text-muted-foreground">
          내 기술을 넣으면 — 시장 수요 대비 <span className="font-medium text-foreground">뭘 갖췄고</span>,
          다음에 <span className="font-medium text-foreground">뭘 배우면</span> 지원 가능 공고가 느는지.
        </p>
      </header>

      {/* 지역 탭 */}
      <div className="mb-4 flex gap-2">
        {REGIONS.map((t) => {
          const active = (t.key || undefined) === region;
          return (
            <Link
              key={t.key}
              href={regionHref(t.key || undefined)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                active ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-8">
        <StackInput initial={userSkills} region={region} />
      </div>

      {!gap ? (
        <p className="py-16 text-center text-muted-foreground">
          위에 보유 기술을 입력해봐. (Enter 또는 쉼표로 추가)
        </p>
      ) : (
        <div className="space-y-6">
          {/* 매칭률 */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {region === "kr" ? "🇰🇷 한국" : region === "global" ? "🌐 글로벌" : "전체"} 시장 요구 TOP {gap.top20n} 중
              </CardDescription>
              <CardTitle className="text-4xl">
                {gap.inTop20}
                <span className="text-xl text-muted-foreground">/{gap.top20n} 보유 · {gap.matchRate}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${gap.matchRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* 다음에 배우면 좋은 것 (핵심) */}
          <Card>
            <CardHeader>
              <CardTitle>다음에 배우면 좋은 기술</CardTitle>
              <CardDescription>
                내가 아직 없는데 시장이 많이 찾는 순 — 이걸 채우면 지원 가능 공고가 늘어난다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gap.missing.length === 0 ? (
                <p className="text-muted-foreground">시장 상위 기술을 이미 다 갖췄어. 👏</p>
              ) : (
                <div className="divide-y">
                  {gap.missing.slice(0, 10).map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-right text-sm text-muted-foreground">{i + 1}</span>
                        <span className="font-medium">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{s.count}건</Badge>
                        <span className="w-14 text-right text-sm text-muted-foreground">{s.share}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 이미 갖춘 것 */}
          <Card>
            <CardHeader>
              <CardTitle>이미 시장이 원하는 내 기술</CardTitle>
              <CardDescription>보유 기술 중 수요 목록에 든 것 (수요 높은 순)</CardDescription>
            </CardHeader>
            <CardContent>
              {gap.have.length === 0 ? (
                <p className="text-muted-foreground">
                  입력한 기술이 아직 이 시장 상위 수요에는 안 보여. 지역을 바꿔보거나 표기를 확인해봐.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gap.have.map((s) => (
                    <Badge key={s.name} variant="outline" className="font-normal">
                      {s.name}
                      <span className="ml-1 text-muted-foreground">{s.share}%</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 니치(수요목록 밖) — 참고용, 판단 아님 */}
          {gap.niche.length > 0 && (
            <p className="text-sm text-muted-foreground">
              수요 상위 밖 기술:{" "}
              {gap.niche.join(", ")} — 틈새거나 표기가 다를 수 있어. (희소성이 강점일 수도)
            </p>
          )}
        </div>
      )}
    </main>
  );
}
