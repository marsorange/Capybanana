// Postcard gacha: the server-side rarity roll + the 图鉴 card identity.
//
// Rarity is rolled at trip resolution (engine.foldOutcome), never by the LLM, so
// the odds stay tunable. Inputs: the pet's VISIBLE growth (陪伴天数 companionDays)
// + its HIDDEN curiosity + a soft/hard pity counter (pullsSinceRare). Kept to a
// transparent weight table. Each (destination × rarity) pair is one fixed
// collectible card; 12 destinations × 4 rarities = 48-card 图鉴.
import { DESTINATIONS, LANDMARKS } from "./destinations";
import type { DestinationTheme, Rarity } from "./types";
import { weightedPick } from "./util";

export const RARITIES: Rarity[] = ["N", "R", "SR", "SSR"];
const RARITY_INDEX: Record<Rarity, number> = { N: 0, R: 1, SR: 2, SSR: 3 };

export const TOTAL_CARDS = DESTINATIONS.length * RARITIES.length; // 12 × 4 = 48

// Base pull weights → N 60% / R 30% / SR 8% / SSR 2%.
const BASE: Record<Rarity, number> = { N: 600, R: 300, SR: 80, SSR: 20 };

// Soft pity ramps from this many rare-less travels; hard guarantee at HARD.
const PITY_SOFT = 8;
const PITY_HARD = 15;

/**
 * "Luck" from raising: the VISIBLE 陪伴天数 (companionDays, contributes ≤30) plus
 * the HIDDEN curiosity (≤10). Capped at 40 so even a long-companioned pet tops
 * out near SSR ~5% — rarity stays rare (the bigger pools arrive in P1).
 */
export function luckOf(companionDays: number, curiosity: number): number {
  return (
    Math.min(Math.max(0, companionDays), 30) +
    Math.min(Math.floor(Math.max(0, curiosity) / 10), 10)
  );
}

export interface RollContext {
  companionDays: number;
  curiosity: number;
  pullsSinceRare: number; // travels since the last SR/SSR
}

/** Roll one postcard's rarity. Pure except for the RNG inside weightedPick. */
export function rollRarity(ctx: RollContext): Rarity {
  const luck = luckOf(ctx.companionDays, ctx.curiosity);
  const w = new Map<Rarity, number>([
    ["N", BASE.N],
    ["R", BASE.R],
    ["SR", BASE.SR + luck * 3],
    ["SSR", BASE.SSR + luck * 1],
  ]);
  const over = Math.max(0, ctx.pullsSinceRare - (PITY_SOFT - 1));
  if (over > 0) {
    w.set("SR", (w.get("SR") ?? 0) + over * 60);
    w.set("SSR", (w.get("SSR") ?? 0) + over * 15);
  }
  if (ctx.pullsSinceRare >= PITY_HARD) {
    // guarantee a rare: drop the common tiers entirely
    w.set("N", 0);
    w.set("R", 0);
  }
  return weightedPick(w);
}

/** SR / SSR reset the pity counter; N / R extend it. */
export function isRare(r: Rarity): boolean {
  return r === "SR" || r === "SSR";
}

/** A stable id for the (destination × rarity) 图鉴 slot. */
export function cardId(theme: DestinationTheme, rarity: Rarity): string {
  return `${theme}:${rarity}`;
}

/** The canonical landmark shown for a card (same slot → same landmark). */
export function landmarkForCard(theme: DestinationTheme, rarity: Rarity): string {
  const list = LANDMARKS[theme];
  return list[RARITY_INDEX[rarity]] ?? list[0];
}
