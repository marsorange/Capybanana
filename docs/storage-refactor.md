# Capybanana 存储重构设计

> **状态：已实施（2026-06）。** 本文是存储层从单一 KV blob 迁到 Postgres 关系表的设计稿，迁移**已完成**——`src/lib/kv.ts` 已删除。权威实现见 `supabase/migrations/0001_storage_refactor.sql`（schema）与 `src/server/store.ts`（repository）。下文保留作设计依据与 ER/字段参考。原合并自 `docs/data-model.md` 与 `docs/storage-redesign-issues.md`。

## 0. 现状（重构后）

存储层已从单一 KV blob 迁到 Postgres 关系表，**`src/lib/kv.ts` 已删除**，不再支持 Upstash / Vercel KV 或进程内存作为账号存储。

- **唯一后端**：PostgreSQL（Supabase Postgres 或本地 Docker）。只认 `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`；没有连接串时登录 route 直接 503。
- **建表真源**：`supabase/migrations/0001_storage_refactor.sql`（`psql "$POSTGRES_URL" -f ...` 或 Supabase CLI 跑）。
- **repository**：`src/server/store.ts` 用这些关系表组装兼容旧前端的 `CloudSave` DTO。
- **与本设计稿的差异（以代码/迁移为准）**：① 宠物状态已精简为 4 个核心值 `mood / energy / courage / injury`（原 `curiosity` / `bravery` / `bond` 移除、`bravery`→`courage`，见 `docs/core-gameplay.md`）；② 对战（`battles` 表、`pets.rating/wins/losses/draws`）与 `friendships` 已建好作占位，但**应用层尚未写入**（对战后置）；③ 明信片 AI 生图已下线，`postcards.image_prompt/image_status/image_path/landmark` 列保留但代码不再写，明信片统一用程序化 `PostcardArt`；④ §2 / §8 / §9 的旧 KV 回填已无意义（kv.ts 不存在，demo 数据直接丢弃）。

> 下面 §0′–§13 是迁移当时的设计依据与字段/ER 参考，按原样保留；个别 DDL 片段早于上面的 4 值精简，**一律以 `0001_storage_refactor.sql` 为准**。

## 0′. 重构前的起点（历史）

重构前真实持久化入口是 `src/lib/kv.ts`。

支持三种后端：

| 后端 | 触发环境变量 | 说明 |
|---|---|---|
| Upstash / Vercel KV | `UPSTASH_REDIS_REST_URL/TOKEN` 或 `KV_REST_API_URL/TOKEN` | Redis REST |
| Postgres KV | `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` | 自动建两张通用 KV 表 |
| Memory | 无持久化 env | 仅本地单进程开发 |

当前 Postgres 只自动创建：

```sql
create table if not exists capy_kv (
  k text primary key,
  v jsonb not null
);

create table if not exists capy_kv_set (
  k text not null,
  member text not null,
  primary key (k, member)
);
```

当前业务 key：

| Key | Value |
|---|---|
| `sb:<supabaseUserId>` | `userId` |
| `dev:<identity>` | `userId` |
| `user:<userId>` | `User` |
| `bind:<token>` | `userId` |
| `pet:<petId>` | `CloudSave` |
| `img:<postcardId>` | 明信片 AI 图 dataURL / URL |
| `img:lock:<postcardId>` | 明信片图生成锁 |

当前权威游戏状态是单个 `CloudSave` blob，包含宠物、数值、包裹、在途旅行、明信片、对战、事件、`rev`。API 大多是 `authed -> tickSave -> engine mutation -> savePet`，最后整份 save 覆盖写回。

## 1. 为什么要改

单个 `pet:<id>` JSON blob 对当前单人养成足够，但无法很好支撑跨用户查询和长期数据演进：

| 需求 | KV blob 的问题 |
|---|---|
| 对战匹配 | 需要按 rating / 状态跨用户查询 |
| 排行榜 | 需要排序、分页、缓存或物化视图 |
| 好友 / 时间线 | 需要多用户关系和 feed 游标 |
| 并发写入 | 整份 save 覆盖容易丢更新 |
| 图片 / 照片 | dataURL 入库会撑大行 |
| 数据迁移 | JSON shape 改动会牵连前后端 |

