import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000/dev/screen";
const out = process.argv[3] || "/tmp/capy-home.png";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 800, height: 900 },
  deviceScaleFactor: 2,
});
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE.ERR:", m.text());
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000); // let 3D / WASM settle
await page.screenshot({ path: out });
await browser.close();
console.log("saved", out);
