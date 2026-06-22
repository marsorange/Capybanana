import type { Locale } from "@/i18n/core";
import { localize, type Bi } from "@/i18n/core";
import type {
  DestinationTheme,
  LuggageItem,
  Personality,
  TripDistance,
} from "./types";

export interface Palette {
  sky: string;
  mid: string;
  ground: string;
  accent: string;
}

// Locale-independent fields stay plain; every player-facing text is bilingual
// (`Bi<...>`). Resolve them for a locale with `localizeDestination`.
export interface DestinationMeta {
  theme: DestinationTheme;
  label: Bi<string>;
  emoji: string;
  distance: TripDistance; // which pool this place belongs to (near / far)
  baseWeight: number; // floor weight so every place keeps a chance (保底随机)
  locationNames: Bi<string[]>;
  titles: Bi<string[]>;
  scenes: Bi<string[]>; // "我看到的样子"
  headTo: Bi<string>; // "就往...走了"
  palette: Palette;
}

// A destination with all text resolved to one language — what generators/UI use.
export interface LocalDestination {
  theme: DestinationTheme;
  label: string;
  emoji: string;
  distance: TripDistance;
  baseWeight: number;
  locationNames: string[];
  titles: string[];
  scenes: string[];
  headTo: string;
  palette: Palette;
}

