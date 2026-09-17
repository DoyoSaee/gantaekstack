import Link from "next/link";
import { counts } from "@/lib/aggregate";
import { ERA_YEARS } from "@/lib/era-data";
import { ResumeAnalyzer } from "@/components/resume-analyzer";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const sharedSkills = (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 40);
  const meta = await counts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <AppNav current="/" />
      <header className="relative mb-8">
        {/* 워터마크 마크 — 그림자 대신 마크로 지면에 결 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-4 h-44 w-44 opacity-[0.07] dark:invert"
        />
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Market-Picked Stack
        </p>
        <h1 className="mt-2 text-[40px] font-black leading-[46px] tracking-[-0.04em]">
          내 이력서, <span className="underline decoration-foreground decoration-4 underline-offset-4">몇 년도</span> 스택일까
        </h1>
        <p className="mt-3 text-muted-foreground">
          이력서를 넣으면 — AI가 스택을 읽고, 기술마다{" "}
          <span className="font-medium text-foreground">시장에서 정점이던 해</span>와{" "}
          <span className="font-medium text-foreground">시장이 어디로 이동했는지</span>, 그리고 지금
          채용시장에 맞추려면 <span className="font-medium text-foreground">뭘 더하면 되는지</span>를
          데이터로 보여줘. 채점이 아니라 방향이야.
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          SO {ERA_YEARS[0]}–{ERA_YEARS[ERA_YEARS.length - 1]} · 채용공고{" "}
          <span className="text-foreground">{meta.postings.toLocaleString()}</span>건 ·{" "}
          기술 <span className="text-foreground">{meta.skills.toLocaleString()}</span>종
        </p>
      </header>

      <ResumeAnalyzer initialSkills={sharedSkills} />

      {/* 보조 화면 링크 */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/market"
          className="group rounded-lg border bg-card p-4 transition hover:border-foreground"
        >
          <p className="font-bold">시장 대시보드 →</p>
          <p className="mt-1 text-sm text-muted-foreground">
            지금 채용시장이 간택하는 기술 TOP 20 · 지역×직군별 · AI가 포착한 숨은 요구
          </p>
        </Link>
        <Link
          href="/gap"
          className="group rounded-lg border bg-card p-4 transition hover:border-foreground"
        >
          <p className="font-bold">스택 직접 입력 →</p>
          <p className="mt-1 text-sm text-muted-foreground">
            이력서 없이 기술만 골라서 시장 수요와 격차 보기
          </p>
        </Link>
      </div>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        시대축: Stack Overflow 개발자 설문 (ODbL · 2026 설문 결과 공개 시 반영) · 현재 수요:{" "}
        <a href="https://www.arbeitnow.com" className="underline" rel="noreferrer" target="_blank">Arbeitnow</a>{" · "}
        <a href="https://remoteok.com" className="underline" rel="noreferrer" target="_blank">RemoteOK</a>{" · "}
        <a href="https://remotive.com" className="underline" rel="noreferrer" target="_blank">Remotive</a>
        {" "}(글로벌) + 직접 지원하며 수집한 한국 공고 · 민간 API 승인 대기(사람인) · 원티드 AI Championship 2026
      </footer>
    </main>
  );
}