目标是迁到 Postgres 关系表，同时保留一层 `CloudSaveDTO` 兼容接口，让前端第一阶段尽量无感。

## 2. 已定决策

| 决策 | 结论 |
|---|---|
| 业务用户是否强 FK 到 `auth.users` | 不强依赖。保留 `users.supabase_user_id uuid unique`，本地调试用 mock auth 生成稳定 uuid |
| `rev` 是否正式入表 | 是。`pets.rev bigint not null default 0`，主状态写入时 +1 |
| 活动日志方向 | 使用 `activities` 作为统一行为日志和 feed 游标 |
| 对战模式 | 第一阶段做异步幽灵对战：只结算发起方，对方只收到 `challenged` activity |
| 大对象 | 打包照片和明信片 AI 图走 Supabase Storage，表里只存 path |
| 前端迁移策略 | 第一阶段服务端组装旧 `CloudSaveDTO`，降低前端改动面 |
| Migration 体系 | 用 `supabase/migrations` 作为唯一 SQL 来源；本地没有 Supabase CLI 时直接用 `psql` 跑同一批 SQL |
| Agent token | 明文 token 前缀 `capy_ag_`；库里只存 hash；推荐 HMAC-SHA256 |
| 本地 mock auth | 用稳定 uuid 生成策略，把 `dev:<identity>` 映射到固定 `supabase_user_id` |
| `trips` 表 | 第一阶段直接入表 |
| `AGENT_TOKEN_SECRET` | 环境变量名使用 `AGENT_TOKEN_SECRET` |
| demo 数据迁移 | demo 阶段允许丢弃旧数据；回填脚本不是第一优先级 |

仍需在执行前定下：

| 待决策 | 推荐 |
|---|---|
| 旧字符串 ID 到 UUID | 新表用 UUID，核心表保留 `legacy_id text unique` 过渡；demo 阶段可简单处理 |
| 未收明信片数量 | 第一阶段推荐一宠最多一张未收，partial unique index |
| KV 回填 | demo 阶段允许丢弃旧数据；如需回填，优先支持 Postgres KV，Redis/Upstash 暂不做自动回填 |

## 3. ER 总览

```text
auth.users (Supabase 自带身份; 不做强 FK)
    │ 1:1 via users.supabase_user_id
  users ───────1:1─────── pets ──┬──1:N── trips ──┬─0:1─► postcards
    │                             │                └─0:1─► battles
    │                             ├──1:N── bags
    │                             ├──1:N── activities ──┬─0:1─► postcards
    │                             │                      └─0:1─► battles
    │                             └──(快照)── battles
    │
agent_tokens
    │
friendships (未来)
```

建表依赖建议：

```text
users -> agent_tokens -> pets -> bags -> trips -> postcards -> battles -> activities -> friendships
```

## 4. 表定义草案

### 4.1 `users`

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid not null unique,
  pet_id uuid unique, -- demo/旧 API 兼容：预分配一人一宠 id；正式关系仍以 pets.owner_id 为准
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
```

说明：

- 密码和 OAuth 登录交给 Supabase Auth。
- 业务表不强依赖 `auth.users` 外键，避免普通 Docker Postgres 本地调试失败。
- 本地 dev auth 使用稳定 mock uuid 写入 `supabase_user_id`。
- 稳定 mock uuid 推荐使用 UUID v5：namespace 固定，name 为 `dev:<identity>`。
- `pet_id` 是 demo 阶段为了兼容现有 `savePet(petId, save)` 签名的预分配字段；长期可以退役。

### 4.2 `agent_tokens`

```sql
create table agent_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'default',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index on agent_tokens(user_id);
```

说明：

- 不长期明文存 bearer token。
- 明文 token 格式：`capy_ag_` + 高熵随机串。
- 明文 token 只在创建或轮换时返回一次。
- 第一阶段可以只允许每个用户一个 active token，但表结构先支持轮换和多 Agent。
- `token_hash` 推荐使用 HMAC-SHA256：`hmac_sha256(AGENT_TOKEN_SECRET, token)`。
- 如果没有 `AGENT_TOKEN_SECRET`，开发环境可以回退到普通 SHA-256，但生产必须配置 secret。

### 4.3 `pets`

```sql
create table pets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  legacy_companion_id text unique,
  owner_id uuid not null unique references users(id) on delete cascade,

  name text not null,
  species text not null,
  primary_color text not null,
  personality text not null,
  accessory text not null default 'none',

  -- 4 个核心状态值（见 docs/core-gameplay.md §8）
  mood int not null default 65,
  energy int not null default 70,
  courage int not null default 40,
  injury int not null default 0,
  traits text[] not null default '{}',
  memories text[] not null default '{}',
  souvenirs text[] not null default '{}',
  misunderstandings text[] not null default '{}',
  last_result jsonb,

  state text not null default 'idle_home',
  -- 对战占位列：已建好，应用层暂不写入（对战后置）
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  last_action_day date,
  pending_message text,
  active_trip_id uuid,
  rev bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (species in ('capybara','rabbit','duck','raccoon','shiba','sheep')),
  check (personality in ('gentle','curious','lazy','brave','dreamy')),
  check (accessory in ('none','scarf','hat','glasses','flower','bell')),
  check (state in ('idle_home','ready','traveling')),
  check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  check (mood between 0 and 100),
  check (energy between 0 and 100),
  check (courage between 0 and 100),
  check (injury between 0 and 100)
);

