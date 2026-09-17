import "dotenv/config";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = "private/지원자들";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const KEY = process.env.GEMINI_API_KEY!;

const INSTR = `너는 이력서 익명화기다. 이력서 원문을 **최대한 그대로 보존한 익명 전문**으로 만들어 JSON으로 출력해라.
- role: "프론트엔드"|"백엔드"|"풀스택"|"모바일"|"데이터"|"데브옵스"|"기획"|"기타"
- years: 경력 연차(숫자, 신입=0)
- sample: 익명 전문. 규칙:
  * 문장·불릿·섹션 구조를 원문 그대로 유지 (요약·압축 금지)
  * 제거: 이름·이메일·전화·주소·생년·사진설명·URL(깃헙/블로그/포트폴리오 링크 전부)
  * 치환: 학교명→"4년제 대학" 등 일반화, 회사·서비스 실명→업종 일반화("커머스 스타트업", "제조 대기업", "여행 플랫폼" 등)
  * 기술스택·프로젝트 설명·성과 수치·기간은 원문 그대로 보존
  * 이력서 내용이 아닌 머리말/꼬리말(페이지번호 등) 제거`;

async function gem(text: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTR }] },
        contents: [{ role: "user", parts: [{ text: text.slice(0, 18000) }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              role: { type: "STRING" },
              years: { type: "INTEGER" },
              sample: { type: "STRING" },
            },
            required: ["role", "years", "sample"],
          },
          maxOutputTokens: 8000,
        },
      }),
    },
  );
  if (!res.ok) { console.error("gemini", res.status, (await res.text()).slice(0,120)); return null; }
  const d = await res.json();
  try { return JSON.parse(d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""); } catch { return null; }
}

function stripHtml(h: string) {
  return h.replace(/<script[^>]*>[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();
}

(async () => {
  const { PDFParse } = await import("pdf-parse");
  const out: any[] = [];
  for (const f of readdirSync(DIR)) {
    if (f.endsWith(".zip")) continue;
    const p = join(DIR, f);
    let text = "";
    try {
      if (f.toLowerCase().endsWith(".pdf")) {
        const parser = new PDFParse({ data: new Uint8Array(readFileSync(p)) });
        text = (await parser.getText()).text ?? "";
      } else if (f.endsWith(".html")) {
        text = stripHtml(readFileSync(p, "utf-8"));
      } else continue;
    } catch { console.error("파싱실패:", f); continue; }
    if (text.trim().length < 150) { console.error("스캔본 스킵:", f); continue; }
    const r = await gem(text.trim());
    if (!r?.sample) { console.error("추출실패:", f); continue; }
    out.push({ file: f, ...r });
    console.log(`✓ ${f} → ${r.years}년차 ${r.role} (${r.sample.length}자)`);
    await new Promise((s) => setTimeout(s, 1200));
  }
  writeFileSync("private/samples_full.json", JSON.stringify(out, null, 2));
  console.log("총", out.length, "건");
})();
