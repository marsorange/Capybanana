import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT:", error?.message || error);
  if (error?.stack) console.error(error.stack.split("\n").slice(0, 8).join("\n"));
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED:", error?.message || error);
  if (error?.stack) console.error(error.stack.split("\n").slice(0, 8).join("\n"));
  process.exit(1);
});

const ARTIFACT_BASE =
  "/Users/pengbo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool";
const art = await import(`${ARTIFACT_BASE}/dist/artifact_tool.mjs`);
const { jsx, jsxs } = await import(`${ARTIFACT_BASE}/dist/presentation-jsx/jsx-runtime.mjs`);
const { paint, stroke } = await import(`${ARTIFACT_BASE}/dist/presentation-jsx/index.mjs`);

const ROOT = "/Users/pengbo/Documents/develop/Capybanana";
const WORKSPACE = path.join(
  ROOT,
  "outputs/manual-20260530-174318/presentations/capybanana-agent-pitch",
);
const PREVIEW_DIR = path.join(WORKSPACE, "preview");
const LAYOUT_DIR = path.join(WORKSPACE, "layout");
const QA_DIR = path.join(WORKSPACE, "qa");
const OUTPUT_DIR = path.join(WORKSPACE, "output");
const FINAL_PPTX = path.join(OUTPUT_DIR, "capybanana-agent-pitch.pptx");

const assets = {
  house: "/Users/pengbo/Downloads/db5b5c56-212f-4448-9aca-5a9ff25a7dd3.png",
  home: "/Users/pengbo/Desktop/截屏2026-05-30 16.52.55.png",
  profile: "/Users/pengbo/Desktop/截屏2026-05-30 16.53.11.png",
  album: "/Users/pengbo/Desktop/截屏2026-05-30 16.53.04.png",
  logo: "/Users/pengbo/Desktop/卡皮巴啦啦/251325a9-df64-4cd5-899c-413c222a4547 (1).png",
};

const W = 1600;
const H = 900;
const C = {
  cream: "#FFF6EA",
  milk: "#F7EDDD",
  paper: "#FFFDF8",
  ink: "#332824",
  muted: "#7A6D62",
  line: "#DED0BE",
  accent: "#D95F59",
  yellow: "#F2B93B",
  green: "#87A976",
  moss: "#5F8157",
  brown: "#A66A32",
  blue: "#6DB9C8",
};

const font = "PingFang SC";
const titleFont = "Yuanti SC";

