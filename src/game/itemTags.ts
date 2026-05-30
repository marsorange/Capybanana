import type { ItemTag, LuggageItem, PackedItem } from "./types";

// Every valid story-seed tag (for validating loose input from the agent API).
export const ALL_ITEM_TAGS: ItemTag[] = [
  "warm",
  "food",
  "soft",
  "shiny",
  "protective",
  "weird",
  "work",
  "rain",
  "sleep",
  "toy",
];

export const PRESET_TAGS: Record<LuggageItem, ItemTag[]> = {
  food: ["food"],
  camera: ["work", "shiny"],
  charm: ["protective", "shiny"],
  gift: ["soft", "toy"],
  umbrella: ["rain", "protective"],
};

// Placeholder for a real VLM: map the photo's extracted "element" to tags.
export function tagsFromHint(hint?: string): ItemTag[] {
  switch (hint) {
    case "夜色般的暗调":
      return ["sleep", "weird"];
    case "海一样的蓝":
      return ["shiny"];
    case "草木的绿":
      return ["soft"];
    case "暖暖的橘":
      return ["warm"];
    case "花一样的粉":
      return ["soft", "toy"];
    case "灰白的城":
      return ["work", "rain"];
    default:
      return ["weird"];
  }
}

export function collectTags(items: PackedItem[]): ItemTag[] {
  const out: ItemTag[] = [];
  for (const it of items) {
    if (it.tags && it.tags.length) out.push(...it.tags);
    else if (it.kind === "preset" && it.preset) out.push(...PRESET_TAGS[it.preset]);
  }
  return out;
}

export function hasTag(tags: ItemTag[], t: ItemTag): boolean {
  return tags.includes(t);
}
