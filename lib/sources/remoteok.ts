import { JobSource, NormalizedPosting, isDevPosting } from "./types";

// RemoteOK 공개 API — 키 불필요. 이용조건: 출처 링크 표기(푸터에 명시).
// 원격 채용 전문이라 dev 비중 높음. 응답 첫 원소는 법적 고지(잡 아님).

interface RemoteOkJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string; // HTML
  location?: string;
  date?: string; // ISO
  url?: string;
  legal?: string; // 첫 원소(고지)
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const remoteokSource: JobSource = {
  name: "remoteok",
  async fetchRecent({ limit = 100 } = {}) {
    const res = await fetch("https://remoteok.com/api", {
      headers: { accept: "application/json", "user-agent": "gantaekstack (job-market analysis)" },
    });
    if (!res.ok) {
      console.error(`[remoteok] HTTP ${res.status}`);
      return [];
    }
    const arr = (await res.json()) as RemoteOkJob[];
    const out: NormalizedPosting[] = [];
    for (const j of arr) {
      if (!j.position || !j.id) continue; // 첫 원소(legal) 등 스킵
      if (!isDevPosting(j.position, j.tags ?? [])) continue;
      out.push({
        source: "remoteok",
        region: "global",
        sourceId: String(j.id),
        title: j.position,
        company: j.company,
        url: j.url,
        location: j.location || "Remote",
        postedAt: j.date ? new Date(j.date) : undefined,
        rawText: `${j.position}\n${(j.tags ?? []).join(", ")}\n${stripHtml(j.description ?? "")}`,
      });
      if (out.length >= limit) break;
    }
    return out;
  },
};
