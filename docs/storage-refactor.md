# Capybanana 存储说明

> 当前状态：存储层已经完成从 KV blob 到 PostgreSQL 关系表的迁移。本文只记录当前实现，历史迁移方案不再保留为维护依据。

## 权威实现

- Schema：`supabase/migrations/0001_storage_refactor.sql` + `supabase/migrations/0002_gameplay_v2.sql`
- Repository：`src/server/store.ts`
- API DTO：`src/server/types.ts` 中的 `CloudSave`
- 游戏状态投影：`src/server/engine.ts`

没有 PostgreSQL 连接串时，登录和云存档相关 route 会返回 503。项目不再支持 Upstash / Vercel KV / 进程内存作为账号存储。

## 环境变量

数据库连接按优先级读取：

1. `POSTGRES_URL`
2. `POSTGRES_PRISMA_URL`
3. `POSTGRES_URL_NON_POOLING`

本地调试可用：

```bash
POSTGRES_URL=postgres://postgres:postgres@127.0.0.1:5432/capybanana
CAPY_DEV_LOCAL_AUTH=1
NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH=1
```

## 迁移顺序

新库需要按顺序执行：

```bash
psql "$POSTGRES_URL" -f supabase/migrations/0001_storage_refactor.sql
psql "$POSTGRES_URL" -f supabase/migrations/0002_gameplay_v2.sql
```

`0001` 是基础云存档 schema；`0002` 加入 gameplay v2 字段：`curiosity`、`rest_until_day`、`pending_stress` / `pending_stress_note`、`battle_pool`。

## 当前数据模型

核心表：

- `users`：业务用户，记录 Supabase user id、email、当前宠物 id。
- `agent_tokens`：Agent bind token 的 hash；明文 token 只发给客户端/Agent。
- `pets`：宠物主状态，一人一宠。包含形象、五个核心值、成长内容、行动状态、切磋统计、待处理压力和版本号 `rev`。
- `bags`：今日包裹。当前待命包裹唯一，状态由 `ready/consumed/...` 管理。
- `trips`：每日主要行动实例，覆盖 `travel/battle/stay`。
- `postcards`：旅行收藏。
- `battles`：切磋收藏。
- `activities`：事件流，给 Agent feed 使用。
- `battle_pool`：异步切磋快照池。

保留字段：

- `legacy_id` / `legacy_companion_id` 用于旧前端 DTO 和历史 id 兼容。
- `postcards.image_prompt/image_status/image_path/landmark` 是早期 AI 生图设计遗留列；当前代码不写入，明信片用程序化 `PostcardArt`。
- `friendships` 暂未作为玩法入口使用，保留给后续好友/指定切磋。

## CloudSave 投影

前端和 Agent API 仍主要读写 `CloudSave` 形状。`src/server/store.ts` 负责把关系表组装成 `CloudSave`，再由 `src/server/engine.ts` 做纯逻辑变更，最后写回相关表。

重要约定：

- `rev` 是宠物主状态版本。会改变主状态的写操作必须递增。
- `companionState` 只有 `idle_home | ready | traveling`。
- `ready` 不自动出门，必须由 Agent 调 `POST /api/agent/day`。
- `lastActionDay` 按 UTC+8 day key 判断每天一次主要行动。
- `pendingStress` / `pendingStressNote` 是 Agent 当天 checkin 的临时输入，会被当天行动消费。

## 照片与图片

打包照片不做云端图片持久化。网页端只把识别后的 `label/keyword/tags/color` 等轻量信息写入包裹；图片 data URL 不作为长期云存档。明信片 AI 生图已下线。

## 切磋存储

`POST /api/agent/day` 选择 `battle` 时：

1. 从 `battle_pool` 找近 7 天、异主的宠物快照。
2. 找不到则生成 NPC。
3. 写入 `battles` 收藏记录。
4. 更新发起方切磋记录和 `battle_pool` 快照。

当前未实现双向 rating 更新，也没有好友指定切磋。
