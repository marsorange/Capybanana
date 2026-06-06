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

export interface DestinationMeta {
  theme: DestinationTheme;
  label: string;
  emoji: string;
  distance: TripDistance; // which pool this place belongs to (near / far)
  baseWeight: number; // floor weight so every place keeps a chance (保底随机)
  locationNames: string[];
  titles: string[];
  scenes: string[]; // "我看到的样子"
  headTo: string; // "就往...走了"
  palette: Palette;
}

// NEAR pool (短途，家附近就能逛) — listed first — then the FAR pool (远方，要走很久).
export const DESTINATIONS: DestinationMeta[] = [
  {
    theme: "seaside",
    label: "海边",
    emoji: "🌊",
    distance: "near",
    baseWeight: 1,
    locationNames: ["白帆港", "盐风湾", "退潮的小海角", "贝壳滩"],
    titles: ["风从海边慢慢吹过来", "我把海风寄给你", "退潮以后的下午"],
    scenes: [
      "这里有很多白色的小船，风有点咸，我猜你会喜欢。",
      "我赤脚踩了踩沙子，浪一退就把脚印带走了。",
      "海面亮得睁不开眼，我捡了一枚很小的贝壳。",
    ],
    headTo: "往有海风的方向走了",
    palette: { sky: "#cdeaf0", mid: "#8ecbd6", ground: "#f0e0c0", accent: "#f2a65a" },
  },
  {
    theme: "forest",
    label: "森林",
    emoji: "🌲",
    distance: "near",
    baseWeight: 1,
    locationNames: ["苔藓谷", "松针小径", "安静的林子", "蕨叶深处"],
    titles: ["树林里很安静，只有风", "我在叶子缝里看见光", "森林深处的午后"],
    scenes: [
      "脚下全是软软的松针，走起来一点声音都没有。",
      "有只小松鼠盯着我看了很久，最后才跑掉。",
      "阳光从叶子缝里漏下来，地上全是晃动的小光斑。",
    ],
    headTo: "钻进了安静的树林里",
    palette: { sky: "#d7ead0", mid: "#6f9a63", ground: "#4f7a52", accent: "#c99b5a" },
  },
  {
    theme: "flowerfield",
    label: "花田",
    emoji: "🌷",
    distance: "near",
    baseWeight: 1,
    locationNames: ["春信原", "黄花坡", "风里的花田", "蜜蜂草甸"],
    titles: ["一整片花开得正好", "风一吹，花全都点头", "花田里走丢的下午"],
    scenes: [
      "花一直开到看不见的地方，风一吹就一片片地晃。",
      "有好多蜜蜂忙来忙去，我都不敢大声呼吸。",
      "我躺在花中间看天，闻着甜甜的味道差点睡着。",
    ],
    headTo: "往开满花的坡上去了",
    palette: { sky: "#e9f2da", mid: "#cfe09a", ground: "#a8c46f", accent: "#e98aa8" },
  },
  {
    theme: "town",
    label: "小镇",
    emoji: "🏘️",
    distance: "near",
    baseWeight: 1,
    locationNames: ["慢巷镇", "石板老街", "钟楼小镇", "巷尾杂货铺"],
    titles: ["在小镇上慢慢地逛", "老街上没什么人", "钟楼敲了三下"],
    scenes: [
      "石板路被磨得发亮，巷子窄窄的，拐来拐去。",
      "杂货铺的猫趴在门口睡觉，我蹲下看了它好久。",
      "面包店刚出炉，香味顺着整条街飘过来。",
    ],
    headTo: "拐进了一个安静的小镇",
    palette: { sky: "#f0e2cc", mid: "#d8b58c", ground: "#b98a64", accent: "#d95f59" },
  },
  {
    theme: "snow",
    label: "雪地",
    emoji: "❄️",
    distance: "far",
    baseWeight: 1,
    locationNames: ["初雪村", "白桦坡", "结冰的小湖", "雪线小屋"],
    titles: ["这里下了今年的第一场雪", "雪把声音都盖住了", "踩雪的一整天"],
    scenes: [
      "雪很厚，每走一步都会陷下去，再拔出来咯吱咯吱响。",
      "我哈出来的气是白的，一会儿就散在冷空气里。",
      "湖面结了薄冰，我不敢踩，只敢站在边上看。",
    ],
    headTo: "往落雪的北边去了",
    palette: { sky: "#e7eef5", mid: "#cdd9e6", ground: "#f7fbff", accent: "#9fb6cf" },
  },
  {
    theme: "mountain",
    label: "山路",
    emoji: "⛰️",
    distance: "far",
    baseWeight: 1,
    locationNames: ["云脚岭", "石阶山道", "半山亭", "望远垭口"],
    titles: ["爬到半山就看见了云", "山顶的风真的很大", "一级一级往上走"],
    scenes: [
      "石阶很长，我走走停停，回头一看已经爬了好高。",
      "云就在脚边飘，伸手好像能摸到一点点。",
      "山顶有座小亭子，我在里面歇了好久才下山。",
    ],
    headTo: "朝着山的方向往上爬了",
    palette: { sky: "#dce6ec", mid: "#9aa7b0", ground: "#7d8a72", accent: "#e8e2d0" },
  },
  {
    theme: "starfield",
    label: "星河",
    emoji: "🌌",
    distance: "far",
    baseWeight: 1,
    locationNames: ["银河观测台", "坠星谷", "无光的山脊", "极光下的湖"],
    titles: ["银河整夜都没走", "我数了好多颗星", "坐在星空下发呆"],
    scenes: [
      "天黑透了，星星密得像撒了一把盐。",
      "我躺在草地上看银河，凉风把它吹得好像在动。",
      "有颗星划过去，我赶紧替你许了个愿。",
    ],
    headTo: "往没有灯的暗处追星去了",
    palette: { sky: "#1b1b3a", mid: "#2a2a52", ground: "#39396a", accent: "#a9d8ff" },
  },
  {
    theme: "desert",
    label: "沙丘绿洲",
    emoji: "🏜️",
    distance: "far",
    baseWeight: 1,
    locationNames: ["月牙泉边", "起伏的沙丘", "绿洲驿站", "落日沙海"],
    titles: ["沙子一直暖到傍晚", "翻过一个又一个沙丘", "绿洲边歇了好久"],
    scenes: [
      "沙子被晒得暖暖的，踩下去又软又烫。",
      "爬上沙丘回头看，脚印被风一点点抹平了。",
      "绿洲的水很清，我趴在边上喝了好几口。",
    ],
    headTo: "朝着暖暖的沙丘走了",
    palette: { sky: "#f3d9a8", mid: "#e3b072", ground: "#cf8f4f", accent: "#d95f59" },
  },
];

