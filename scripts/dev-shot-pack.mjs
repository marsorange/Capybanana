// Dev-only: screenshot /dev/pack at phone sizes with a fake camera stream.
// Usage: node scripts/dev-shot-pack.mjs
import { chromium } from "playwright";

const SIZES = [
  [390, 844],
  [375, 667],
  [320, 568],
];

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});

for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ["camera"],
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/dev/pack", { waitUntil: "networkidle" });
  await page.waitForTimeout(1800); // camera warm-up
  await page.screenshot({ path: `/tmp/pack-${w}x${h}.png` });
  console.log(`shot /tmp/pack-${w}x${h}.png`);
  await ctx.close();
}
await browser.close();
