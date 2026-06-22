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
// The owner's `locale` decides the postcard language.
import type { Locale } from "@/i18n/core";
import { destinationLabel } from "@/game/destinations";
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
  locale?: Locale; // language to write the postcard in (default zh)
}

export interface PostcardText {
  title: string;
  message: string;
  reason: string;
}

// A tone hint per rarity. The model is NOT told the tier name (the player never
// sees "SR" in the prose) — only how special the day felt.
const RARITY_TONE: Record<Locale, Record<Rarity, string>> = {
  zh: {
    N: "这是平平常常但温柔的一天，普通的小风景。",
    R: "今天遇到了一点小小的惊喜，比平时多一些光彩。",
    SR: "今天撞见了难得一遇的绝景，整段旅程都闪闪发亮、值得一辈子记得（但别直接说『稀有』或等级）。",
  },
  en: {
    N: "An ordinary but tender day, a small everyday view.",
    R: "A little surprise turned up today, a touch more shine than usual.",
    SR: "Today I stumbled on a once-in-a-lifetime sight; the whole trip glittered and is worth remembering forever (but never say 'rare' or name a tier).",
  },
};

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : fallback;

function buildPromptZh(ctx: PostcardContext): string {
  const { companion: c, capy } = ctx;
  const label = destinationLabel(ctx.destination, "zh");
  const things =
    ctx.items.map((i) => i.label).filter(Boolean).join("、") || "（空包裹）";
  const kws = keywordsOf(ctx.items).join("、");
  return [
    `你来扮演一只叫「${c.name}」的低多边形小卡皮巴拉，性格${c.personality}。它刚出门旅行回来，要给主人写一张明信片。`,
    `这次去的地方是真实地标「${ctx.landmark}」（属于「${label}」这类风景，${ctx.distance === "far" ? "走了很远" : "就在附近"}）。**明信片必须写的是这个地标**，不要编别的地名。`,
    `今天的气质：${RARITY_TONE.zh[ctx.rarity]}`,
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

function buildPromptEn(ctx: PostcardContext): string {
  const { companion: c, capy } = ctx;
  const label = destinationLabel(ctx.destination, "en");
  const things =
    ctx.items.map((i) => i.label).filter(Boolean).join(", ") || "(an empty bag)";
  const kws = keywordsOf(ctx.items).join(", ");
  return [
    `Play a low-poly little capybara named "${c.name}", personality: ${c.personality}. It just got back from a trip and is writing a postcard to its owner.`,
    `The place it visited is the real landmark "${ctx.landmark}" (a "${label}"-type scene, ${ctx.distance === "far" ? "very far away" : "nearby"}). **The postcard MUST be about this landmark** — do not invent other place names.`,
    `Today's mood: ${RARITY_TONE.en[ctx.rarity]}`,
    `The owner packed: ${things}${kws ? ` (keywords: ${kws})` : ""}. Let the postcard **use these things naturally** (carried along, put to some odd use, or sparking a thought of the owner).`,
    ctx.message ? `The owner's wish: "${ctx.message}". It may echo this, or adorably misunderstand it a little.` : "The owner left no wish.",
    ctx.note ? `Whoever sent it off left a note: "${ctx.note}". Let the trip's tone faintly echo it.` : "",
    ctx.stressNote ? `Its caretaker said today: "${ctx.stressNote}". It feels a little empathy.` : "",
    `Its state (affects tone — don't state numbers): energy ${capy.energy} / mood ${capy.mood} / courage ${capy.courage} / curiosity ${capy.curiosity}.`,
    `Write entirely in the first person ("I"), like it's whispering to its owner — gentle, childlike, concrete and sensory, no slogans.`,
    `Return JSON only, no extra text:`,
    `{"title":"<a vivid title, <= 6 words>","message":"<2-4 sentence postcard body, first person, mentioning the landmark and the packed things>","reason":"<one first-person sentence: why I went there / how it ties to the bag>"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Compose the postcard via the LLM. null → caller keeps the procedural text. */
export async function composePostcard(
  ctx: PostcardContext,
): Promise<PostcardText | null> {
  if (!llmConfigured()) return null;
  const locale: Locale = ctx.locale ?? "zh";
  try {
    const raw = await jsonComplete<{
      title?: string;
      message?: string;
      reason?: string;
    }>({
      system:
        locale === "en"
          ? "You write tender little copy for a cozy pet-raising game, role-playing a small animal writing a postcard. Output JSON only."
          : "你是一个为陪伴养成小游戏写温柔短文案的助手，扮演一只小动物写明信片，只输出 JSON。",
      prompt: locale === "en" ? buildPromptEn(ctx) : buildPromptZh(ctx),
    });
    // Require a real body; a blank message means fall back to procedural text.
    if (!raw.message || !raw.message.trim()) return null;
    const fb =
      locale === "en"
        ? {
            title: "I went for a wander",
            message: "The wind was soft today, and I thought of you.",
            reason: "I left today to the wind and my own feet.",
          }
        : {
            title: "我出门走了走",
            message: "今天的风很轻，我想起了你。",
            reason: "我把今天交给了风和脚步。",
          };
    return {
      title: str(raw.title, fb.title),
      message: str(raw.message, fb.message),
      reason: str(raw.reason, fb.reason),
    };
  } catch {
    return null; // network / parse / API error → procedural fallback
  }
}
