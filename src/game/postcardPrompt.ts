import { getDestination } from "./destinations";
import { PRIMARY_COLORS } from "./labels";
import { photoItemsOf, presetsOf } from "./packing";
import type {
  Accessory,
  Companion,
  CompanionType,
  LuggageItem,
  Personality,
  Trip,
} from "./types";

// Art-oriented descriptors. These are written for an image model, not for the
// in-game copy (which lives in destinations.ts), so they lean visual.
const TYPE_DESC: Record<CompanionType, string> = {
  animal: "一只圆滚滚、憨态可掬的水豚（卡皮巴拉）",
  sprite: "一个轻盈半透明、微微发光的小精灵",
  robot: "一个方头方脑、表情认真的小机器人",
  mushroom: "一只圆顶蘑菇当脑袋的小蘑菇精灵",
  dumpling: "一个软乎乎、圆滚滚的小团子精灵",
};

const PERSONALITY_DESC: Record<Personality, string> = {
  gentle: "神情温柔安静",
  curious: "睁着圆圆的眼睛好奇张望",
  lazy: "懒洋洋地眯着眼放空",
  brave: "挺起胸膛、神气十足",
  dreamy: "望向远方、若有所思",
};

const ACCESSORY_DESC: Record<Accessory, string> = {
  none: "",
  scarf: "脖子上围着一条小围巾",
  hat: "头上戴着一顶小帽子",
  glasses: "戴着一副圆圆的小眼镜",
  flower: "头上别着一朵小花",
  bell: "挂着一颗小铃铛",
};

const PRESET_ART: Record<LuggageItem, string> = {
  food: "一个小巧的饭团/零食",
  camera: "一台复古的小相机",
  charm: "一枚小小的护身符御守",
  gift: "一份包扎好的小礼物",
  umbrella: "一把折好的小伞",
};

function nearestColorName(hex: string): string {
  const target = parseHex(hex);
  if (!target) return hex;
  let best = PRIMARY_COLORS[0];
  let bestD = Infinity;
  for (const c of PRIMARY_COLORS) {
    const rgb = parseHex(c.hex);
    if (!rgb) continue;
    const d =
      (rgb[0] - target[0]) ** 2 +
      (rgb[1] - target[1]) ** 2 +
      (rgb[2] - target[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Describe everything the player packed, for the image prompt. */
function describeItems(trip: Trip): string {
  const parts: string[] = [];
  for (const p of presetsOf(trip.items)) parts.push(PRESET_ART[p]);
  for (const photo of photoItemsOf(trip.items)) {
    const tone = photo.hint ? `${photo.hint}的` : "";
    const color = photo.color ? `（色调接近 ${photo.color}）` : "";
    parts.push(`一件主人随身拍下的${tone}小物件${color}`);
  }
  return parts.join("、");
}

/**
 * Build the image-generation prompt for a postcard. Folds together the four
 * things the player actually contributed — the companion's look, the things
 * they packed, the revealed location, and the note they wrote — into one
 * descriptive scene, then pins the game's low-poly art direction.
 *
 * Kept pure (no client/server APIs) so it can run inside the lifecycle reducer
 * at trip-resolution time and be stored on the postcard for later regeneration.
 */
export function buildPostcardImagePrompt(
  companion: Companion,
  trip: Trip,
  opts: { locationName: string; scene: string },
): string {
  const meta = getDestination(trip.destination);
  const colorName = nearestColorName(companion.primaryColor);
  const accessory = ACCESSORY_DESC[companion.accessory];
  const itemsPhrase = describeItems(trip);
  const msg = trip.message?.trim() ?? "";
  const { palette } = meta;

  const lines = [
    `一张竖版风景明信片插画。主角是${TYPE_DESC[companion.type]}，` +
      `主色调为${colorName}（${companion.primaryColor}），${PERSONALITY_DESC[companion.personality]}` +
      `${accessory ? "，" + accessory : ""}。`,
    `它此刻正待在「${meta.label} · ${opts.locationName}」：${opts.scene}`,
    itemsPhrase
      ? `它的小背包里带着${itemsPhrase}，让它们自然地出现在画面里。`
      : "",
    msg ? `画面氛围呼应主人写给它的话：「${msg}」。` : "",
    `整体色板参考：天空 ${palette.sky}、远景 ${palette.mid}、地面 ${palette.ground}、点缀色 ${palette.accent}。`,
    `美术风格：低多边形（low poly）3D 等距小场景，柔和卡通渲染（toon / cel shading），` +
      `干净清晰的描边轮廓，温暖柔光，奶油色与马卡龙色系，治愈、可爱、安静。`,
    `构图：主角居中偏下，背景是该地点标志性的景物，上方留出天空。画面里不要出现任何文字、字母或水印。`,
  ];

  return lines.filter(Boolean).join("\n").slice(0, 1500);
}
