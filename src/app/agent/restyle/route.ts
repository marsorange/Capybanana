// A tiny test entry: open `<base>/agent/restyle?bind=<token>` in a browser and
// each load re-rolls the bound pet into a fresh capybara-cute look (type / color
// / accessory). Refresh to cycle until you like one, then open the app — it
// pulls the new look within a few seconds. Side-effecting GET on purpose (it's a
// dev/testing convenience, gated by the secret bind token).
import { ACCESSORIES, COMPANION_TYPES, PRIMARY_COLORS } from "@/game/labels";
import { baseUrl } from "@/server/api";
import { readBind } from "@/server/bind";
import { restyleCompanion, tickSave } from "@/server/engine";
import { resolveBind, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE = new Map(COMPANION_TYPES.map((t) => [t.type, t] as const));
const ACC = new Map(ACCESSORIES.map((a) => [a.value, a] as const));

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function page(title: string, bodyHtml: string): Response {
  return new Response(
    `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    background:#f7f1e3;color:#3a2e2a;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
  .card{max-width:360px;width:86%;background:#fffdf6;border:2px solid rgba(58,46,42,.08);
    border-radius:24px;padding:28px 24px;text-align:center;box-shadow:0 12px 36px rgba(58,46,42,.1)}
  .emoji{font-size:64px;line-height:1;margin:4px 0 10px}
  h1{font-size:20px;margin:0 0 6px}
  .look{font-size:17px;margin:10px 0 4px}
  .swatch{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:middle;
    border:1px solid rgba(58,46,42,.15);margin-right:4px}
  p{color:#7a6b63;font-size:13px;line-height:1.6}
  .btns{margin-top:20px;display:flex;flex-direction:column;gap:10px}
  a.btn{display:block;padding:12px 16px;border-radius:16px;text-decoration:none;font-weight:600}
  a.primary{background:#D95F59;color:#fff}
  a.ghost{background:#f1e2c8;color:#3a2e2a}
</style></head><body><div class="card">${bodyHtml}</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export async function GET(req: Request): Promise<Response> {
  const base = baseUrl(req);
  const token = readBind(req);
  if (!token)
    return page(
      "换个造型",
      `<div class="emoji">🔗</div><h1>缺少绑定令牌</h1>
       <p>请用你自己的链接打开：<br><code>${base}/agent/restyle?bind=&lt;你的令牌&gt;</code><br>
       令牌可在 App 的「Agent」页里拿到。</p>`,
    );

  const found = await resolveBind(token);
  if (!found)
    return page("换个造型", `<div class="emoji">⚠️</div><h1>令牌无效或已失效</h1>`);

  let save = tickSave(found.save, Date.now());
  if (!save.companion)
    return page(
      "换个造型",
      `<div class="emoji">🥚</div><h1>这个账号还没有宠物</h1>
       <p>先登录 App 领养一只，再回来换造型。</p>
       <div class="btns"><a class="primary btn" href="${base}/">打开 App →</a></div>`,
    );

  save = restyleCompanion(save, { random: true }, Date.now());
  await savePet(found.user.petId, save);

  const c = save.companion!;
  const t = TYPE.get(c.type);
  const acc = ACC.get(c.accessory);
  const colorName =
    PRIMARY_COLORS.find((p) => p.hex.toLowerCase() === c.primaryColor.toLowerCase())
      ?.name ?? c.primaryColor;
  const accText = c.accessory === "none" ? "没戴配饰" : `${acc?.emoji ?? ""} ${acc?.label ?? ""}`;
  const rerollUrl = `${base}/agent/restyle?bind=${encodeURIComponent(token)}`;

  return page(
    "换个造型",
    `<div class="emoji">${t?.emoji ?? "🦫"}</div>
     <h1>${esc(c.name)} 换了个新造型！</h1>
     <div class="look">${t?.emoji ?? ""} ${t?.label ?? c.type}　·
       <span class="swatch" style="background:${esc(c.primaryColor)}"></span>${esc(colorName)}　·　${accText}</div>
     <p>不满意就刷新本页再换一个；满意了回到 App，几秒内就会变成这个样子。</p>
     <div class="btns">
       <a class="primary btn" href="${rerollUrl}">🎲 再换一个</a>
       <a class="ghost btn" href="${base}/">← 回到小屋看效果</a>
     </div>`,
  );
}
