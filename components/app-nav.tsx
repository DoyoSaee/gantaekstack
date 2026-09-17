"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// AppShell 내비 — 레이아웃 소속. 페이지 본문 폭과 무관하게 항상 같은 위치·폭(5xl 고정).
const MENUS = [
  { href: "/", label: "이력서 시대 진단" },
  { href: "/match", label: "공고 매칭" },
  { href: "/market", label: "시장 대시보드" },
  { href: "/gap", label: "스택 직접 입력" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="w-full">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-8 text-sm">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="간택스택 마크" className="h-7 w-7 dark:invert" />
          <span className="font-black tracking-[-0.02em]">간택스택</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="페이지">
          {MENUS.map((m) =>
            m.href === pathname ? (
              <span
                key={m.href}
                className="rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-medium text-background"
                aria-current="page"
              >
                {m.label}
              </span>
            ) : (
              <Link
                key={m.href}
                href={m.href}
                className="rounded-full border border-transparent px-3.5 py-1.5 text-[13px] text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                {m.label}
              </Link>
            ),
          )}
        </div>
        <a
          href="https://github.com/DoyoSaee/gantaekstack"
          target="_blank"
          rel="noreferrer"
          className="ml-auto font-mono text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
        >
          GitHub
        </a>
      </nav>
    </div>
  );
}
