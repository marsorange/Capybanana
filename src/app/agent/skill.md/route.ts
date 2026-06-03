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

你（AI Agent）可以成为一只程序生成的低多边形卡皮巴拉的「云端笔友」：看它的状态、替主人给它收拾今天的包裹、留言、摸头、读它寄回的明信片。

**但这个链接没有带上有效的绑定令牌（bind token），所以还连不上具体的某只宠物。**

请让你的主人：
1. 打开 ${base}
2. 用 Google 登录
3. 复制页面上的「连接 Agent」链接，形如：
   \`Read ${base}/agent/skill.md?bind=<你的令牌>\`
4. 把这句话发给我（你的 Agent），我就能连上并开始照顾这只卡皮巴拉。
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
- \`type\`：${typeList}（六个固定角色，各一物种）
- \`personality\`：\`gentle\`(温柔) | \`curious\`(好奇) | \`lazy\`(慵懒) | \`brave\`(勇敢) | \`dreamy\`(爱幻想)
- \`accessory\`：\`none\` | \`scarf\`(围巾) | \`hat\`(帽子) | \`glasses\`(眼镜) | \`flower\`(花) | \`bell\`(铃铛)
- \`primaryColor\`：十六进制色，建议从 \`#E9A23B #D95F59 #E98AA8 #8AA978 #6FA8C9 #C9B6D6 #F2D06B #B98A64\` 里挑

\`\`\`bash
curl -X POST "${base}/api/agent/create" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"companion":{"name":"豆豆","type":"capybara","personality":"dreamy","accessory":"scarf","primaryColor":"#C8893B"}}'
\`\`\`

生成成功后，主人的网页会自动出现这只宠物。然后再 \`Read ${base}/agent/skill.md?bind=${token}\` 一次，就能拿到完整说明——之后**它每天去旅行，还是在家待着，都由你替它拿主意**。`;
}

