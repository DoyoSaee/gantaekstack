import { JobSource, NormalizedPosting } from "./types";

// The Muse 공개 API — 키 불필요(공개 레벨), Software Engineering 카테고리만. 출처 표기 조건.

interface MuseJob {
  id: number;
  name: string;
  company?: { name?: string };
  locations?: { name?: string }[];
  publication_date?: string;
  refs?: { landing_page?: string };
  contents?: string; // HTML
  levels?: { name?: string }[];
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const museSource: JobSource = {
  name: "muse",
  async fetchRecent({ limit = 200 } = {}) {
    const out: NormalizedPosting[] = [];
    for (let page = 1; page <= Math.ceil(limit / 20) && out.length < limit; page++) {
      const res = await fetch(
        `https://www.themuse.com/api/public/jobs?category=Software%20Engineering&page=${page}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) break;
      const json = (await res.json()) as { results?: MuseJob[] };
      const jobs = json.results ?? [];
      if (jobs.length === 0) break;
      for (const j of jobs) {
        out.push({
          source: "muse",
          region: "global",
          sourceId: String(j.id),
          title: j.name,
          company: j.company?.name,
          url: j.refs?.landing_page,
          location: j.locations?.[0]?.name,
          postedAt: j.publication_date ? new Date(j.publication_date) : undefined,
          rawText: `${j.name}\n${(j.levels ?? []).map((l) => l.name).join(", ")}\n${stripHtml(j.contents ?? "")}`.slice(0, 8000),
        });
        if (out.length >= limit) break;
      }
    }
    return out;
  },
};
