import { chromium } from "playwright";
const screens = ["home","pack","album","postcard","profile","connect","result","traveling","login","intro"];
const b = await chromium.launch();
for (const s of screens) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`http://localhost:3000/dev/screen?s=${s}`, { waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `/tmp/s-${s}.png` });
  if (errs.length) console.log(s, "PAGEERR:", errs[0]);
  await p.close();
}
await b.close();
console.log("captured", screens.join(", "));