const BY_THEME = new Map(DESTINATIONS.map((d) => [d.theme, d] as const));

// Accepts any string so legacy postcards on retired themes (harbor/hotspring/…)
// still resolve to a sensible fallback rather than crashing.
export function getDestination(theme: string): DestinationMeta {
  return BY_THEME.get(theme as DestinationTheme) ?? DESTINATIONS[0];
}

/** The destinations in a given distance pool (near / far) — the server picks one. */
export function destinationsByDistance(distance: TripDistance): DestinationMeta[] {
  return DESTINATIONS.filter((d) => d.distance === distance);
}

// Real, recognizable landmarks per theme. Index === rarity tier:
// [0]=N 普通, [1]=R 稀有, [2]=SR 史诗 — the grandest landmark is the SR card.
// landmarkForCard() in gacha.ts reads this by rarity index, so the SAME
// (destination × rarity) card always shows the same landmark in the 图鉴.
export const LANDMARKS: Record<DestinationTheme, string[]> = {
  seaside: ["巴厘岛海滩", "尼斯蔚蓝海岸", "圣托里尼"],
  forest: ["德国黑森林", "加州红杉林", "屋久岛原始森林"],
  flowerfield: ["英国湖区", "北海道富良野花海", "普罗旺斯薰衣草田"],
  town: ["布拉格老城广场", "摩洛哥舍夫沙万蓝城", "巴黎埃菲尔铁塔"],
  snow: ["北海道雪原", "加拿大班夫", "瑞士少女峰"],
  mountain: ["黄山", "马丘比丘", "富士山"],
  starfield: ["冰岛星空营地", "新西兰特卡波湖星空", "挪威北极光"],
  desert: ["敦煌鸣沙山月牙泉", "迪拜沙漠绿洲", "撒哈拉沙漠"],
};

