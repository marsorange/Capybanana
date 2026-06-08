import { generatePostcard } from "./generatePostcard";
import { collectTags } from "./itemTags";
import type {
  CapyState,
  Companion,
  DayOutcome,
  ItemTag,
  OutcomeKind,
  Trip,
} from "./types";
import { pick, uid, weightedPick } from "./util";

const HOME_WORDS = ["休息", "别累", "在家", "睡", "安静", "慢", "歇"];
const YARD_WORDS = ["院子", "晒太阳", "种", "花", "草", "门口"];

// One obvious place for every action's stat change. Fixed small integers — easy
// to read and tune (see docs/core-gameplay.md §9). injury for travel is the only
// randomness, a single coin-flip below.
const EFFECTS: Record<
  Exclude<OutcomeKind, "battle">,
  DayOutcome["effects"]
> = {
  travel: { energy: -10, mood: 5, courage: 3, curiosity: 5 },
  home: { mood: 6, energy: 12, injury: -6 },
  yard: { mood: 8, energy: -3, curiosity: 3 },
  rest: { injury: -18, energy: 18, mood: 4 },
};

const TRAVEL_HURT_CHANCE = 0.25;
const TRAVEL_HURT_AMOUNT = 15;

const TRAIT_CHANCE = 0.12;
const TRAITS = [
  "爱晒太阳",
  "喜欢收集小石头",
  "胆子变大了一点",
  "对远方很好奇",
  "爱睡懒觉",
];

const SOUVENIRS = [
  "一颗圆圆的小石头",
  "半张旧车票",
  "一片会发光的叶子",
  "一枚有点咸的贝壳",
  "一颗不知名的种子",
  "一张皱巴巴的糖纸",
];

const WEIRD_USES = [
  "一顶帽子",
  "一把奇怪的乐器",
  "一艘小船",
  "一座枕头堡垒",
  "一台想象中的机器",
  "一个鸟窝",
];

/** Occasionally pick up a growth tag on a memorable day (keeps traits alive). */
function maybeTrait(existing: string[]): string | undefined {
  if (Math.random() >= TRAIT_CHANCE) return undefined;
  const fresh = TRAITS.filter((t) => !existing.includes(t));
  return fresh.length ? pick(fresh) : undefined;
}

// "把东西弄丢" / "把东西组合成奇怪用途" — small surprise sub-events.
function microVariant(
  trip: Trip,
): { story: string; effects: DayOutcome["effects"]; memory?: string } | null {
  const labels = trip.items.map((i) => i.label).filter(Boolean);
  const r = Math.random();
  if (r < 0.15 && labels.length) {
    return {
      story: `你给我的「${pick(labels)}」，我走丢了…回来只敢偷偷看你。`,
      effects: { mood: -4 },
    };
  }
  if (r < 0.32 && labels.length >= 2) {
    return {
      story: `我把「${labels[0]}」和「${labels[1]}」拼成了${pick(WEIRD_USES)}，挺得意的。`,
      effects: { mood: 6, courage: 3 },
      memory: `${labels[0]} + ${labels[1]} = 某种神秘装置`,
    };
  }
  return null;
}

