// Roll a brand-new travel companion. Used by both the client (the "🎲 换一只"
// reroll on the create screen) and the server (a new account's first pet), so a
// fresh capybara looks the same wherever it is born.
import { ACCESSORIES, COMPANION_TYPES, PERSONALITIES, PRIMARY_COLORS } from "./labels";
import type { Accessory, CompanionType, Personality } from "./types";
import { pick } from "./util";

export interface CompanionDraft {
  name: string;
  type: CompanionType;
  primaryColor: string;
  personality: Personality;
  accessory: Accessory;
}

// Soft, food-and-nature flavored names that suit a low-poly capybara.
const NAMES = [
  "豆豆",
  "团团",
  "糯米",
  "麻薯",
  "可乐",
  "布丁",
  "芋圆",
  "栗子",
  "桃酥",
  "月饼",
  "汤圆",
  "棉花",
  "山楂",
  "花生",
  "小米",
  "椰果",
];

export function randomCompanion(): CompanionDraft {
  return {
    name: pick(NAMES),
    type: pick(COMPANION_TYPES).type,
    primaryColor: pick(PRIMARY_COLORS).hex,
    personality: pick(PERSONALITIES).value,
    accessory: pick(ACCESSORIES).value,
  };
}

const TYPE_SET = new Set<string>(COMPANION_TYPES.map((t) => t.type));
const PERSONALITY_SET = new Set<string>(PERSONALITIES.map((p) => p.value));
const ACCESSORY_SET = new Set<string>(ACCESSORIES.map((a) => a.value));
const COLOR_SET = new Set<string>(PRIMARY_COLORS.map((c) => c.hex));

// Coerce arbitrary (e.g. agent-supplied) input into a valid draft, filling any
// missing or out-of-range field with a fresh random pick.
export function coerceCompanionDraft(input: unknown): CompanionDraft {
  const base = randomCompanion();
  if (!input || typeof input !== "object") return base;
  const o = input as Record<string, unknown>;
  return {
    name:
      typeof o.name === "string" && o.name.trim()
        ? o.name.trim().slice(0, 12)
        : base.name,
    type:
      typeof o.type === "string" && TYPE_SET.has(o.type)
        ? (o.type as CompanionType)
        : base.type,
    primaryColor:
      typeof o.primaryColor === "string" && COLOR_SET.has(o.primaryColor)
        ? o.primaryColor
        : base.primaryColor,
    personality:
      typeof o.personality === "string" && PERSONALITY_SET.has(o.personality)
        ? (o.personality as Personality)
        : base.personality,
    accessory:
      typeof o.accessory === "string" && ACCESSORY_SET.has(o.accessory)
        ? (o.accessory as Accessory)
        : base.accessory,
  };
}
