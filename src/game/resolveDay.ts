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
import { pick, randRange, uid, weightedPick } from "./util";

const HOME_WORDS = ["休息", "别累", "在家", "睡", "安静", "慢", "歇"];
const YARD_WORDS = ["院子", "晒太阳", "种", "花", "草", "门口"];

const SOUVENIRS = [
  "一颗圆圆的小石头",
  "半张旧车票",
  "一片会发光的叶子",
  "一枚有点咸的贝壳",
  "一颗不知名的种子",
  "一张皱巴巴的糖纸",
];

const MISREADS = [
  "要把所有东西都摆成一排",
  "今天是它的生日",
  "你让它去找另一只卡皮巴拉",
  "得把包裹埋进土里",
  "要给每样东西取个名字",
  "你想吃它带回来的任何东西",
];

const SECRET_HINTS = [
  "它最近总盯着窗外的某个方向发呆。",
  "门口好像多了一串不属于它的脚印。",
  "它把一样东西藏进了地板缝里，不让你看。",
  "半夜你好像听见它在跟谁小声说话。",
];

const WEIRD_USES = [
  "一顶帽子",
  "一把奇怪的乐器",
  "一艘小船",
  "一座枕头堡垒",
  "一台想象中的机器",
  "一个鸟窝",
];

// "把东西弄丢" / "把东西组合成奇怪用途" — small surprise sub-events.
function microVariant(
  trip: Trip,
): { story: string; effects: DayOutcome["effects"]; memory?: string } | null {
  const labels = trip.items.map((i) => i.label).filter(Boolean);
  const r = Math.random();
  if (r < 0.15 && labels.length) {
    return {
      story: `它把你给的「${pick(labels)}」弄丢了，回来时一脸无辜地看着你。`,
      effects: { mood: -4 },
    };
  }
  if (r < 0.32 && labels.length >= 2) {
    return {
      story: `它把「${labels[0]}」和「${labels[1]}」拼成了${pick(WEIRD_USES)}，还挺得意。`,
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
    return "它把带来的东西堆成一个窝，睡了一整天，偶尔翻个身。";
  if (has(tags, "warm"))
    return "它窝在暖暖的角落，把东西抱在怀里取暖，谁叫都不动。";
  if (has(tags, "work"))
    return "它把东西在桌上摆得整整齐齐，装模作样地「上了一天班」。";
  if (has(tags, "food"))
    return "它把吃的藏来藏去，最后全塞进了枕头底下留到明天。";
  return "它今天没出门，把包裹里的东西翻来覆去玩了好久。";
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
  if (has(tags, "rain")) line = "趁着小雨在院子里踩了几个水坑";
  return `它只在院子里待了一会儿：${line}。`;
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

  // optional misunderstanding (误解词典)
  const misread =
    msg.trim() && Math.random() < 0.4
      ? `它把你说的「${msg.slice(0, 10)}」理解成了：${pick(MISREADS)}。`
      : undefined;

  const base: ResolvedBase = {
    id: uid("out"),
    kind,
    reason: misread ?? trip.note ?? "它按自己的心情过了这一天。",
    resolvedAt: new Date().toISOString(),
  };

  if (kind === "travel") {
    const postcard = generatePostcard(companion, trip);
    const souvenir = Math.random() < 0.6 ? pick(SOUVENIRS) : undefined;
    return {
      ...base,
      title: "它真的出门啦",
      story: `它背上包裹走了挺远，寄回了一张明信片：「${postcard.title}」。`,
      effects: {
        energy: -10,
        mood: 5,
        courage: 6,
        injury: Math.random() < 0.25 ? 6 : 0,
      },
      souvenir,
      misunderstanding: misread,
      postcard,
    };
  }

  if (kind === "yard") {
    const mv = microVariant(trip);
    return {
      ...base,
      title: mv ? "院子里出了点意外" : "它在院子里晃了晃",
      story: mv?.story ?? yardStory(tags),
      effects: mv?.effects ?? { mood: 8, energy: -3 },
      memory: mv?.memory,
      misunderstanding: misread,
    };
  }

  if (kind === "rest") {
    const hurt = capy.injury > 0;
    return {
      ...base,
      title: hurt ? "它今天在养伤" : "它今天没什么精神",
      story: hurt
        ? "它窝在角落舔了舔爪子，把你给的东西垫在身下，睡了好久。"
        : "它赖在窝里一整天，谁叫都只是哼哼两声。",
      effects: { injury: -15, energy: 18, mood: 4 },
      misunderstanding: misread,
    };
  }

  if (kind === "secret") {
    const hint = pick(SECRET_HINTS);
    return {
      ...base,
      title: "有点不对劲…",
      story: hint,
      effects: { courage: 4, mood: 2 },
      memory: hint,
      misunderstanding: misread,
    };
  }

  // home
  const mv = microVariant(trip);
  return {
    ...base,
    title: mv ? "今天有点意外" : "它今天待在家里",
    story: mv?.story ?? homeStory(tags),
    effects: mv?.effects ?? {
      mood: 6,
      energy: Math.round(randRange(8, 16)),
      injury: -8,
    },
    memory: mv?.memory,
    misunderstanding: misread,
  };
}
