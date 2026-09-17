import { JobSource, NormalizedPosting } from "./types";

// Remotive 공개 API — 키 불필요, software-dev 카테고리만. 출처 표기 조건.

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  url: string;
  candidate_required_location?: string;
  publication_date?: string;
  tags?: string[];
  description?: string; // HTML
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const remotiveSource: JobSource = {
  name: "remotive",
  async fetchRecent({ limit = 100 } = {}) {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?category=software-dev&limit=${Math.min(limit, 200)}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) {
      console.error(`[remotive] HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { jobs?: RemotiveJob[] };
    return (json.jobs ?? []).slice(0, limit).map((j): NormalizedPosting => ({
      source: "remotive",
      region: "global",
      sourceId: String(j.id),
      title: j.title,
      company: j.company_name,
      url: j.url,
      location: j.candidate_required_location || "Remote",
      postedAt: j.publication_date ? new Date(j.publication_date) : undefined,
      rawText: `${j.title}\n${(j.tags ?? []).join(", ")}\n${stripHtml(j.description ?? "")}`,
    }));
  },
};
