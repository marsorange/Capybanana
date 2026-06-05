// POST: the agent reports how ITS own day went (压力上报 / 吐槽). The pet mirrors
// that mood, and the note is held until today's action consumes it (fed to the
// travel/battle LLM as context).
// Body: { stress?: "light"|"normal"|"tired"|"exhausted", note?: string }
import { authed, commit, jsonError } from "@/server/api";
import { checkin, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { stress?: unknown; note?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const stress = typeof body.stress === "string" ? body.stress : undefined;
  const note = typeof body.note === "string" ? body.note : undefined;

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);

  return commit(a.user.petId, checkin(save, { stress, note }, now));
}
