// Daily step ①: the agent reports how ITS own day went AND reads the pet's full
// current state in one round-trip.
//   Body (all optional): { stress?: "light"|"normal"|"tired"|"exhausted",
//                          note?: string, since?: number }
// With stress/note it mirrors that mood onto the pet (consumed by today's action
// as LLM context). An empty body is a pure read. Either way it returns the
// curated bundle the agent needs to decide the day:
//   { ok, rev, pet, events, postcards, battles }
// (`since` filters the event log to only what's new since that seq.)
import { agentStateBody, authed, jsonError, readBody } from "@/server/api";
import { checkin, tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  const body = await readBody(req);
  const now = Date.now();
  let save = await tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);

  const stress = typeof body.stress === "string" ? body.stress : undefined;
  const note = typeof body.note === "string" ? body.note : undefined;
  const since = Number(body.since) || 0;

  // Reporting something mutates; an empty body is a pure read (no rev bump).
  if (stress !== undefined || note !== undefined)
    save = checkin(save, { stress, note }, now);

  // Persist only if the tick (a resolved trip) or the check-in actually changed
  // things — keeps idle polls from writing on every call.
  if (save.rev !== a.save.rev) await savePet(a.user.petId, save);

  return Response.json(agentStateBody(save, since));
}
