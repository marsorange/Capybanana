// v2 UI smoke test: screenshot every screen via the /dev/screen harness (no
// login / DB) and report real console errors. Verifies the redesign's new UI:
// 好奇心 stat bar, the album 对战 tab, and the battle result theme.
//   node scripts/v2-ui.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000/dev/screen";
const shot = (n) => `/tmp/capy-v2-${n}.png`;

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({
  viewport: { width: 460, height: 900 },
  deviceScaleFactor: 2,
});

const errors = [];
const benign = /THREE\.Clock|favicon|Download the React|WebGL|Lighthouse/i;
page.on("console", (m) => {
  if (m.type() === "error" && !benign.test(m.text()))
    errors.push("ERR: " + m.text().slice(0, 180));
});
page.on("pageerror", (e) => errors.push("PAGEERR: " + e.message.slice(0, 180)));

const grab = async (name, query, after) => {
  errors.length = 0;
  await page.goto(`${BASE}${query}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500); // let 3D / WASM settle
  if (after) await after();
  await page.screenshot({ path: shot(name) });
  console.log(
    `${name.padEnd(16)} ${errors.length ? "⚠ " + errors.length + " err" : "ok"}`,
  );
  errors.forEach((e) => console.log("   " + e));
};

try {
  await grab("home", "?s=home");
  await grab("profile", "?s=profile"); // expect 好奇心 bar
  await grab("pack", "?s=pack");
  await grab("album-cards", "?s=album");
  await grab("album-battles", "?s=album", async () => {
    await page.getByText("对战", { exact: true }).first().click({ timeout: 4000 });
    await page.waitForTimeout(600);
  });
  await grab("postcard", "?s=postcard");
  await grab("traveling", "?s=traveling");
  await grab("result-yard", "?s=result");
  await grab("result-battle", "?r=battle"); // battle theme + curiosity chip
  await grab("connect", "?s=connect");
  await grab("intro", "?s=intro");
  console.log("\nscreenshots: /tmp/capy-v2-*.png");
} catch (e) {
  console.log("TEST ERROR:", e.message);
} finally {
  await browser.close();
}
