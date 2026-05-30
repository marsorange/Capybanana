import type { LuggageItem, PackedItem } from "./types";

export function presetsOf(items: PackedItem[]): LuggageItem[] {
  return items
    .filter((i) => i.kind === "preset" && i.preset)
    .map((i) => i.preset as LuggageItem);
}

export function photoItemsOf(items: PackedItem[]): PackedItem[] {
  return items.filter((i) => i.kind === "photo");
}

export function keywordsOf(items: PackedItem[]): string[] {
  return items
    .map((i) => i.keyword)
    .filter((k): k is string => !!k);
}
