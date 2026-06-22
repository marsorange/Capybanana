import { tr, type Bi, type Locale } from "@/i18n/core";
import { localizeDestination, SOUVENIRS } from "./destinations";
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

// Keyword matchers stay zh+en so an EN-speaking owner's message also biases the
// quiet-day mode. Matched case-insensitively (see `any`).
const HOME_WORDS = ["休息", "别累", "在家", "睡", "安静", "慢", "歇", "rest", "home", "sleep", "quiet", "tired", "slow"];
const YARD_WORDS = ["院子", "晒太阳", "种", "花", "草", "门口", "yard", "garden", "sun", "plant", "flower", "outside"];

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
// Canonical trait ids are the zh strings (that's what's stored on the pet). EN is
// for display only — TRAIT_LABELS / TRAIT_LINES are keyed by the zh id.
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

/** Display label for a (zh-keyed) trait id. */
export const TRAIT_LABELS: Record<string, Bi<string>> = {
  爱晒太阳: { zh: "爱晒太阳", en: "Loves sunbathing" },
  喜欢收集小石头: { zh: "喜欢收集小石头", en: "Collects little stones" },
  胆子变大了一点: { zh: "胆子变大了一点", en: "A little braver now" },
  对远方很好奇: { zh: "对远方很好奇", en: "Curious about far places" },
  爱睡懒觉: { zh: "爱睡懒觉", en: "Loves sleeping in" },
  走路喜欢踩石头缝: { zh: "走路喜欢踩石头缝", en: "Steps between the cracks" },
  对会发光的东西没抵抗力: { zh: "对会发光的东西没抵抗力", en: "Can't resist shiny things" },
  学会了慢慢深呼吸: { zh: "学会了慢慢深呼吸", en: "Learned to breathe slow" },
  喜欢把东西排整齐: { zh: "喜欢把东西排整齐", en: "Likes things tidy" },
  认得回家的每一条路: { zh: "认得回家的每一条路", en: "Knows every way home" },
};

const WEIRD_USES: Bi<string[]> = {
  zh: [
    "一顶帽子", "一把奇怪的乐器", "一艘小船", "一座枕头堡垒", "一台想象中的机器",
    "一个鸟窝", "一座小小的瞭望塔", "一条过山车轨道", "一面会响的鼓", "一个秘密基地的门牌",
  ],
  en: [
    "a hat", "a strange instrument", "a little boat", "a pillow fort", "an imaginary machine",
    "a bird's nest", "a tiny watchtower", "a roller-coaster track", "a drum that booms", "a sign for a secret base",
  ],
};

// What an earned trait sounds like when you tap the pet — the days you spent
// together, coming back out of its own mouth (the 养育感 payoff). Keyed by zh id.
export const TRAIT_LINES: Record<string, Bi<string>> = {
  爱晒太阳: {
    zh: "我现在最懂哪块地砖晒得最暖——这是跟你过日子攒下的本事。",
    en: "I know exactly which floor tile gets warmest now — a skill I earned living with you.",
  },
  喜欢收集小石头: {
    zh: "我的小石头又多了一颗，改天排成一排给你看。",
    en: "My little-stone collection grew by one; I'll line them all up to show you sometime.",
  },
  胆子变大了一点: {
    zh: "今天的影子没吓到我。我是不是变勇敢了一点？",
    en: "The shadows didn't scare me today. Have I gotten a little braver?",
  },
  对远方很好奇: {
    zh: "远处的山后面是什么呢？我总是忍不住想。",
    en: "What's behind those far mountains? I just can't stop wondering.",
  },
  爱睡懒觉: {
    zh: "再睡五分钟……我们说好的，就五分钟。",
    en: "Five more minutes… we agreed, just five.",
  },
  走路喜欢踩石头缝: {
    zh: "踩石头缝这件事，我已经是岛上最熟练的了。",
    en: "When it comes to stepping between the cracks, I'm the best on this island.",
  },
  对会发光的东西没抵抗力: {
    zh: "你有没有什么会发光的小东西？给我看一眼嘛。",
    en: "Do you have anything that glows? Let me have just one look.",
  },
  学会了慢慢深呼吸: {
    zh: "吸——呼——你也跟我做一次，会舒服很多。",
    en: "In… out… do it with me once, it feels so much better.",
  },
  喜欢把东西排整齐: {
    zh: "我刚把台阶上的叶子按大小排整齐了，好看吗？",
    en: "I just sorted the leaves on the steps by size — don't they look nice?",
  },
  认得回家的每一条路: {
    zh: "不管走多远，回家的路我都认得，你放心。",
    en: "No matter how far I roam, I know the way home — don't worry.",
  },
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
  locale: Locale,
): { story: string; effects: DayOutcome["effects"]; memory?: string } | null {
  const labels = trip.items.map((i) => i.label).filter(Boolean);
  const r = Math.random();
  const en = locale === "en";
  if (r < 0.13 && labels.length) {
    const it = pick(labels);
    return {
      story: en
        ? `I snuck the "${it}" out of your bag to play with, almost lost it, and hurried to put it back nicely. Now I'm pretending nothing happened.`
        : `我把你包里的「${it}」偷偷叼出来玩，差点弄丢，吓得我赶紧好好放了回去。现在装作什么都没发生。`,
      effects: { mood: -3, courage: 2 },
      memory: en ? `Almost lost the "${it}", heart still pounding` : `差点弄丢「${it}」，心还怦怦跳`,
    };
  }
  if (r < 0.28 && labels.length >= 2) {
    return {
      story: en
        ? `I borrowed the "${labels[0]}" and "${labels[1]}" from your bag and built ${pick(WEIRD_USES.en)} — pretty proud of it. Put them both back after.`
        : `我把「${labels[0]}」和「${labels[1]}」从包里借出来，拼成了${pick(WEIRD_USES.zh)}，挺得意的。玩完都放回去啦。`,
      effects: { mood: 6, courage: 3 },
      memory: en
        ? `${labels[0]} + ${labels[1]} = some mysterious contraption`
        : `${labels[0]} + ${labels[1]} = 某种神秘装置`,
    };
  }
  if (r < 0.4 && labels.length) {
    const it = pick(labels);
    return {
      story: en
        ? `I studied the "${it}" all afternoon: sniffed it, nudged it, flipped it over. Still didn't figure out what it's thinking — more tomorrow.`
        : `我对着「${it}」研究了一下午：闻了闻，推了推，又翻了个面。还是没搞懂它在想什么，明天继续。`,
      effects: { mood: 3, curiosity: 2 },
      memory: en ? `The "${it}" is a mystery` : `「${it}」是个谜`,
    };
  }
  return null;
}

