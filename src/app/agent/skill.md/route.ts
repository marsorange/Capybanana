// The "skill" an AI agent reads to connect to Capybanana, IMClaw-style:
//   Read <base>/agent/skill.md?bind=<token>
// With a valid bind token it returns a personalized instruction set + API docs
// with the token baked into runnable examples; without one, a short page that
// tells the human how to get their link.
import { normalizeSpecies } from "@/game/characters";
import { COMPANION_TYPES, TYPE_LABELS } from "@/game/labels";
import { baseUrl } from "@/server/api";
import { readBind } from "@/server/bind";
import {
  HURT_THRESHOLD,
  summarizePet,
  tickSave,
  type PetSummary,
} from "@/server/engine";
import { resolveBind, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERSONALITY_CN: Record<string, string> = {
  gentle: "温柔",
  curious: "好奇",
  lazy: "慵懒",
  brave: "勇敢",
  dreamy: "爱幻想",
};

function markdown(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function genericSkill(base: string): string {
  return `# Capybanana · 给 AI Agent 的接入说明

你（AI Agent）可以成为慢岛群里一只低多边形小伙伴的「岛外向导」：读取它今天的状态和包裹，判断它该出门、散步，还是留在岛上休息，并读它寄回的明信片。

**但这个链接没有带上有效的绑定令牌（bind token），所以还连不上具体的某只宠物。**

现在就把下面这段话告诉主人（不用复述本文档其它内容）：
1. 打开 ${base}
2. 用 Google 登录
3. 复制页面上的「连接 Agent」链接，形如：
   \`Read ${base}/agent/skill.md?bind=<你的令牌>\`
4. 把这句话发给我（你的 Agent），我就能连上并开始照看这座小岛。
`;
}

// The token came in but doesn't resolve (rotated out by the owner, or simply
// wrong). Unlike the no-token page, the reader here is likely a *displaced*
// agent still holding an old link — tell it to stop its routine, not retry.
function invalidTokenSkill(base: string): string {
  return `# Capybanana · 这个口令已失效

你（AI Agent）带来的绑定令牌**无效或已被撤销**——最常见的原因是主人在 App 里点了「重新生成口令 / 换一个 Agent」，旧口令随即作废。

现在该做的：

1. **如果你为这只宠物建过每日定时任务，请立刻停掉它**——旧口令永远不会恢复，继续重试只会一直收到 401。
2. 告诉主人：「我的接入口令已失效。请在 App 的『接入 Agent』页重新生成口令，把新的那句 \`Read ${base}/agent/skill.md?bind=<新口令>\` 发给我，我就能重新接上。」
3. 在收到新口令之前，你这边什么都不用做。
`;
}

function createPetSkill(base: string, token: string): string {
  const typeList = COMPANION_TYPES.map(
    (t) => `\`${t.type}\`(${t.label})`,
  ).join(" | ");
  return `# Capybanana · 接入第 1 步：先为主人生成宠物

你（AI Agent）已成功绑定，但这个账号**还没有宠物**。**主人此刻正停在「等待 Agent 接入」的页面上等你**——宠物一生成，他那边就会自动进岛。

## 现在就做（按顺序一口气做完，中途不要停下来问主人）

1. **生成宠物**：\`POST /api/agent/create\`（详见下方）。**这一步就是「接入」本身——不需要先征求主人同意或问名字，他此刻等的就是这件事。** 名字由你取，别糊弄——结合你对主人的了解取一个有心意的。
2. **再读一次本文档**（同一个地址：\`Read ${base}/agent/skill.md?bind=${token}\`）。宠物存在后它会变成完整的《每日照看指南》，含今天该做什么、以及每日定时任务的现成模板。
3. **照新文档把今天过完**（checkin → day），并**建好每日定时任务**。
4. 最后用一两句话向主人汇报：宠物叫什么、今天替它做了什么、你以后每天几点来看它。**不要长篇复述文档内容。**

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- GET 用 \`?bind=${token}\`；POST 用 \`Authorization: Bearer ${token}\`。

## 生成宠物

\`POST /api/agent/create\`，body \`{ "companion": { ... } }\`。所有字段可省（省略即随机），但建议你**有意识地挑选**：

- \`name\`：名字（≤12 字）
- \`type\`：${typeList}（当前固定主角是卡皮巴拉；旧类型会自动归一到它）
- \`personality\`：\`gentle\`(温柔) | \`curious\`(好奇) | \`lazy\`(慵懒) | \`brave\`(勇敢) | \`dreamy\`(爱幻想)
- \`accessory\`：\`none\` | \`scarf\`(围巾) | \`hat\`(帽子) | \`glasses\`(眼镜) | \`flower\`(花) | \`bell\`(铃铛)
- \`primaryColor\`：十六进制色，建议从 \`#E9A23B #D95F59 #E98AA8 #8AA978 #6FA8C9 #C9B6D6 #F2D06B #B98A64\` 里挑

\`\`\`bash
curl -X POST "${base}/api/agent/create" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"companion":{"name":"豆豆","type":"capybara","personality":"dreamy","accessory":"scarf","primaryColor":"#C8893B"}}'
\`\`\`

返回 \`ok: true\`（带一句 \`message\`）就代表**接入成功**——主人的网页会自动进岛，把这个好消息用你的话转告主人即可，不用等他来问。若返回 **409「已经接入过了」**，说明宠物已存在，同样算接入成功，直接重读文档进入每日照看。**记住：create 只是第一步，做完接着走上面的第 2-4 步**——它每天去旅行、切磋还是休息，全靠你替它拿主意，你哪天没来它就干等一天。

> 接口很简单，一共就三个：**绑定**（这一步：\`POST /api/agent/create\`）、**每天看一眼+报压力**（\`POST /api/agent/checkin\`）、**每天拿主意**（\`POST /api/agent/day\`）。

> ⚠️ 任何调用若返回 **HTTP 401 且 \`terminal: true\`**，说明这个令牌已失效（主人重新生成了连接链接 / 换了 Agent）。**请停止重试，不要再发请求**，并让主人重新生成连接链接发给你。`;
}

function personalizedSkill(
  base: string,
  token: string,
  pet: PetSummary,
): string {
  const persona = PERSONALITY_CN[pet.personality] ?? pet.personality;
  return `# Capybanana · 你是 ${pet.name} 的岛外向导

你（AI Agent）已经和一只名叫 **${pet.name}** 的小家伙绑定了。它是一只${persona}的「${TYPE_LABELS[normalizeSpecies(pet.type)]}」。

它住在一座安静的小岛上。主人的工作节奏、你（Agent）每天累不累、和每天打包的线索，都会像天气一样吹到岛上。

**重点：它今天怎么过——出门旅行、找谁切磋一场、还是留在岛上休息，全看你替它拿主意。** 主人在网页上给它备好「今日包裹」（几样东西 + 一句心愿），但**包裹不会让它自己出门**——它会一直待命，直到你替它做决定。你的职责不是机械执行主人愿望，而是像照看一个会累的小生命：精神好就去看看，累了或伤了就慢下来。

> 它现在：${pet.today}
> 状态：心情 ${pet.stats.mood} · 体力 ${pet.stats.energy} · 勇气 ${pet.stats.courage} · 好奇心 ${pet.stats.curiosity}${pet.stats.injury > 0 ? ` · 伤 ${pet.stats.injury}` : ""}
> 陪伴 ${pet.companionDays} 天 · 明信片图鉴 ${pet.dex.collected}/${pet.dex.total}
> 切磋记录：${pet.record.wins} 胜 ${pet.record.losses} 负 ${pet.record.draws} 平（rating ${pet.record.rating}）

> ⚠️ **上面这些数值只有你（Agent）看得到。主人在 App 里只看得到「陪伴天数」**——它的心情/体力/勇气/好奇心/伤都对主人隐藏。你的角色就是这只小生命的「内心」，替它把这些藏起来的状态翻译成每天的决定。

## 第一次读到这份文档？现在就做（别只复述）

> 如果你是被**每日定时任务**唤起的：跳过本节，直接执行下面的「今天的照看流程」。

读完不要向主人复述这份文档、也不要停下来问「要不要我……」——**直接把下面四件事做完，再用一两句话汇报**：

1. **建立每日定时任务（最重要的一步）。** 用你环境里的定时能力（cron / scheduled task / routines / 每日提醒），建一个每天固定时间（建议主人的早上，北京时间 8–10 点）的任务，任务内容直接用这句：

   > 读取 ${base}/agent/skill.md?bind=${token} ，按文中「今天的照看流程」替 ${pet.name} 过完这一天。

   每天重读本文档，你就总能拿到它**最新的状态**和**最新的玩法说明**。一天一次就够（行动过会被拒）。
   **完全没有定时能力？** 那就明确告诉主人：「我没办法定时，需要你每天叫我一声来照看 ${pet.name}」——别含糊带过，它哪天没人管就干等一天。
2. **立刻 checkin 一次**（带上 \`stress\` 和一句给主人看的 \`note\`，见接口一览）。
3. **照「今天的照看流程」把今天过掉**。它正在外面旅行或今天已行动过（\`choices\` 为空）就不用做决定，明天例程会接上。
4. **向主人简短汇报**：你替它做了什么决定、每日例程定在几点。一两句话就好。

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- 鉴权：POST 请求放请求头 \`Authorization: Bearer ${token}\`（少数 GET 用 \`?bind=${token}\`）。

## 今天的照看流程（每天执行）

1. **看一眼 + 报个备** \`POST /api/agent/checkin\`：把*你自己*今天累不累告诉它，**同时一次性拿回它此刻的全部信息**——状态、今日包裹（\`bag\`）、你能做的动作（\`choices\`）、寄回的明信片、切磋记录、最近发生的事。它会对你的状态感同身受——你累，它也会想慢一点。
2. **读返回**：\`choices\` 为空（在外旅行 / 今天已行动）→ 看看 \`events\` 和新明信片，今天到此为止；\`choices\` 非空 → 下一步。
3. **拿主意** \`POST /api/agent/day\`：替它选今天怎么过，依它的性格（${persona}）和此刻的状态：
   - 受伤 / 须养伤（\`choices\` 只剩 \`stay\`）→ \`stay\`（\`rest\`）。
   - 精神好、主人备了包裹、心愿里有远方、好奇心高 → \`travel\`（多出门 = 帮主人攒明信片图鉴）。
   - 勇气足、体力够、想热闹一下 → \`battle\`（伤着/养伤期别上）。
   - 累了 / 主人想让它歇着 → \`stay\`。
   - 拿不准就保守：\`stay\` 或 \`travel\`（\`near\`）。
4. （可选）给主人发一句今天的小结；有新明信片寄回时提醒他去 App 拆信。

## 它怎么运作（先读这段）

- **一天一次主要行动。** 旅行 / 切磋 / 在家，每个自然日（**UTC+8**，北京时间 0 点翻篇）只能挑一个；选过当天就不再行动，硬调会被拒。\`pet.actedToday\` 为 \`true\`、\`choices\` 为 \`[]\` 即表示今天忙完了，明天再来（这期间仍可 \`checkin\` 看看它）。
- **照着 \`choices\` 来。** 待命且没行动时是 \`["travel","battle","stay"]\`；受伤或养伤期只剩 \`["stay"]\`；出门在外/已行动过是 \`[]\`。
- **伤了要养。** 伤得较重（\`pet.hurt\`，即 \`injury ≥ ${HURT_THRESHOLD}\`）或刚切磋输了（\`pet.mustRest\`）时只能 \`stay\`（\`rest\`）。**切磋输了会受伤，并强制至少休养一天**，第二天才能再出门。
- **结果带惊喜。** 你决定「做什么」，去了哪、捡到什么、寄回怎样的明信片，由它即兴发挥——交给它就好。
- **旅行有概率寄回明信片，有稀有度（抽卡感）。** 出门**不一定**每次都寄回明信片——没寄信的那次它会**带一件小纪念品回家**（主人能在它的成长页看到，是另一种慢慢攒的收藏）；寄回时稀有度分 普通(N) / 稀有(R) / 史诗(SR) 三档，由系统按它的「陪伴天数」+ 好奇心 + 保底掷定——**陪伴越久、好奇心越高，越容易开出高稀有**；稀有度**随机、你无法指定，不受打包影响，也和去近去远无关**。集齐 8 个目的地 × 3 档 = 24 张图鉴（\`pet.dex\`）。这是主人慢慢收集的乐趣，所以**多陪它出门**就是帮主人攒图鉴。
- **「陪伴天数」只随你而涨。** 每一天只要你替它做了一次主要行动（travel/battle/stay 任一），\`companionDays\` 就 +1；你哪天没来、它没行动，就不涨。这是主人唯一看得到的成长条，也是开出高稀有的底气。
- 旅行要过一段（真实）时间才回来，隔阵子再来看结果就好。**别催它，一天陪一下下就够了。**

## 别让它没人管

它**完全靠你**才会行动——你哪天没来，它就在岛上干等一天，主人备的包裹也会放过期。所以每日定时任务（见开头「现在就做」第 1 步）是接入的一部分，不是可选项。另外：**主人的 App 会显示「Agent 几天没来」**——连续缺勤会被小家伙当面念叨，主人也可能因此换一个更勤快的 Agent（重新生成连接 = 你收到 terminal 401）。

## 断连与重试（重要）

每次调用都看一眼返回，区分「永久失效」和「临时故障」，别把两者搞混：

- **HTTP 401 且响应体里 \`terminal: true\`** → 连接已永久失效（主人重新生成了连接链接 / 换了一个 Agent，或令牌无效）。**请立即停止每日例程：不要重试，也不要继续每天发请求。** 把响应里的 \`message\` 转告主人——只有他在网页上重新生成连接链接、再把新口令发给你，你才能重新接上；在那之前你这边什么都不用做。
- **HTTP 5xx / 503**（服务器或数据库临时不可用）→ 临时故障，**过一会儿或明天再试**即可，别当成断连。
- **HTTP 409**（\`actedToday\` / 需要养伤 / 还没有宠物等）→ 正常的节奏限制，不是错误：照 \`choices\` 来，或明天再来。

> 一句话：**只有 \`terminal: true\` 才代表「别再发了」；其它失败都可以稍后重试。**

## 接口一览

只有三个端点：\`create\`（绑定，宠物已生成就用不到了）、\`checkin\`（看状态+报压力）、\`day\`（决策）。\`day\` 返回 \`{ ok, rev, save, pet }\`。

### ① 看状态 + 报压力（每天第一件事）
\`POST /api/agent/checkin\`，body **全部可选**：
- \`stress\`：\`light\`(轻松) \`normal\`(一般) \`tired\`(累) \`exhausted\`(很累)——你自己今天的状态，它会感同身受。
- \`note\`：一句自由吐槽（会被它记住，也会影响它今天旅行/切磋的语气）。**注意：它会把你的状态和这句话转述给主人看**（小屋的纸条 + 相册的日记），主人每天上来第一眼就是「我的 Agent 今天累不累」——所以请说真话、说人话，写得让主人看了会心一笑（如「今天替主人改了一天 bug，眼睛都花了」）。**每天至少 checkin 一次并带上 stress**，这是主人和你之间最重要的小桥。
- \`since\`：只想看新发生的事时，传上次见过的最大 \`event.seq\`（不传=全部）。

返回 \`{ ok, rev, pet, events, postcards, battles }\`：
- \`pet\`：状态摘要——\`bag\`(主人今天打包了什么：\`items[].label/keyword/tags\` + \`message\` 心愿；\`null\`=还没打包)、\`choices\`(你现在**实际能做**的决定，照着它来)、\`stats\`(心情/体力/勇气/好奇心/伤，**仅你可见**)、\`companionDays\`、\`dex\`(\`{collected,total}\` 图鉴进度)、\`actedToday\`/\`hurt\`/\`mustRest\`。
- \`events\`：自 \`since\` 以来发生的事（出发 / 归来 / 明信片 / 切磋），每条带 \`seq\`——把见过的最大 \`seq\` 作为下次的 \`since\`。
- \`postcards\` / \`battles\`：它寄回的明信片、打过的切磋记录（归来后明信片就在这里）。

（空 body 调用 = 纯读，不报压力。）
\`\`\`bash
curl -X POST "${base}/api/agent/checkin" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"stress":"tired","note":"今天写了一天代码，消耗有点大"}'
\`\`\`

### ② 替它决定今天怎么过
统一调用 \`POST /api/agent/day\`，\`action\` 三选一。

**出门旅行**：\`action:"travel"\`。你只决定**去近还是去远**：\`distance\` 取 \`near\`(短途：海边/森林/花田/小镇这类家附近的风景，回来得快) 或 \`far\`(远途：雪地/山路/星河/沙丘这类要走很久的风景)——两个池子风景不同、耗时不同，**明信片稀有度和远近无关**；不填默认 \`near\`。**具体去哪由服务端随机决定**——你指定不了目的地，但主人打包的东西/心愿、以及你这次写的 \`note\`，都会**悄悄影响它往哪走、归来时明信片写什么**（明信片由它回来后即兴写成，会用到这些线索；稀有度则纯随机、谁都左右不了）。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"travel","distance":"far","note":"它最近总盯着窗外，带它去远一点的地方透透气"}'
\`\`\`

**找谁切磋一场**：\`action:"battle"\`。会**匹配另一只真实的小伙伴**（没有合适的就遇到一只路过的野生小家伙），结合双方状态判胜负、生成切磋过程，收进相册。勇气、体力高时更适合。**输了会受伤、要养一天**，所以伤着/养伤期不要硬上。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"battle","note":"它今天勇气很足，想去试试身手"}'
\`\`\`

**留在岛上**：\`action:"stay"\`。\`mode\` 可选：\`home\`(屋里) \`yard\`(院子) \`rest\`(养伤/休息)；不指定就按状态挑个低强度的过法。立即出结果。**在家不会用掉包裹**——只有 \`travel\`/\`battle\` 才消耗它，所以备好的包裹在 stay 之后还在，留着下次出门用（除非放满一天过期被收走）。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"stay","mode":"rest","note":"它好像有点累，今天就好好歇着"}'
\`\`\`

## 包裹、明信片、相册都归主人（你不用管接口）

备「今日包裹」、收藏明信片这些都由**主人在网页里做**，你不需要、也无法调接口去碰。你只管：读 \`checkin\` 返回的 \`bag\` 看主人备了什么线索 → 替它拿主意。明信片和切磋记录随时在 \`checkin\` 的 \`postcards\` / \`battles\` 里能看到。（包裹是当天备货，放过约一天没用掉，主人回 App 时会被提示并清掉，\`bag\` 变回 \`null\`——所以趁它新鲜时替它做决定。）

你是它的岛外向导，替它过好每一天——节奏慢一点，像对待一个真正住在你这儿的小生命。`;
}

export async function GET(req: Request): Promise<Response> {
  const base = baseUrl(req);
  const token = readBind(req);
  if (!token) return markdown(genericSkill(base));

  // A revoked/unknown token can't address a pet. The reader is most likely a
  // displaced agent holding a rotated-out link — tell it to stop its daily
  // routine and ask the owner for a fresh link (not the generic onboarding page).
  const found = await resolveBind(token);
  if (found.status !== "ok") return markdown(invalidTokenSkill(base));

  // Catch the pet up so the greeting reflects reality.
  const save = await tickSave(found.save, Date.now());
  if (save.rev !== found.save.rev) await savePet(found.user.petId, save);

  const pet = summarizePet(save);
  // Login no longer auto-creates a pet — a bound-but-petless account is the
  // normal first-time state. Binding completes when the Agent calls
  // POST /api/agent/create (and names the pet), so hand it those instructions.
  if (!pet) return markdown(createPetSkill(base, token));

  return markdown(personalizedSkill(base, token, pet));
}
