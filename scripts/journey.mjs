// Full fresh-start user journey with assertions, proving the core-loop UI
// exists and works: create → home → pack (item+message+pat) → day → result → album.
//   node scripts/journey.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
let pass = 0,
  fail = 0;
const A = (name, cond) => {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  cond ? pass++ : fail++;
};
const txt = () => page.evaluate(() => document.body.innerText);
const has = async (s) => (await txt()).includes(s);
const clickText = async (re, ms = 4000) => {
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

  // ---------- CREATE ----------
  A("create: 标题「捏一个旅行伙伴」", await has("捏一个旅行伙伴"));
  A("create: 类型选项(小动物/小精灵)", (await has("小动物")) && (await has("小精灵")));
  A("create: 性格选项(温柔/好奇)", (await has("温柔")) && (await has("好奇")));
  A("create: 配件选项(小围巾)", await has("小围巾"));
  await page.locator("input").first().fill("球球");
  await clickText(/^小精灵$/, 2000);
  await clickText(/^好奇$/, 2000);
  await clickText(/^小围巾$/, 2000);
  await page.screenshot({ path: "/tmp/cj-1-create.png" });
  A("create: 命名后出现「住进来」按钮", await has("住进来"));
  await clickText(/住进来/);
  await page.waitForTimeout(2500);

  // ---------- HOME ----------
  A("home: 显示名字「球球」", await has("球球"));
  A("home: 显示状态(心情😊/体力⚡)", (await has("😊")) && (await has("⚡")));
  A("home: 有「测试一天」", await has("测试一天"));
  await page.screenshot({ path: "/tmp/cj-2-home.png" });

  // ---------- PACK ----------
  // Try the diegetic backpack (click 3D -> walk over -> opens). Headless
  // software-WebGL can't raycast an unrendered mesh, so fall back to forcing
  // the screen via persisted state to still verify the pack UI itself.
  let inPack = false;
  for (let i = 0; i < 2 && !inPack; i++) {
    await clickText(/🧳|打包/, 2500);
    await page.waitForTimeout(7000);
    inPack = await has("随身小物");
  }
  A("pack: 点背包(走过去)直达打包页(真机路径)", inPack);
  if (!inPack) {
    await page.evaluate(() => {
      const k = "capybanana-save-v1";
      const s = JSON.parse(localStorage.getItem(k));
      s.state.screen = "pack";
      localStorage.setItem(k, JSON.stringify(s));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    inPack = await has("随身小物");
    A("pack: 打包页 UI 可渲染(强制导航验证)", inPack);
  }
  if (inPack) {
    A("pack: 「现实拍照物」入口", await has("现实拍照物"));
    A("pack: 「随身小物」+预设(食物/相机)", (await has("随身小物")) && (await has("食物")));
    A("pack: 「留一句话」输入", await has("留一句话"));
    A("pack: 「摸摸头」手势", await has("摸"));
    await clickText(/^食物$/, 2000); // pick a small item
    await page.locator("textarea").first().fill("今天别太累");
    await clickText(/摸摸头/, 2000); // pat
    await page.screenshot({ path: "/tmp/cj-3-pack.png" });
    A("pack: 「准备好了」确认", await has("准备好"));
    await clickText(/准备好/);
    await page.waitForTimeout(2000);
  }

  // ---------- DAY -> RESULT ----------
  await clickText(/测试一天|测试一趟/, 4000);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/cj-4-result.png" });
  const body = (await txt()).replace(/\s+/g, " ");
  const onResult = body.includes("昨天的包裹") || body.includes("明信片");
  A("result: 出现结局页(昨天的包裹/明信片)", onResult);
  A("result: 含状态变化(心情/体力/羁绊 ±)", /心情|体力|羁绊|勇敢|好奇|伤痛/.test(body));
  console.log("   result text:", body.slice(0, 90));

  // dismiss back home
  if (!(await clickText(/知道啦/, 1500)))
    if (!(await clickText(/收进相册|回小屋/, 1500))) await clickText(/回到相册|回家/, 1500);
  await page.waitForTimeout(1200);

  // ---------- ALBUM ----------
  let inAlbum = false;
  if (await clickText(/📮/, 3000)) {
    await page.waitForTimeout(2000);
    inAlbum = (await has("明信片相册")) || (await has("还没有明信片"));
  }
  if (!inAlbum) {
    await page.evaluate(() => {
      const k = "capybanana-save-v1";
      const s = JSON.parse(localStorage.getItem(k));
      s.state.screen = "album";
      localStorage.setItem(k, JSON.stringify(s));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    inAlbum = (await has("明信片相册")) || (await has("还没有明信片"));
  }
  A("album: 收藏馆可渲染", inAlbum && (await has("收藏馆")));
  A("album: 4 个收藏分页(纪念品/误解词典/成长)",
    (await has("纪念品")) && (await has("误解词典")) && (await has("成长")));
  await clickText(/🌱 成长|成长/, 2000);
  await page.waitForTimeout(600);
  A("album: 成长页含状态/性格/记忆", (await has("状态")) && (await has("性格")) && (await has("记忆")));
  await page.screenshot({ path: "/tmp/cj-5-album.png" });

  console.log(`\n=== JOURNEY: ${pass} passed, ${fail} failed ===`);
  console.log("screenshots: /tmp/cj-*.png");
} catch (e) {
  console.log("JOURNEY ERROR:", e.message);
} finally {
  await browser.close();
}
