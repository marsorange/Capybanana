// The six fixed protagonists. Each is its own species (persisted as
// `companion.type`). Reference art lives in `src/asset/Character/<reference>`
// and is only a target for the per-character 3D assets we generate later — at
// runtime every species still renders the shared low-poly placeholder model
// (see src/components/scenes3d/character/). This roster is the single source of
// truth for species metadata: labels, default look, and the placeholder's
// proportion hints. Replace `earScale`/colors here only to tune the placeholder;
// the real distinguishing geometry arrives with the generated assets.
import type { Accessory, CompanionType } from "./types";

export interface CharacterDef {
  /** Stable id, stored on `companion.type`. */
  species: CompanionType;
  /** Brand name (matches the reference art filename). */
  name: string;
  /** Cute Chinese display label used across the UI. */
  label: string;
  emoji: string;
  blurb: string;
  /** Body color sampled from the reference art. */
  defaultColor: string;
  /** Signature accessory from the reference art. */
  accessory: Accessory;
  /** Ear proportion hint for the shared placeholder (1 = capybara baseline). */
  earScale: number;
  /** Reference image filename under src/asset/Character/ (art target, not bundled). */
  reference: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    species: "capybara",
    name: "Capybanana",
    label: "卡皮巴拉",
    emoji: "🐹",
    blurb: "憨厚爱发呆，戴贝雷帽",
    defaultColor: "#C8893B",
    accessory: "scarf",
    earScale: 0.9,
    reference: "Capybanana.png",
  },
  {
    species: "rabbit",
    name: "Bunberry",
    label: "邦布兔",
    emoji: "🐰",
    blurb: "竖着长耳朵，爱蹦跶",
    defaultColor: "#F1EBE2",
    accessory: "scarf",
    earScale: 1.9,
    reference: "Bunberry.png",
  },
  {
    species: "duck",
    name: "Quackaroo",
    label: "呱呱鸭",
    emoji: "🦆",
    blurb: "戴草帽的小水手",
    defaultColor: "#F3EEE4",
    accessory: "hat",
    earScale: 0.7,
    reference: "Quackaroo.png",
  },
  {
    species: "raccoon",
    name: "Raccoonie",
    label: "浣熊仔",
    emoji: "🦝",
    blurb: "戴圆框眼镜，机灵",
    defaultColor: "#8C8A90",
    accessory: "glasses",
    earScale: 1.4,
    reference: "Raccoonie.png",
  },
  {
    species: "shiba",
    name: "Shibuddy",
    label: "柴柴",
    emoji: "🐕",
    blurb: "笑眯眯的小柴犬",
    defaultColor: "#E0A256",
    accessory: "scarf",
    earScale: 1.3,
    reference: "Shibuddy.png",
  },
  {
    species: "sheep",
    name: "Woollybean",
    label: "羊毛豆",
    emoji: "🐑",
    blurb: "毛茸茸，系小围裙",
    defaultColor: "#F2EFE9",
    accessory: "hat",
    earScale: 0.9,
    reference: "Woollybean.png",
  },
];

export const CHARACTER_BY_SPECIES = Object.fromEntries(
  CHARACTERS.map((c) => [c.species, c]),
) as Record<CompanionType, CharacterDef>;

export const SPECIES_LIST: CompanionType[] = CHARACTERS.map((c) => c.species);

export const DEFAULT_SPECIES: CompanionType = "capybara";

// Old saves stored the retired parametric types (animal/sprite/robot/mushroom/
// dumpling). Map them onto the new roster so existing pets keep a stable look
// instead of being re-rolled into a random species.
const LEGACY_TYPES: Record<string, CompanionType> = {
  animal: "capybara",
  mushroom: "capybara",
  dumpling: "sheep",
  sprite: "rabbit",
  robot: "raccoon",
};

/** Normalize any stored/agent-supplied value into a valid species. */
export function normalizeSpecies(value: unknown): CompanionType {
  if (typeof value === "string") {
    if (value in CHARACTER_BY_SPECIES) return value as CompanionType;
    if (value in LEGACY_TYPES) return LEGACY_TYPES[value];
  }
  return DEFAULT_SPECIES;
}

export function isSpecies(value: unknown): value is CompanionType {
  return typeof value === "string" && value in CHARACTER_BY_SPECIES;
}
