// One-off: pre-generate 3 real MiniMax postcard images for the mock/demo cards
// and write them as jpgs into public/mock-postcards/. Re-run only when you want
// to refresh the art. Run:
//   node --env-file=.env.local scripts/gen-mock-postcards.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const key = process.env.MINIMAX_API_KEY;
const url = process.env.MINIMAX_IMAGE_URL ?? "https://api.minimaxi.com/v1/image_generation";
const model = process.env.MINIMAX_IMAGE_MODEL ?? "image-01";
if (!key) {
  console.error("MINIMAX_API_KEY 未配置（用 --env-file=.env.local）");
  process.exit(1);
}

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/mock-postcards");

// Mirrors buildPostcardImagePrompt: a representative companion (毛茸茸/奶油色)
// standing in front of an ICONIC, clearly-recognizable landmark which is the
// main backdrop; theme scenery is only soft atmosphere. Clean 3:4, no text.
const COMPANION = "圆滚滚、可爱的低多边形（low-poly）3D 毛茸茸的卡皮巴拉，奶油色的身体，";
function prompt(landmark, bg, scene) {
  return [
    "一张治愈系旅行明信片插画。",
    `画面主角是一只${COMPANION}`,
    `站在标志性地标「${landmark}」前面。`,
    `画面以清晰可辨、一眼能认出的「${landmark}」为背景主体，`,
    `周围是${bg}的氛围，${scene}。`,
    "柔和的卡通渲染，暖色调，轻微景深，竖构图 3:4，画面干净、不要任何文字。",
  ].join("");
}

const CARDS = [
  {
    theme: "town",
    landmark: "巴黎埃菲尔铁塔",
    prompt: prompt("巴黎埃菲尔铁塔", "巴黎街景与蓝天白云", "铁塔高耸入云，午后的阳光很暖"),
  },
  {
    theme: "seaside",
    landmark: "圣托里尼蓝顶教堂",
    prompt: prompt("圣托里尼蓝顶教堂", "蓝顶白墙与爱琴海", "海面亮得睁不开眼，风里有点咸味"),
  },
  {
    theme: "mountain",
    landmark: "富士山",
    prompt: prompt("富士山", "晴朗天空与山脚的草地", "雪顶的富士山清晰又安静"),
  },
];

async function gen(card) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        prompt: card.prompt,
        aspect_ratio: "3:4",
        response_format: "base64",
        n: 1,
        prompt_optimizer: true,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    const code = data?.base_resp?.status_code;
    if (!res.ok || (typeof code === "number" && code !== 0)) {
      throw new Error(data?.base_resp?.status_msg || `HTTP ${res.status}`);
    }
    const b64 = data?.data?.image_base64?.[0] ?? data?.data?.base64?.[0];
    if (!b64) throw new Error("未返回 base64 图片");
    const file = resolve(OUT_DIR, `${card.theme}.jpg`);
    await writeFile(file, Buffer.from(b64, "base64"));
    console.log(`✅ ${card.theme}.jpg  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${(b64.length / 1024).toFixed(0)}KB b64)`);
  } finally {
    clearTimeout(timeout);
  }
}

await mkdir(OUT_DIR, { recursive: true });
for (const card of CARDS) {
  try {
    await gen(card);
  } catch (err) {
    console.error(`❌ ${card.theme}:`, err?.message ?? err);
  }
}
console.log("done →", OUT_DIR);