create index on pets(rating);
create index on pets(state);
```

说明：

- `rev` 是宠物主状态版本，不是 feed cursor。
- 会改变宠物主状态的事务都必须 `rev = rev + 1`。
- `legacy_id` 用于旧 `user.petId` / `pet:<id>` 回填映射。
- `legacy_companion_id` 用于旧 `companion.id` 映射。
- `souvenirs`、`misunderstandings`、`last_result` 是 demo 阶段兼容现有 `CloudSaveDTO` 的轻量字段；后续可拆到专表或完全由 detail 表派生。

### 4.4 `bags`

```sql
create table bags (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  message text not null default '',
  gesture text,
  items jsonb not null default '[]',
  status text not null default 'ready',
  packed_at timestamptz not null default now(),
  consumed_at timestamptz,

  check (gesture is null or gesture in ('pat')),
  check (status in ('ready','consumed','expired','canceled'))
);

create index on bags(pet_id, status);

create unique index one_ready_bag_per_pet
on bags(pet_id)
where status = 'ready';
```

`items` 是原 `PackedItem[]` 的 normalized JSON，最多 3 件：

```jsonc
{
  "kind": "preset|photo|text",
  "preset": "food|camera|charm|gift|umbrella",
  "label": "一颗橡果",
  "hint": "海一样的蓝",
  "keyword": "森林",
  "color": "#88aa66",
  "tags": ["food", "protective"],
  "photo_path": "bag-photos/<uid>.jpg",
  "thumbnail_path": "bag-photos/<uid>-thumb.jpg"
}
```

规则：

- `data:image/...` 不入库。
- API 写入前 normalize：限制长度、过滤未知 tag、上传照片到 Storage。
- 当前待命包裹 = `status='ready'` 的唯一一条。

### 4.5 `trips`

```sql
create table trips (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  bag_id uuid references bags(id) on delete set null,
  kind text not null,
  intent text,
  destination_theme text,
  status text not null default 'started',
  agent_note text,
  message text not null default '',
  gesture text,
  items_snapshot jsonb not null default '[]',
  started_at timestamptz not null default now(),
  returns_at timestamptz,
  resolved_at timestamptz,

  check (kind in ('travel','battle','stay')),
  check (status in ('started','resolved','canceled')),
  check (gesture is null or gesture in ('pat'))
);

create index on trips(pet_id, started_at desc);
create index on trips(pet_id, status);
```

说明：

- 这是 travel / battle / stay 的当天行动实例。
- `pets.active_trip_id` 指向当前在途 trip。
- `items_snapshot` 保存当日包裹快照，避免后续包裹变化影响历史。
- 第一阶段若实现成本过高，可用 `pets.active_trip jsonb` 过渡，但推荐直接建 `trips`。

### 4.6 `postcards`

```sql
create table postcards (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  pet_id uuid not null references pets(id) on delete cascade,
  trip_id uuid unique references trips(id) on delete set null,
  destination_theme text not null,
  location_name text not null,
  landmark text,
  title text not null,
  message text not null,
  reason text,
  image_key text,
  image_prompt text,
  image_status text not null default 'pending',
  image_path text,
  collected boolean not null default false,
  sent_at timestamptz not null default now(),

  check (destination_theme in (
    'seaside','forest','snow','hotspring','harbor',
    'mountain','flowerfield','raincity','town','nightstation'
  )),
  check (image_status in ('pending','generating','ready','error','fallback'))
);