function has(tags: ItemTag[], t: ItemTag): boolean {
  return tags.includes(t);
}
function any(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w.toLowerCase()));
}

// Generic home lines deliberately do NOT mention the bag — they're what fires
// when nothing was packed. Tag branches fire when the doorway bag gives clues.
const HOME_GENERIC: Bi<string[]> = {
  zh: [
    "我今天没出门，在每个房间都躺了一遍，最后还是觉得老地方最好。",
    "我守着窗户看了一下午：三只鸟、两朵走得很慢的云，和一个有点像你的影子。",
    "我把垫子拖到有光的地方，跟着太阳挪了一下午。",
    "下午打了个特别长的盹，梦里好像有人轻轻摸了摸我的头。",
    "我对着天花板想了很多事，想着想着就睡着了，醒来只记得都是好事。",
  ],
  en: [
    "I didn't go out today; I lay down in every room and decided my usual spot is still best.",
    "I watched out the window all afternoon: three birds, two very slow clouds, and a shadow a bit like you.",
    "I dragged my cushion into the light and shuffled along after the sun all afternoon.",
    "Took an extra-long nap; in the dream someone seemed to gently pat my head.",
    "I thought about a lot of things at the ceiling, fell asleep mid-thought, and woke remembering only good ones.",
  ],
};

function homeStory(tags: ItemTag[], locale: Locale): string {
  const en = locale === "en";
  if (has(tags, "sleep") || has(tags, "soft"))
    return en
      ? "I pictured the soft thing in the doorway bag and built my nest tall and fluffy to match, then slept all day."
      : "我把门口包裹里软软的东西想了一遍，照着那个样子把窝堆得又高又软，睡了一整天。";
  if (has(tags, "warm"))
    return en
      ? "I curled into the warmest corner thinking of that warm thing in your bag; the more I thought, the sleepier I got — wouldn't move for anyone."
      : "我窝在最暖的角落，想着你包里那件暖暖的东西，越想越困，谁叫都不想动。";
  if (has(tags, "work"))
    return en
      ? "I copied you and lined everything up neatly on the desk, pretending I put in a serious day's work."
      : "我学着你的样子，把东西在桌上摆得整整齐齐，假装认认真真「上了一天班」。";
  if (has(tags, "food"))
    return en
      ? "I thought about the snacks in the doorway bag all day, hid them here and there, and finally decided: save them for the day we go out."
      : "我惦记了一整天门口包裹里的吃的，藏来藏去最后决定：留到出门那天再吃。";
  if (has(tags, "shiny"))
    return en
      ? "I set the shiny one on the windowsill and watched the light slide slowly across it for the longest time."
      : "我把亮晶晶的那件摆在窗台上，看光从它身上慢慢滑过去，看了好久好久。";
  if (has(tags, "toy"))
    return en
      ? "I circled the fun thing from the bag all afternoon, rolling it around until the floor went shiny."
      : "我围着包裹里好玩的那件转了一下午，滚来滚去，地板都被我蹭亮了。";
  if (has(tags, "rain"))
    return en
      ? "There was a damp smell outside; I lay by the window all afternoon and turned the rain into a lullaby."
      : "外面有点湿湿的味道，我趴在窗边听了一下午，把雨声当成了催眠曲。";
  return pick(HOME_GENERIC[locale]);
}

