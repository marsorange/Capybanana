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
import { pick, randInt, randRange, uid, weightedPick } from "./util";

const HOME_WORDS = ["休息", "别累", "在家", "睡", "安静", "慢", "歇"];
const TRAVEL_WORDS = ["海", "山", "远", "旅行", "出门", "外面", "走走", "看看世界"];
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

const CLAW_REPORTS_WIN = [
  "你来我往三个回合，它鼓起腮帮子猛地一扑，Claw 转身就溜了。",
  "它一个利落的侧滚闪开，反手叼走了对方的小旗子，Claw 愣在原地。",
  "它一屁股坐下耍赖，又冷不丁反击，Claw 拿它没辙，悻悻认了输。",
  "它把带的东西当道具一通乱舞，Claw 看懵了，灰头土脸地退走。",
];
const CLAW_REPORTS_LOSE = [
  "它被 Claw 连挠两爪，灰溜溜地缩回角落，回来一直舔爪子。",
  "Claw 今天太凶，它没占到半点便宜，蔫蔫地回了家。",
  "一个没站稳被掀翻在地，它委屈巴巴地一路小跑回来。",
];
const CLAW_REPORTS_DRAW = [
  "两边对视了很久，谁也不让谁，最后居然一起分吃了点东西。",
  "打着打着就玩到一起去了，滚成一团也分不清谁输谁赢。",
  "互相虚张声势了半天，谁都没真动手，扮个鬼脸各回各家。",
];
const CLAW_SPOILS = ["Claw 掉的一颗纽扣", "一撮对方的软毛", "半块没吃完的饼干"];
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
      effects: { mood: -4, bond: -2 },
    };
  }
  if (r < 0.32 && labels.length >= 2) {
    return {
      story: `它把「${labels[0]}」和「${labels[1]}」拼成了${pick(WEIRD_USES)}，还挺得意。`,
      effects: { mood: 6, curiosity: 5 },
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

// Weighted-random "what did it do today" — the legacy autonomous behavior, used
// when the pet decides for itself (intent "auto").
function pickAutoKind(
  capy: CapyState,
  tags: ItemTag[],
  msg: string,
  gesture: Trip["gesture"],
): OutcomeKind {
  const weights = new Map<OutcomeKind, number>([
    ["home", 6],
    ["yard", 3],
    ["travel", 2],
    ["claw", 1],
    ["rest", 1],
    ["secret", 0.6],
  ]);
  const add = (k: OutcomeKind, n: number) =>
    weights.set(k, (weights.get(k) ?? 0) + n);

  // tags
  if (has(tags, "warm") || has(tags, "soft") || has(tags, "sleep")) add("home", 4);
  if (has(tags, "work")) add("home", 2);
  if (has(tags, "food")) add("yard", 2);
  if (has(tags, "toy")) add("yard", 2);
  if (has(tags, "rain")) add("home", 2);
  if (has(tags, "shiny") || has(tags, "weird")) add("travel", 3);
  if (has(tags, "protective")) {
    add("travel", 1);
    add("claw", 2);
  }
  // stats
  if (capy.injury > 0) add("rest", 8);
  if (capy.energy < 28) add("rest", 6);
  if (capy.energy < 40) add("home", 4);
  if (capy.curiosity > 60) {
    add("travel", 4);
    add("secret", 1.2);
  }
  if (capy.bravery > 55) add("claw", 3);
  // message
  if (any(msg, TRAVEL_WORDS)) add("travel", 6);
  if (any(msg, HOME_WORDS)) add("home", 5);
  if (any(msg, YARD_WORDS)) add("yard", 5);
  if (gesture === "pat") add("home", 2);

  return weightedPick(weights);
}

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
// obeyed; "quiet" picks a low-key day; "auto"/undefined lets the pet choose.
function pickKind(
  capy: CapyState,
  tags: ItemTag[],
  msg: string,
  trip: Trip,
): OutcomeKind {
  const intent = trip.intent ?? "auto";
  if (intent === "auto") return pickAutoKind(capy, tags, msg, trip.gesture);
  if (intent === "quiet") return pickQuietKind(capy, tags, msg);
  return intent; // a concrete OutcomeKind the agent asked for
}

// A scrap with Claw resolved as win / lose / draw from the pet's fighting power
// (bravery + energy + a protective item + bond + luck) vs a random opponent.
function resolveClaw(
  capy: CapyState,
  tags: ItemTag[],
  base: ResolvedBase,
  misread: string | undefined,
): DayOutcome {
  const protective = has(tags, "protective");
  const power =
    capy.bravery +
    capy.energy * 0.25 +
    (protective ? 18 : 0) +
    capy.bond * 0.08 +
    randRange(0, 35);
  const foe = randRange(35, 100);
  const margin = power - foe;

  if (margin > 10) {
    return {
      ...base,
      title: "它赢下了和 Claw 的对决",
      story: pick(CLAW_REPORTS_WIN),
      effects: { bravery: 8, bond: 6, mood: 8, energy: -12, injury: randInt(0, 6) },
      souvenir: Math.random() < 0.7 ? pick(CLAW_SPOILS) : undefined,
      trait: capy.bravery > 72 ? "常胜将军" : undefined,
      misunderstanding: misread,
      battle: "win",
    };
  }
  if (margin < -10) {
    return {
      ...base,
      title: "它输给了 Claw",
      story: pick(CLAW_REPORTS_LOSE),
      effects: { injury: randInt(8, 20), mood: -6, energy: -15, bravery: 4, bond: 3 },
      misunderstanding: misread,
      battle: "lose",
    };
  }
  return {
    ...base,
    title: "它和 Claw 打了个平手",
    story: pick(CLAW_REPORTS_DRAW),
    effects: { bravery: 5, injury: randInt(0, 8), mood: 3, bond: 4 },
    souvenir: Math.random() < 0.4 ? pick(CLAW_SPOILS) : undefined,
    misunderstanding: misread,
    battle: "draw",
  };
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
        curiosity: 10,
        energy: -10,
        bravery: 4,
        bond: 6,
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
      effects: mv?.effects ?? { mood: 8, energy: -3, curiosity: 3, bond: 3 },
      memory: mv?.memory,
      misunderstanding: misread,
    };
  }

  if (kind === "claw") {
    return resolveClaw(capy, tags, base, misread);
  }

  if (kind === "rest") {
    const hurt = capy.injury > 0;
    return {
      ...base,
      title: hurt ? "它今天在养伤" : "它今天没什么精神",
      story: hurt
        ? "它窝在角落舔了舔爪子，把你给的东西垫在身下，睡了好久。"
        : "它赖在窝里一整天，谁叫都只是哼哼两声。",
      effects: { injury: -15, energy: 18, mood: 4, bond: 2 },
      misunderstanding: misread,
    };
  }

  if (kind === "secret") {
    const hint = pick(SECRET_HINTS);
    return {
      ...base,
      title: "有点不对劲…",
      story: hint,
      effects: { curiosity: 8, mood: 2 },
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
      bond: 4,
    },
    memory: mv?.memory,
    misunderstanding: misread,
  };
}