// Keyword rules: message text -> boosted themes + how to phrase it back.
export interface KeywordRule {
  test: string[];
  themes: DestinationTheme[];
  wish: string; // shown in the postcard front, quoted
  reason: string; // shown in the postcard back "原因"
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    test: ["海边", "大海", "海风", "海", "港口", "码头", "船", "灯塔"],
    themes: ["seaside"],
    wish: "想去海边",
    reason: "你今天的留言里提到了海",
  },
  {
    test: ["雪", "冬天", "结冰", "滑雪"],
    themes: ["snow"],
    wish: "想看看雪",
    reason: "你提到了雪",
  },
  {
    test: ["安静", "清静", "独处", "静一静", "歇一歇"],
    themes: ["forest", "town"],
    wish: "想要安静一点",
    reason: "你说想要安静一点",
  },
  {
    test: ["山", "登山", "爬山", "高处"],
    themes: ["mountain"],
    wish: "想去爬山",
    reason: "你提到了山",
  },
  {
    test: ["花", "花田", "花海", "春天"],
    themes: ["flowerfield"],
    wish: "想去看花",
    reason: "你想去看花",
  },
  {
    test: ["森林", "树林", "林子"],
    themes: ["forest"],
    wish: "想钻进树林",
    reason: "你想钻进树林里",
  },
  {
    test: ["小镇", "老街", "巷子", "慢慢逛", "雨", "阴天"],
    themes: ["town"],
    wish: "想逛逛小镇",
    reason: "你想找个小镇慢慢逛",
  },
  {
    test: ["星空", "银河", "星星", "观星", "极光"],
    themes: ["starfield"],
    wish: "想去看星星",
    reason: "你提到了星空",
  },
  {
    test: ["沙漠", "沙丘", "绿洲", "戈壁", "暖", "热"],
    themes: ["desert"],
    wish: "想去暖暖的地方",
    reason: "你说想去暖暖的地方",
  },
  {
    test: ["随便", "都行", "随你", "看心情", "哪都好"],
    themes: [],
    wish: "随便走走都好",
    reason: "你说随便走走都好",
  },
];

// Narrative fragments for generatePostcard.
export const PERSONALITY_LINES: Record<Personality, string[]> = {
  gentle: [
    "我走得很慢，怕错过你会喜欢的小角落。",
    "我替你深呼吸了一下，把这里的安稳也装了一点回来。",
  ],
  curious: [
    "我东看看西看看，差点忘了时间。",
    "这里好多没见过的东西，我都想指给你看。",
  ],
  lazy: [
    "我找了个舒服的地方发了好久的呆，太舒服了。",
    "走累了就坐下来晒太阳，一坐就是一下午。",
  ],
  brave: [
    "我一个人也不怕，走到了挺远的地方呢。",
    "遇到岔路我挑了没走过的那条，结果超棒。",
  ],
  dreamy: [
    "我盯着远处发呆，想象你也站在我旁边。",
    "这里好像梦里见过，软软的，不太真实。",
  ],
};

export const GENERIC_OPENINGS: string[] = [
  "你没说想去哪，那我就顺着心情挑啦——",
  "我也说不清为什么，脚就把我带到了这儿。",
  "风往哪吹我就往哪走，最后停在了这里。",
];

export const GIFT_LINES: string[] = [
  "对了，我给你带了一个小东西，回去给你。",
  "路上看到一样东西就想到你，悄悄收进了包里。",
];

export const ITEM_NOUNS: Record<LuggageItem, string> = {
  food: "路上的吃的",
  camera: "相机",
  charm: "护身符",
  gift: "想给你的小礼物",
  umbrella: "一把伞",
};