// NEAR pool (短途，家附近就能逛) — listed first — then the FAR pool (远方，要走很久).
export const DESTINATIONS: DestinationMeta[] = [
  {
    theme: "seaside",
    label: { zh: "海边", en: "Seaside" },
    emoji: "🌊",
    distance: "near",
    baseWeight: 1,
    locationNames: {
      zh: ["白帆港", "盐风湾", "退潮的小海角", "贝壳滩"],
      en: ["White Sail Harbor", "Saltwind Bay", "Low-Tide Cape", "Seashell Beach"],
    },
    titles: {
      zh: ["风从海边慢慢吹过来", "我把海风寄给你", "退潮以后的下午"],
      en: ["The sea breeze drifts in slow", "Mailing you the ocean wind", "An afternoon after low tide"],
    },
    scenes: {
      zh: [
        "这里有很多白色的小船，风有点咸，我猜你会喜欢。",
        "我赤脚踩了踩沙子，浪一退就把脚印带走了。",
        "海面亮得睁不开眼，我捡了一枚很小的贝壳。",
      ],
      en: [
        "Lots of little white boats here, and the wind tastes a bit salty — I think you'd like it.",
        "I stepped barefoot on the sand; the waves pulled my footprints away as they drew back.",
        "The sea was too bright to look at, so I picked up one tiny shell.",
      ],
    },
    headTo: { zh: "往有海风的方向走了", en: "headed toward where the sea breeze was" },
    palette: { sky: "#cdeaf0", mid: "#8ecbd6", ground: "#f0e0c0", accent: "#f2a65a" },
  },
  {
    theme: "forest",
    label: { zh: "森林", en: "Forest" },
    emoji: "🌲",
    distance: "near",
    baseWeight: 1,
    locationNames: {
      zh: ["苔藓谷", "松针小径", "安静的林子", "蕨叶深处"],
      en: ["Moss Valley", "Pine-Needle Path", "The Quiet Woods", "Deep in the Ferns"],
    },
    titles: {
      zh: ["树林里很安静，只有风", "我在叶子缝里看见光", "森林深处的午后"],
      en: ["The woods were quiet, just the wind", "I saw light through the leaves", "An afternoon deep in the forest"],
    },
    scenes: {
      zh: [
        "脚下全是软软的松针，走起来一点声音都没有。",
        "有只小松鼠盯着我看了很久，最后才跑掉。",
        "阳光从叶子缝里漏下来，地上全是晃动的小光斑。",
      ],
      en: [
        "Soft pine needles underfoot — I walked without making a sound.",
        "A little squirrel stared at me for ages before finally running off.",
        "Sunlight leaked through the leaves, dappling the ground with shifting spots of light.",
      ],
    },
    headTo: { zh: "钻进了安静的树林里", en: "slipped into the quiet woods" },
    palette: { sky: "#d7ead0", mid: "#6f9a63", ground: "#4f7a52", accent: "#c99b5a" },
  },
  {
    theme: "flowerfield",
    label: { zh: "花田", en: "Flower Field" },
    emoji: "🌷",
    distance: "near",
    baseWeight: 1,
    locationNames: {
      zh: ["春信原", "黄花坡", "风里的花田", "蜜蜂草甸"],
      en: ["Springtide Meadow", "Yellow-Bloom Slope", "Flowers in the Wind", "Honeybee Meadow"],
    },
    titles: {
      zh: ["一整片花开得正好", "风一吹，花全都点头", "花田里走丢的下午"],
      en: ["A whole field in full bloom", "When the wind blew, every flower nodded", "An afternoon lost among the flowers"],
    },
    scenes: {
      zh: [
        "花一直开到看不见的地方，风一吹就一片片地晃。",
        "有好多蜜蜂忙来忙去，我都不敢大声呼吸。",
        "我躺在花中间看天，闻着甜甜的味道差点睡着。",
      ],
      en: [
        "Flowers bloomed all the way past where I could see, swaying in waves with the wind.",
        "So many bees bustling about that I hardly dared to breathe loudly.",
        "I lay among the flowers watching the sky, and the sweet smell nearly put me to sleep.",
      ],
    },
    headTo: { zh: "往开满花的坡上去了", en: "went up the slope full of flowers" },
    palette: { sky: "#e9f2da", mid: "#cfe09a", ground: "#a8c46f", accent: "#e98aa8" },
  },
  {
    theme: "town",
    label: { zh: "小镇", en: "Old Town" },
    emoji: "🏘️",
    distance: "near",
    baseWeight: 1,
    locationNames: {
      zh: ["慢巷镇", "石板老街", "钟楼小镇", "巷尾杂货铺"],
      en: ["Slow-Lane Town", "Old Cobble Street", "Clocktower Town", "The Corner Shop"],
    },
    titles: {
      zh: ["在小镇上慢慢地逛", "老街上没什么人", "钟楼敲了三下"],
      en: ["Wandering the town slowly", "The old street was nearly empty", "The clocktower struck three"],
    },
    scenes: {
      zh: [
        "石板路被磨得发亮，巷子窄窄的，拐来拐去。",
        "杂货铺的猫趴在门口睡觉，我蹲下看了它好久。",
        "面包店刚出炉，香味顺着整条街飘过来。",
      ],
      en: [
        "The cobblestones were worn shiny, the alleys narrow and winding.",
        "A shop cat napped in a doorway; I crouched and watched it for a long time.",
        "The bakery had just pulled fresh bread, and the smell floated down the whole street.",
      ],
    },
    headTo: { zh: "拐进了一个安静的小镇", en: "turned into a quiet little town" },
    palette: { sky: "#f0e2cc", mid: "#d8b58c", ground: "#b98a64", accent: "#d95f59" },
  },
  {
    theme: "snow",
    label: { zh: "雪地", en: "Snowland" },
    emoji: "❄️",
    distance: "far",
    baseWeight: 1,
    locationNames: {
      zh: ["初雪村", "白桦坡", "结冰的小湖", "雪线小屋"],
      en: ["First-Snow Village", "Birch Slope", "The Frozen Pond", "Snowline Cabin"],
    },
    titles: {
      zh: ["这里下了今年的第一场雪", "雪把声音都盖住了", "踩雪的一整天"],
      en: ["The year's first snow fell here", "The snow muffled every sound", "A whole day in the snow"],
    },
    scenes: {
      zh: [
        "雪很厚，每走一步都会陷下去，再拔出来咯吱咯吱响。",
        "我哈出来的气是白的，一会儿就散在冷空气里。",
        "湖面结了薄冰，我不敢踩，只敢站在边上看。",
      ],
      en: [
        "The snow was deep — each step sank in and crunched as I pulled my foot back out.",
        "My breath came out white and scattered into the cold air a moment later.",
        "Thin ice covered the pond; I didn't dare step on it, just watched from the edge.",
      ],
    },
    headTo: { zh: "往落雪的北边去了", en: "headed north to where the snow was falling" },
    palette: { sky: "#e7eef5", mid: "#cdd9e6", ground: "#f7fbff", accent: "#9fb6cf" },
  },
  {
    theme: "mountain",
    label: { zh: "山路", en: "Mountain Trail" },
    emoji: "⛰️",
    distance: "far",
    baseWeight: 1,
    locationNames: {
      zh: ["云脚岭", "石阶山道", "半山亭", "望远垭口"],
      en: ["Cloudfoot Ridge", "Stone-Step Trail", "Halfway Pavilion", "Lookout Pass"],
    },
    titles: {
      zh: ["爬到半山就看见了云", "山顶的风真的很大", "一级一级往上走"],
      en: ["Halfway up, I reached the clouds", "The wind at the summit was fierce", "Climbing one step at a time"],
    },
    scenes: {
      zh: [
        "石阶很长，我走走停停，回头一看已经爬了好高。",
        "云就在脚边飘，伸手好像能摸到一点点。",
        "山顶有座小亭子，我在里面歇了好久才下山。",
      ],
      en: [
        "The stone steps were long; I stopped and started, and looked back to find I'd climbed so high.",
        "Clouds drifted right by my feet — it felt like I could almost touch one.",
        "There was a little pavilion at the top; I rested in it a long while before heading down.",
      ],
    },
    headTo: { zh: "朝着山的方向往上爬了", en: "started climbing toward the mountain" },
    palette: { sky: "#dce6ec", mid: "#9aa7b0", ground: "#7d8a72", accent: "#e8e2d0" },
  },
  {
    theme: "starfield",
    label: { zh: "星河", en: "Starfield" },
    emoji: "🌌",
    distance: "far",
    baseWeight: 1,
    locationNames: {
      zh: ["银河观测台", "坠星谷", "无光的山脊", "极光下的湖"],
      en: ["Galaxy Observatory", "Fallen-Star Valley", "The Lightless Ridge", "Lake Under the Aurora"],
    },
    titles: {
      zh: ["银河整夜都没走", "我数了好多颗星", "坐在星空下发呆"],
      en: ["The galaxy stayed all night", "I counted so many stars", "Sitting and dreaming under the stars"],
    },
    scenes: {
      zh: [
        "天黑透了，星星密得像撒了一把盐。",
        "我躺在草地上看银河，凉风把它吹得好像在动。",
        "有颗星划过去，我赶紧替你许了个愿。",
      ],
      en: [
        "When it got fully dark, the stars were as dense as a scattered handful of salt.",
        "I lay on the grass watching the galaxy; the cool wind made it seem to drift.",
        "A star shot across, and I quickly made a wish for you.",
      ],
    },
    headTo: { zh: "往没有灯的暗处追星去了", en: "chased the stars into the lightless dark" },
    palette: { sky: "#1b1b3a", mid: "#2a2a52", ground: "#39396a", accent: "#a9d8ff" },
  },
  {
    theme: "desert",
    label: { zh: "沙丘绿洲", en: "Dune Oasis" },
    emoji: "🏜️",
    distance: "far",
    baseWeight: 1,
    locationNames: {
      zh: ["月牙泉边", "起伏的沙丘", "绿洲驿站", "落日沙海"],
      en: ["Crescent Spring", "The Rolling Dunes", "Oasis Waystation", "Sunset Sand Sea"],
    },
    titles: {
      zh: ["沙子一直暖到傍晚", "翻过一个又一个沙丘", "绿洲边歇了好久"],
      en: ["The sand stayed warm till dusk", "Over one dune and then another", "Resting a long while by the oasis"],
    },
    scenes: {
      zh: [
        "沙子被晒得暖暖的，踩下去又软又烫。",
        "爬上沙丘回头看，脚印被风一点点抹平了。",
        "绿洲的水很清，我趴在边上喝了好几口。",
      ],
      en: [
        "The sand was warm from the sun, soft and hot under my feet.",
        "I climbed a dune and looked back; the wind was slowly smoothing my footprints away.",
        "The oasis water was clear, and I lay at the edge and drank a few mouthfuls.",
      ],
    },
    headTo: { zh: "朝着暖暖的沙丘走了", en: "set off toward the warm dunes" },
    palette: { sky: "#f3d9a8", mid: "#e3b072", ground: "#cf8f4f", accent: "#d95f59" },
  },
];

