import { JobSource, NormalizedPosting } from "./types";

// 재정경제부_공공기관 채용정보 조회서비스 (공공데이터포털 15125273 · 자동승인 · 일 1,000건)
// 한국 공공기관(공사·공단) 채용공시. NCS 정보통신(R600020)만 수집해 개발직 노이즈 제거.
// 코드정의서: docs/MOEF_NKOD_DB_05_CODE_DOC_v1.2.pdf

const BASE = "https://apis.data.go.kr/1051000/recruitment";
const NCS_IT = "R600020"; // 정보통신

interface MoefItem {
  recrutPblntSn: number; // 공고 일련번호
  instNm: string; // 기관명
  recrutPbancTtl: string; // 공고 제목
  ncsCdLst?: string;
  ncsCdNmLst?: string; // 직무분야명 (예: "정보통신")
  hireTypeNmLst?: string; // 고용형태명
  recrutSeNm?: string; // 신입/경력
  workRgnNmLst?: string; // 근무지명
  acbgCondNmLst?: string; // 학력
  aplyQlfcCn?: string; // 지원자격 내용 (본문격)
  prefCn?: string; // 우대조건
  prefCondCn?: string;
  scrnprcdrMthdExpln?: string; // 전형절차 설명
  pbancBgngYmd?: string; // YYYYMMDD
  pbancEndYmd?: string;
  srcUrl?: string; // 원 공고 URL
}

function ymd(s?: string): Date | undefined {
  if (!s || s.length !== 8) return undefined;
  return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00+09:00`);
}

export const moefSource: JobSource = {
  name: "moef",
  async fetchRecent({ limit = 100 } = {}) {
    const key = process.env.MOEF_API_KEY;
    if (!key) {
      console.warn("[moef] MOEF_API_KEY 없음 → 스킵");
      return [];
    }
    const out: NormalizedPosting[] = [];
    let page = 1;
    while (out.length < limit && page <= 10) {
      const qs = new URLSearchParams({
        serviceKey: key,
        resultType: "json",
        numOfRows: "100",
        pageNo: String(page),
        ncsCdLst: NCS_IT, // 정보통신만
      });
      const res = await fetch(`${BASE}/list?${qs}`, { headers: { accept: "application/json" } });
      if (!res.ok) {
        console.error(`[moef] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        break;
      }
      const json = await res.json();
      // 게이트웨이 에러는 200으로도 옴 (OpenAPI_ServiceResponse 래퍼)
      if (json?.OpenAPI_ServiceResponse?.cmmMsgHeader) {
        console.error("[moef] 게이트웨이 에러:", JSON.stringify(json.OpenAPI_ServiceResponse.cmmMsgHeader));
        break;
      }
      const items: MoefItem[] = json?.result ?? json?.response?.body?.items ?? [];
      if (!Array.isArray(items) || items.length === 0) break;
      for (const it of items) {
        const parts = [
          it.recrutPbancTtl,
          it.ncsCdNmLst && `직무분야: ${it.ncsCdNmLst}`,
          it.recrutSeNm && `채용구분: ${it.recrutSeNm}`,
          it.hireTypeNmLst && `고용형태: ${it.hireTypeNmLst}`,
          it.acbgCondNmLst && `학력: ${it.acbgCondNmLst}`,
          it.aplyQlfcCn && `지원자격: ${it.aplyQlfcCn}`,
          (it.prefCn || it.prefCondCn) && `우대: ${it.prefCn || it.prefCondCn}`,
          it.scrnprcdrMthdExpln && `전형: ${it.scrnprcdrMthdExpln}`,
        ].filter(Boolean);
        out.push({
          source: "moef",
          region: "kr",
          sourceId: String(it.recrutPblntSn),
          title: it.recrutPbancTtl,
          company: it.instNm,
          url: it.srcUrl || undefined,
          location: it.workRgnNmLst || undefined,
          postedAt: ymd(it.pbancBgngYmd),
          rawText: parts.join("\n"),
        });
        if (out.length >= limit) break;
      }
      page++;
    }
    return out;
  },
};
