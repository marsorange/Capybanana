// Judge a friendly match between two pets. Hands both snapshots to the LLM for
// a winner + a process narrative; on no-key/failure falls back to a SIMPLE
// score compare (see docs/core-gameplay.md §9.2). Always returns a verdict.
// The owner's `locale` decides the language of the title/story/spoils.
import type { Locale } from "@/i18n/core";
import type { BattleResult, BattleSnapshot } from "@/game/types";
import { jsonComplete, llmConfigured } from "@/lib/openrouter";
import { pick, randInt } from "@/game/util";

export interface BattleContext {
  self: BattleSnapshot;
  opponent: BattleSnapshot;
  opponentIsNpc: boolean;
  stressNote?: string | null;
  locale?: Locale;
}

export interface BattleVerdict {
  result: BattleResult; // from `self`'s perspective
  title: string;
  story: string;
  injury: number; // injury `self` takes (0..40)
  spoils?: string;
}

// Simple, readable power score — courage leads, energy backs it, curiosity is a
// small wildcard. No weighted formulas beyond this.
function power(s: BattleSnapshot): number {
  return s.stats.courage + s.stats.energy + Math.round(s.stats.curiosity / 2);
}

function injuryFor(result: BattleResult): number {
  if (result === "lose") return randInt(16, 26);
  if (result === "draw") return randInt(8, 16);
  return randInt(3, 8);
}

const SPOILS: Record<Locale, string[]> = {
  zh: ["一枚对手的纽扣", "半块奖励饼干", "一根漂亮的羽毛", "一颗亮晶晶的弹珠"],
  en: ["a button from my rival", "half a victory cookie", "a pretty feather", "a glittering marble"],
};

function heuristic(ctx: BattleContext): BattleVerdict {
  const locale: Locale = ctx.locale ?? "zh";
  const diff = power(ctx.self) + randInt(0, 30) - (power(ctx.opponent) + randInt(0, 30));
  const result: BattleResult = diff > 8 ? "win" : diff < -8 ? "lose" : "draw";
  const opp = ctx.opponent.name;
  const story =
    locale === "en"
      ? result === "win"
        ? `I worked up my courage and charged in, and within a few rounds had ${opp} all flustered — a clean little win.`
        : result === "lose"
          ? `${opp} was tougher than I thought; I fought to the end but was always half a step behind, and came home a bit rumpled.`
          : `We chased each other back and forth for ages, neither getting the upper hand, and ended up in a giggling heap.`
      : result === "win"
        ? `我鼓起勇气冲上去，几个回合就把 ${opp} 逗得手忙脚乱，赢得漂漂亮亮。`
        : result === "lose"
          ? `${opp} 比我想的厉害，我拼到最后还是慢了半步，灰头土脸地回来了。`
          : `我俩你追我赶，闹了好一阵，谁也没占到便宜，最后笑作一团。`;
  const title =
    locale === "en"
      ? result === "win"
        ? "I won today!"
        : result === "lose"
          ? "I lost this one"
          : "We tied it up"
      : result === "win"
        ? "今天我赢啦"
        : result === "lose"
          ? "我输了一场"
          : "打成了平手";
  return {
    result,
    title,
    story,
    injury: injuryFor(result),
    spoils: result === "win" && Math.random() < 0.5 ? pick(SPOILS[locale]) : undefined,
  };
}

function describeZh(s: BattleSnapshot): string {
  return `「${s.name}」(${s.personality}的${s.species})：勇气 ${s.stats.courage} / 体力 ${s.stats.energy} / 好奇心 ${s.stats.curiosity} / 心情 ${s.stats.mood} / 伤 ${s.stats.injury}`;
}
function describeEn(s: BattleSnapshot): string {
  return `"${s.name}" (a ${s.personality} ${s.species}): courage ${s.stats.courage} / energy ${s.stats.energy} / curiosity ${s.stats.curiosity} / mood ${s.stats.mood} / injury ${s.stats.injury}`;
}

