# Capybanana

> 每天一分钟，陪它长大一点。

Capybanana 是一个竖屏 Web 随心陪伴养成小游戏。用户每天花一分钟，给一只低多边形卡皮巴拉伙伴**准备包裹和心愿**，由绑定的 **AI Agent** 替它决定今天怎么过（旅行 / 对战 / 在家），宠物把这一天变成一张可收藏的明信片、对战记录或成长记忆。完整玩法设计见 [`docs/core-gameplay.md`](docs/core-gameplay.md)。

## Product

- 低压力、短平快的每日陪伴体验：打包 → Agent 决策 → 结算 → 收藏
- 低多边形 3D 卡皮巴拉伙伴；GLB 管线保留，当前默认走程序化主角
- 每个登录用户拥有唯一一只云端宠物；AI Agent 通过 bind token 操作同一只宠物
- 明信片、对战记录、纪念品、误解词典、成长 traits 等收藏内容
- 移动端优先，适合 1 分钟左右打开一次；拍照打包可接入摄像头识别

## Tech Stack

- Next.js 16 / React 19
- Three.js / React Three Fiber / drei；物理用 @react-three/rapier
- Zustand（客户端状态）
- Tailwind CSS v4 / Framer Motion
- Supabase Auth（Google 登录）+ PostgreSQL 云存档

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Camera-based interactions require a secure context, such as `localhost` or HTTPS.

## Local PostgreSQL Debug (no Supabase access)

If you cannot access the project's Supabase/Vercel, you can still run the full
"cloud save + bind token" flow on localhost:

1. Create `.env.local` with:

```bash
POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:5432/capybanana
CAPY_DEV_LOCAL_AUTH=1
NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH=1
```

2. Start local PostgreSQL (example with Docker):

```bash
docker run --name capybanana-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=capybanana \
  -p 5432:5432 -d postgres:16
```

3. Run `npm run dev`, open `http://localhost:3000`, then use
   "本地调试登录（无需 Supabase）" on the login screen.

Run the SQL migrations in order before logging in:
`supabase/migrations/0001_storage_refactor.sql`, then
`supabase/migrations/0002_gameplay_v2.sql`. The app now uses the relational
tables directly; there is no KV fallback.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Current Scope

The current version focuses on the Agent-driven daily loop (see
[`docs/core-gameplay.md`](docs/core-gameplay.md)):

- Sign in with Google; the app mints an Agent **bind token**
- Sign-in creates the default companion if the account does not have one yet
- Each day the owner packs up to 3 items + a wish; the pet waits in `ready`
- The Agent calls `POST /api/agent/day` to decide the day — `travel`,
  `battle`, or `stay`
- Travel may send back a postcard; battle creates records; collect cards,
  souvenirs and memories
- Five core stats drive the day: energy / mood / courage / curiosity / injury
