# Capybanana

> 每天一分钟，陪它长大一点。

Capybanana 是一个随心陪伴养成小游戏。用户每天通过一个很短的小互动，喂养一只低边形卡皮巴拉伙伴，收集心情种子、每日卡片和成长变化。

## Product

- 低压力、短平快的每日陪伴体验
- 低边形 3D 卡皮巴拉伙伴
- 每日心情种子、卡片收藏和成长进度
- 移动端优先，适合 1 分钟左右打开一次
- 可逐步接入摄像头、声音、动作和重力感应作为小游戏输入

## Tech Stack

- Next.js 16
- React 19
- Three.js / React Three Fiber
- Zustand
- Tailwind CSS v4
- Framer Motion

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

Run the SQL in `supabase/migrations/0001_storage_refactor.sql` before logging
in. The app now uses the relational tables directly; there is no KV fallback.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Initial Scope

This first public version focuses on the base companion loop:

- Create a companion
- Interact with the 3D home scene
- Prepare small items or photo-based inputs
- Let the companion grow through short daily-style interactions
- Collect generated cards and memories
