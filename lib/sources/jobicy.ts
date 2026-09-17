import { JobSource, NormalizedPosting, isDevPosting } from "./types";

// Jobicy 공개 API — 키 불필요, 원격 채용. 출처 표기 조건.

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobIndustry?: string[] | string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobDescription?: string; // HTML
  pubDate?: string;
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function arr(v?: string[] | string): string[] {
  return Array.isArray(v) ? v : v ? [v] : [];
}

export const jobicySource: JobSource = {
  name: "jobicy",
  async fetchRecent({ limit = 100 } = {}) {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=${Math.min(limit, 100)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`[jobicy] HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { jobs?: JobicyJob[] };
    const out: NormalizedPosting[] = [];
    for (const j of json.jobs ?? []) {
      const tags = [...arr(j.jobIndustry), ...arr(j.jobType)];
      if (!isDevPosting(j.jobTitle, tags)) continue;
      out.push({
        source: "jobicy",
        region: "global",
        sourceId: String(j.id),
        title: j.jobTitle,
        company: j.companyName,
        url: j.url,
        location: j.jobGeo || "Remote",
        postedAt: j.pubDate ? new Date(j.pubDate) : undefined,
        rawText: `${j.jobTitle}\n${tags.join(", ")}\n${j.jobLevel ?? ""}\n${stripHtml(j.jobDescription ?? "")}`,
      });
      if (out.length >= limit) break;
    }
    return out;
  },
};