function has(tags: ItemTag[], t: ItemTag): boolean {
  return tags.includes(t);
}
function any(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function homeStory(tags: ItemTag[]): string {
  if (has(tags, "sleep") || has(tags, "soft"))
    return "我把带来的东西堆成一个窝，睡了一整天，偶尔翻个身。";
  if (has(tags, "warm"))
    return "我窝在暖暖的角落，抱着东西取暖，谁叫都不想动。";
  if (has(tags, "work"))
    return "我把东西在桌上摆得整整齐齐，假装「上了一天班」。";
  if (has(tags, "food"))
    return "我把吃的藏来藏去，最后全塞进枕头底下，留到明天。";
  return "我今天没出门，把包裹里的东西翻来覆去玩了好久。";
}

function yardStory(tags: ItemTag[]): string {
  const acts = [
    "在院子里晒了好一会儿太阳",
    "挖了个小坑又自己填上",
    "给那盆花浇了点水",
    "追着一只虫子转圈",
    "把东西在台阶上摆成一道风景",
  ];
  let line = pick(acts);
  if (has(tags, "rain")) line = "趁着小雨踩了几个水坑";
  return `我只在院子里待了一会儿：${line}。`;
}

type ResolvedBase = Pick<DayOutcome, "id" | "kind" | "reason" | "resolvedAt">;

// A low-key day: only home / yard / rest, biased by the bag and how it feels.
// Used when the agent tells it to "stay" without a specific mode.
function pickQuietKind(capy: CapyState, tags: ItemTag[], msg: string): OutcomeKind {
  const weights = new Map<OutcomeKind, number>([
    ["home", 4],
    ["yard", 4],
    ["rest", 1],
  ]);
  const add = (k: OutcomeKind, n: number) =>
    weights.set(k, (weights.get(k) ?? 0) + n);
  if (capy.injury > 0) add("rest", 8);
  else if (capy.energy < 35) add("rest", 4);
  if (has(tags, "warm") || has(tags, "soft") || has(tags, "sleep")) add("home", 3);
  if (has(tags, "food") || has(tags, "toy")) add("yard", 3);
  if (has(tags, "rain")) add("home", 2);
  if (any(msg, YARD_WORDS)) add("yard", 4);
  if (any(msg, HOME_WORDS)) add("home", 4);
  return weightedPick(weights);
}

// Resolve the day's "kind" from the agent's decision. A concrete OutcomeKind is
// obeyed; "quiet" picks a low-key day.
function pickKind(
  capy: CapyState,
  tags: ItemTag[],
  msg: string,
  trip: Trip,
): OutcomeKind {
  const intent = trip.intent ?? "quiet";
  if (intent === "quiet") return pickQuietKind(capy, tags, msg);
  return intent; // a concrete OutcomeKind the agent asked for
}

export function resolveDay(
  companion: Companion,
  capy: CapyState,
  trip: Trip,
): DayOutcome {
  const tags = collectTags(trip.items);
  const msg = trip.message ?? "";

  const kind = pickKind(capy, tags, msg, trip);

  const base: ResolvedBase = {
    id: uid("out"),
    kind,
    reason: trip.note ?? "我按自己的心情，过了这一天。",
    resolvedAt: new Date().toISOString(),
  };

  if (kind === "travel") {
    const postcard = generatePostcard(companion, trip);
    const souvenir = Math.random() < 0.6 ? pick(SOUVENIRS) : undefined;
    const hurt = Math.random() < TRAVEL_HURT_CHANCE ? TRAVEL_HURT_AMOUNT : 0;
    return {
      ...base,
      title: "我真的出门啦",
      story: `我背上包裹走了挺远，给你寄了张明信片：「${postcard.title}」。`,
      effects: { ...EFFECTS.travel, injury: hurt },
      souvenir,
      trait: maybeTrait(capy.traits),
      memory: `我去过${postcard.locationName}，记得那里像「${postcard.title}」。`,
      postcard,
    };
  }

  if (kind === "yard") {
    const mv = microVariant(trip);
    return {
      ...base,
      title: mv ? "院子里出了点意外" : "我在院子里晃了晃",
      story: mv?.story ?? yardStory(tags),
      effects: mv?.effects ?? EFFECTS.yard,
      memory: mv?.memory,
      trait: maybeTrait(capy.traits),
    };
  }

  if (kind === "rest") {
    const hurt = capy.injury > 0;
    return {
      ...base,
      title: hurt ? "我今天在养伤" : "我今天没什么精神",
      story: hurt
        ? "我窝在角落舔舔爪子，把你给的东西垫在身下，睡了好久。"
        : "我赖在窝里一整天，谁叫都只哼哼两声。",
      effects: EFFECTS.rest,
    };
  }

  // home
  const mv = microVariant(trip);
  return {
    ...base,
    title: mv ? "今天有点意外" : "我今天待在家里",
    story: mv?.story ?? homeStory(tags),
    effects: mv?.effects ?? EFFECTS.home,
    memory: mv?.memory,
    trait: maybeTrait(capy.traits),
  };
}