const BY_THEME = new Map(DESTINATIONS.map((d) => [d.theme, d] as const));

// Accepts any string so legacy postcards on retired themes (harbor/hotspring/…)
// still resolve to a sensible fallback rather than crashing.
export function getDestination(theme: string): DestinationMeta {
  return BY_THEME.get(theme as DestinationTheme) ?? DESTINATIONS[0];
}

/** A destination with every text field resolved to one language. */
export function localizeDestination(
  theme: string,
  locale: Locale,
): LocalDestination {
  const d = getDestination(theme);
  return {
    theme: d.theme,
    label: localize(d.label, locale),
    emoji: d.emoji,
    distance: d.distance,
    baseWeight: d.baseWeight,
    locationNames: d.locationNames[locale],
    titles: d.titles[locale],
    scenes: d.scenes[locale],
    headTo: localize(d.headTo, locale),
    palette: d.palette,
  };
}

/** Just the display label for a theme (the most common lookup). */
export function destinationLabel(theme: string, locale: Locale): string {
  return localize(getDestination(theme).label, locale);
}

/** The destinations in a given distance pool (near / far) — the server picks one. */
export function destinationsByDistance(distance: TripDistance): DestinationMeta[] {
  return DESTINATIONS.filter((d) => d.distance === distance);
}