export async function judgeBattle(ctx: BattleContext): Promise<BattleVerdict> {
  const locale: Locale = ctx.locale ?? "zh";
  if (!llmConfigured()) return heuristic(ctx);
  try {
    const raw = await jsonComplete<{
      winner?: string; // "self" | "opponent" | "draw"
      title?: string;
      story?: string;
      injury?: number;
      spoils?: string;
    }>({
      system:
        locale === "en"
          ? "You are the referee of a friendly sparring match in a cozy pet-raising game. Output JSON only. The result mostly follows courage and energy, with room for a little surprise."
          : "你是一个陪伴养成小游戏里友好切磋的裁判，只输出 JSON。胜负主要看勇气与体力，但允许一点意外。",
      prompt:
        locale === "en"
          ? [
              `Two low-poly little animals had a friendly little spar.`,
              `My side: ${describeEn(ctx.self)}.`,
              `Opponent: ${describeEn(ctx.opponent)}${ctx.opponentIsNpc ? " (a wild little one passing by)" : ""}.`,
              ctx.stressNote ? `My caretaker Agent said today: "${ctx.stressNote}".` : "",
              `Decide who won, and write a gentle, childlike, non-violent 2-4 sentence account of the match in **my first person ("I")** (like it's telling its owner about the match back home). Give the injury my side takes as an integer 0-40 (smaller for a win, larger for a loss).`,
              `Return JSON only: {"winner":"self|opponent|draw","title":"<title <= 5 words, first person>","story":"<account, first person>","injury":<int>,"spoils":"<optional trophy, omit if none>"}`,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `两只低多边形小动物来了一场友好的小切磋。`,
              `我方 ${describeZh(ctx.self)}。`,
              `对手 ${describeZh(ctx.opponent)}${ctx.opponentIsNpc ? "（一只路过的野生小家伙）" : ""}。`,
              ctx.stressNote ? `照看我方的 Agent 今天说：「${ctx.stressNote}」。` : "",
              `判断谁赢，并以**我方第一人称「我」**写一段温和、童真、不血腥的 2-4 句过程描述（像它回家跟主人讲今天这场）。我方受的伤给 0-40 的整数（赢应较小，输应较大）。`,
              `只返回 JSON：{"winner":"self|opponent|draw","title":"<≤8字标题，第一人称>","story":"<过程，第一人称>","injury":<int>,"spoils":"<可选战利品，没有就省略>"}`,
            ]
              .filter(Boolean)
              .join("\n"),
    });

    const result: BattleResult =
      raw.winner === "self" ? "win" : raw.winner === "opponent" ? "lose" : "draw";
    const injury =
      typeof raw.injury === "number" && Number.isFinite(raw.injury)
        ? Math.max(0, Math.min(40, Math.round(raw.injury)))
        : injuryFor(result);
    const fb = heuristic({ ...ctx, locale });
    return {
      result,
      title:
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim().slice(0, 16)
          : fb.title,
      story:
        typeof raw.story === "string" && raw.story.trim()
          ? raw.story.trim().slice(0, 400)
          : fb.story,
      injury,
      spoils:
        typeof raw.spoils === "string" && raw.spoils.trim()
          ? raw.spoils.trim().slice(0, 40)
          : undefined,
    };
  } catch {
    return heuristic(ctx);
  }
}

// A wild NPC opponent conjured from the player's own level when the pool is
// empty — kept near the player's rating so it feels fair.
const NPC_NAMES: Record<Locale, string[]> = {
  zh: ["流浪的小灰", "爱炫耀的圆圆", "睡不醒的奶花", "蹦蹦跳跳的栗子", "雾港来的旅人"],
  en: ["Wandering Smudge", "Show-off Pudge", "Sleepy Cream", "Bouncy Chestnut", "The Traveler from Foggy Harbor"],
};
const NPC_SPECIES = ["capybara", "rabbit", "duck", "raccoon", "shiba", "sheep"] as const;
const NPC_PERSONALITY = ["gentle", "curious", "lazy", "brave", "dreamy"] as const;

export function makeNpcOpponent(
  self: BattleSnapshot,
  locale: Locale = "zh",
): BattleSnapshot {
  const jitter = (n: number) => Math.max(0, Math.min(100, n + randInt(-12, 12)));
  return {
    name: pick(NPC_NAMES[locale]),
    species: pick(NPC_SPECIES),
    personality: pick(NPC_PERSONALITY),
    accessory: "none",
    stats: {
      energy: jitter(self.stats.energy),
      mood: randInt(40, 80),
      courage: jitter(self.stats.courage),
      curiosity: randInt(30, 80),
      injury: 0,
    },
    traits: [],
    rating: self.rating,
  };
}
