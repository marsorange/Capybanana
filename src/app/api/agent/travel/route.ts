// POST: the agent decides to send the pet on a journey.
// Body: { destination?: DestinationTheme, note?: string }
//   destination — force one of the 10 themes; omitted → weighted-random from
//   the packed bag + the owner's wish. The result (and its postcard) still
//   surprises everyone.
import { authed, commit, jsonError } from "@/server/api";
import { startTravel, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { destination?: unknown; note?: unknown } = {};
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

  const destination =
    typeof body.destination === "string" ? body.destination : undefined;
  const note = typeof body.note === "string" ? body.note : undefined;

  return commit(a.user.petId, startTravel(save, { destination, note }, now));
}