// Real, recognizable landmarks per theme. Index === rarity tier:
// [0]=N 普通, [1]=R 稀有, [2]=SR 史诗 — the grandest landmark is the SR card.
// landmarkForCard() in gacha.ts reads this by rarity index, so the SAME
// (destination × rarity) card always shows the same landmark in the 图鉴.
export const LANDMARKS: Record<DestinationTheme, Bi<string[]>> = {
  seaside: {
    zh: ["巴厘岛海滩", "尼斯蔚蓝海岸", "圣托里尼"],
    en: ["Bali Beach", "Côte d'Azur, Nice", "Santorini"],
  },
  forest: {
    zh: ["德国黑森林", "加州红杉林", "屋久岛原始森林"],
    en: ["The Black Forest", "California Redwoods", "Yakushima's Ancient Forest"],
  },
  flowerfield: {
    zh: ["英国湖区", "北海道富良野花海", "普罗旺斯薰衣草田"],
    en: ["The Lake District", "Furano Flower Fields", "Provence Lavender Fields"],
  },
  town: {
    zh: ["布拉格老城广场", "摩洛哥舍夫沙万蓝城", "巴黎埃菲尔铁塔"],
    en: ["Prague Old Town Square", "Chefchaouen, the Blue City", "The Eiffel Tower, Paris"],
  },
  snow: {
    zh: ["北海道雪原", "加拿大班夫", "瑞士少女峰"],
    en: ["Hokkaido Snowfields", "Banff, Canada", "Jungfrau, Switzerland"],
  },
  mountain: {
    zh: ["黄山", "马丘比丘", "富士山"],
    en: ["Mount Huangshan", "Machu Picchu", "Mount Fuji"],
  },
  starfield: {
    zh: ["冰岛星空营地", "新西兰特卡波湖星空", "挪威北极光"],
    en: ["Iceland Stargazing Camp", "Lake Tekapo Night Sky", "The Norwegian Northern Lights"],
  },
  desert: {
    zh: ["敦煌鸣沙山月牙泉", "迪拜沙漠绿洲", "撒哈拉沙漠"],
    en: ["Dunhuang Crescent Spring", "Dubai Desert Oasis", "The Sahara"],
  },
};

