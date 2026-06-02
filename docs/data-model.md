# Capybanana 数据模型设计（KV → 关系型）

> **状态：设计稿，尚未落地。** 目前线上仍是 KV 存储（`capy_kv` / `capy_kv_set` 两张通用表，
> 数据是一个 `pet:<id>` 大 JSON）。本文档描述**目标**关系型结构，作为后续建表 /
> migration 的评审基准。代码侧目前只完成了「日记功能移除」这一步清场。

---

## 0. 为什么要改

现状所有数据都塞在单个 `CloudSave` JSON 里，按 `pet:<id>` 取单条。这对单机养成够用，
但**社交（对战匹配 / 排行榜 / 好友）本质是跨用户查询，KV 做不到**。我们已经在用
Supabase（即 Postgres），所以把数据拆成真实关系表。

## 1. 关键决策

1. **迁到 Postgres 关系表**（不再是单个 JSON blob）。
2. **对战 = 异步「幽灵对战」(snapshot PvP)**：匹配别的用户宠物时取其**数据快照**对算，
   *不伤害、不扣对方分*，只有发起方涨/掉分、可能受伤；对方仅在时间线里收到一条
   `challenged`。避免离线被刷/被坑。（保留了对称双向所需的字段，未来想要有输有赢可切。）
3. **`activities` 升级为「全行为统一日志 + feed 游标」**：travel/battle/rest/pat/say/pack/
   restyle/adopt 全部记成一行；旅行/对战的富内容落到 `postcards`/`battles`，activities 用
   外键指过去，**不再重复写正文**。
4. **照片 / 明信片图走对象存储**（Supabase Storage），表里只存 path。

### 已砍掉（相比早期草案）

| 砍掉的东西 | 原因 / 去向 |
|---|---|
| `diaries` 表 + 日记功能 | 已下线（代码已拆） |
| `secret` 机制 + `secretProgress` | 半成品、云端吃不到；不再作为一种 `kind` |
| `events` 表 | 被 `activities` 吸收：feed 直接读 activities |
| `bag_items` 子表 | 合并成 `bags.items` 一个 jsonb 列 |
| `souvenirs[]` / `misunderstandings[]` 数组 | 从 `activities.payload` 派生 |
| `activities` 的 `UNIQUE(pet_id, day)` | 一天多条行为；「一天一次成长行动」改由 `pets.last_action_day` 拦 |

---

## 2. ER 总览

```
auth.users (Supabase 自带身份)
    │ 1:1
  users ───────1:1─────── pets ──┬──1:N── activities ──┬─0:1─► postcards
    │                             │       (全行为日志)    └─0:1─► battles
    │                             ├──1:N── bags                (打包)
(N:N 好友, 未来)                  └──(快照)── battles            (对战/匹配)
    │
friendships          battles.attacker_pet_id / defender_pet_id ──► pets
```

- 一个账号 = 1 条 `users` + 1 条 `pets`（`pets.owner_id` UNIQUE，唯一角色）。
- `activities` 是宠物的**时间线主干**，旅行/对战的细节挂在 `postcards`/`battles`，由
  `activities.postcard_id` / `battle_id` 单向指过去。
- `battles` 同时承担**社交对战**：两侧都引用 `pets`，并各存一份不可变快照。

建表依赖顺序：`users → pets → postcards → battles → bags → activities → friendships`。

---

## 3. 表定义

### 3.1 `users` — 用户

```sql
create table users (
  id            uuid primary key references auth.users(id) on delete cascade, -- 沿用 Supabase 身份
  email         text,
  display_name  text,
  bind_token    text unique not null,   -- Agent 密钥 + 网页瘦客户端凭证(原 bindToken)
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
```
> 密码/登录交给 Supabase Auth（`auth.users`，Google OAuth）。`bind_token` 想支持多 Agent /
> 轮换时再拆 `agent_tokens` 子表，现阶段一列够用。

### 3.2 `pets` — 角色（唯一角色 + 数值 + 战力 + 瞬时态）

