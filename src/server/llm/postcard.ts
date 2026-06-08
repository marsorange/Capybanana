// LLM-written travel postcard, composed at RETURN time — i.e. AFTER the gacha
// rarity has been rolled and the card's canonical landmark is fixed. That timing
// is what makes it both consistent (the model is told the exact landmark, so the
// front and the body never disagree) and actually persisted (it's written into
// the postcard row in the same save, unlike the old departure-time draft that
// had no column and was lost on reload).
//
// It weaves in everything the day actually carried: what the owner packed, the
// owner's wish, and the note the Agent sent with its `travel` call. Returns null
// on no-key/parse/timeout so the caller keeps the procedural fallback text.
import { getDestination } from "@/game/destinations";
import { keywordsOf } from "@/game/packing";
import type {
  CapyState,
  Companion,
  DestinationTheme,
  PackedItem,
  Rarity,
  TripDistance,
} from "@/game/types";
import { jsonComplete, llmConfigured } from "@/lib/openrouter";

export interface PostcardContext {
  companion: Companion;
  capy: CapyState;
  items: PackedItem[];
  message: string; // the owner's wish written into the bag
  note?: string | null; // the note the Agent sent with the travel call
  stressNote?: string | null; // the Agent's checkin 吐槽 for the day, if any
  destination: DestinationTheme;
  landmark: string; // the card's fixed landmark — the model MUST write about THIS place
  rarity: Rarity;
  distance: TripDistance;
}

export interface PostcardText {
  title: string;
  message: string;
  reason: string;
}

// A tone hint per rarity. The model is NOT told the tier name (the player never
// sees "SR" in the prose) — only how special the day felt.
const RARITY_TONE: Record<Rarity, string> = {
  N: "这是平平常常但温柔的一天，普通的小风景。",
  R: "今天遇到了一点小小的惊喜，比平时多一些光彩。",
  SR: "今天撞见了难得一遇的绝景，整段旅程都闪闪发亮、值得一辈子记得（但别直接说『稀有』或等级）。",
};

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : fallback;

function buildPrompt(ctx: PostcardContext): string {
  const { companion: c, capy } = ctx;
  const meta = getDestination(ctx.destination);
  const things =
    ctx.items.map((i) => i.label).filter(Boolean).join("、") || "（空包裹）";
  const kws = keywordsOf(ctx.items).join("、");
  return [
    `你来扮演一只叫「${c.name}」的低多边形小卡皮巴拉，性格${c.personality}。它刚出门旅行回来，要给主人写一张明信片。`,
    `这次去的地方是真实地标「${ctx.landmark}」（属于「${meta.label}」这类风景，${ctx.distance === "far" ? "走了很远" : "就在附近"}）。**明信片必须写的是这个地标**，不要编别的地名。`,
    `今天的气质：${RARITY_TONE[ctx.rarity]}`,
    `主人给它打包了：${things}${kws ? `（关键词：${kws}）` : ""}。请让明信片里**自然地用到这些东西**（被它带在路上、派上奇怪用场、或想起主人）。`,
    ctx.message ? `主人写的心愿：「${ctx.message}」。它可以呼应这句话，但也可能把心愿理解得有点歪——这很可爱。` : "主人没有写心愿。",
    ctx.note ? `送它出门的人留了句话：「${ctx.note}」。可让旅程的语气稍稍呼应。` : "",
    ctx.stressNote ? `照看它的人今天说：「${ctx.stressNote}」。它会有点感同身受。` : "",
    `它的状态（影响语气，别直接报数字）：体力 ${capy.energy} / 心情 ${capy.mood} / 勇气 ${capy.courage} / 好奇心 ${capy.curiosity}。`,
    `全程用第一人称「我」写，像它在跟主人小声说话，温柔、童真、具体可感，别喊口号。`,
    `只返回 JSON，不要多余文字：`,
    `{"title":"<≤12字、有画面感的标题>","message":"<2-4句明信片正文，第一人称，写到地标和打包的东西>","reason":"<一句话，第一人称：我为什么去了那里 / 和包裹的关系>"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Compose the postcard via the LLM. null → caller keeps the procedural text. */
export async function composePostcard(
  ctx: PostcardContext,
): Promise<PostcardText | null> {
  if (!llmConfigured()) return null;
  try {
    const raw = await jsonComplete<{
      title?: string;
      message?: string;
      reason?: string;
    }>({
      system:
        "你是一个为陪伴养成小游戏写温柔短文案的助手，扮演一只小动物写明信片，只输出 JSON。",
      prompt: buildPrompt(ctx),
    });
    // Require a real body; a blank message means fall back to procedural text.
    if (!raw.message || !raw.message.trim()) return null;
    return {
      title: str(raw.title, "我出门走了走"),
      message: str(raw.message, "今天的风很轻，我想起了你。"),
      reason: str(raw.reason, "我把今天交给了风和脚步。"),
    };
  } catch {
    return null; // network / parse / API error → procedural fallback
  }
}