// Little trinkets the pet may carry home from a trip that didn't mail a
// postcard — the "空手而归" consolation. Named like collectibles (the owner sees
// them quoted in the day's story and on the profile shelf), so keep them
// concrete and a bit odd. Each list is one destination's flavor.
export const SOUVENIRS: Record<DestinationTheme, Bi<string[]>> = {
  seaside: {
    zh: [
      "一枚还带着潮味的小贝壳",
      "一颗被浪磨圆的玻璃珠",
      "半截晒白的小船绳",
      "一小包细细的白沙",
    ],
    en: [
      "a little shell that still smells of the tide",
      "a glass bead rounded by the waves",
      "half a length of sun-bleached boat rope",
      "a small pouch of fine white sand",
    ],
  },
  forest: {
    zh: [
      "一颗裹着泥土香的橡果",
      "一片比我脸还大的蕨叶",
      "一小块软软的青苔",
      "一颗被松鼠啃过一口的松果",
    ],
    en: [
      "an acorn that smells of earth",
      "a fern frond bigger than my face",
      "a small patch of soft moss",
      "a pinecone with one squirrel-nibbled bite",
    ],
  },
  flowerfield: {
    zh: [
      "一朵压得扁扁的小黄花",
      "三粒不知名的花种子",
      "一颗沾着花粉的小石子",
      "一段还香着的干花枝",
    ],
    en: [
      "a little yellow flower pressed flat",
      "three seeds from a flower I can't name",
      "a pebble dusted with pollen",
      "a dried flower sprig that still smells sweet",
    ],
  },
  town: {
    zh: [
      "一张面包店的旧价签",
      "一枚被路人踩得发亮的铜扣",
      "一颗杂货铺门口捡的玻璃弹珠",
      "半张巷口的旧电影票根",
    ],
    en: [
      "an old price tag from the bakery",
      "a brass button polished shiny by passing feet",
      "a glass marble found by the corner shop",
      "half an old movie-ticket stub from the alley",
    ],
  },
  snow: {
    zh: [
      "一小罐化成了水的雪",
      "一根挂过冰棱的小树枝",
      "一颗冻得硬邦邦的红浆果",
      "一张呵着白气画下来的冰裂纹",
    ],
    en: [
      "a small jar of snow that melted into water",
      "a twig that once held an icicle",
      "a red berry frozen rock-hard",
      "a sketch of frost cracks I drew with my breath",
    ],
  },
  mountain: {
    zh: [
      "一块带云纹的小石头",
      "一片从半山亭飘下来的叶子",
      "一截被山风吹弯的草茎",
      "一张画着山顶云的小纸片",
    ],
    en: [
      "a little stone with cloud-like veining",
      "a leaf that drifted down from the halfway pavilion",
      "a grass stem bent by the mountain wind",
      "a scrap of paper with the summit clouds drawn on it",
    ],
  },
  starfield: {
    zh: [
      "一颗据说被星星照过的小石子",
      "一片夜里凉凉的草叶",
      "一张画着流星方向的小纸条",
      "一小截观测台旁捡的旧绳结",
    ],
    en: [
      "a pebble they say a star once shone on",
      "a blade of grass cool from the night",
      "a note with the shooting star's path drawn on it",
      "a frayed knot of old rope from by the observatory",
    ],
  },
  desert: {
    zh: [
      "一小瓶月牙泉边的细沙",
      "一颗晒得暖暖的圆石子",
      "一片绿洲棕榈的叶尖",
      "一块风干成奇怪形状的小泥块",
    ],
    en: [
      "a small vial of fine sand from the crescent spring",
      "a round pebble warm from the sun",
      "the tip of an oasis palm frond",
      "a clod of clay wind-dried into an odd shape",
    ],
  },
};