```sql
create table pets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references users(id) on delete cascade, -- unique = 一人一宠

  -- 外观 / 性格
  name          text not null,
  species       text not null,        -- capybara|rabbit|duck|raccoon|shiba|sheep
  primary_color text not null,        -- #rrggbb
  personality   text not null,        -- gentle|curious|lazy|brave|dreamy
  accessory     text not null default 'none', -- none|scarf|hat|glasses|flower|bell

  -- 成长数值(原 CapyState)
  mood      int not null default 60,
  energy    int not null default 60,
  curiosity int not null default 50,
  bravery   int not null default 50,
  injury    int not null default 0,
  bond      int not null default 0,
  traits    text[] not null default '{}',   -- 习得性格(战斗/文案会读)
  memories  text[] not null default '{}',   -- 滚动保留最近 ~30 条

  -- 生命周期 / 匹配 / 瞬时态
  state            text not null default 'idle_home', -- idle_home|ready|traveling
  rating           int  not null default 1000,        -- 对战 MMR,匹配按它分段
  wins   int not null default 0,
  losses int not null default 0,
  draws  int not null default 0,
  last_action_day  date,        -- 当天成长行动(travel/battle/rest)花在哪个 UTC 日 → 一天一次
  pending_message  text,        -- agent "said" 的话,喂下次出行(原 pendingMessage)
  active_trip      jsonb,       -- 在途旅行瞬时态(出门→归来之间);null=不在途(原 activeTrip)

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on pets(rating);   -- 匹配分段扫描
create index on pets(state);
```

### 3.3 `bags` — 打包（items 直接 jsonb）

```sql
create table bags (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references pets(id) on delete cascade,
  message     text not null default '',   -- 心愿留言
  gesture     text,                        -- 'pat' | null
  items       jsonb not null default '[]', -- PackedItem[](见下)
  status      text not null default 'ready', -- ready|consumed|expired
  packed_at   timestamptz not null default now(),
  consumed_at timestamptz
);
create index on bags(pet_id, status);
```

`items` 每个元素（原 `PackedItem`）：
```jsonc
{
  "kind": "preset|photo|text",
  "preset": "food|camera|charm|gift|umbrella",   // kind=preset
  "label": "一颗橡果",
  "hint": "海一样的蓝",            // 可选
  "keyword": "森林",               // 可选,planTrip 偏置
  "color": "#88aa66",              // 可选,主色
  "tags": ["food","protective"],   // 可选,故事种子标签
  "photo_path": "bag-photos/<uid>.jpg"  // kind=photo → Storage 路径,不存 dataURL
}
```
> 当前 `packedBag` 只存一份;拆成表后**每天的包裹都留档**。「当前待命包裹」=该宠物
> `status='ready'` 的最新一条。

### 3.4 `activities` — 全行为统一日志 + feed 游标 ★

```sql
create table activities (
  id          bigint generated always as identity primary key, -- 单调游标,feed?since= 用它
  pet_id      uuid not null references pets(id) on delete cascade,
  actor       text not null,        -- owner | agent | world | pet  ← 谁触发的
  kind        text not null,        -- travel|battle|rest|home|yard|pat|say|pack|restyle|adopt
  day         date not null,        -- 发生在哪个 UTC 日("今天做了啥")
  title       text not null,        -- 一句话摘要(UI/Agent 直接读)
  detail      text,                 -- 富文本 story(可空,如休息日就没有)
  effects     jsonb not null default '{}', -- 本次数值变化 {mood,energy,curiosity,bravery,injury,bond}
  payload     jsonb,                -- 行为特有小数据:souvenir / misunderstanding / memory / trait / 留言文本…
  postcard_id uuid references postcards(id) on delete set null, -- kind=travel
  battle_id   uuid references battles(id)   on delete set null, -- kind=battle
  created_at  timestamptz not null default now()
);
create index on activities(pet_id, id);   -- feed 游标 + 时间线
create index on activities(pet_id, day);   -- "今天做了什么"
```

要点：
- **指针单向**：activities → postcards/battles（hub→detail），detail 表不回指，避免循环。
- **无 `UNIQUE(pet_id, day)`**：一天会有多条 pat/say/pack。「成长行动一天一次」靠
  `pets.last_action_day`（写 travel/battle/rest 时设当天）。
- **吸收了 events**：feed = `summarizePet` + `activities where pet_id=? and id > :since`。
- **保留期**：travel/battle 正本在 postcards/battles（永久）。activities 当画布历史；
  若 pat/say 太碎，可只 prune 90 天前的琐碎行（travel/battle 行建议永久保留）。

