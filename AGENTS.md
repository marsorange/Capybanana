<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Capybanana — project orientation

竖屏 Web 随心陪伴养成小游戏。核心气质是“每天一分钟，陪低边形卡皮巴拉长大一点”：短互动、轻养成、卡片收藏、移动端优先。MVP 仍保持全程序化低多边形 3D，无外部美术素材、无 AI/图片 API。

- **状态/路由**：`src/state/gameStore.ts`（Zustand + persist，`skipHydration`，客户端 `rehydrate()`）。屏幕用 `screen` 状态机切换，不用路由。`GameRoot.tsx` 每秒 `tick()` 推进生命周期 + 窗口聚焦补算。
- **生命周期**：`idle_home → ready(行李已备) → traveling → idle_home`。纯逻辑在 `src/game/clock.ts`（`advanceLifecycle` 一次循环结算出门+旅行+归来，支持长时间离线补算；低概率“今天不出门”会自恢复）。
- **内容/规则**：`src/game/destinations.ts`（10 主题文案 + 关键词规则）、`planTrip.ts`（加权随机选目的地，对玩家隐藏）、`generatePostcard.ts`（按留言/行李/性格拼装文案）。
- **3D**：`src/components/scenes3d/`，`MeshToonMaterial + gradientMap` + drei `Outlines`；不要给 `meshToonMaterial` 传 `flatShading` prop（R3F 类型不支持，会编译失败）。`Companion3D` 是按 type/color/accessory 参数化的同一套造型。家是带阁楼的两层别墅 `Villa.tsx`（一层仓库+客厅、阁楼卧室、楼梯）；宠物用 `RoamingCompanion.tsx` 在 `villaLayout.ts` 的 spot 间自主寻路走动+做活动（看书/睡觉/打扫/看窗），仅在家时出现。
- **打包**：行李箱最多 3 样，每样是 `PackedItem`（`preset` 预设小物 或 `photo` 拍照实物）。`CameraCapture.tsx` 用 getUserMedia 拍实物→`photoExtract.ts` 取主色映射成要素关键词（占位，未来换 iOS 物体抠图）。关键词与预设一起喂给 `planTrip`/`generatePostcard`。注意摄像头需安全上下文（localhost 或 https），用网络 IP 打开拿不到摄像头会优雅降级。
- **UI 主题**：Tailwind v4 `@theme` in `globals.css`（`bg-cream` / `text-ink` / `bg-accent #D95F59` / `rounded-sticker` / `font-hand`）。手写标题字体走 `<link>` 加载 Google Fonts（ZCOOL KuaiLe / Baloo 2）。
- 验证：`npm run build`（含 tsc + lint）。浏览器手动走闭环；等待页可“催它快点回来”快进。
- 仓库目录名 `Capybanana` 含大写，npm 包名不能含大写——脚手架曾用小写临时子目录再上移。
