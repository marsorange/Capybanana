import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const items = [
  ["home","首页 / 小屋"],["pack","今日包裹"],["album","明信片手账"],["postcard","读明信片"],["profile","成长 / 手账"],
  ["connect","接入 Agent"],["result","今日结果"],["traveling","出门中"],["login","登录"],["intro","引导"],
];
const cells = items.map(([s,label]) => {
  const b64 = readFileSync(`/tmp/s-${s}.png`).toString("base64");
  return `<figure><img src="data:image/png;base64,${b64}"/><figcaption>${label}</figcaption></figure>`;
}).join("");
const html = `<!doctype html><meta charset=utf8><body style="margin:0;background:#e9ddc7;font-family:PingFang SC,system-ui;padding:26px">
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px 18px;max-width:1180px;margin:auto">${cells}</div>
<style>figure{margin:0;text-align:center}img{width:100%;border-radius:18px;box-shadow:0 8px 20px -8px rgba(60,40,20,.5);display:block}figcaption{margin-top:8px;font-size:15px;color:#5a4634;font-weight:600}</style>
</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
await p.setContent(html, { waitUntil: "networkidle" });
await p.waitForTimeout(400);
const el = await p.$("div");
await el.screenshot({ path: "/tmp/capy-contact.png" });
await b.close();
console.log("montage saved");
