import "dotenv/config";
import { runCollection } from "@/lib/pipeline";
import { hnSource } from "@/lib/sources/hn";
import { museSource } from "@/lib/sources/muse";
import { moefSource } from "@/lib/sources/moef";
(async () => {
  console.log("[1/3] HN Who is hiring (최근 3개월, 최대 800)…");
  console.log(JSON.stringify(await runCollection(hnSource, 800, 1100)));
  console.log("[2/3] The Muse (최대 300)…");
  console.log(JSON.stringify(await runCollection(museSource, 300, 1100)));
  console.log("[3/3] MOEF 재시도…");
  console.log(JSON.stringify(await runCollection(moefSource, 200, 1100)));
  console.log("DONE");
})();
