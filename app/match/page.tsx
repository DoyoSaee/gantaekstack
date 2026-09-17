import { PostingMatcher } from "@/components/posting-matcher";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const initialSkills = (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 40);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-10">
      <header className="mb-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Match
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">이 공고, 나랑 맞나</h1>
        <p className="mt-2 text-muted-foreground">
          지원 직전의 공고를 붙여넣으면 — 요구 스택과 내 스택의 대조, 공고가 요구하는{" "}
          <span className="font-medium text-foreground">스택의 시대</span>, 문장 속 숨은 요구까지.
          기여를 켜면 그 공고가 한국 데이터셋을 키워.
        </p>
      </header>
      <PostingMatcher initialSkills={initialSkills} />
      <footer className="mt-10 text-center text-xs text-muted-foreground">
        기여된 공고는 익명·통계 목적으로만 저장 · 원티드 AI Championship 2026
      </footer>
    </main>
  );
}
