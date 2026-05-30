<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Capybanana — project orientation

竖屏 Web 随心陪伴养成小游戏。核心气质是“每天一分钟，陪低边形卡皮巴拉长大一点”：短互动、轻养成、卡片收藏、移动端优先。MVP 仍保持全程序化低多边形 3D，无外部美术素材、无 AI/图片 API。

- **状态/路由**：`src/state/gameStore.ts`（Zustand + persist，`skipHydration`，客户端 `rehydrate()`）。屏幕用 `screen` 状态机切换，不用路由。`GameRoot.tsx` 每秒 `tick()` 推进生命周期 + 窗口聚焦补算。
- **生命周期**：`idle_home → ready(行李已备) → traveling → idle_home`。纯逻辑在 `src/game/clock.ts`（`advanceLifecycle` 一次循环结算出门+旅行+归来，支持长时间离线补算；低概率“今天不出门”会自恢复）。
- **内容/规则**：`src/game/destinations.ts`（10 主题文案 + 关键词规则）、`planTrip.ts`（加权随机选目的地，对玩家隐藏）、`generatePostcard.ts`（按留言/行李/性格拼装文案）。
- **3D**：`src/components/scenes3d/`，`MeshToonMaterial + gradientMap` + drei `Outlines`；不要给 `meshToonMaterial` 传 `flatShading` prop（R3F 类型不支持，会编译失败）。`Companion3D` 是按 type/color/accessory 参数化造型。家是等距 diorama：`HomeScene.tsx` = `Island`(浮空草地小岛) + `House`(两层剖面别墅，向 +x/+z 开切口) + `Yard`(院子：栅栏/踏石/树/菜地/花)。镜头是**正交等距 + 双指缩放**（`SceneCanvas` 的 `orthographic`/`enableZoom`/`azimuth`/`minZoom`..`maxZoom`）。宠物 `RoamingCompanion.tsx` 在 `villaLayout.ts` 的 SPOTS（含院子）间寻路走动+活动，仅在家时出现。
- **打包（已极简）**：`PackScreen` 只有一个放大的 3D 背包 + 📷拍照 + 💬留言 + 确认，无预设网格、无快捷标签。可拍多张，每拍一张确认后自动进背包（`photos: PackedItem[]` 缩略图列，可单独移除）。每样 `PackedItem`（`preset` 仅 Agent API 用 / `photo`）。`CameraCapture.tsx` 拍完先用 `photoExtract.ts` 取主色得“氛围”标签（`tags` 仍按颜色，喂 outcome），再 `POST /api/recognize` 调 MiniMax 视觉理解（`src/lib/minimax.ts` 的 `understandImage`→Token Plan 视觉端点 `/v1/coding_plan/vlm`，复用 `MINIMAX_API_KEY`）得“这是什么”，把物体名填进 `hint`/`keyword`/`label`；没配 key 或识别失败则保留取色启发式，不打断。摄像头需安全上下文（localhost/https）。
- **账号 / Agent 连接（云存档）**：手机号免密登录（`POST /api/auth/login`，手机号即身份，无验证码）→ 服务器为新账号建一只宠物（网页用 `randomCompanion()` 随机生成后 `POST /api/agent/create`）→ 拿到绑定链接 `Read <域名>/agent/skill.md?bind=<token>`。AI Agent 读 `skill.md`（`src/app/agent/skill.md/route.ts`，按 token 动态生成带真实接口的说明）后，用同一套 **`/api/agent/*`**（`pet/create/pack/travel/battle/stay/pat/say/collect/postcards/feed`，bind 令牌鉴权：`?bind=` 或 `Authorization: Bearer`）操作**同一只**云宠物。服务端复用纯逻辑：`src/server/engine.ts` 的 `tickSave` 包 `advanceLifecycle`，outcome 合并抽到共享的 `src/game/applyOutcome.ts`（`gameStore.tick` 也用它）；存储在 `src/lib/kv.ts`（Upstash/Vercel KV，未配置则进程内存回退）+ `src/server/store.ts`。登录后网页变“瘦客户端”：`gameStore` 的 `cloud` 切片把 `prepareBag/collectPostcard/createCompanion` 路由到服务器，`GameRoot` 改用 `cloudPull` 每 5s 拉取、本地不再随机结算。
- **Agent 驱动的玩法（核心）**：云宠物**不再自己出门**——主人在网页备好「今日包裹」（物品 + 心愿），宠物停在 `ready` 待命，由 **Agent** 看状态 + 包裹（`summarizePet` 现含 `bag`/`choices`）后替它决定今天怎么过：`startTravel`（旅行，可指定 `destination`，归来寄明信片）/ `startBattle`（找 Claw 较量，`resolveDay` 的 `resolveClaw` 按勇敢+体力+`protective`物+羁绊+运气出胜/负/平+战利品）/ `stayHome`（在家/院子/养伤，立即结算）。机制：`Trip.intent`（`OutcomeKind|"auto"|"quiet"`）决定 `resolveDay` 走哪种收场；`engine.packBag` 用 `clock.ts` 的 `NO_AUTO_DEPART` 哨兵把 `departAt` 设成永不触发，所以 `advanceLifecycle` 的 ready→traveling 自动出门只在**本地访客模式**（`gameStore.prepareBag` 仍 `scheduleDeparture`）触发，云端纯靠 Agent。**已知缺口**：`secretProgress`（多日秘密铺垫）与明信片生图持久化仍是客户端本地的，云宠物暂不享有，后续可下沉到服务端。
- **部署（Vercel）**：所有 route 文件均 `runtime="nodejs"`+`dynamic="force-dynamic"`。在 Vercel 控制台 Storage 加一个 **Upstash for Redis**（自动注入 KV 环境变量）；`kv.ts` 同时兼容 `UPSTASH_REDIS_REST_URL/TOKEN` 与 `KV_REST_API_URL/TOKEN`。`/agent/skill.md` 用点号文件夹路由，已验证 `next build` 可注册、无需 rewrite。绑定链接域名从请求头推导，可用 `APP_BASE_URL` 固定。
- **UI 主题**：Tailwind v4 `@theme` in `globals.css`（`bg-cream`/`text-ink`/`bg-accent #D95F59`/`rounded-sticker`/`font-hand`）。标题字体用系统 CJK（Yuanti/PingFang），不外链 Google Fonts。`ErrorBoundary.tsx` 包住每屏，3D 出错只显示重试卡片不至于全白。
- **验证 & 坑**：dev 运行时用 `npx tsc --noEmit`，**不要在 `next dev` 运行时跑 `next build`**（两者共用 `.next`，会让 dev 加载不稳定/白屏；修复：`rm -rf .next` 后重启 dev）。
- 仓库目录名 `Capybanana` 含大写，npm 包名不能含大写——脚手架曾用小写临时子目录再上移。
- **远期玩法蓝图（用户已提出，尚未实现）**：纪念品/特产、负伤与休养、成长、对战与战后恢复、家庭活动、按“天”推进的日循环；在家自主生活由 时间/心情/体力/是否受伤/纪念品 驱动选择活动。当前只实现到“出门旅行→寄明信片→带回”闭环。
