// POST: the agent decides to send the pet to scrap with Claw.
// Body: { note?: string }
//   The outcome is win/lose/draw, decided by the pet's fighting power
//   (bravery + energy + a protective item in the bag + bond + luck). A
//   protective item / high bravery makes winning likelier; losing hurts it.
import { authed, commit, jsonError } from "@/server/api";
import { startBattle, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { note?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);
  if (save.companionState === "traveling")
    return jsonError("它已经出门了，等它回来再说", 409);

  const note = typeof body.note === "string" ? body.note : undefined;

  return commit(a.user.petId, startBattle(save, { note }, now));
}
