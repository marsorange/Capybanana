// Web action: the owner packs today's bag. Packing only puts the pet in `ready`;
// the agent's /api/agent/day still decides whether it actually heads out.
// Body: { items?: Item[], message?: string, gesture?: "pat" }
//   Item (web): a full PackedItem (preset/photo) — passed through
//   Item (free text): { label, keyword?, hint?, tags? }
import { ALL_ITEM_TAGS } from "@/game/itemTags";
import type { ItemTag, LuggageItem, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { jsonError, petAction } from "@/server/api";
import { packBag } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TAGS = new Set<string>(ALL_ITEM_TAGS);
const PRESETS = new Set<string>(["food", "camera", "charm", "gift", "umbrella"]);

function toPackedItems(raw: unknown): PackedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((entry): PackedItem => {
    const o = (entry ?? {}) as Record<string, unknown>;
    const labelSrc =
      (typeof o.label === "string" && o.label.trim()) ||
      (typeof o.keyword === "string" && o.keyword.trim()) ||
      "一样东西";
    const label = String(labelSrc).slice(0, 20);
    const keyword =
      typeof o.keyword === "string" ? o.keyword.slice(0, 20) : undefined;
    const hint = typeof o.hint === "string" ? o.hint.slice(0, 40) : undefined;
    const tags = Array.isArray(o.tags)
      ? (o.tags.filter(
          (t): t is ItemTag => typeof t === "string" && VALID_TAGS.has(t),
        ) as ItemTag[])
      : undefined;

    // Web client sends a fully-built preset/photo item — keep it intact.
    if (o.kind === "preset" && typeof o.preset === "string" && PRESETS.has(o.preset))
      return {
        id: typeof o.id === "string" ? o.id : uid("pi"),
        kind: "preset",
        preset: o.preset as LuggageItem,
        label,
        keyword,
        hint,
        tags,
      };
    if (o.kind === "photo" && typeof o.photo === "string")
      return {
        id: typeof o.id === "string" ? o.id : uid("pi"),
        kind: "photo",
        photo: o.photo,
        label,
        keyword,
        hint,
        color: typeof o.color === "string" ? o.color : undefined,
        tags,
      };

    // Free-text "thing".
    return { id: uid("ai"), kind: "text", label, keyword, hint, tags };
  });
}

export const POST = petAction((save, { body, now }) => {
  if (save.companionState === "traveling")
    return jsonError("它正在旅行，等它回来再收拾包裹", 409);

  const items = toPackedItems(body.items);
  const message =
    typeof body.message === "string" ? body.message.slice(0, 50) : "";
  const gesture = body.gesture === "pat" ? "pat" : undefined;

  return packBag(save, items, message, gesture, now);
});
