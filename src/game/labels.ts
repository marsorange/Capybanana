import { localize, type Bi, type Locale } from "@/i18n/core";
import { CHARACTERS } from "./characters";
import type {
  Accessory,
  CompanionType,
  LuggageItem,
  Personality,
} from "./types";

// All player-facing text here is bilingual (`Bi<string>`). Use the locale-aware
// resolver functions below (companionTypes(locale), personalities(locale), …) to
// get plain strings; the raw bilingual constants are exported for the few callers
// that resolve a single language explicitly (e.g. the zh-only skill.md).

// Derived from the character roster so there is a single source of truth.
export const COMPANION_TYPES: {
  type: CompanionType;
  label: Bi<string>;
  emoji: string;
  blurb: Bi<string>;
}[] = CHARACTERS.map((c) => ({
  type: c.species,
  label: c.label,
  emoji: c.emoji,
  blurb: c.blurb,
}));

export const PERSONALITIES: {
  value: Personality;
  label: Bi<string>;
  emoji: string;
  desc: Bi<string>;
}[] = [
  { value: "gentle", label: { zh: "温柔", en: "Gentle" }, emoji: "🫧", desc: { zh: "走得慢，话也软", en: "Slow steps, soft words" } },
  { value: "curious", label: { zh: "好奇", en: "Curious" }, emoji: "🔍", desc: { zh: "什么都想看看", en: "Wants to see everything" } },
  { value: "lazy", label: { zh: "慵懒", en: "Lazy" }, emoji: "🌿", desc: { zh: "爱发呆和晒太阳", en: "Loves dozing in the sun" } },
  { value: "brave", label: { zh: "勇敢", en: "Brave" }, emoji: "⛰️", desc: { zh: "敢走远一点", en: "Dares to wander far" } },
  { value: "dreamy", label: { zh: "爱幻想", en: "Dreamy" }, emoji: "☁️", desc: { zh: "总在想些别的", en: "Always somewhere else" } },
];

export const ACCESSORIES: { value: Accessory; label: Bi<string>; emoji: string }[] =
  [
    { value: "none", label: { zh: "什么都不戴", en: "Nothing" }, emoji: "·" },
    { value: "scarf", label: { zh: "小围巾", en: "Scarf" }, emoji: "🧣" },
    { value: "hat", label: { zh: "小帽子", en: "Hat" }, emoji: "🎩" },
    { value: "glasses", label: { zh: "小眼镜", en: "Glasses" }, emoji: "👓" },
    { value: "flower", label: { zh: "小花", en: "Flower" }, emoji: "🌼" },
    { value: "bell", label: { zh: "小铃铛", en: "Bell" }, emoji: "🔔" },
  ];

export const LUGGAGE: {
  item: LuggageItem;
  label: Bi<string>;
  emoji: string;
  blurb: Bi<string>;
}[] = [
  { item: "food", label: { zh: "食物", en: "Food" }, emoji: "🍙", blurb: { zh: "走得更久一点", en: "Goes a little longer" } },
  { item: "camera", label: { zh: "相机", en: "Camera" }, emoji: "📷", blurb: { zh: "更容易寄明信片", en: "More likely to mail a postcard" } },
  { item: "charm", label: { zh: "护身符", en: "Charm" }, emoji: "🧿", blurb: { zh: "爱去安静神秘的地方", en: "Drawn to quiet, mysterious places" } },
  { item: "gift", label: { zh: "小礼物", en: "Gift" }, emoji: "🎁", blurb: { zh: "会带回温柔的话", en: "Brings back gentle words" } },
  { item: "umbrella", label: { zh: "雨伞", en: "Umbrella" }, emoji: "☂️", blurb: { zh: "偏爱雨天和城市", en: "Prefers rain and cities" } },
];

// Friendly, slightly muted creature colors.
export const PRIMARY_COLORS: { hex: string; name: Bi<string> }[] = [
  { hex: "#E9A23B", name: { zh: "蜜橙", en: "Honey Orange" } },
  { hex: "#D95F59", name: { zh: "陶红", en: "Terracotta" } },
  { hex: "#E98AA8", name: { zh: "樱粉", en: "Cherry Pink" } },
  { hex: "#8AA978", name: { zh: "豆绿", en: "Pea Green" } },
  { hex: "#6FA8C9", name: { zh: "湖蓝", en: "Lake Blue" } },
  { hex: "#C9B6D6", name: { zh: "薰紫", en: "Lavender" } },
  { hex: "#F2D06B", name: { zh: "奶黄", en: "Cream Yellow" } },
  { hex: "#B98A64", name: { zh: "焦糖", en: "Caramel" } },
];

export const PERSONALITY_LABELS: Record<Personality, Bi<string>> = {
  gentle: { zh: "温柔", en: "Gentle" },
  curious: { zh: "好奇", en: "Curious" },
  lazy: { zh: "慵懒", en: "Lazy" },
  brave: { zh: "勇敢", en: "Brave" },
  dreamy: { zh: "爱幻想", en: "Dreamy" },
};

export const TYPE_LABELS = Object.fromEntries(
  CHARACTERS.map((c) => [c.species, c.label]),
) as Record<CompanionType, Bi<string>>;

export const LUGGAGE_LABELS: Record<LuggageItem, Bi<string>> = {
  food: { zh: "食物", en: "Food" },
  camera: { zh: "相机", en: "Camera" },
  charm: { zh: "护身符", en: "Charm" },
  gift: { zh: "小礼物", en: "Gift" },
  umbrella: { zh: "雨伞", en: "Umbrella" },
};

export const LUGGAGE_EMOJI: Record<LuggageItem, string> = {
  food: "🍙",
  camera: "📷",
  charm: "🧿",
  gift: "🎁",
  umbrella: "☂️",
};

export const MAX_LUGGAGE = 3;

// ---- locale-aware resolvers (return plain strings) --------------------------

export function companionTypes(locale: Locale) {
  return COMPANION_TYPES.map((c) => ({
    type: c.type,
    label: c.label[locale],
    emoji: c.emoji,
    blurb: c.blurb[locale],
  }));
}

export function personalities(locale: Locale) {
  return PERSONALITIES.map((p) => ({
    value: p.value,
    label: p.label[locale],
    emoji: p.emoji,
    desc: p.desc[locale],
  }));
}

export function accessories(locale: Locale) {
  return ACCESSORIES.map((a) => ({
    value: a.value,
    label: a.label[locale],
    emoji: a.emoji,
  }));
}

export function luggage(locale: Locale) {
  return LUGGAGE.map((l) => ({
    item: l.item,
    label: l.label[locale],
    emoji: l.emoji,
    blurb: l.blurb[locale],
  }));
}

export function primaryColors(locale: Locale) {
  return PRIMARY_COLORS.map((c) => ({ hex: c.hex, name: c.name[locale] }));
}

export function personalityLabel(p: Personality, locale: Locale): string {
  return PERSONALITY_LABELS[p][locale];
}

export function typeLabel(t: CompanionType, locale: Locale): string {
  return localize(TYPE_LABELS[t] ?? TYPE_LABELS.capybara, locale);
}

export function accessoryLabel(a: Accessory, locale: Locale): string {
  return ACCESSORIES.find((x) => x.value === a)?.label[locale] ?? "";
}

export function luggageLabel(item: LuggageItem, locale: Locale): string {
  return LUGGAGE_LABELS[item][locale];
}
