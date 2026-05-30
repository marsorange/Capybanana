// Compose the text prompt for the AI postcard art. Combines the companion's
// look (low-poly capybara variant + color + accessory) with a famous landmark
// as the background scenery, so the generated image is "我家宝贝站在埃菲尔铁塔前".
import { ACCESSORIES } from "./labels";
import { PRIMARY_COLORS } from "./labels";
import type { Companion, CompanionType, DestinationTheme } from "./types";

const TYPE_FLAVOR: Record<CompanionType, string> = {
  animal: "毛茸茸的",
  sprite: "身上带点微光的",
  robot: "略带机械感的",
  mushroom: "头顶圆圆像小蘑菇的",
  dumpling: "软乎乎像小团子的",
};

const THEME_BG: Record<DestinationTheme, string> = {
  seaside: "湛蓝的大海与白色浪花",
  harbor: "停泊小船的港口与灯塔",
  forest: "茂密森林与洒落的阳光",
  snow: "白雪覆盖的雪原",
  hotspring: "热气氤氲的温泉",
  mountain: "层叠山峦与云海",
  flowerfield: "大片盛开的花田",
  raincity: "湿润的雨中街道与暖暖的灯",
  town: "古旧的小镇老街",
  nightstation: "霓虹与灯火的夜晚",
};

function colorName(hex: string): string {
  return (
    PRIMARY_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())
      ?.name ?? "柔和的颜色"
  );
}

export function buildPostcardImagePrompt(
  companion: Companion,
  opts: { landmark: string; theme: DestinationTheme; scene?: string },
): string {
  const flavor = TYPE_FLAVOR[companion.type] ?? "";
  const color = colorName(companion.primaryColor);
  const acc = ACCESSORIES.find((a) => a.value === companion.accessory);
  const accPart =
    companion.accessory !== "none" && acc ? `戴着${acc.label}，` : "";
  const bg = THEME_BG[opts.theme];

  return [
    "一张治愈系旅行明信片插画。",
    `画面主角是一只圆滚滚、可爱的低多边形（low-poly）3D ${flavor}卡皮巴拉，`,
    `${color}的身体，${accPart}`,
    `站在标志性地标「${opts.landmark}」前面。`,
    // Foreground the recognizable landmark as the main backdrop so it actually
    // reads as that place; the theme scenery is only soft atmosphere.
    `画面以清晰可辨、一眼能认出的「${opts.landmark}」为背景主体，`,
    `周围是${bg}的氛围${opts.scene ? `，${opts.scene}` : ""}。`,
    "柔和的卡通渲染，暖色调，轻微景深，竖构图 3:4，画面干净、不要任何文字。",
  ].join("");
}
