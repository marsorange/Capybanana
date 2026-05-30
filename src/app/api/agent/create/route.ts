// POST to bring the pet into existence from a chosen (or random) draft.
// Body: { companion?: { name?, type?, primaryColor?, personality?, accessory? } }
// Any missing/invalid field is filled with a random pick.
import { coerceCompanionDraft } from "@/game/randomCompanion";
import { authed, commit, jsonError } from "@/server/api";
import { createPet, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { companion?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body — a fully random pet is fine */
  }

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (save.companion) return jsonError("已经有一只宠物了", 409);

  const draft = coerceCompanionDraft(body.companion);
  return commit(a.user.petId, createPet(save, draft, now));
}
