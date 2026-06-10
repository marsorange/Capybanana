// Postcard gacha: the server-side rarity roll + the 图鉴 card identity.
//
// Rarity is rolled at trip resolution (engine.foldOutcome), never by the LLM and
// NOT influenced by the packed bag — only by the pet's VISIBLE growth (陪伴天数
// companionDays) + its HIDDEN curiosity + a soft/hard pity counter
// (pullsSinceRare). Kept to a transparent weight table. Each (destination ×
// rarity) pair is one fixed collectible card; 8 destinations × 3 rarities =
// 24-card 图鉴.
import { DESTINATIONS, LANDMARKS } from "./destinations";
import type { DestinationTheme, Rarity } from "./types";
import { weightedPick } from "./util";

export const RARITIES: Rarity[] = ["N", "R", "SR"];
const RARITY_INDEX: Record<Rarity, number> = { N: 0, R: 1, SR: 2 };

export const TOTAL_CARDS = DESTINATIONS.length * RARITIES.length; // 8 × 3 = 24

// Base pull weights → N 64% / R 30% / SR 6%.
const BASE: Record<Rarity, number> = { N: 640, R: 300, SR: 60 };

// Soft pity ramps from this many SR-less travels; hard SR guarantee at HARD.
const PITY_SOFT = 8;
const PITY_HARD = 15;

/**
 * "Luck" from raising: the VISIBLE 陪伴天数 (companionDays, contributes ≤30) plus
 * the HIDDEN curiosity (≤10). Capped at 40 so even a long-companioned pet tops
 * out near SR ~19% — the rare tier stays rare. The bag does NOT feed luck.
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
  pullsSinceRare: number; // travels since the last SR
}

/** Roll one postcard's rarity. Pure except for the RNG inside weightedPick. */
export function rollRarity(ctx: RollContext): Rarity {
  const luck = luckOf(ctx.companionDays, ctx.curiosity);
  const w = new Map<Rarity, number>([
    ["N", BASE.N],
    ["R", BASE.R],
    ["SR", BASE.SR + luck * 4],
  ]);
  const over = Math.max(0, ctx.pullsSinceRare - (PITY_SOFT - 1));
  if (over > 0) w.set("SR", (w.get("SR") ?? 0) + over * 80);
  if (ctx.pullsSinceRare >= PITY_HARD) {
    // guarantee the rare tier: drop the common tiers entirely
    w.set("N", 0);
    w.set("R", 0);
  }
  return weightedPick(w);
}

/** SR resets the pity counter; N / R extend it. */
export function isRare(r: Rarity): boolean {
  return r === "SR";
}

/**
 * Normalize any stored rarity onto the current 3-tier set (legacy 传说 SSR → SR,
 * unknown / missing → N). Mirrors the server-side coerce in store.ts, but lives
 * here so the client can scrub persisted localStorage saves (which bypass the
 * server projection) before the UI ever indexes a missing RARITY_META entry.
 */
export function coerceRarity(r: string | null | undefined): Rarity {
  if (r === "R" || r === "SR") return r;
  if (r === "SSR") return "SR";
  return "N";
}

/** A stable id for the (destination × rarity) 图鉴 slot. */
export function cardId(theme: DestinationTheme, rarity: Rarity): string {
  return `${theme}:${rarity}`;
}

/** Every valid 图鉴 slot id — used to count collection progress (ignores orphans). */
export const ALL_CARD_IDS: ReadonlySet<string> = new Set(
  DESTINATIONS.flatMap((d) => RARITIES.map((r) => cardId(d.theme, r))),
);

/** Collected count, counting only ids that belong to the current 24-card 图鉴. */
export function countCollected(cardDex: string[]): number {
  return cardDex.filter((id) => ALL_CARD_IDS.has(id)).length;
}

/** The canonical landmark shown for a card (same slot → same landmark). */
export function landmarkForCard(theme: DestinationTheme, rarity: Rarity): string {
  const list = LANDMARKS[theme];
  return list?.[RARITY_INDEX[rarity]] ?? list?.[0] ?? "远方";
}
