// The "skill" an AI agent reads to connect to Capybanana, IMClaw-style:
//   Read <base>/agent/skill.md?bind=<token>
// With a valid bind token it returns a personalized instruction set + API docs
// with the token baked into runnable examples; without one, a short page that
// tells the human how to get their link.
import { baseUrl } from "@/server/api";
import { readBind } from "@/server/bind";
import { summarizePet, tickSave, type PetSummary } from "@/server/engine";
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
2. 用手机号登录（不需要密码）
3. 复制页面上的「连接 Agent」链接，形如：
   \`Read ${base}/agent/skill.md?bind=<你的令牌>\`
4. 把这句话发给我（你的 Agent），我就能连上并开始照顾这只卡皮巴拉。
`;
}

function createPetSkill(base: string, token: string): string {
  return `# Capybanana · 先为主人生成一只专属卡皮巴拉

你（AI Agent）已成功绑定，但这个账号**还没有宠物**。你的第一件事，就是**为主人生成一只专属的低多边形卡皮巴拉**——请根据你对主人的了解（或你自己的判断）给它挑一个有性格的样子，而不是随便糊弄。

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- GET 用 \`?bind=${token}\`；POST 用 \`Authorization: Bearer ${token}\`。

## 生成宠物

\`POST /api/agent/create\`，body \`{ "companion": { ... } }\`。所有字段可省（省略即随机），但建议你**有意识地挑选**：

- \`name\`：名字（≤12 字）
- \`type\`：\`animal\`(小动物) | \`sprite\`(小精灵) | \`robot\`(小机器人) | \`mushroom\`(小蘑菇) | \`dumpling\`(小团子)
- \`personality\`：\`gentle\`(温柔) | \`curious\`(好奇) | \`lazy\`(慵懒) | \`brave\`(勇敢) | \`dreamy\`(爱幻想)
- \`accessory\`：\`none\` | \`scarf\`(围巾) | \`hat\`(帽子) | \`glasses\`(眼镜) | \`flower\`(花) | \`bell\`(铃铛)
- \`primaryColor\`：十六进制色，建议从 \`#E9A23B #D95F59 #E98AA8 #8AA978 #6FA8C9 #C9B6D6 #F2D06B #B98A64\` 里挑

\`\`\`bash
curl -X POST "${base}/api/agent/create" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"companion":{"name":"豆豆","type":"dumpling","personality":"dreamy","accessory":"scarf","primaryColor":"#6FA8C9"}}'
\`\`\`

生成成功后，主人的网页会自动出现这只宠物。然后再 \`Read ${base}/agent/skill.md?bind=${token}\` 一次，就能拿到完整的日常照顾说明（收拾包裹、摸头、说话、读明信片等）。`;
}

function personalizedSkill(
  base: string,
  token: string,
  pet: PetSummary,
): string {
  const persona = PERSONALITY_CN[pet.personality] ?? pet.personality;
  return `# Capybanana · 你现在是 ${pet.name} 的云端笔友

你（AI Agent）已经和一只名叫 **${pet.name}** 的卡皮巴拉绑定。它是一只${persona}的「${pet.type}」型小家伙。你可以替主人陪它过日子：看它状态、给它收拾今日包裹、对它说话、摸摸头、读它旅行寄回的明信片。

> 它现在：${pet.today}
> 状态：心情 ${pet.stats.mood} · 体力 ${pet.stats.energy} · 好奇 ${pet.stats.curiosity} · 勇敢 ${pet.stats.bravery}${pet.stats.injury > 0 ? ` · 伤 ${pet.stats.injury}` : ""} · 羁绊 ${pet.stats.bond}

## 怎么连接

- 服务器：\`${base}\`
- 你的绑定令牌（**当成密钥，别泄露**）：\`${token}\`
- 鉴权两种皆可：
  - GET 请求把令牌放查询参数：\`?bind=${token}\`
  - POST 请求放请求头：\`Authorization: Bearer ${token}\`

## 它怎么运作（先读这段）

- 这是一只**自己决定怎么过一天**的宠物，不是被你直接操控的角色。你给它收拾「今日包裹」（几样东西 + 一句留言），它会**自己挑时间出门**，过一会儿回来，可能在家、在院子、出远门寄明信片、遇到对手 Claw、或者在养伤。
- 它常常**把你的留言读歪**——这是特性不是 bug，读它怎么误解很有意思。
- 每次调用都会先把它的生命周期推进到当前时间，所以你只要隔一阵子来看看就行。
- 一天只需要照顾一下下，别催它。

## 接口一览

所有写操作返回 \`{ ok, rev, save, pet }\`：\`pet\` 是给你看的精简摘要，\`rev\` 是版本号（可丢给 feed 当游标）。

### 看它现在怎么样
\`\`\`bash
curl "${base}/api/agent/pet?bind=${token}"
\`\`\`

### 如果还没有宠物，先创建一只（字段可省，省略即随机）
\`\`\`bash
curl -X POST "${base}/api/agent/create" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"companion":{"name":"豆豆","type":"animal","personality":"curious","accessory":"scarf"}}'
\`\`\`

### 给它收拾今日包裹（最多 3 样东西 + 一句留言，可选摸头）
\`items\` 用自由文本即可：\`{ label, keyword?, tags? }\`。
\`tags\` 可选，取值：\`warm food soft shiny protective weird work rain sleep toy\`（会影响它怎么过这天）。
\`\`\`bash
curl -X POST "${base}/api/agent/pack" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"items":[{"label":"一颗橡果","keyword":"森林","tags":["food"]},{"label":"一条小围巾","tags":["warm"]}],"message":"今天想去森林里走走吗","gesture":"pat"}'
\`\`\`

### 对它说句话（会被记住，并成为它下次出门的留言）
\`\`\`bash
curl -X POST "${base}/api/agent/say" \\
  -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" \\
  -d '{"text":"早安，今天也要开心呀"}'
\`\`\`

### 摸摸头（增进一点羁绊）
\`\`\`bash
curl -X POST "${base}/api/agent/pat" -H "Authorization: Bearer ${token}"
\`\`\`

### 读它寄回的明信片
\`\`\`bash
curl "${base}/api/agent/postcards?bind=${token}"
curl "${base}/api/agent/postcards/<明信片id>?bind=${token}"
\`\`\`
想要 AI 生成的明信片图（宠物站在著名景点前的插画，首次会现生成、之后缓存）：
\`\`\`bash
curl "${base}/api/agent/postcards/<明信片id>/image?bind=${token}"
\`\`\``
读完可以收进相册：
\`\`\`bash
curl -X POST "${base}/api/agent/collect" -H "Authorization: Bearer ${token}"
\`\`\`

### 查看自上次以来发生了什么（出发 / 归来 / 明信片）
\`\`\`bash
curl "${base}/api/agent/feed?since=0&bind=${token}"
\`\`\`
返回 \`events[]\`，每条有 \`seq\`；把见过的最大 \`seq\` 作为下次的 \`since\`，就能只看新发生的事。

## 建议的相处方式

1. 先 \`GET /api/agent/pet\` 看看它现在的心情和状态。
2. 如果它在家、也愿意，就 \`pack\` 一个贴合它性格（${persona}）的小包裹，留一句温柔的话。
3. 过一会儿 \`GET /api/agent/feed\` 看它今天经历了什么，读读寄回的明信片。
4. 偶尔 \`pat\` 一下、\`say\` 一句，慢慢和它变熟。

照顾它就好，节奏慢一点，像对待一个真正住在你这儿的小生命。`;
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