const YARD_ACTS: Bi<string[]> = {
  zh: [
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
  ],
  en: [
    "sunbathed in the yard for a good while",
    "dug a little hole and filled it back in myself",
    "watered that potted flower",
    "chased a bug in circles",
    "arranged things on the steps into a little scene",
    "lined up the fallen leaves by size",
    "watched the ants march off to move house by the fence until I forgot the time",
    "quietly cheered on the biggest sprout in the veggie bed",
    "hopped back and forth on the stepping stones, pretending the sea was underneath",
    "rolled over right there mid-sunbathe and got three blades of grass on my back",
  ],
};

function yardStory(tags: ItemTag[], locale: Locale): string {
  const en = locale === "en";
  let line = pick(YARD_ACTS[locale]);
  if (has(tags, "rain"))
    line = en ? "splashed in a few puddles during the drizzle" : "趁着小雨踩了几个水坑";
  else if (has(tags, "food"))
    line = en ? "carried the snacks out to the steps and held a picnic for one" : "把吃的端到台阶上，办了一场一个人的小野餐";
  else if (has(tags, "toy"))
    line = en
      ? "tossed the fun thing up and caught it, fumbled three times and pretended each was on purpose"
      : "把好玩的那件抛起来又接住，失手了三次，都假装是故意的";
  return en ? `I only spent a little while in the yard: I ${line}.` : `我只在院子里待了一会儿：${line}。`;
}

const REST_HURT_STORIES: Bi<string[]> = {
  zh: [
    "我窝在角落舔舔爪子，把最软的垫子垫在身下，睡了好久。",
    "我把自己卷成一团，睡睡醒醒，伤口好像没那么疼了。",
    "我趴在窗边晒着太阳养伤，光把疼的地方焐得暖暖的。",
  ],
  en: [
    "I curled up in a corner licking my paws, the softest cushion beneath me, and slept a long time.",
    "I rolled into a ball, dozing on and off, and the sore spot started to hurt a little less.",
    "I lay by the window healing in the sun; the light warmed the place that hurt.",
  ],
};
const REST_LAZY_STORIES: Bi<string[]> = {
  zh: [
    "我赖在窝里一整天，谁叫都只哼哼两声。",
    "我睡了一个超长的觉，中途醒来喝了口水，又接着睡。",
    "我今天什么都没干，光发呆就发了三场，每场质量都很高。",
  ],
  en: [
    "I lazed in my nest all day and only grunted twice whenever anyone called.",
    "I slept an extra-long sleep, woke once for a sip of water, then went right back.",
    "I did nothing today — three solid sessions of staring into space, each top quality.",
  ],
};

// ---- travel return without a postcard --------------------------------------

