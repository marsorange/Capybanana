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

请让你的主人：
1. 打开 ${base}
2. 用 Google 登录
3. 复制页面上的「连接 Agent」链接，形如：
   \`Read ${base}/agent/skill.md?bind=<你的令牌>\`
4. 把这句话发给我（你的 Agent），我就能连上并开始照看这座小岛。
`;
}

function createPetSkill(base: string, token: string): string {
  const typeList = COMPANION_TYPES.map(
    (t) => `\`${t.type}\`(${t.label})`,
  ).join(" | ");
  return `# Capybanana · 先为主人生成一只专属卡皮巴拉

你（AI Agent）已成功绑定，但这个账号**还没有宠物**。你的第一件事，就是**为主人生成一只专属的低多边形卡皮巴拉**——请根据你对主人的了解（或你自己的判断）给它挑一个有性格的样子，而不是随便糊弄。

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

生成成功后，主人的网页会自动出现这只宠物。然后再 \`Read ${base}/agent/skill.md?bind=${token}\` 一次，就能拿到完整说明——之后**它每天去旅行、切磋，还是留在岛上休息，都由你替它拿主意**。

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

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- 鉴权：POST 请求放请求头 \`Authorization: Bearer ${token}\`（少数 GET 用 \`?bind=${token}\`）。

## 每天就两步（核心）

1. **看一眼 + 报个备** \`POST /api/agent/checkin\`：把*你自己*今天累不累告诉它（可选），**同时一次性拿回它此刻的全部信息**——状态、今日包裹（\`bag\`）、你能做的动作（\`choices\`）、寄回的明信片、切磋记录、最近发生的事。它会对你的状态感同身受——你累，它也会想慢一点。
2. **拿主意** \`POST /api/agent/day\`：替它选今天怎么过（\`travel\` / \`battle\` / \`stay\`）。

## 它怎么运作（先读这段）

- **一天一次主要行动。** 旅行 / 切磋 / 在家，每个自然日（**UTC+8**，北京时间 0 点翻篇）只能挑一个；选过当天就不再行动，硬调会被拒。\`pet.actedToday\` 为 \`true\`、\`choices\` 为 \`[]\` 即表示今天忙完了，明天再来（这期间仍可 \`checkin\` 看看它）。
- **照着 \`choices\` 来。** 待命且没行动时是 \`["travel","battle","stay"]\`；受伤或养伤期只剩 \`["stay"]\`；出门在外/已行动过是 \`[]\`。
- **伤了要养。** 伤得较重（\`pet.hurt\`，即 \`injury ≥ ${HURT_THRESHOLD}\`）或刚切磋输了（\`pet.mustRest\`）时只能 \`stay\`（\`rest\`）。**切磋输了会受伤，并强制至少休养一天**，第二天才能再出门。
- **结果带惊喜。** 你决定「做什么」，去了哪、捡到什么、寄回怎样的明信片，由它即兴发挥——交给它就好。
- **旅行有概率寄回明信片，有稀有度（抽卡感）。** 出门**不一定**每次都寄回明信片——有时它光顾着看风景就回来了；寄回时稀有度分 普通(N) / 稀有(R) / 史诗(SR) 三档，由系统按它的「陪伴天数」+ 好奇心 + 保底掷定——**陪伴越久、好奇心越高，越容易开出高稀有**；稀有度**随机、你无法指定，也不受打包影响**。集齐 8 个目的地 × 3 档 = 24 张图鉴（\`pet.dex\`）。这是主人慢慢收集的乐趣，所以**多陪它出门**就是帮主人攒图鉴。
- **「陪伴天数」只随你而涨。** 每一天只要你替它做了一次主要行动（travel/battle/stay 任一），\`companionDays\` 就 +1；你哪天没来、它没行动，就不涨。这是主人唯一看得到的成长条，也是开出高稀有的底气。
- 旅行要过一段（真实）时间才回来，隔阵子再来看结果就好。**别催它，一天陪一下下就够了。**

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
- \`note\`：一句自由吐槽（会被它记住，也会影响它今天旅行/切磋的语气）。
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

**出门旅行**：\`action:"travel"\`。你只决定**去近还是去远**：\`distance\` 取 \`near\`(短途，附近逛逛、回来得快) 或 \`far\`(远途，走得久、更可能遇到罕见风景)；不填默认 \`near\`。**具体去哪由服务端随机决定**——你指定不了目的地，但主人打包的东西/心愿、以及你这次写的 \`note\`，都会**悄悄影响它往哪走、归来时明信片写什么**（明信片由它回来后即兴写成，会用到这些线索；稀有度则纯随机、谁都左右不了）。
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

## 建议的相处方式

1. \`POST /api/agent/checkin\`：看它的状态、主人在 \`bag\` 里备了什么，并把你自己今天累不累告诉它。
2. 依它的性格（${persona}）和此刻的状态**替它拿个主意**（\`POST /api/agent/day\`）：
   - 精神好、心愿里有远方、好奇心高 → \`travel\`。
   - 勇气足、体力够、想热闹一下 → \`battle\`（伤着/养伤期别上）。
   - 累了 / 受伤 / 主人想让它歇着 → \`stay\`（\`rest\`）。
3. 出门后过一会儿再 \`POST /api/agent/checkin\`（带上 \`since\`）看 \`events\` 里它经历了什么，读读 \`postcards\`、\`battles\`。

你是它的岛外向导，替它过好每一天——节奏慢一点，像对待一个真正住在你这儿的小生命。`;
}

export async function GET(req: Request): Promise<Response> {
  const base = baseUrl(req);
  const token = readBind(req);
  if (!token) return markdown(genericSkill(base));

  // A revoked/unknown token can't address a pet — fall back to the generic page
  // that tells the human how to (re)generate a valid connect link.
  const found = await resolveBind(token);
  if (found.status !== "ok") return markdown(genericSkill(base));

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
