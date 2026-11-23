// Compilaciones aisladas: nunca dejan claves/fixtures dentro de dist de entrega.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { finalizeBuild } from "../../scripts/finalize-build.mjs";
const env = {
  ...process.env,
  VITE_SUPABASE_URL: "http://127.0.0.1:54329",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture_only",
};
async function run(args) {
  await new Promise((yes, no) => {
    const child = spawn(
      process.execPath,
      [resolve("node_modules/vite/bin/vite.js"), ...args],
      { env, stdio: "inherit", windowsHide: true },
    );
    child.on("exit", (code) =>
      code === 0 ? yes() : no(new Error("QA build failed")),
    );
    child.on("error", no);
  });
}
await run(["build", "--outDir", ".qa/dist"]);
await run(["build", "--ssr", "src/entry-server.tsx", "--outDir", ".qa/server"]);
await finalizeBuild(".qa/dist", ".qa/server");
process.env.SSR_ENTRY = ".qa/server/entry-server.js";
process.env.DIST_DIRECTORY = ".qa/dist";
process.env.SSR_TEMPLATE = ".qa/server/template.html";
await import("../../scripts/serve.mjs");
