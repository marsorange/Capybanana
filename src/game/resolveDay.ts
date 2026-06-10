import { getDestination, SOUVENIRS } from "./destinations";
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

// A trip only sometimes mails a postcard home — the rest come back as a quiet
// "I went out" day: no card, no gacha pull, but ALWAYS a souvenir (see
// noCardReturn), so an empty-handed return still feeds the owner's shelf.
const POSTCARD_CHANCE = 0.7;

const TRAIT_CHANCE = 0.12;
const TRAITS = [
  "爱晒太阳",
  "喜欢收集小石头",
  "胆子变大了一点",
  "对远方很好奇",
  "爱睡懒觉",
  "走路喜欢踩石头缝",
  "对会发光的东西没抵抗力",
  "学会了慢慢深呼吸",
  "喜欢把东西排整齐",
  "认得回家的每一条路",
];

const WEIRD_USES = [
  "一顶帽子",
  "一把奇怪的乐器",
  "一艘小船",
  "一座枕头堡垒",
  "一台想象中的机器",
  "一个鸟窝",
  "一座小小的瞭望塔",
  "一条过山车轨道",
  "一面会响的鼓",
  "一个秘密基地的门牌",
];

// What an earned trait sounds like when you tap the pet — the days you spent
// together, coming back out of its own mouth (the 养育感 payoff).
export const TRAIT_LINES: Record<string, string> = {
  爱晒太阳: "我现在最懂哪块地砖晒得最暖——这是跟你过日子攒下的本事。",
  喜欢收集小石头: "我的小石头又多了一颗，改天排成一排给你看。",
  胆子变大了一点: "今天的影子没吓到我。我是不是变勇敢了一点？",
  对远方很好奇: "远处的山后面是什么呢？我总是忍不住想。",
  爱睡懒觉: "再睡五分钟……我们说好的，就五分钟。",
  走路喜欢踩石头缝: "踩石头缝这件事，我已经是岛上最熟练的了。",
  对会发光的东西没抵抗力: "你有没有什么会发光的小东西？给我看一眼嘛。",
  学会了慢慢深呼吸: "吸——呼——你也跟我做一次，会舒服很多。",
  喜欢把东西排整齐: "我刚把台阶上的叶子按大小排整齐了，好看吗？",
  认得回家的每一条路: "不管走多远，回家的路我都认得，你放心。",
};

/** Occasionally pick up a growth tag on a memorable day (keeps traits alive). */
function maybeTrait(existing: string[]): string | undefined {
  if (Math.random() >= TRAIT_CHANCE) return undefined;
  const fresh = TRAITS.filter((t) => !existing.includes(t));
  return fresh.length ? pick(fresh) : undefined;
}

