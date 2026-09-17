import { JobSource, NormalizedPosting, isDevPosting } from "./types";

// Arbeitnow 공개 API — 인증 없이 글로벌/원격 채용공고. 즉시·합법·크롤 아님.
// 일반 잡보드라 개발 직군만 필터링해서 담는다(비개발직 노이즈 제거).
interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string; // HTML
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // unix seconds
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const arbeitnowSource: JobSource = {
  name: "arbeitnow",
  async fetchRecent({ limit = 100 } = {}) {
    const out: NormalizedPosting[] = [];
    let page = 1;
    // 페이지 상한은 안전핀(무한루프 방지) — 빈 페이지가 나오면 그 전에 멈춘다.
    while (out.length < limit && page <= 80) {
      const res = await fetch(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) break;
      const json = (await res.json()) as { data?: ArbeitnowJob[] };
      const jobs = json.data ?? [];
      if (jobs.length === 0) break;
      for (const j of jobs) {
        if (!isDevPosting(j.title, j.tags ?? [])) continue; // 개발 직군만
        out.push({
          source: "arbeitnow",
          region: "global",
          sourceId: j.slug,
          title: j.title,
          company: j.company_name,
          url: j.url,
          location: j.location,
          postedAt: j.created_at ? new Date(j.created_at * 1000) : undefined,
          rawText: `${j.title}\n${(j.tags ?? []).join(", ")}\n${stripHtml(j.description)}`,
        });
      }
      page++;
    }
    return out.slice(0, limit);
  },
};
