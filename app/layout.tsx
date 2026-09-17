import type { Metadata } from "next";
import { Gothic_A1, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// 디자인 시스템(docs/logo-design): Gothic A1(400/500/700/900) + JetBrains Mono
const gothicA1 = Gothic_A1({
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "간택스택 — 내 이력서, 몇 년도 스택일까",
  description:
    "이력서를 넣으면 AI가 스택을 읽고, 기술별 시대 위치와 시장이 이동한 방향, 지금 채용시장에 맞추려면 뭘 더하면 되는지 데이터로 보여줍니다. 채점이 아니라 방향.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${gothicA1.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