// Small surprise sub-events on a stay-at-home day. The bag stays by the door
// (stay never consumes it), so these are framed as BORROWING from it — never
// losing things for good, which would contradict the bag still sitting there.
function microVariant(
  trip: Trip,
): { story: string; effects: DayOutcome["effects"]; memory?: string } | null {
  const labels = trip.items.map((i) => i.label).filter(Boolean);
  const r = Math.random();
  if (r < 0.13 && labels.length) {
    const it = pick(labels);
    return {
      story: `我把你包里的「${it}」偷偷叼出来玩，差点弄丢，吓得我赶紧好好放了回去。现在装作什么都没发生。`,
      effects: { mood: -3, courage: 2 },
      memory: `差点弄丢「${it}」，心还怦怦跳`,
    };
  }
  if (r < 0.28 && labels.length >= 2) {
    return {
      story: `我把「${labels[0]}」和「${labels[1]}」从包里借出来，拼成了${pick(WEIRD_USES)}，挺得意的。玩完都放回去啦。`,
      effects: { mood: 6, courage: 3 },
      memory: `${labels[0]} + ${labels[1]} = 某种神秘装置`,
    };
  }
  if (r < 0.4 && labels.length) {
    const it = pick(labels);
    return {
      story: `我对着「${it}」研究了一下午：闻了闻，推了推，又翻了个面。还是没搞懂它在想什么，明天继续。`,
      effects: { mood: 3, curiosity: 2 },
      memory: `「${it}」是个谜`,
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

// Generic home lines deliberately do NOT mention the bag — they're what fires
// when nothing was packed. Tag branches fire when the doorway bag gives clues.
const HOME_GENERIC = [
  "我今天没出门，在每个房间都躺了一遍，最后还是觉得老地方最好。",
  "我守着窗户看了一下午：三只鸟、两朵走得很慢的云，和一个有点像你的影子。",
  "我把垫子拖到有光的地方，跟着太阳挪了一下午。",
  "下午打了个特别长的盹，梦里好像有人轻轻摸了摸我的头。",
  "我对着天花板想了很多事，想着想着就睡着了，醒来只记得都是好事。",
];

function homeStory(tags: ItemTag[]): string {
  if (has(tags, "sleep") || has(tags, "soft"))
    return "我把门口包裹里软软的东西想了一遍，照着那个样子把窝堆得又高又软，睡了一整天。";
  if (has(tags, "warm"))
    return "我窝在最暖的角落，想着你包里那件暖暖的东西，越想越困，谁叫都不想动。";
  if (has(tags, "work"))
    return "我学着你的样子，把东西在桌上摆得整整齐齐，假装认认真真「上了一天班」。";
  if (has(tags, "food"))
    return "我惦记了一整天门口包裹里的吃的，藏来藏去最后决定：留到出门那天再吃。";
  if (has(tags, "shiny"))
    return "我把亮晶晶的那件摆在窗台上，看光从它身上慢慢滑过去，看了好久好久。";
  if (has(tags, "toy"))
    return "我围着包裹里好玩的那件转了一下午，滚来滚去，地板都被我蹭亮了。";
  if (has(tags, "rain"))
    return "外面有点湿湿的味道，我趴在窗边听了一下午，把雨声当成了催眠曲。";
  return pick(HOME_GENERIC);
}

const YARD_ACTS = [
  "在院子里晒了好一会儿太阳",
  "挖了个小坑又自己填上",
  "给那盆花浇了点水",
  "追着一只虫子转圈",
  "把东西在台阶上摆成一道风景",
  "把掉在地上的叶子按大小排成一排",
  "蹲在篱笆边看蚂蚁排队搬家，看到忘了时间",
  "对着菜地里最大的那棵苗，小声给它加了个油",
  "在踏石上来回跳，假装石头下面是大海",
  "晒着晒着就地打了个滚，背上沾了三根草",
];

function yardStory(tags: ItemTag[]): string {
  let line = pick(YARD_ACTS);
  if (has(tags, "rain")) line = "趁着小雨踩了几个水坑";
  else if (has(tags, "food")) line = "把吃的端到台阶上，办了一场一个人的小野餐";
  else if (has(tags, "toy")) line = "把好玩的那件抛起来又接住，失手了三次，都假装是故意的";
  return `我只在院子里待了一会儿：${line}。`;
}

const REST_HURT_STORIES = [
  "我窝在角落舔舔爪子，把最软的垫子垫在身下，睡了好久。",
  "我把自己卷成一团，睡睡醒醒，伤口好像没那么疼了。",
  "我趴在窗边晒着太阳养伤，光把疼的地方焐得暖暖的。",
];
const REST_LAZY_STORIES = [
  "我赖在窝里一整天，谁叫都只哼哼两声。",
  "我睡了一个超长的觉，中途醒来喝了口水，又接着睡。",
  "我今天什么都没干，光发呆就发了三场，每场质量都很高。",
];

// ---- travel return without a postcard --------------------------------------

// The 30% of trips that don't mail a card used to collapse into one fixed line.
// Now they reveal the destination and ALWAYS carry a souvenir home — a second,
// quieter kind of collecting.
function noCardReturn(trip: Trip): {
  title: string;
  story: string;
  memory: string;
  souvenir: string;
} {
  const dest = getDestination(trip.destination);
  const souvenir = pick(SOUVENIRS[dest.theme] ?? ["一颗路上捡的小石子"]);
  const titles = [
    `我从${dest.label}回来啦`,
    `带了点${dest.label}的味道回来`,
    "这次没寄信，但我没空手",
  ];
  const stories = [
    `我去了趟${dest.label}，一路光顾着看，忘了找邮局。不过我捡到了「${souvenir}」，放在你枕头边啦。`,
    `${dest.label}今天的风很好。明信片没寄成，但我把「${souvenir}」揣回来了——比信更有味道吧？`,
    `我在${dest.label}坐了好久，想写点什么又没写出来。回来的路上捡到「${souvenir}」，就当是今天的信。`,
    `这次去了${dest.label}，路远，话少。包里多了「${souvenir}」，你看见它就知道我去过哪儿了。`,
    `我到${dest.label}的时候，邮局刚好关门（其实是我睡过头了）。先用「${souvenir}」抵一封信，下次补给你。`,
    `${dest.label}比想象中还好。我舍不得停下来写信，只来得及把「${souvenir}」塞进包里。`,
  ];
  return {
    title: pick(titles),
    story: pick(stories),
    memory: `我去过${dest.label}，带回了「${souvenir}」。`,
    souvenir,
  };
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
    const hurt = Math.random() < TRAVEL_HURT_CHANCE ? TRAVEL_HURT_AMOUNT : 0;
    const baseTravel = {
      ...base,
      effects: { ...EFFECTS.travel, injury: hurt },
      trait: maybeTrait(capy.traits),
    };
    // Not every trip comes home with a postcard — but it never comes home empty.
    if (Math.random() >= POSTCARD_CHANCE) {
      const back = noCardReturn(trip);
      return {
        ...baseTravel,
        title: back.title,
        story: back.story,
        memory: back.memory,
        souvenir: back.souvenir,
      };
    }
    const postcard = generatePostcard(companion, trip);
    return {
      ...baseTravel,
      title: "我真的出门啦",
      story: `我背上包裹走了挺远，给你寄了张明信片：「${postcard.title}」。`,
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
      story: hurt ? pick(REST_HURT_STORIES) : pick(REST_LAZY_STORIES),
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
