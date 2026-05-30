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

