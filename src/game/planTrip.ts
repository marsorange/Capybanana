import { destinationsByDistance, KEYWORD_RULES } from "./destinations";
import { keywordsOf, presetsOf } from "./packing";
import type { DestinationTheme, PackedItem, TripDistance } from "./types";
import { weightedPick } from "./util";

const KEYWORD_BOOST = 6;
const ITEM_BOOST = 3;

/**
 * Decide WHERE the companion went, within the distance pool the agent chose.
 * The agent only picks near/far; the destination is the server's call, biased
 * (never dictated) by the message keywords AND the keywords extracted from the
 * photographed objects — every place in the pool keeps its base weight, so the
 * result stays a surprise. Hidden from the player until the postcard arrives.
 */
export function pickDestination(
  items: PackedItem[],
  message: string,
  distance: TripDistance,
): DestinationTheme {
  const pool = destinationsByDistance(distance);
  const inPool = new Set(pool.map((d) => d.theme));
  const weights = new Map<DestinationTheme, number>();
  for (const d of pool) weights.set(d.theme, d.baseWeight);

  // Only boost themes that actually live in the chosen pool.
  const boost = (themes: DestinationTheme[], amount: number) => {
    for (const theme of themes) {
      if (inPool.has(theme)) weights.set(theme, (weights.get(theme) ?? 0) + amount);
    }
  };

  const text = [message ?? "", ...keywordsOf(items)].join(" ");
  for (const rule of KEYWORD_RULES) {
    if (rule.test.some((t) => text.includes(t))) boost(rule.themes, KEYWORD_BOOST);
  }

  const presets = presetsOf(items);
  if (presets.includes("charm")) boost(["forest", "snow"], ITEM_BOOST);
  if (presets.includes("umbrella")) boost(["town"], ITEM_BOOST);

  return weightedPick(weights);
}
