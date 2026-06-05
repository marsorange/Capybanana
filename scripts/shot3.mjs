import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 460, height: 900 }, deviceScaleFactor: 3 });
await p.goto("http://localhost:3000/dev/screen", { waitUntil: "networkidle", timeout: 60000 });
await p.waitForTimeout(4000);
// full page at DSR3, then a crop of just the bottom bar from that full shot
await p.screenshot({ path: "/tmp/full-dsr3.png" });
await b.close();
console.log("done");
