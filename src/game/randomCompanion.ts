// Roll a brand-new travel companion (the server mints a new account's first
// pet). The product ships a single fixed character now, so the species is always
// the capybara — `CHARACTERS` holds one entry — and only the cute name varies.
import { CHARACTERS, isSpecies, normalizeSpecies } from "./characters";
import { ACCESSORIES, PERSONALITIES } from "./labels";
import type { Accessory, CompanionType, Personality } from "./types";
import { pick } from "./util";

export interface CompanionDraft {
  name: string;
  type: CompanionType;
  primaryColor: string;
  personality: Personality;
  accessory: Accessory;
}

// Soft, food-and-nature flavored names that suit the low-poly roster.
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

const HEX = /^#[0-9a-fA-F]{6}$/;

export function randomCompanion(): CompanionDraft {
  const character = pick(CHARACTERS);
  return {
    name: pick(NAMES),
    type: character.species,
    primaryColor: character.defaultColor,
    personality: pick(PERSONALITIES).value,
    accessory: character.accessory,
  };
}

// Every roster character is already a soft, cute animal, so the "cute" roll is
// just a fresh roster pick (kept as its own export for the adoption / "换个样子"
// callers that want to stay explicit about intent).
export function randomCuteCompanion(): CompanionDraft {
  return randomCompanion();
}

const PERSONALITY_SET = new Set<string>(PERSONALITIES.map((p) => p.value));
const ACCESSORY_SET = new Set<string>(ACCESSORIES.map((a) => a.value));

// Coerce arbitrary (e.g. agent-supplied) input into a valid draft, filling any
// missing or out-of-range field with a fresh random pick. Legacy species names
// are mapped onto the roster rather than discarded.
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
      typeof o.type === "string" ? normalizeSpecies(o.type) : base.type,
    primaryColor:
      typeof o.primaryColor === "string" && HEX.test(o.primaryColor)
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

// Just the look (no name/personality) — used to restyle an existing pet.
export interface Appearance {
  type: CompanionType;
  primaryColor: string;
  accessory: Accessory;
}

// Validate a partial appearance, keeping the fallback for any missing/invalid
// field (so an explicit restyle only changes what it specifies).
export function coerceAppearance(input: unknown, fallback: Appearance): Appearance {
  if (!input || typeof input !== "object") return fallback;
  const o = input as Record<string, unknown>;
  return {
    type: isSpecies(o.type) ? o.type : fallback.type,
    primaryColor:
      typeof o.primaryColor === "string" && HEX.test(o.primaryColor)
        ? o.primaryColor
        : fallback.primaryColor,
    accessory:
      typeof o.accessory === "string" && ACCESSORY_SET.has(o.accessory)
        ? (o.accessory as Accessory)
        : fallback.accessory,
  };
}
