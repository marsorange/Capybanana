// LLM-decided travel details, generated at DEPARTURE from the day's full
// context (pet stats + bag + owner message + the agent's reported stress).
// Returns destination / duration / postcard *flavor*; stat effects stay the
// fixed table in resolveDay. Returns null on any failure so the engine falls
// back to the procedural planTrip()+generatePostcard().
import { DESTINATIONS, pickLandmark } from "@/game/destinations";
import { keywordsOf } from "@/game/packing";
import type {
  CapyState,
  Companion,
  DestinationTheme,
  PackedItem,
} from "@/game/types";
import { jsonComplete, llmConfigured } from "@/lib/openrouter";

const THEMES = DESTINATIONS.map((d) => d.theme);
const THEME_SET = new Set<string>(THEMES);

export interface TravelContext {
  companion: Companion;
  capy: CapyState;
  items: PackedItem[];
  message: string;
  stressNote?: string | null;
  preferred?: DestinationTheme; // agent-specified destination; honored if valid
}

export interface TravelStory {
  destination: DestinationTheme;
  durationHours: number;
  postcard: { title: string; message: string; landmark: string; reason: string };
}

const clampHours = (n: unknown): number => {
  const h = typeof n === "number" && Number.isFinite(n) ? n : 4;
  return Math.max(1, Math.min(12, Math.round(h)));
};

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : fallback;

function buildPrompt(ctx: TravelContext): string {
  const { companion: c, capy } = ctx;
  const things =
    ctx.items.map((i) => i.label).filter(Boolean).join("、") || "（空包裹）";
  const kws = keywordsOf(ctx.items).join("、");
  const themeList = DESTINATIONS.map((d) => `${d.theme}(${d.label})`).join(" ");
  return [
    `你在为一只低多边形小动物决定它今天的旅行。它叫「${c.name}」，是一只${c.personality}的${c.type}。`,
    `它的状态：体力 ${capy.energy} / 心情 ${capy.mood} / 勇气 ${capy.courage} / 好奇心 ${capy.curiosity} / 伤 ${capy.injury}。`,
    `主人给它打包了：${things}${kws ? `（关键词：${kws}）` : ""}。`,
    ctx.message ? `主人留言：「${ctx.message}」。` : "主人没有留言。",
    ctx.stressNote ? `照看它的 Agent 今天说：「${ctx.stressNote}」。可让旅程稍稍呼应这份心情。` : "",
    ctx.preferred
      ? `请安排它去「${ctx.preferred}」。`
      : `从这些目的地里挑一个最契合的：${themeList}。好奇心高就去远一点、新奇一点的地方。`,
    `时长按它的体力与距离给一个 1–12 小时的整数。`,
    `然后以它的口吻写一张寄回家的明信片（温柔、童真、可能把心愿理解得有点歪）。`,
    `只返回 JSON，不要多余文字：`,
    `{"destination":"<theme>","durationHours":<int>,"title":"<≤12字标题>","message":"<2-4句明信片正文>","landmark":"<一个真实著名地标名>","reason":"<一句它为什么去那里>"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Plan the trip via the LLM. null → caller should use the procedural fallback. */
export async function planTravelStory(
  ctx: TravelContext,
): Promise<TravelStory | null> {
  if (!llmConfigured()) return null;
  try {
    const raw = await jsonComplete<{
      destination?: string;
      durationHours?: number;
      title?: string;
      message?: string;
      landmark?: string;
      reason?: string;
    }>({
      system:
        "你是一个为陪伴养成小游戏写温柔短文案的助手，只输出 JSON。",
      prompt: buildPrompt(ctx),
    });

    const destination: DestinationTheme =
      ctx.preferred && THEME_SET.has(ctx.preferred)
        ? ctx.preferred
        : raw.destination && THEME_SET.has(raw.destination)
          ? (raw.destination as DestinationTheme)
          : (THEMES[Math.floor(Math.random() * THEMES.length)] as DestinationTheme);

    return {
      destination,
      durationHours: clampHours(raw.durationHours),
      postcard: {
        title: str(raw.title, "我出门走了走"),
        message: str(raw.message, "今天的风很轻，我想起了你。"),
        landmark: str(raw.landmark, pickLandmark(destination)),
        reason: str(raw.reason, "它把今天交给了风和脚步。"),
      },
    };
  } catch {
    return null; // network / parse / API error → procedural fallback
  }
}
