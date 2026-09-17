import { JobSource, NormalizedPosting } from "./types";

// Hacker News "Ask HN: Who is hiring?" 월간 스레드 — 공개 Algolia API(키 불필요).
// 톱레벨 댓글 하나 = 채용공고 하나. "Company | Role | Location | ..." 관례.
// 본문이 길고 기술스택이 구체적이라 Gemini 추출과 궁합이 가장 좋음.

interface HnItem {
  id: number;
  created_at?: string;
  text?: string | null;
  children?: HnItem[];
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export const hnSource: JobSource = {
  name: "hn",
  async fetchRecent({ limit = 300 } = {}) {
    const s = await fetch(
      "https://hn.algolia.com/api/v1/search_by_date?query=%22who%20is%20hiring%22&tags=story,author_whoishiring&hitsPerPage=3",
      { headers: { accept: "application/json" } },
    );
    if (!s.ok) return [];
    const stories = ((await s.json()).hits ?? []) as { objectID: string; title: string }[];
    const out: NormalizedPosting[] = [];
    for (const st of stories) {
      const res = await fetch(`https://hn.algolia.com/api/v1/items/${st.objectID}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) continue;
      const item = (await res.json()) as HnItem;
      for (const c of item.children ?? []) {
        if (!c.text) continue;
        const text = stripHtml(c.text);
        if (text.length < 200) continue; // 한 줄짜리·잡담 스킵
        const segs = text.split(/[|\n]/).map((x) => x.trim()).filter(Boolean);
        const company = (segs[0] ?? "").slice(0, 60);
        const title = segs.slice(0, 3).join(" · ").slice(0, 140) || "HN hiring post";
        out.push({
          source: "hn",
          region: "global",
          sourceId: String(c.id),
          title,
          company,
          url: `https://news.ycombinator.com/item?id=${c.id}`,
          postedAt: c.created_at ? new Date(c.created_at) : undefined,
          rawText: text.slice(0, 6000),
        });
        if (out.length >= limit) break;
      }
      if (out.length >= limit) break;
    }
    return out;
  },
};