// Keyword rules: message text -> boosted themes + how to phrase it back.
export interface KeywordRule {
  test: string[]; // matched against the owner's message (zh + en terms)
  themes: DestinationTheme[];
  wish: Bi<string>; // shown in the postcard front, quoted
  reason: Bi<string>; // shown in the postcard back "原因"
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    test: ["海边", "大海", "海风", "海", "港口", "码头", "船", "灯塔", "sea", "ocean", "beach", "harbor", "harbour", "coast"],
    themes: ["seaside"],
    wish: { zh: "想去海边", en: "wanting to go to the sea" },
    reason: { zh: "你今天的留言里提到了海", en: "your note today mentioned the sea" },
  },
  {
    test: ["雪", "冬天", "结冰", "滑雪", "snow", "winter", "ice", "ski"],
    themes: ["snow"],
    wish: { zh: "想看看雪", en: "wanting to see snow" },
    reason: { zh: "你提到了雪", en: "you mentioned snow" },
  },
  {
    test: ["安静", "清静", "独处", "静一静", "歇一歇", "quiet", "calm", "alone", "rest", "peace"],
    themes: ["forest", "town"],
    wish: { zh: "想要安静一点", en: "wanting a little quiet" },
    reason: { zh: "你说想要安静一点", en: "you said you wanted some quiet" },
  },
  {
    test: ["山", "登山", "爬山", "高处", "mountain", "hike", "climb", "peak", "summit"],
    themes: ["mountain"],
    wish: { zh: "想去爬山", en: "wanting to climb a mountain" },
    reason: { zh: "你提到了山", en: "you mentioned the mountains" },
  },
  {
    test: ["花", "花田", "花海", "春天", "flower", "blossom", "bloom", "spring"],
    themes: ["flowerfield"],
    wish: { zh: "想去看花", en: "wanting to see the flowers" },
    reason: { zh: "你想去看花", en: "you wanted to see flowers" },
  },
  {
    test: ["森林", "树林", "林子", "forest", "woods", "trees"],
    themes: ["forest"],
    wish: { zh: "想钻进树林", en: "wanting to slip into the woods" },
    reason: { zh: "你想钻进树林里", en: "you wanted to disappear into the woods" },
  },
  {
    test: ["小镇", "老街", "巷子", "慢慢逛", "雨", "阴天", "town", "street", "alley", "stroll", "rain", "cloudy"],
    themes: ["town"],
    wish: { zh: "想逛逛小镇", en: "wanting to wander a town" },
    reason: { zh: "你想找个小镇慢慢逛", en: "you wanted a town to wander slowly" },
  },
  {
    test: ["星空", "银河", "星星", "观星", "极光", "star", "galaxy", "stargaze", "aurora", "night sky"],
    themes: ["starfield"],
    wish: { zh: "想去看星星", en: "wanting to see the stars" },
    reason: { zh: "你提到了星空", en: "you mentioned the night sky" },
  },
  {
    test: ["沙漠", "沙丘", "绿洲", "戈壁", "暖", "热", "desert", "dune", "oasis", "warm", "hot"],
    themes: ["desert"],
    wish: { zh: "想去暖暖的地方", en: "wanting somewhere warm" },
    reason: { zh: "你说想去暖暖的地方", en: "you said you wanted somewhere warm" },
  },
  {
    test: ["随便", "都行", "随你", "看心情", "哪都好", "anywhere", "whatever", "you decide", "up to you"],
    themes: [],
    wish: { zh: "随便走走都好", en: "anywhere is fine for a wander" },
    reason: { zh: "你说随便走走都好", en: "you said anywhere was fine for a wander" },
  },
];

