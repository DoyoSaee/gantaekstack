import { NextResponse } from "next/server";
import { runCollection } from "@/lib/pipeline";
import { arbeitnowSource } from "@/lib/sources/arbeitnow";
import { remoteokSource } from "@/lib/sources/remoteok";
import { remotiveSource } from "@/lib/sources/remotive";
import { moefSource } from "@/lib/sources/moef";
// import { saraminSource } from "@/lib/sources/saramin"; // 승인 시 활성화

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 신규 공고 추출(Gemini) 여유분

async function run() {
  const results = [];
  // 글로벌(라이브) — 기존 건은 멱등 skip이라 신규분만 추출됨
  results.push(await runCollection(arbeitnowSource, 150, 800));
  results.push(await runCollection(remoteokSource, 60, 800));
  results.push(await runCollection(remotiveSource, 60, 800));
  // 한국 공공기관(공공데이터포털) — 키 활성화 후 동작, 없으면 자동 스킵
  results.push(await runCollection(moefSource, 60, 800));
  // 한국 민간: 사람인 승인 시 아래 주석 해제
  // results.push(await runCollection(saraminSource, 100));
  return results;
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 로컬/미설정 시 개방
  // Vercel Cron은 CRON_SECRET을 Bearer로 자동 첨부
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret
  );
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, results: await run() });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, results: await run() });
}