create index on postcards(pet_id, sent_at desc);

create unique index one_uncollected_postcard_per_pet
on postcards(pet_id)
where collected = false;
```

说明：

- 第一阶段按当前 UI 语义，一宠最多一张待拆明信片。
- 明信片 AI 图写入 Storage，表里只存 `image_path`。
- `image_status` 独立更新，不触碰 `pets.rev`。
- **当前**：明信片 AI 生图已下线，`image_prompt` / `image_status` / `image_path` / `landmark` 列保留但代码不再写，统一渲染程序化 `PostcardArt`（按 `destination_theme`）。

### 4.7 `battles`

```sql
create table battles (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  trip_id uuid unique references trips(id) on delete set null,
  day date not null,
  attacker_pet_id uuid not null references pets(id) on delete cascade,
  defender_pet_id uuid references pets(id) on delete set null,
  is_npc boolean not null default false,
  attacker_snapshot jsonb not null,
  defender_snapshot jsonb not null,
  result text not null,
  attacker_rating_delta int not null default 0,
  defender_rating_delta int not null default 0,
  attacker_injury int not null default 0,
  spoils text,
  title text not null,
  story text not null,
  created_at timestamptz not null default now(),

  check (result in ('win','lose','draw'))
);

create index on battles(attacker_pet_id, created_at desc);
create index on battles(defender_pet_id, created_at desc);
```

说明：

- **当前**：对战玩法后置，本表已建好但**应用层尚未写入**（`POST /api/agent/day` 的 `action:"battle"` 会被拒）。
- NPC Claw：`is_npc=true`、`defender_pet_id=null`。
- 幽灵 PvP：只更新发起方；防守方不受伤、不扣分，只获得 `challenged` activity。
- 双方 snapshot 不可变，避免对方后续改外观/数值影响历史记录。

### 4.8 `activities`

```sql
create table activities (
  id bigint generated always as identity primary key,
  legacy_seq bigint,
  pet_id uuid not null references pets(id) on delete cascade,
  actor text not null,
  kind text not null,
  day date not null,
  title text not null,
  detail text,
  effects jsonb not null default '{}',
  payload jsonb,
  trip_id uuid references trips(id) on delete set null,
  postcard_id uuid references postcards(id) on delete set null,
  battle_id uuid references battles(id) on delete set null,
  created_at timestamptz not null default now(),

  check (actor in ('owner','agent','world','pet')),
  check (kind in (
    'adopt','pack','say','pat','restyle',
    'travel','battle','rest','home','yard','challenged'
  ))
);

