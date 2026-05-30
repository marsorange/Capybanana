// POST today's bag. The companion decides on its own when to leave.
// Body: { items?: Item[], message?: string, gesture?: "pat" }
//   Item (agent): { label, keyword?, hint?, tags? }   — free text
//   Item (web):   a full PackedItem (preset/photo) — passed through
import { ALL_ITEM_TAGS } from "@/game/itemTags";
import type { ItemTag, LuggageItem, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { authed, commit, jsonError } from "@/server/api";
import { packBag, tickSave } from "@/server/engine";

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

    // Agent's free-text "thing".
    return { id: uid("ai"), kind: "text", label, keyword, hint, tags };
  });
}

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { items?: unknown; message?: unknown; gesture?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);
  if (save.companionState === "traveling")
    return jsonError("它正在旅行，等它回来再收拾包裹", 409);

  const items = toPackedItems(body.items);
  const message = typeof body.message === "string" ? body.message.slice(0, 50) : "";
  const gesture = body.gesture === "pat" ? "pat" : undefined;

  return commit(a.user.petId, packBag(save, items, message, gesture, now));
}