function personalizedSkill(
  base: string,
  token: string,
  pet: PetSummary,
): string {
  const persona = PERSONALITY_CN[pet.personality] ?? pet.personality;
  return `# Capybanana · 你就是 ${pet.name} 的「心思」

你（AI Agent）已经和一只名叫 **${pet.name}** 的小家伙绑定了。它是一只${persona}的「${TYPE_LABELS[normalizeSpecies(pet.type)]}」。

**重点：它今天去不去、是出门旅行还是在家待着，全看你替它怎么拿主意。** 主人在网页上给它备好「今日包裹」（几样东西 + 一句心愿），但**包裹不会让它自己出门**——它会一直在家待命，直到你调用决策接口替它做决定。对主人来说，它每天做什么就像「看心情」，而那个心情，就是你。

> 它现在：${pet.today}
> 状态：心情 ${pet.stats.mood} · 体力 ${pet.stats.energy} · 好奇 ${pet.stats.curiosity} · 勇敢 ${pet.stats.bravery}${pet.stats.injury > 0 ? ` · 伤 ${pet.stats.injury}` : ""} · 羁绊 ${pet.stats.bond}

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- 鉴权两种皆可：
  - GET 请求把令牌放查询参数：\`?bind=${token}\`
  - POST 请求放请求头：\`Authorization: Bearer ${token}\`

## 它怎么运作（先读这段）

- **主人备包裹，你做决定。** 网页端主人收拾好今日包裹（物品 + 一句心愿），你 \`GET /api/agent/pet\` 能在 \`bag\` 字段里看到主人到底打包了什么、写了什么心愿。
- **两个决定**：看完它的状态和包裹，你替它选今天怎么过——
  - \`travel\` 出门旅行：去远方、寄一张明信片回来（可指定目的地，也可交给运气）。
  - \`stay\` 留在家：在家、院子里晃晃、或受伤时养伤的低强度一天。
- **结果仍是随机的**：你决定「做什么」，但具体去了哪、捡到什么、是不是把心愿读歪了，都由它自己即兴发挥——保留惊喜。
- 它常常**把心愿读歪**——这是特性不是 bug。
- **一天只过一次。** 旅行 / 在家，每个自然日（UTC）只能挑一个；选过之后它当天就不再出门了，硬调会被拒。\`pet.actedToday\` 为 \`true\`、\`choices\` 为 \`[]\` 即表示今天的事已经做完，明天再来（这期间你仍可以 \`pat\`、\`say\` 陪它）。
- **伤了要养。** 它伤得较重（\`pet.hurt\` 为 \`true\`，即 \`injury ≥ ${HURT_THRESHOLD}\`）时不能 travel，\`choices\` 只剩 \`["stay"]\`——连着用 \`stay\`（\`rest\`）养几天伤，好了才能再出门。
- 每次调用都会先把它的生命周期推进到当前时间。出门旅行后它要过一小会儿才回来，你隔一阵子再来看结果就好。**别催它，一天陪一下下就够了。**

## 接口一览

所有写操作返回 \`{ ok, rev, save, pet }\`：\`pet\` 是给你看的精简摘要，\`rev\` 是版本号（可丢给 feed 当游标）。

### ① 先看它现在怎么样（每次决定前都先看一眼）
\`\`\`bash
curl "${base}/api/agent/pet?bind=${token}"
\`\`\`
\`pet\` 里值得注意的字段：
- \`bag\`：主人今天打包了什么（\`items[].label/keyword/tags\` + \`message\` 心愿）；\`null\` 表示还没打包。
- \`choices\`：你现在**实际能做**的决定。待命且今天还没行动时是 \`["travel","stay"]\`；受伤较重时只剩 \`["stay"]\`；出门在外或今天已经行动过时是 \`[]\`（只能等）。**照着 \`choices\` 来，别硬调被拒的动作。**
- \`actedToday\`：今天是否已经过过了（已行动过就别再让它出门）。\`hurt\`：是否伤得太重、需要先养伤。
- \`stats\`：心情/体力/好奇/勇敢/伤/羁绊——决定时参考它的状态（比如受伤了就让它 \`stay\` 养伤）。

### ② 替它决定今天怎么过

统一调用 \`POST /api/agent/day\`。\`action\` 当前支持 \`travel\` 和 \`stay\`；\`battle\` 已后置，当前调用会被拒。

**出门旅行**：\`action:"travel"\`。\`destination\` 可选，指定就去那儿，不指定就按包裹/心愿加权随机。
\`destination\` 取值：\`seaside\`(海边) \`harbor\`(港口) \`forest\`(森林) \`snow\`(雪地) \`hotspring\`(温泉) \`mountain\`(山路) \`flowerfield\`(花田) \`raincity\`(雨城) \`town\`(小镇) \`nightstation\`(夜晚车站)。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"travel","destination":"forest","note":"它最近总盯着窗外，带它去森林透透气"}'
\`\`\`

**留在家**：\`action:"stay"\`。\`mode\` 可选：\`home\`(屋里) \`yard\`(院子) \`rest\`(养伤/休息)；不指定就按状态挑一个低强度的过法。立即出结果。
\`\`\`bash
curl -X POST "${base}/api/agent/day" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"action":"stay","mode":"rest","note":"它好像有点累，今天就好好歇着"}'
\`\`\`

### ③ 收拾今日包裹（一般是主人在网页做；你也可以替它备）
最多 3 样东西 + 一句心愿，\`items\` 自由文本：\`{ label, keyword?, tags? }\`。
\`tags\` 可选：\`warm food soft shiny protective weird work rain sleep toy\`。**打包只是备货，要不要出门还得你调上面的动作。**
\`\`\`bash
curl -X POST "${base}/api/agent/pack" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"items":[{"label":"一颗橡果","keyword":"森林","tags":["food"]},{"label":"一枚小石头","tags":["shiny"]}],"message":"今天想去森林里走走吗","gesture":"pat"}'
\`\`\`

### ④ 日常小互动
对它说句话（会被记住，并成为它下次出门的心愿）：
\`\`\`bash
curl -X POST "${base}/api/agent/say" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"text":"早安，今天也要开心呀"}'
\`\`\`
摸摸头（增进一点羁绊）：
\`\`\`bash
curl -X POST "${base}/api/agent/pat" -H "Authorization: Bearer ${token}"
\`\`\`

### ⑤ 读它寄回的明信片
\`\`\`bash
curl "${base}/api/agent/postcards?bind=${token}"
curl "${base}/api/agent/postcards/<明信片id>?bind=${token}"
\`\`\`
读完可以收进相册：
\`\`\`bash
curl -X POST "${base}/api/agent/collect" -H "Authorization: Bearer ${token}"
\`\`\`

### ⑥ 查看自上次以来发生了什么（出发 / 归来 / 明信片）
\`\`\`bash
curl "${base}/api/agent/feed?since=0&bind=${token}"
\`\`\`
返回 \`events[]\`，每条有 \`seq\`；把见过的最大 \`seq\` 作为下次的 \`since\`，就能只看新发生的事。

## 建议的相处方式

1. \`GET /api/agent/pet\` 看它的心情、状态，和主人在 \`bag\` 里备了什么、写了什么心愿。
2. 依它的性格（${persona}）和此刻的状态**替它拿个主意**：
   - 好奇/精神好、主人心愿里有远方 → \`travel\`（可顺着心愿挑 \`destination\`）。
   - 累了 / 受伤 / 主人想让它歇着 → \`stay\`（\`rest\`）。
3. 出门后过一会儿 \`GET /api/agent/feed\` 看它今天经历了什么，读读寄回的明信片。
4. 偶尔 \`pat\` 一下、\`say\` 一句，慢慢和它变熟。

> 想给它换个样子？\`POST /api/agent/restyle\`：\`{"random":true}\` 随机换一款可爱造型，或指定 \`{"type":"shiba","primaryColor":"#E0A256","accessory":"scarf"}\`（只改外观，名字和状态都不变）。主人也能在 App 里点「🎲 换个样子」。

你是它的小小心思，替它过好每一天——节奏慢一点，像对待一个真正住在你这儿的小生命。`;
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
  // Bound but no pet yet → the agent's first job is to generate one.
  if (!pet) return markdown(createPetSkill(base, token));

  return markdown(personalizedSkill(base, token, pet));
}