create index on activities(pet_id, id);
create index on activities(pet_id, day);
create index on activities(pet_id, created_at desc);
```

说明：

- `activities.id` 是 feed cursor。
- `pets.rev` 是主状态版本。
- 两者不要混用。
- 永久事实不要只依赖可清理 activity。纪念品、长期记忆、习得 trait 应同步落到 `pets` 或后续专表。

`kind` x `actor` 约定：

| kind | actor | detail 指针 | payload 常见键 |
|---|---|---|---|
| `adopt` | `pet` | - | - |
| `pack` | `owner` / `agent` | `trip_id` 可空 | `bagId`, `items` 概要 |
| `say` | `owner` / `agent` | - | `text` |
| `pat` | `owner` / `agent` | - | - |
| `restyle` | `owner` / `agent` | - | `species`, `color`, `accessory` |
| `travel` | `agent` | `trip_id`, `postcard_id` | `souvenir`, `misunderstanding`, `memory`, `trait` |
| `battle` | `agent` | `trip_id`, `battle_id` | `spoils`, `memory`, `trait` |
| `rest` / `home` / `yard` | `agent` | `trip_id` | `memory`, `trait` |
| `challenged` | `world` | `battle_id` | - |

### 4.9 `friendships` 未来可选

```sql
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),

  unique(requester_id, addressee_id),
  check (status in ('pending','accepted','blocked'))
);
```

排行榜第一阶段不建表：

```sql
select ...
from pets
order by rating desc
limit 100;
```

量大后再上物化视图或缓存榜单。

## 5. 统一动作事务

新表后，所有成长动作必须走事务，不能外层传回整份 DTO 覆盖数据库。

标准流程：

1. `begin`
2. 通过 token / session 解析 user 和 pet
3. `select * from pets where id = :pet_id for update`
4. catch-up lifecycle，如有归来结果则先落库
5. 校验 `state`、`last_action_day`、`injury`
6. 更新 `pets` 主状态
7. 消耗当前 `bags`
8. 插入或更新 `trips`
9. 插入 detail：`postcards` 或 `battles`
10. 插入 `activities`
11. `pets.rev = pets.rev + 1`
12. `commit`

读取请求如果需要 catch-up，也要把写入收进 repository 方法，例如：

```ts
loadPetForRead({ catchUp: true })
```

不要在每个 GET route 里散落 `tickSave + savePet`。

## 6. Feed 与同步语义

当前旧语义：

- `events.seq == rev`
- Agent 用 `feed?since=<seq>`
- 前端 `cloudPull` 用 `save.rev` 判断是否 adopt

新语义：

| 字段 | 用途 |
|---|---|
| `pets.rev` | 宠物主状态版本 |
| `activities.id` | Agent feed / timeline cursor |
| `postcards.image_status` | 媒体状态，不触碰 `pets.rev` |

API 建议返回：

```jsonc
{
  "ok": true,
  "rev": 42,
  "cursor": 1088,
  "pet": {},
  "activities": []
}
```

前端主状态继续用 `rev` 快速跳过。明信片图片通过 image endpoint 独立轮询。Agent skill 文档要同步更新，避免继续把 `rev` 当 `since`。

## 7. 大对象存储

| 内容 | Bucket | 表里存 |
|---|---|---|
| 打包照片 | `bag-photos` | `bags.items[].photo_path` / `thumbnail_path` |
| 明信片 AI 生图 | `postcard-art` | `postcards.image_path` |

规则：

- dataURL 只允许短暂进入 `/api/recognize` 或上传接口。
- dataURL 不写入 Postgres。
- 旧 `img:<id>` / `img:lock:<id>` KV key 在迁移完成后退役。
- 媒体状态独立更新，不 bump `pets.rev`。

## 8. 旧数据映射

| 旧数据 | 新位置 |
|---|---|
| `User.id` | `users.legacy_id` 可选，或迁移映射表 |
| `User.supabaseUserId` | `users.supabase_user_id` |
| `User.email` | `users.email` |
| `User.bindToken` | `agent_tokens.token_hash` |
| `User.petId` | `pets.legacy_id` |
| `companion.id` | `pets.legacy_companion_id` |
| `companion.name` | `pets.name` |
| `companion.type` | `pets.species` |
| `companion.primaryColor` | `pets.primary_color` |
| `companion.personality` | `pets.personality` |
| `companion.accessory` | `pets.accessory` |
| `capyState` | `pets` 数值列 / `traits` / `memories` |
| `companionState` | `pets.state` |
| `packedBag` | `bags(status='ready')` |
| `activeTrip` | `trips(status='started')` + `pets.active_trip_id` |
| `postcards[]` | `postcards` |
| `battles[]` | `battles` |
| `souvenirs[]` | `activities.payload` 派生，或后续 `pet_artifacts` |
| `misunderstandings[]` | `activities.payload` 派生，或后续专表 |
| `lastResult` | 最近一条成长 action/detail 组装为 DTO |
| `pendingPostcardId` | `postcards.collected=false` |
| `pendingMessage` | `pets.pending_message` |
| `lastActionDay` | `pets.last_action_day` |
| `events[]` | `activities` |
| `rev` | `pets.rev` |
| `updatedAt` | `pets.updated_at` |

已删除或不下沉：

| 旧字段 / 功能 | 处理 |
|---|---|
| `diary[]` | 已下线，不建表 |
| `secretProgress` | 半成品，不迁云端 |

## 9. 迁移路径

### 阶段 1：文档和 DDL

- 收敛本文剩余决策。
- 建 `supabase/migrations`，作为唯一 migration 来源。
- 写 schema、indexes、check、trigger。
- 建 `updated_at` trigger。

本地运行策略：

- 有 Supabase CLI：`supabase db reset` 或 `supabase migration up`。
- 没有 Supabase CLI：普通 PostgreSQL 直接用 `psql "$POSTGRES_URL" -f supabase/migrations/<file>.sql` 跑同一份 SQL。
- demo 阶段暂不引入复杂 migration runner；两位开发者按文件名顺序执行即可。

### 阶段 2：回填脚本

Postgres KV：

```sql
select k, v
from capy_kv
where k like 'user:%'
   or k like 'pet:%'
   or k like 'sb:%'
   or k like 'dev:%'
   or k like 'bind:%';