`kind` × `actor` 约定：

| kind | actor | postcard_id / battle_id | payload 常见键 |
|---|---|---|---|
| `adopt` | pet | — | — |
| `pack` | owner/agent | — | `bagId`, `items` 概要 |
| `say` | owner/agent | — | `text` |
| `pat` | owner/agent | — | — |
| `restyle` | owner/agent | — | `species`,`color`,`accessory` |
| `travel` | agent | `postcard_id` | `souvenir`,`misunderstanding`,`memory`,`trait` |
| `battle` | agent | `battle_id` | `spoils`,`memory`,`trait` |
| `rest`/`home`/`yard` | agent | — | `memory`,`trait` |
| `challenged`（被别人挑战）| world | `battle_id` | — |

### 3.5 `postcards` — 旅行明信片（= 旅行当日结果）

```sql
create table postcards (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references pets(id) on delete cascade,
  destination_theme text not null,  -- seaside|forest|snow|hotspring|harbor|mountain|flowerfield|raincity|town|nightstation
  location_name text not null,      -- 真实地标名,如 "埃菲尔铁塔"
  landmark      text,
  title         text not null,
  message       text not null,
  reason        text,
  image_prompt  text,
  image_status  text default 'pending',  -- pending|ready|error
  image_path    text,                     -- 生成图 → Storage 路径
  collected     boolean not null default false, -- 主人是否已收进相册(替代 pendingPostcardId)
  sent_at       timestamptz not null default now()
);
create index on postcards(pet_id, sent_at desc);
```
> 「待拆的明信片」= 该宠物 `collected=false` 的最新一条。

### 3.6 `battles` — 对战记录 + 社交匹配 ★

```sql
create table battles (
  id                uuid primary key default gen_random_uuid(),
  day               date not null,
  attacker_pet_id   uuid not null references pets(id) on delete cascade,
  defender_pet_id   uuid references pets(id) on delete set null, -- null = NPC「Claw」
  is_npc            boolean not null default false,
  -- 不可变快照:对方日后改了数值,这条记录也不变
  attacker_snapshot jsonb not null,   -- {name,species,color,bravery,energy,bond,rating,...}
  defender_snapshot jsonb not null,
  result            text not null,    -- 发起方视角:win|lose|draw
  attacker_rating_delta int not null default 0,
  defender_rating_delta int not null default 0, -- 幽灵模式恒为 0(留字段以备双向)
  attacker_injury   int not null default 0,
  spoils            text,             -- 战利品
  title             text not null,
  story             text not null,
  created_at        timestamptz not null default now()
);
create index on battles(attacker_pet_id, created_at desc);
create index on battles(defender_pet_id, created_at desc);
```
**「我的对战记录」** = `where attacker_pet_id = :me or defender_pet_id = :me`，含别人来挑战的场次。

### 3.7 `friendships` — 好友（未来，可选）

```sql
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending', -- pending|accepted|blocked
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);
```
> **排行榜不建表**：`select ... from pets order by rating desc limit 100`，量大再上物化视图。

---

## 4. 对战匹配流程（异步幽灵对战）

Agent 调 `POST /api/agent/battle` 时：

1. **校验**：`pets.last_action_day <> today`（今天还没花成长行动）；`injury` 没到不能打的阈值。
2. **找对手**（按 rating 分段随机，排除自己）：
   ```sql
   select * from pets
   where id <> :me
     and rating between :r - 150 and :r + 150
   order by random()
   limit 1;
   ```
   找不到就放宽分段；仍为空 → 回退 NPC「Claw」（`is_npc=true`，合成 `defender_snapshot`）。
3. **结算**：把现有 `resolveClaw`（勇敢 + 体力 + `protective` 物 + 羁绊 + 运气）升级成
   `resolvePvp`，用对手快照里的数值对算。
4. **写结果**（一个事务）：
   - 插入 `battles` 一行（双方快照不可变）。
   - 给发起方插入 `activities(kind=battle, actor=agent, battle_id=…)`，更新 `pets`（数值/
     `rating`±/`wins|losses|draws`/`last_action_day=today`）。
   - **幽灵模式下对方不动**（`defender_rating_delta=0`，不受伤），只给对方插入
     `activities(kind=challenged, actor=world, battle_id=…)`，进它的时间线/feed。

