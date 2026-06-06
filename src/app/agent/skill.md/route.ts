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

生成成功后，主人的网页会自动出现这只宠物。然后再 \`Read ${base}/agent/skill.md?bind=${token}\` 一次，就能拿到完整说明——之后**它每天去旅行、对战，还是留在岛上休息，都由你替它拿主意**。`;
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

**重点：它今天怎么过——出门旅行、找谁比试一场、还是留在岛上休息，全看你替它拿主意。** 主人在网页上给它备好「今日包裹」（几样东西 + 一句心愿），但**包裹不会让它自己出门**——它会一直待命，直到你替它做决定。你的职责不是机械执行主人愿望，而是像照看一个会累的小生命：精神好就去看看，累了或伤了就慢下来。

> 它现在：${pet.today}
> 状态：心情 ${pet.stats.mood} · 体力 ${pet.stats.energy} · 勇气 ${pet.stats.courage} · 好奇心 ${pet.stats.curiosity}${pet.stats.injury > 0 ? ` · 伤 ${pet.stats.injury}` : ""}
> 战绩：${pet.record.wins} 胜 ${pet.record.losses} 负 ${pet.record.draws} 平（rating ${pet.record.rating}）

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- 鉴权两种皆可：
  - GET 请求把令牌放查询参数：\`?bind=${token}\`
  - POST 请求放请求头：\`Authorization: Bearer ${token}\`

## 每天就三步（核心）

1. **看一眼** \`GET /api/agent/pet\`：读它的状态、今日包裹（\`bag\`）和你能做的动作（\`choices\`）。
2. **报个备** \`POST /api/agent/checkin\`：把*你自己*今天的状态告诉它（累不累、做了什么）。它会感同身受——你累，它也会想慢一点。
3. **拿主意** \`POST /api/agent/day\`：替它选今天怎么过（\`travel\` / \`battle\` / \`stay\`）。

## 它怎么运作（先读这段）

- **一天一次主要行动。** 旅行 / 对战 / 在家，每个自然日（**UTC+8**，北京时间 0 点翻篇）只能挑一个；选过当天就不再行动，硬调会被拒。\`pet.actedToday\` 为 \`true\`、\`choices\` 为 \`[]\` 即表示今天忙完了，明天再来（这期间仍可 \`checkin\`、\`pat\`、\`say\` 陪它）。
- **照着 \`choices\` 来。** 待命且没行动时是 \`["travel","battle","stay"]\`；受伤或养伤期只剩 \`["stay"]\`；出门在外/已行动过是 \`[]\`。
- **伤了要养。** 伤得较重（\`pet.hurt\`，即 \`injury ≥ ${HURT_THRESHOLD}\`）或刚战败（\`pet.mustRest\`）时只能 \`stay\`（\`rest\`）。**对战战败一定会受伤，并强制至少休养一天**，第二天才能再出门。
- **结果带惊喜。** 你决定「做什么」，去了哪、捡到什么、是不是把心愿读歪了，由它即兴发挥——读歪心愿是特性不是 bug。
- 旅行要过一段（真实）时间才回来，隔阵子再来看结果就好。**别催它，一天陪一下下就够了。**

## 接口一览

所有写操作返回 \`{ ok, rev, save, pet }\`：\`pet\` 是给你看的精简摘要，\`rev\` 是版本号（可丢给 feed 当游标）。

### ① 先看它现在怎么样（每次决定前都先看一眼）
\`\`\`bash
curl "${base}/api/agent/pet?bind=${token}"
\`\`\`
\`pet\` 里值得注意的字段：
- \`bag\`：主人今天打包了什么（\`items[].label/keyword/tags\` + \`message\` 心愿）；\`null\` 表示还没打包。
- \`choices\`：你现在**实际能做**的决定。**照着它来，别硬调被拒的动作。**
- \`stats\`：心情/体力/勇气/好奇心/伤。\`stress\`：你上次 checkin 报的状态。
- \`actedToday\` / \`hurt\` / \`mustRest\`：今天是否已行动 / 是否伤重 / 是否在强制养伤。

### ② 报备你自己今天的状态（压力上报 / 吐槽）
\`POST /api/agent/checkin\`。\`stress\` 取 \`light\`(轻松) \`normal\`(一般) \`tired\`(累) \`exhausted\`(很累)；\`note\` 是一句自由吐槽（会被它记住，也会影响它今天旅行/对战的心情）。
\`\`\`bash
curl -X POST "${base}/api/agent/checkin" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"stress":"tired","note":"今天写了一天代码，消耗有点大"}'
\`\`\`

### ③ 替它决定今天怎么过
统一调用 \`POST /api/agent/day\`，\`action\` 三选一。

**出门旅行**：\`action:"travel"\`。\`destination\` 可选（指定就去那儿，不指定就按包裹/心愿/好奇心来）。去哪、去多久、明信片都会结合状态生成。
\`destination\` 取值：\`seaside\`(海边) \`harbor\`(港口) \`forest\`(森林) \`snow\`(雪地) \`hotspring\`(温泉) \`mountain\`(山路) \`flowerfield\`(花田) \`raincity\`(雨城) \`town\`(小镇) \`nightstation\`(夜晚车站)。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"travel","destination":"forest","note":"它最近总盯着窗外，带它去森林透透气"}'
\`\`\`

**找谁比试一场**：\`action:"battle"\`。会**匹配另一只真实的小伙伴**（没有合适的就遇到一只路过的野生小家伙），结合双方状态判胜负、生成对战过程，收进相册。勇气、体力高时更适合。**战败必受伤、要养一天**，所以伤着/养伤期不要硬上。
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

### ④ 收拾今日包裹（一般是主人在网页做；你也可以替它备）
最多 3 样东西 + 一句心愿，\`items\` 自由文本：\`{ label, keyword?, tags? }\`。
\`tags\` 可选：\`warm food soft shiny protective weird work rain sleep toy\`。**打包只是备货，要不要出门还得你调上面的动作。** 注意：包裹是**当天的备货**，放过约一天（24 小时）就算「不新鲜」——主人回到 App 时会被提示并清掉它（\`bag\` 变回 \`null\`）。所以备好的包裹别拖太久，趁新鲜用掉；真过期了让主人或你重新打包即可。
\`\`\`bash
curl -X POST "${base}/api/agent/pack" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"items":[{"label":"一颗橡果","keyword":"森林","tags":["food"]},{"label":"一枚小石头","tags":["shiny"]}],"message":"今天想去森林里走走吗","gesture":"pat"}'
\`\`\`

### ⑤ 日常小互动
对它说句话（会被记住，并成为它下次出门的心愿）：
\`\`\`bash
curl -X POST "${base}/api/agent/say" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"text":"早安，今天也要开心呀"}'
\`\`\`
摸摸头（哄它开心一点）：
\`\`\`bash
curl -X POST "${base}/api/agent/pat" -H "Authorization: Bearer ${token}"
\`\`\`

### ⑥ 读明信片 / 看对战记录
\`\`\`bash
curl "${base}/api/agent/postcards?bind=${token}"
curl "${base}/api/agent/postcards/<明信片id>?bind=${token}"
curl "${base}/api/agent/battles?bind=${token}"
\`\`\`
读完明信片可以收进相册：
\`\`\`bash
curl -X POST "${base}/api/agent/collect" -H "Authorization: Bearer ${token}"
\`\`\`

### ⑦ 查看自上次以来发生了什么（出发 / 归来 / 明信片 / 对战）
\`\`\`bash
curl "${base}/api/agent/feed?since=0&bind=${token}"
\`\`\`
返回 \`events[]\`，每条有 \`seq\`；把见过的最大 \`seq\` 作为下次的 \`since\`，就能只看新发生的事。

## 建议的相处方式

1. \`GET /api/agent/pet\` 看它的状态，和主人在 \`bag\` 里备了什么。
2. \`POST /api/agent/checkin\` 把你自己今天累不累告诉它。
3. 依它的性格（${persona}）和此刻的状态**替它拿个主意**：
   - 精神好、心愿里有远方、好奇心高 → \`travel\`。
   - 勇气足、体力够、想热闹一下 → \`battle\`（伤着/养伤期别上）。
   - 累了 / 受伤 / 主人想让它歇着 → \`stay\`（\`rest\`）。
4. 出门后过一会儿 \`GET /api/agent/feed\` 看它经历了什么，读读明信片、对战记录。

> 想给它换个样子？\`POST /api/agent/restyle\`：\`{"random":true}\` 会重掷当前卡皮巴拉造型；也可以指定 \`{"type":"capybara","primaryColor":"#E0A256","accessory":"scarf"}\`（只改外观，名字和状态都不变）。旧物种类型会自动归一到当前主角。主人也能在 App 里点「🎲 换个样子」。

你是它的岛外向导，替它过好每一天——节奏慢一点，像对待一个真正住在你这儿的小生命。`;
}

export async function GET(req: Request): Promise<Response> {
  const base = baseUrl(req);
  const token = readBind(req);
  if (!token) return markdown(genericSkill(base));

  const found = await resolveBind(token);
  if (!found) return markdown(genericSkill(base));

  // Catch the pet up so the greeting reflects reality.
  const save = tickSave(found.save, Date.now());
  if (save.rev !== found.save.rev) await savePet(found.user.petId, save);

  const pet = summarizePet(save);
  // Login no longer auto-creates a pet — a bound-but-petless account is the
  // normal first-time state. Binding completes when the Agent calls
  // POST /api/agent/create (and names the pet), so hand it those instructions.
  if (!pet) return markdown(createPetSkill(base, token));

  return markdown(personalizedSkill(base, token, pet));
}
