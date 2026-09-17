import { NextResponse } from "next/server";
import { topSkills, coOccurring, counts } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? undefined; // "kr" | "global" | undefined(전체)
  const category = searchParams.get("category") ?? undefined; // frontend|backend|...
  const withSkill = searchParams.get("with");

  const [top, meta] = await Promise.all([
    topSkills(region, category, 20),
    counts(region),
  ]);
  const co = withSkill ? await coOccurring(withSkill, region, 10) : [];

  return NextResponse.json({ region: region ?? "all", meta, topSkills: top, coOccurring: co });
}
