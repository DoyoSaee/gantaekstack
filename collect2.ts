import "dotenv/config";
import { runCollection } from "@/lib/pipeline";
import { remoteokSource } from "@/lib/sources/remoteok";
import { remotiveSource } from "@/lib/sources/remotive";
import { moefSource } from "@/lib/sources/moef";
(async () => {
  console.log(JSON.stringify(await runCollection(remoteokSource, 100, 1300)));
  console.log(JSON.stringify(await runCollection(remotiveSource, 100, 1300)));
  console.log(JSON.stringify(await runCollection(moefSource, 200, 1300)));
  console.log("DONE");
})();
