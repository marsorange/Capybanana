import { CHARACTERS } from "./characters";
import type {
  Accessory,
  CompanionType,
  LuggageItem,
  Personality,
} from "./types";

// Derived from the character roster so there is a single source of truth.
export const COMPANION_TYPES: {
  type: CompanionType;
  label: string;
  emoji: string;
  blurb: string;
}[] = CHARACTERS.map((c) => ({
  type: c.species,
  label: c.label,
  emoji: c.emoji,
  blurb: c.blurb,
}));

export const PERSONALITIES: {
  value: Personality;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { value: "gentle", label: "温柔", emoji: "🫧", desc: "走得慢，话也软" },
  { value: "curious", label: "好奇", emoji: "🔍", desc: "什么都想看看" },
  { value: "lazy", label: "慵懒", emoji: "🌿", desc: "爱发呆和晒太阳" },
  { value: "brave", label: "勇敢", emoji: "⛰️", desc: "敢走远一点" },
  { value: "dreamy", label: "爱幻想", emoji: "☁️", desc: "总在想些别的" },
];

export const ACCESSORIES: { value: Accessory; label: string; emoji: string }[] =
  [
    { value: "none", label: "什么都不戴", emoji: "·" },
    { value: "scarf", label: "小围巾", emoji: "🧣" },
    { value: "hat", label: "小帽子", emoji: "🎩" },
    { value: "glasses", label: "小眼镜", emoji: "👓" },
    { value: "flower", label: "小花", emoji: "🌼" },
    { value: "bell", label: "小铃铛", emoji: "🔔" },
  ];

export const LUGGAGE: {
  item: LuggageItem;
  label: string;
  emoji: string;
  blurb: string;
}[] = [
  { item: "food", label: "食物", emoji: "🍙", blurb: "走得更久一点" },
  { item: "camera", label: "相机", emoji: "📷", blurb: "更容易寄明信片" },
  { item: "charm", label: "护身符", emoji: "🧿", blurb: "爱去安静神秘的地方" },
  { item: "gift", label: "小礼物", emoji: "🎁", blurb: "会带回温柔的话" },
  { item: "umbrella", label: "雨伞", emoji: "☂️", blurb: "偏爱雨天和城市" },
];

// Friendly, slightly muted creature colors.
export const PRIMARY_COLORS: { hex: string; name: string }[] = [
  { hex: "#E9A23B", name: "蜜橙" },
  { hex: "#D95F59", name: "陶红" },
  { hex: "#E98AA8", name: "樱粉" },
  { hex: "#8AA978", name: "豆绿" },
  { hex: "#6FA8C9", name: "湖蓝" },
  { hex: "#C9B6D6", name: "薰紫" },
  { hex: "#F2D06B", name: "奶黄" },
  { hex: "#B98A64", name: "焦糖" },
];

export const PERSONALITY_LABELS: Record<Personality, string> = {
  gentle: "温柔",
  curious: "好奇",
  lazy: "慵懒",
  brave: "勇敢",
  dreamy: "爱幻想",
};

export const TYPE_LABELS = Object.fromEntries(
  CHARACTERS.map((c) => [c.species, c.label]),
) as Record<CompanionType, string>;

export const LUGGAGE_LABELS: Record<LuggageItem, string> = {
  food: "食物",
  camera: "相机",
  charm: "护身符",
  gift: "小礼物",
  umbrella: "雨伞",
};

export const LUGGAGE_EMOJI: Record<LuggageItem, string> = {
  food: "🍙",
  camera: "📷",
  charm: "🧿",
  gift: "🎁",
  umbrella: "☂️",
};

export const MAX_LUGGAGE = 3;
