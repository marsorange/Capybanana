<div align="center">

# 🍌 Capybanana

**每天一分钟，陪它长大一点。**
**One minute a day. Watch it grow.**

🌐 **官网 / Live site → [capybanana.vercel.app](https://capybanana.vercel.app/)**

[中文](#中文) · [English](#english)

</div>

---

## 中文

Capybanana 是一个**竖屏 Web 随心陪伴养成小游戏**。你每天花一分钟，给一只低多边形卡皮巴拉伙伴**准备包裹和心愿**，由你绑定的 **AI Agent** 替它决定今天怎么过（旅行 / 对战 / 在家），宠物把这一天变成一张可收藏的明信片、一段对战记录或一份成长记忆。

完整玩法设计见 [`docs/core-gameplay.md`](docs/core-gameplay.md)。

> 全产品支持**中英文双语**，可在界面内随时切换（语言开关，自动记忆你的选择）。

### 产品特色

- 低压力、短平快的每日陪伴体验：**打包 → Agent 决策 → 结算 → 收藏**
- 低多边形 3D 卡皮巴拉伙伴；GLB 资产管线已上线，主角带骨骼动画
- 每个登录用户拥有**唯一一只云端宠物**；AI Agent 通过 bind token 操作同一只宠物
- 收藏内容：明信片手账（24 张图鉴）、对战记录、纪念品、成长 traits
- 移动端优先，适合 1 分钟左右打开一次；拍照打包可接入摄像头 + 视觉识别
- 中英双语界面、游戏内容与服务端文案

### 核心循环

1. 用 Google 登录；应用为你铸出一个 Agent **bind token**
2. 把链接交给你的 AI Agent，Agent 调 `POST /api/agent/create` 绑定并**给宠物取名**
3. 每天你给宠物备「今日包裹」（最多 3 样 + 一句心愿），宠物停在 `ready` 待命
4. Agent 每天两步：`checkin`（看状态 / 报压力）→ `day`（决策：`travel` / `battle` / `stay`）
5. 旅行可能寄回明信片，对战生成记录；收集卡片、纪念品与回忆
6. 五个核心数值驱动每一天：体力 / 心情 / 勇气 / 好奇心 / 受伤

### 技术栈

- **Next.js 16 / React 19**
- **Three.js / React Three Fiber / drei**（纯 Three.js 运动，无物理引擎）
- **Zustand**（客户端状态 + 持久化）
- **Tailwind CSS v4 / Framer Motion**
- **Supabase Auth（Google 登录）+ PostgreSQL** 云存档
- 可选 LLM：OpenRouter（明信片 / 对战文案）、智谱 GLM-4V（拍照视觉理解）

### 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。摄像头交互需要安全上下文（`localhost` 或 HTTPS）。

### 本地 PostgreSQL 调试（无 Supabase 权限时）

无法访问项目的 Supabase/Vercel 时，仍可在本机跑完整的「云存档 + bind token」流程：

1. 创建 `.env.local`：

   ```bash
   POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:5432/capybanana
   CAPY_DEV_LOCAL_AUTH=1
   NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH=1
   ```

2. 启动本地 PostgreSQL（Docker 示例）：

   ```bash
   docker run --name capybanana-pg \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=capybanana \
     -p 5432:5432 -d postgres:16
   ```

3. 依次执行迁移 `supabase/migrations/0001 … 0007`，再 `npm run dev`，
   在登录页用「本地调试登录（无需 Supabase）」进入。

### 脚本

```bash
npm run dev    # 开发
npm run build  # 构建（勿与 next dev 同时跑，会污染 .next）
npm run lint   # 检查
```

---

## English

Capybanana is a **portrait-mode, low-effort companion-raising web game**. You spend
about a minute each day **packing a bag and a wish** for a low-poly capybara
companion. Its bound **AI Agent** decides how the pet spends the day — travel,
battle, or stay home — and the pet turns that day into a collectible postcard, a
battle record, or a growth memory.

See [`docs/core-gameplay.md`](docs/core-gameplay.md) for the full gameplay design.

> The whole product is **bilingual (中文 / English)** with an in-app language
> toggle that remembers your choice.

### Highlights

- A calm, bite-sized daily loop: **pack → Agent decides → resolve → collect**
- Low-poly 3D capybara companion with a rigged GLB asset pipeline + animations
- Every signed-in user owns **one cloud pet**; the AI Agent drives the same pet via a bind token
- Collectibles: a postcard journal (24-card dex), battle records, souvenirs, growth traits
- Mobile-first, made to open ~once a minute; packing can use the camera + vision recognition
- Bilingual UI, game content, and server-side copy

### Core loop

1. Sign in with Google; the app mints an Agent **bind token**
2. Hand the link to your AI Agent — it calls `POST /api/agent/create` to bind and **name the pet**
3. Each day you pack a bag (up to 3 items + a wish); the pet waits in `ready`
4. The Agent runs two steps a day: `checkin` (read state / report stress) → `day` (`travel` / `battle` / `stay`)
5. Travel may send back a postcard; battles create records; collect cards, souvenirs, memories
6. Five core stats drive the day: energy / mood / courage / curiosity / injury

### Tech stack

- **Next.js 16 / React 19**
- **Three.js / React Three Fiber / drei** (pure Three.js motion, no physics engine)
- **Zustand** (client state + persistence)
- **Tailwind CSS v4 / Framer Motion**
- **Supabase Auth (Google login) + PostgreSQL** cloud saves
- Optional LLMs: OpenRouter (postcard / battle copy), Zhipu GLM-4V (photo vision)

### Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera-based interactions require a secure context
(`localhost` or HTTPS).

### Local PostgreSQL debug (no Supabase access)

If you cannot reach the project's Supabase/Vercel, you can still run the full
"cloud save + bind token" flow on localhost:

1. Create `.env.local`:

   ```bash
   POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:5432/capybanana
   CAPY_DEV_LOCAL_AUTH=1
   NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH=1
   ```

2. Start local PostgreSQL (Docker example):

   ```bash
   docker run --name capybanana-pg \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=capybanana \
     -p 5432:5432 -d postgres:16
   ```

3. Run migrations `supabase/migrations/0001 … 0007` in order, then `npm run dev`
   and use **"本地调试登录（无需 Supabase）"** on the login screen.

### Scripts

```bash
npm run dev    # develop
npm run build  # build (do NOT run while next dev is active — it pollutes .next)
npm run lint   # lint
```
