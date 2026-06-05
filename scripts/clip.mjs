import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 3 });
await p.goto("http://localhost:3000/dev/screen", { waitUntil: "networkidle", timeout: 60000 });
await p.waitForTimeout(4000);
await p.screenshot({ path: "/tmp/clip-nav.png", clip: { x: 250, y: 770, width: 300, height: 95 } });
await p.screenshot({ path: "/tmp/clip-cap.png", clip: { x: 168, y: 42, width: 250, height: 86 } });
await b.close();
console.log("clipped");
