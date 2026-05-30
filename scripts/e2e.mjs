// Headless end-to-end smoke test: drives the real game in Chromium (software
// WebGL, like Chrome device-emulation) and watches for context loss / crashes.
//   node scripts/e2e.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const shot = (p) => `/tmp/capy-${p}.png`;

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

const logs = [];
let ctxLost = 0;
let realErrors = 0;
page.on("console", (m) => {
  const t = m.text();
  if (/context lost|already lost|CONTEXT_LOST/i.test(t)) ctxLost++;
  if (m.type() === "error" && !/THREE\.Clock|favicon|Download the React/i.test(t)) {
    realErrors++;
    logs.push("ERR: " + t.slice(0, 160));
  }
});
page.on("pageerror", (e) => {
  realErrors++;
  logs.push("PAGEERR: " + e.message.slice(0, 160));
});

const click = async (re, ms = 4000) => {
  try {
    await page.getByText(re).first().click({ timeout: ms });
    return true;
  } catch {
    return false;
  }
};

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // --- create ---
  await page.locator("input").first().fill("球球").catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("1-create") });
  await click(/住进来|就让它|起个名字/);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot("2-home") });

  // --- idle stability watch (no editing): 16s on home ---
  const lostBefore = ctxLost;
  for (let i = 0; i < 8; i++) await page.waitForTimeout(2000);
  await page.screenshot({ path: shot("3-home-after16s") });
  const lostDuringIdle = ctxLost - lostBefore;

  // --- run several days, capture outcomes ---
  const seen = [];
  for (let d = 0; d < 8; d++) {
    await click(/测试一天|测试一趟/, 4000);
    await page.waitForTimeout(1800);
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    seen.push(body.replace(/\s+/g, " ").slice(0, 70));
    await page.screenshot({ path: shot(`day-${d}`) });
    // dismiss result/postcard back to home
    if (!(await click(/知道啦/, 1500)))
      if (!(await click(/收进相册|回小屋/, 1500)))
        await click(/回到相册|回小屋|回家/, 1500);
    await page.waitForTimeout(900);
  }

  console.log("=== RESULT ===");
  console.log("context-lost events total:", ctxLost, "| during 16s idle:", lostDuringIdle);
  console.log("real JS errors:", realErrors);
  logs.slice(0, 8).forEach((l) => console.log("  " + l));
  console.log("outcomes seen across days:");
  seen.forEach((s, i) => console.log(`  day${i}: ${s}`));
  console.log("screenshots: /tmp/capy-*.png");
} catch (e) {
  console.log("TEST ERROR:", e.message);
} finally {
  await browser.close();
}