```

Redis / Upstash：

- demo 阶段暂不做自动回填。
- 如果未来确实需要迁 Redis/Upstash，再加 SCAN 或先在旧写入层补索引集合：`idx:users`、`idx:pets`。

回填要求：

- 新表 UUID 主键。
- 旧字符串 id 写进 `legacy_id` 或迁移映射。
- bind token 只写 hash。
- dataURL 图片不入库。
- 历史 demo 包裹里的 dataURL 可以不强迁，只保留 label、hint、keyword、color、tags 等文本信息。
- 当前业务未上线，demo 数据允许直接丢弃；回填脚本不是第一批阻塞项。

### 阶段 3：双读比对

- 新 repository 从多表组装 `CloudSaveDTO`。
- 同一用户读取旧 KV 和新表 DTO。
- 比对 companion、stats、bag、trip、postcards、battles、pending flags、rev。

### 阶段 4：切写

- 动作 API 改为事务写新表。
- 短期可双写旧 KV，便于回滚。
- 前端仍接收旧 `CloudSaveDTO`。

### 阶段 5：媒体切换

- 打包照片上传 Storage。
- 明信片 AI 图上传 Storage。
- 停止写 `img:<id>` / `img:lock:<id>`。

### 阶段 6：退役旧 KV

- 观察稳定后停止双写。
- 保留快照一段时间。
- 删除或忽略旧 `capy_kv`、`capy_kv_set`、`img:*`。

## 10. 回滚策略

- 迁移前导出 `capy_kv` 快照。
- 双读阶段不改旧写入。
- 切写初期保留旧 KV 双写。
- 如新 repository 出问题，关闭新写入，恢复旧 `store.ts` KV 读写。
- 不立即删除旧 blob 和图片 key。

## 11. 安全与 RLS

第一阶段：

- 服务端使用 service role / server connection 访问数据库。
- Agent API 仍走服务端 token 鉴权。
- RLS 可以先 disabled 或只写 skeleton。

未来网页直连 Supabase 时：

- owner 数据：`owner_id = auth.uid()` 或通过 `users.supabase_user_id = auth.uid()` 约束。
- 排行榜：public read-only view，只暴露有限列。
- Agent token 不属于 Supabase Auth，仍必须走服务端。

## 12. 活动日志清理

永久保留：

- `adopt`
- `travel`
- `battle`
- `challenged`

可清理：

- 90 天前的 `pat`
- 90 天前的 `say`
- 90 天前的 `pack`
- 90 天前的 `restyle`

清理前提：

- 长期事实已经落到 `pets`、`postcards`、`battles` 或后续专表。
- 不从可清理 activity 唯一派生永久收藏。

## 13. 下一步执行清单

1. 建 `supabase/migrations`，写第一版 schema migration。
2. 定下 legacy id 映射细节；demo 阶段可先不回填。
3. 接业务前实现 token 生成：`capy_ag_` 前缀 + HMAC-SHA256 hash。
4. 接业务前实现 SQL repository。
5. 写 repository 的只读 DTO 组装。
6. 写 KV -> 新表回填脚本。
7. 做双读比对。
8. 切动作事务写入。
9. 切 Storage。
10. 上 PVP 匹配和排行榜。
