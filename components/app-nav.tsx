import Link from "next/link";

// AppShell 내비: 마크 · 이름 · 메뉴(현재 위치 = foreground+500, 나머지 muted)
const MENUS = [
  { href: "/", label: "이력서 시대 진단" },
  { href: "/market", label: "시장 대시보드" },
  { href: "/gap", label: "스택 직접 입력" },
] as const;

export function AppNav({ current }: { current: "/" | "/market" | "/gap" }) {
  return (
    <nav className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Link href="/" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="간택스택 마크" className="h-7 w-7 dark:invert" />
        <span className="font-black tracking-[-0.02em]">간택스택</span>
      </Link>
      <span className="hidden text-border sm:inline">|</span>
      {MENUS.map((m) =>
        m.href === current ? (
          <span key={m.href} className="font-medium text-foreground" aria-current="page">
            {m.label}
          </span>
        ) : (
          <Link
            key={m.href}
            href={m.href}
            className="text-muted-foreground transition hover:text-foreground"
          >
            {m.label}
          </Link>
        ),
      )}
    </nav>
  );
}
