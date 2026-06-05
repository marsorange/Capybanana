// The single fixed protagonist. The product used to ship a six-species roster
// with a picker; it now ships ONE character — the capybara — so every surface
// that reads this roster (labels, the random roll, profile chips, the dev
// preview) collapses to it. `CompanionType` stays a wider union (see types.ts)
// only so legacy saves / agent-supplied strings still type-check; everything is
// funneled back to the capybara through `normalizeSpecies`.
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

export const CAPYBARA: CharacterDef = {
  species: "capybara",
  name: "Capybanana",
  label: "卡皮巴拉",
  emoji: "🐹",
  blurb: "憨厚爱发呆，戴贝雷帽",
  defaultColor: "#C8893B",
  accessory: "scarf",
  earScale: 0.9,
  reference: "Capybanana.png",
};

export const CHARACTERS: CharacterDef[] = [CAPYBARA];

export const CHARACTER_BY_SPECIES = Object.fromEntries(
  CHARACTERS.map((c) => [c.species, c]),
) as Record<CompanionType, CharacterDef>;

export const SPECIES_LIST: CompanionType[] = CHARACTERS.map((c) => c.species);

export const DEFAULT_SPECIES: CompanionType = "capybara";

/**
 * Normalize any stored/agent-supplied value into a valid species. With a single
 * fixed character that's always the capybara — old saves (rabbit/duck/… or the
 * retired parametric types) and any agent `type` all resolve here.
 */
export function normalizeSpecies(value?: unknown): CompanionType {
  return isSpecies(value) ? value : DEFAULT_SPECIES;
}

export function isSpecies(value: unknown): value is CompanionType {
  return value === DEFAULT_SPECIES;
}