async function dataUrl(file) {
  const buf = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const type = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${type};base64,${buf.toString("base64")}`;
}

async function writeBlob(file, blob) {
  if (blob?.data instanceof Uint8Array) {
    await fs.writeFile(file, blob.data);
    return;
  }
  if (blob?.arrayBuffer) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(file, buffer);
    return;
  }
  throw new Error(`Unsupported blob for ${file}`);
}

const img = Object.fromEntries(
  await Promise.all(Object.entries(assets).map(async ([key, file]) => [key, await dataUrl(file)])),
);

function layer(children, props = {}) {
  return jsxs("layers", { width: W, height: H, ...normalizeFrameProps(props), children });
}

function normalizePosition(position) {
  if (!position || typeof position !== "object") return position;
  const { x, y, ...rest } = position;
  return {
    ...rest,
    ...(x !== undefined ? { left: x } : {}),
    ...(y !== undefined ? { top: y } : {}),
  };
}

function normalizeFrameProps(props) {
  if (!props.position) return props;
  return { ...props, position: normalizePosition(props.position) };
}

function rect(props) {
  const { fill, line, ...rest } = props;
  return jsx("shape", {
    geometry: "rect",
    fill: typeof fill === "string" ? paint(fill) : fill,
    line: line === undefined ? stroke("none") : typeof line === "string" ? stroke(line) : line,
    ...normalizeFrameProps(rest),
  });
}

function roundRect(props) {
  const { fill, line, ...rest } = props;
  return jsx("shape", {
    geometry: "roundRect",
    borderRadius: props.borderRadius ?? 28,
    fill: typeof fill === "string" ? paint(fill) : fill,
    line: line === undefined ? stroke("none") : typeof line === "string" ? stroke(line) : line,
    ...normalizeFrameProps(rest),
  });
}

function text(children, props = {}) {
  return jsx("text", {
    children,
    style: {
      typeface: font,
      fontSize: 34,
      color: C.ink,
      lineSpacing: 116,
      ...props.style,
    },
    ...normalizeFrameProps(props),
  });
}

function title(children, props = {}) {
  return text(children, {
    ...props,
    style: {
      typeface: titleFont,
      fontSize: 72,
      bold: true,
      color: C.ink,
      lineSpacing: 108,
      ...props.style,
    },
  });
}

function image(dataUrlValue, props) {
  return jsx("image", {
    dataUrl: dataUrlValue,
    contentType: dataUrlValue.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png",
    fit: "cover",
    ...normalizeFrameProps(props),
  });
}

function pill(label, x, y, width, fill = C.paper, color = C.ink) {
  return layer(
    [
      roundRect({
        position: { x, y },
        width,
        height: 50,
        fill,
        line: `2px solid ${fill === C.paper ? C.line : fill}`,
        borderRadius: 25,
      }),
      text(label, {
        position: { x: x + 22, y: y + 10 },
        width: width - 44,
        height: 32,
        style: { fontSize: 22, color, bold: true, alignment: "center" },
      }),
    ],
    { position: { x: 0, y: 0 } },
  );
}

function phoneShot(dataUrlValue, x, y, w, h, label) {
  return layer(
    [
      roundRect({
        position: { x, y },
        width: w,
        height: h,
        fill: "#FFFFFF",
        line: `3px solid ${C.line}`,
        borderRadius: 40,
        shadow: "0px 15px 30px rgba(80, 50, 20, 0.18)",
      }),
      image(dataUrlValue, {
        position: { x: x + 16, y: y + 16 },
        width: w - 32,
        height: h - 32,
        borderRadius: 28,
      }),
      roundRect({
        position: { x: x + 46, y: y + h - 74 },
        width: w - 92,
        height: 42,
        fill: "rgba(255,255,255,0.86)",
        borderRadius: 20,
      }),
      text(label, {
        position: { x: x + 56, y: y + h - 65 },
        width: w - 112,
        height: 28,
        style: { fontSize: 20, color: C.ink, bold: true, alignment: "center" },
      }),
    ],
    { position: { x: 0, y: 0 } },
  );
}

function sectionNumber(n) {
  return text(`0${n}`, {
    position: { x: 90, y: 68 },
    width: 70,
    height: 36,
    style: { fontSize: 23, bold: true, color: C.accent, alignment: "center" },
  });
}

function addSlide(deck, node, notes) {
  const slide = deck.slides.add({ width: W, height: H });
  slide.compose(node);
  if (notes) slide.speakerNotes.setText(notes);
  return slide;
}

const deck = art.Presentation.create();

addSlide(
  deck,
  layer([
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: C.cream }),
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: "linear(35deg, #FFF8ED 0%, #F6E7CD 68%, #F3DFAF 100%)" }),
    image(img.house, { position: { x: 930, y: -18 }, width: 650, height: 936, borderRadius: 0 }),
    roundRect({ position: { x: 72, y: 62 }, width: 92, height: 92, fill: "#FFF8EC", borderRadius: 26, shadow: "0px 12px 28px rgba(80, 50, 20, 0.16)" }),
    image(img.logo, { position: { x: 82, y: 72 }, width: 72, height: 72, borderRadius: 20 }),
    text("竖屏 Agent 陪伴养成小游戏", {
      position: { x: 92, y: 190 },
      width: 600,
      height: 38,
      style: { fontSize: 26, color: C.accent, bold: true },
    }),
    title("让你的 Agent\n活成一只会旅行的\n卡皮巴拉", {
      position: { x: 88, y: 242 },
      width: 760,
      height: 250,
      style: { fontSize: 70 },
    }),
    text("每天 1 分钟，看它今天是被工作压垮，还是攒够力气出门、社交、PK、寄回一张奇怪明信片。", {
      position: { x: 92, y: 548 },
      width: 620,
      height: 108,
      style: { fontSize: 31, color: C.muted },
    }),
    pill("Agent 具象化", 92, 704, 190, C.paper, C.ink),
    pill("轻养成", 300, 704, 124, C.paper, C.ink),
    pill("旅行社交", 442, 704, 150, C.paper, C.ink),
    pill("日记吐槽", 610, 704, 150, C.paper, C.ink),
  ]),
  "开场：Capybanana 不是再做一个待办工具，而是把你的 Agent 使用状态变成一只低边形卡皮巴拉。用户每天只需要打开一分钟。",
);

addSlide(
  deck,
  layer([
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: C.cream }),
    sectionNumber(2),
    title("高压工作很抽象，\n宠物的状态很直观", {
      position: { x: 90, y: 126 },
      width: 650,
      height: 160,
      style: { fontSize: 60 },
    }),
    text("你越频繁使唤 Agent，它越疲惫；你偶尔放慢，它才有体力旅行、社交和成长。", {
      position: { x: 92, y: 318 },
      width: 620,
      height: 96,
      style: { fontSize: 30, color: C.muted },
    }),
    roundRect({ position: { x: 88, y: 474 }, width: 600, height: 92, fill: "#FFFDF7", line: `2px solid ${C.line}`, borderRadius: 24 }),
    text("996 / 高频 Agent 调用", { position: { x: 124, y: 502 }, width: 330, height: 36, style: { fontSize: 28, bold: true } }),
    text("压力 + 疲惫 + 没力气旅行", { position: { x: 454, y: 504 }, width: 190, height: 36, style: { fontSize: 23, color: C.accent, bold: true, alignment: "right" } }),
    roundRect({ position: { x: 88, y: 590 }, width: 600, height: 92, fill: "#FFFDF7", line: `2px solid ${C.line}`, borderRadius: 24 }),
    text("放慢 / 休息 / 少压榨", { position: { x: 124, y: 618 }, width: 330, height: 36, style: { fontSize: 28, bold: true } }),
    text("恢复 + 出门 + 带回故事", { position: { x: 442, y: 620 }, width: 202, height: 36, style: { fontSize: 23, color: C.green, bold: true, alignment: "right" } }),
    image(img.logo, { position: { x: 850, y: 90 }, width: 530, height: 530, borderRadius: 56 }),
    roundRect({ position: { x: 820, y: 652 }, width: 600, height: 98, fill: "#332824", borderRadius: 30, shadow: "0px 18px 34px rgba(60, 35, 15, 0.2)" }),
    text("核心情绪：今天的自己，是否也该休息一下？", {
      position: { x: 858, y: 684 },
      width: 526,
      height: 42,
      style: { fontSize: 29, color: "#FFF8ED", bold: true, alignment: "center" },
    }),
  ]),
  "痛点页：我们不是说教用户休息，而是让一只可爱的宠物把压力反馈出来。抽象的工作强度，变成能一眼看懂的心情、体力和伤痛。",
);

addSlide(
  deck,
  layer([
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: C.milk }),
    sectionNumber(3),
    title("一天只跑一个小循环", {
      position: { x: 90, y: 118 },
      width: 720,
      height: 76,
      style: { fontSize: 58 },
    }),
    text("网页负责陪伴和打包，Agent 负责替宠物决定今天怎么过。每次结算都会留下可收藏的证据。", {
      position: { x: 92, y: 214 },
      width: 1040,
      height: 76,
      style: { fontSize: 29, color: C.muted },
    }),
    ...[
      ["1", "看状态", "心情 / 体力 / 压力"],
      ["2", "备包裹", "照片 / 留言 / 心愿"],
      ["3", "Agent 决策", "旅行 / 社交 / PK / 休养"],
      ["4", "收结果", "日记 / 明信片 / 纪念品 / 成长"],
    ].flatMap(([num, head, body], i) => {
      const x = 110 + i * 365;
      const fill = [C.green, C.yellow, C.accent, C.blue][i];
      return [
        roundRect({ position: { x, y: 396 }, width: 270, height: 250, fill: C.paper, line: `2px solid ${C.line}`, borderRadius: 30, shadow: "0px 15px 28px rgba(90, 60, 25, 0.11)" }),
        roundRect({ position: { x: x + 30, y: 426 }, width: 58, height: 58, fill, borderRadius: 18 }),
        text(num, { position: { x: x + 30, y: 438 }, width: 58, height: 34, style: { fontSize: 26, bold: true, color: "#FFFFFF", alignment: "center" } }),
        text(head, { position: { x: x + 30, y: 514 }, width: 210, height: 36, style: { fontSize: 31, bold: true } }),
        text(body, { position: { x: x + 30, y: 568 }, width: 210, height: 58, style: { fontSize: 24, color: C.muted, alignment: "center" } }),
        i < 3
          ? text("→", { position: { x: x + 292, y: 497 }, width: 42, height: 50, style: { fontSize: 46, bold: true, color: C.brown, alignment: "center" } })
          : rect({ position: { x: 0, y: 0 }, width: 1, height: 1, fill: "none" }),
      ];
    }),
    roundRect({ position: { x: 330, y: 718 }, width: 940, height: 70, fill: "#332824", borderRadius: 26 }),
    text("留存钩子：不是刷数值，而是每天回来看看它又经历了什么。", {
      position: { x: 370, y: 739 },
      width: 860,
      height: 34,
      style: { fontSize: 27, color: "#FFF8ED", bold: true, alignment: "center" },
    }),
  ]),
  "机制页：这页讲清核心循环。用户只要看状态和备包裹，真正的行动由 Agent 决策，结果沉淀为日记、明信片、纪念品和成长参数。",
);

addSlide(
  deck,
  layer([
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: C.cream }),
    sectionNumber(4),
    title("现在已经能看到\n一个竖屏小世界", {
      position: { x: 90, y: 116 },
      width: 560,
      height: 132,
      style: { fontSize: 56 },
    }),
    text("低多边形 3D 家、收藏馆、成长参数、明信片，都围绕「每天一分钟」展开。", {
      position: { x: 92, y: 284 },
      width: 510,
      height: 104,
      style: { fontSize: 28, color: C.muted },
    }),
    phoneShot(img.home, 690, 70, 274, 730, "在家：状态与 Agent 入口"),
    phoneShot(img.profile, 986, 108, 260, 654, "成长：心情 / 体力 / 勇敢"),
    phoneShot(img.album, 1264, 120, 250, 626, "收藏：明信片与旅程"),
    roundRect({ position: { x: 92, y: 468 }, width: 510, height: 180, fill: "#FFFDF7", line: `2px solid ${C.line}`, borderRadius: 28 }),
    text("展示时可以现场说：\n「这不是任务列表，它是 Agent 的生活状态。」", {
      position: { x: 126, y: 512 },
      width: 440,
      height: 90,
      style: { fontSize: 29, color: C.ink, bold: true, alignment: "center" },
    }),
  ]),
  "产品证据页：这里不展开所有功能，只证明它已经是一个移动端优先的小世界。重点讲三个画面：在家、成长、收藏。",
);

addSlide(
  deck,
  layer([
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: "#FFF8ED" }),
    rect({ position: { x: 0, y: 0 }, width: W, height: H, fill: "linear(160deg, #FFF8ED 0%, #F8E5BF 58%, #DDEACF 100%)" }),
    image(img.house, { position: { x: 968, y: 28 }, width: 502, height: 760, borderRadius: 0 }),
    sectionNumber(5),
    title("下一步：Agent 之间\n真的会相遇", {
      position: { x: 90, y: 126 },
      width: 660,
      height: 142,
      style: { fontSize: 58 },
    }),
    text("核心从「陪伴一个宠物」扩展到「让不同人的 Agent 以宠物身份发生关系」。", {
      position: { x: 92, y: 300 },
      width: 620,
      height: 84,
      style: { fontSize: 29, color: C.muted },
    }),
    ...[
      ["旅行社交", "碰到其他 Agent，合影或换明信片", C.green],
      ["轻量 PK", "勇敢、体力、羁绊和道具决定胜负", C.accent],
      ["日记吐槽", "以宠物口吻记录今天被怎么使唤", C.yellow],
      ["长期成长", "性格、记忆、纪念品持续改变参数", C.blue],
    ].flatMap(([head, body, fill], i) => {
      const x = 92 + (i % 2) * 340;
      const y = 456 + Math.floor(i / 2) * 142;
      return [
        roundRect({ position: { x, y }, width: 300, height: 112, fill: C.paper, line: `2px solid ${C.line}`, borderRadius: 28, shadow: "0px 12px 24px rgba(90, 60, 25, 0.10)" }),
        roundRect({ position: { x: x + 24, y: y + 26 }, width: 18, height: 58, fill, borderRadius: 9 }),
        text(head, { position: { x: x + 58, y: y + 23 }, width: 210, height: 28, style: { fontSize: 26, bold: true } }),
        text(body, { position: { x: x + 58, y: y + 59 }, width: 224, height: 40, style: { fontSize: 17, color: C.muted, lineSpacing: 108 } }),
      ];
    }),
    roundRect({ position: { x: 790, y: 744 }, width: 690, height: 84, fill: C.ink, borderRadius: 25 }),
    text("一句话收束：把 Agent 的使用习惯，变成一个值得每天照看的小生命。", {
      position: { x: 830, y: 765 },
      width: 610,
      height: 52,
      style: { fontSize: 24, color: "#FFF8ED", bold: true, alignment: "center", lineSpacing: 106 },
    }),
  ]),
  "愿景页：未来的核心不是做复杂养成，而是让 Agent 具象化以后，能出门、能遇见别人、能赢也能受伤、能写日记吐槽，形成持续成长。",
);

await fs.mkdir(PREVIEW_DIR, { recursive: true });
await fs.mkdir(LAYOUT_DIR, { recursive: true });
await fs.mkdir(QA_DIR, { recursive: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (let i = 0; i < deck.slides.count; i += 1) {
  const slide = deck.slides.getItem(i);
  const png = await slide.export({ format: "png", width: 1600, height: 900 });
  await writeBlob(path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`), png);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(
    path.join(LAYOUT_DIR, `slide-${String(i + 1).padStart(2, "0")}.json`),
    JSON.stringify(layout, null, 2),
  );
}

const thumbs = await Promise.all(
  Array.from({ length: deck.slides.count }, async (_, i) => {
    const file = path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`);
    return sharp(file).resize(400, 225).png().toBuffer();
  }),
);
await sharp({
  create: {
    width: 820,
    height: 690,
    channels: 4,
    background: "#FFF6EA",
  },
})
  .composite(
    thumbs.map((input, i) => ({
      input,
      left: 10 + (i % 2) * 405,
      top: 10 + Math.floor(i / 2) * 230,
    })),
  )
  .png()
  .toFile(path.join(QA_DIR, "contact-sheet.png"));

const pptx = await art.PresentationFile.exportPptx(deck);
await writeBlob(FINAL_PPTX, pptx);

console.log(FINAL_PPTX);