// Narrative fragments for generatePostcard.
export const PERSONALITY_LINES: Record<Personality, Bi<string[]>> = {
  gentle: {
    zh: [
      "我走得很慢，怕错过你会喜欢的小角落。",
      "我替你深呼吸了一下，把这里的安稳也装了一点回来。",
      "路上有人冲我笑，我也轻轻点了点头，像你教我的那样。",
    ],
    en: [
      "I walked slowly, afraid to miss a corner you'd love.",
      "I took a deep breath for you and packed a little of this calm to bring home.",
      "Someone smiled at me on the way, and I nodded back gently, like you taught me.",
    ],
  },
  curious: {
    zh: [
      "我东看看西看看，差点忘了时间。",
      "这里好多没见过的东西，我都想指给你看。",
      "我数了路上的台阶、石头和猫，数字都记不清了，开心是真的。",
    ],
    en: [
      "I looked at this and that and nearly forgot the time.",
      "So many things I'd never seen — I wanted to point them all out to you.",
      "I counted the steps, the stones, and the cats; lost track of the numbers, but the happy was real.",
    ],
  },
  lazy: {
    zh: [
      "我找了个舒服的地方发了好久的呆，太舒服了。",
      "走累了就坐下来晒太阳，一坐就是一下午。",
      "其实我一半的路都是慢慢蹭过去的，但风景没少看。",
    ],
    en: [
      "I found a comfy spot and zoned out for ages — so cozy.",
      "When I got tired I sat in the sun, and one sit became a whole afternoon.",
      "Honestly I dawdled through half the walk, but I didn't miss any of the view.",
    ],
  },
  brave: {
    zh: [
      "我一个人也不怕，走到了挺远的地方呢。",
      "遇到岔路我挑了没走过的那条，结果超棒。",
      "有段路黑黑的，我把胸口挺起来走过去了，没回头。",
    ],
    en: [
      "I wasn't scared on my own — I made it pretty far.",
      "At the fork I took the path I'd never tried, and it turned out great.",
      "One stretch was dark; I puffed out my chest and walked through without looking back.",
    ],
  },
  dreamy: {
    zh: [
      "我盯着远处发呆，想象你也站在我旁边。",
      "这里好像梦里见过，软软的，不太真实。",
      "我把看到的颜色都记下来了，准备拿回去做梦用。",
    ],
    en: [
      "I stared into the distance and imagined you standing beside me.",
      "This place felt like somewhere from a dream — soft, not quite real.",
      "I memorized all the colors I saw, to use later in my dreams.",
    ],
  },
};

export const GENERIC_OPENINGS: Bi<string[]> = {
  zh: [
    "你没说想去哪，那我就顺着心情挑啦——",
    "我也说不清为什么，脚就把我带到了这儿。",
    "风往哪吹我就往哪走，最后停在了这里。",
    "出门的时候我闭上眼转了三圈，朝着鼻尖的方向走。",
    "今天的路自己会拐弯，我就跟着它走到了这里。",
  ],
  en: [
    "You didn't say where to go, so I just followed my mood —",
    "I can't quite say why; my feet just carried me here.",
    "I went wherever the wind blew and ended up stopping here.",
    "On my way out I closed my eyes, spun three times, and walked where my nose pointed.",
    "Today's road did its own turning, and I just followed it here.",
  ],
};

export const GIFT_LINES: Bi<string[]> = {
  zh: [
    "对了，我给你带了一个小东西，回去给你。",
    "路上看到一样东西就想到你，悄悄收进了包里。",
    "我挑了好久，最后选了最不起眼但最像你的那个。",
  ],
  en: [
    "Oh — I brought you back a little something, I'll give it to you when I'm home.",
    "I saw a thing on the way that made me think of you and quietly tucked it into my bag.",
    "I took ages choosing, and picked the plainest one that was most like you.",
  ],
};

export const ITEM_NOUNS: Record<LuggageItem, Bi<string>> = {
  food: { zh: "路上的吃的", en: "the snacks for the road" },
  camera: { zh: "相机", en: "the camera" },
  charm: { zh: "护身符", en: "the charm" },
  gift: { zh: "想给你的小礼物", en: "the little gift for you" },
  umbrella: { zh: "一把伞", en: "an umbrella" },
};
