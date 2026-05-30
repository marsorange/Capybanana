import { DESTINATIONS, KEYWORD_RULES } from "./destinations";
import { keywordsOf, photoItemsOf, presetsOf } from "./packing";
import type { DestinationTheme, PackedItem } from "./types";
import { randRange, weightedPick } from "./util";

const KEYWORD_BOOST = 6;
const ITEM_BOOST = 3;

const BASE_DURATION_MIN = 60_000;
const BASE_DURATION_MAX = 90_000;
const FOOD_BONUS = 45_000;
const PHOTO_BONUS = 8_000;
const DURATION_CAP = 160_000;

export interface TripPlan {
  destination: DestinationTheme;
  durationMs: number;
}

/**
 * Decide where the companion went and for how long. Hidden from the player
 * until the postcard arrives. Message keywords AND keywords extracted from the
 * photographed objects only bias the weighted-random pick (every place keeps
 * its base weight, so the result stays a surprise).
 */
export function planTrip(items: PackedItem[], message: string): TripPlan {
  const weights = new Map<DestinationTheme, number>();
  for (const d of DESTINATIONS) weights.set(d.theme, d.baseWeight);

  const text = [message ?? "", ...keywordsOf(items)].join(" ");
  for (const rule of KEYWORD_RULES) {
    if (rule.test.some((t) => text.includes(t))) {
      for (const theme of rule.themes) {
        weights.set(theme, (weights.get(theme) ?? 0) + KEYWORD_BOOST);
      }
    }
  }

  const presets = presetsOf(items);
  const boost = (themes: DestinationTheme[], amount: number) => {
    for (const theme of themes) {
      weights.set(theme, (weights.get(theme) ?? 0) + amount);
    }
  };
  if (presets.includes("charm")) {
    boost(["forest", "hotspring", "snow", "nightstation"], ITEM_BOOST);
  }
  if (presets.includes("umbrella")) {
    boost(["raincity", "town"], ITEM_BOOST);
  }

  const destination = weightedPick(weights);

  let durationMs = randRange(BASE_DURATION_MIN, BASE_DURATION_MAX);
  if (presets.includes("food")) durationMs += FOOD_BONUS;
  durationMs += photoItemsOf(items).length * PHOTO_BONUS;
  durationMs = Math.min(durationMs, DURATION_CAP);

  return { destination, durationMs: Math.round(durationMs) };
}