---

## 5. Feed 语义（取代 events 表）

```
GET /api/agent/feed?since=<activities.id>
```
返回：`summarizePet(pet)`（当前数值 + 当前 `ready` 包裹 + `pending_message`）
+ `select * from activities where pet_id=:me and id > :since order by id`。

把见过的最大 `id` 作为下次 `since`。`actor` 维度让 Agent 一眼分清
**owner 信号**（pack/say/pat/restyle）/ **world 事件**（challenged）/ **自己干的**（travel/battle/rest）。

---

## 6. 大对象存储

| 内容 | Bucket | 表里存 |
|---|---|---|
| 打包照片 | `bag-photos` | `bags.items[].photo_path` |
| 明信片 AI 生图 | `postcard-art` | `postcards.image_path` |

> 旧的 `img:<id>` / `img:lock:<id>` KV 键退役。dataURL **不入库**（行会被撑大）。

---

## 7. 旧 `CloudSave` → 新表 字段映射

| 旧（CloudSave / Companion / CapyState…） | 新位置 |
|---|---|
| `User{id,supabaseUserId,email,bindToken,petId,createdAt}` | `users`（petId 改为 `pets.owner_id` 反向） |
| `companion{name,type,primaryColor,personality,accessory,createdAt}` | `pets`（type→species） |
| `capyState{mood,energy,curiosity,bravery,injury,bond,traits,memories}` | `pets` 同名列 / `traits[]` / `memories[]` |
| `companionState` | `pets.state` |
| `packedBag` | `bags`（status='ready' 的最新一条） |
| `activeTrip` | `pets.active_trip`（jsonb 瞬时态） |
| `postcards[]` | `postcards` 表 |
| `battles[]`（对 Claw） | `battles` 表（`is_npc=true`） |
| `souvenirs[]` / `misunderstandings[]` | 从 `activities.payload` 派生 |
| `lastResult` | `activities` 里最近一条成长行动（无需独立列） |
| `pendingPostcardId` | `postcards.collected=false` 的最新一条 |
| `pendingMessage` | `pets.pending_message` |
| `lastActionDay` | `pets.last_action_day` |
| `events[]` | `activities` 表（吸收） |
| `diary[]` | **已删除** |
| `secretProgress` | **已删除** |
| `rev` / `updatedAt` | `pets.updated_at`（乐观并发可加 `pets.rev int`） |

---

## 8. 迁移路径（分阶段，低风险）

1. **建表**：上面 DDL 建到 Supabase（与现有 KV 并存）。
2. **回填**：一次性脚本遍历 KV 里所有 `user:` / `pet:` blob → 写进新表（数据量还小，一把过）。
3. **切读写**：`server/engine.ts` 的纯逻辑（`advanceLifecycle`/`resolveDay`/`applyOutcome`）
   基本不动，只改「读写存档」那层——服务端把多表拼成原 `CloudSave` 形状的 DTO 返回，
   客户端 `cloudPull` 几乎无感。
4. **上社交**：`resolvePvp` + 匹配 + 排行榜 +（可选）好友。
5. **退役** KV 的 `img:*` 键、`capy_kv`（迁移完成后）。

---

## 9. RLS / 安全

目前 DB 全走服务端（service role），RLS 可选。若以后让网页 `supabase-js` 直连读：
- `pets`/`postcards`/`activities`/`battles`：仅 `owner_id = auth.uid()` 可读写自己的；
- 排行榜：开一个只读视图暴露 `pets` 的有限列（name/species/rating/wins…），public select。

---

## 10. 待定 / 未来

- `pets.rev`：要不要给乐观并发加版本号（多端同时写时防覆盖）。
- 双向对战：把幽灵模式切成有输有赢（`defender_rating_delta`/`defender_injury` 已留位）。
- `friendships` 串门 / 好友赛。
- `activities` 琐碎行的 prune 策略（cron / 写时清理）。
- 纪念品 / 特产、成长阶段等远期玩法的承载（多半进 `pets` 列或 `activities.payload`）。