// The 30% of trips that don't mail a card used to collapse into one fixed line.
// Now they reveal the destination and ALWAYS carry a souvenir home — a second,
// quieter kind of collecting.
function noCardReturn(
  trip: Trip,
  locale: Locale,
): {
  title: string;
  story: string;
  memory: string;
  souvenir: string;
} {
  const dest = localizeDestination(trip.destination, locale);
  const fallback = locale === "en" ? ["a pebble picked up on the way"] : ["一颗路上捡的小石子"];
  const souvenir = pick(SOUVENIRS[dest.theme]?.[locale] ?? fallback);
  const label = dest.label;
  const titles =
    locale === "en"
      ? [
          `I'm back from ${label}`,
          `Brought a little of ${label} home with me`,
          "No letter this time, but not empty-handed",
        ]
      : [`我从${label}回来啦`, `带了点${label}的味道回来`, "这次没寄信，但我没空手"];
  const stories =
    locale === "en"
      ? [
          `I went to ${label} and was so busy looking around I forgot to find a post office. But I found "${souvenir}" and put it by your pillow.`,
          `The wind at ${label} was lovely today. The postcard didn't happen, but I carried "${souvenir}" back — more flavorful than a letter, right?`,
          `I sat a long while at ${label}, wanted to write something but couldn't. On the way back I found "${souvenir}" — let it be today's letter.`,
          `Went to ${label} this time — far away, few words. There's a "${souvenir}" in my bag now; see it and you'll know where I've been.`,
          `When I reached ${label} the post office had just closed (okay, I overslept). Let "${souvenir}" stand in for a letter; I'll make it up next time.`,
          `${label} was even better than I imagined. I couldn't bear to stop and write, only had time to tuck "${souvenir}" into my bag.`,
        ]
      : [
          `我去了趟${label}，一路光顾着看，忘了找邮局。不过我捡到了「${souvenir}」，放在你枕头边啦。`,
          `${label}今天的风很好。明信片没寄成，但我把「${souvenir}」揣回来了——比信更有味道吧？`,
          `我在${label}坐了好久，想写点什么又没写出来。回来的路上捡到「${souvenir}」，就当是今天的信。`,
          `这次去了${label}，路远，话少。包里多了「${souvenir}」，你看见它就知道我去过哪儿了。`,
          `我到${label}的时候，邮局刚好关门（其实是我睡过头了）。先用「${souvenir}」抵一封信，下次补给你。`,
          `${label}比想象中还好。我舍不得停下来写信，只来得及把「${souvenir}」塞进包里。`,
        ];
  return {
    title: pick(titles),
    story: pick(stories),
    memory:
      locale === "en"
        ? `I've been to ${label} and brought back "${souvenir}".`
        : `我去过${label}，带回了「${souvenir}」。`,
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

// Fixed titles, by language.
const T = {
  defaultReason: { zh: "我按自己的心情，过了这一天。", en: "I spent the day however I felt like." } as Bi<string>,
  travelTitle: { zh: "我真的出门啦", en: "I really went out" } as Bi<string>,
  yardAccident: { zh: "院子里出了点意外", en: "A little incident in the yard" } as Bi<string>,
  yardNormal: { zh: "我在院子里晃了晃", en: "I pottered about the yard" } as Bi<string>,
  restHurt: { zh: "我今天在养伤", en: "I'm healing up today" } as Bi<string>,
  restLazy: { zh: "我今天没什么精神", en: "Not much energy today" } as Bi<string>,
  homeAccident: { zh: "今天有点意外", en: "A little surprise today" } as Bi<string>,
  homeNormal: { zh: "我今天待在家里", en: "I stayed home today" } as Bi<string>,
};

export function resolveDay(
  companion: Companion,
  capy: CapyState,
  trip: Trip,
  locale: Locale = "zh",
): DayOutcome {
  const tags = collectTags(trip.items);
  const msg = trip.message ?? "";
  const en = locale === "en";

  const kind = pickKind(capy, tags, msg, trip);

  const base: ResolvedBase = {
    id: uid("out"),
    kind,
    reason: trip.note ?? tr(locale, T.defaultReason),
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
      const back = noCardReturn(trip, locale);
      return {
        ...baseTravel,
        title: back.title,
        story: back.story,
        memory: back.memory,
        souvenir: back.souvenir,
      };
    }
    const postcard = generatePostcard(companion, trip, locale);
    return {
      ...baseTravel,
      title: tr(locale, T.travelTitle),
      story: en
        ? `I walked quite far with my bag and mailed you a postcard: "${postcard.title}".`
        : `我背上包裹走了挺远，给你寄了张明信片：「${postcard.title}」。`,
      memory: en
        ? `I've been to ${postcard.locationName}; I remember it being like "${postcard.title}".`
        : `我去过${postcard.locationName}，记得那里像「${postcard.title}」。`,
      postcard,
    };
  }

  if (kind === "yard") {
    const mv = microVariant(trip, locale);
    return {
      ...base,
      title: tr(locale, mv ? T.yardAccident : T.yardNormal),
      story: mv?.story ?? yardStory(tags, locale),
      effects: mv?.effects ?? EFFECTS.yard,
      memory: mv?.memory,
      trait: maybeTrait(capy.traits),
    };
  }

  if (kind === "rest") {
    const hurt = capy.injury > 0;
    return {
      ...base,
      title: tr(locale, hurt ? T.restHurt : T.restLazy),
      story: pick((hurt ? REST_HURT_STORIES : REST_LAZY_STORIES)[locale]),
      effects: EFFECTS.rest,
    };
  }

  // home
  const mv = microVariant(trip, locale);
  return {
    ...base,
    title: tr(locale, mv ? T.homeAccident : T.homeNormal),
    story: mv?.story ?? homeStory(tags, locale),
    effects: mv?.effects ?? EFFECTS.home,
    memory: mv?.memory,
    trait: maybeTrait(capy.traits),
  };
}
