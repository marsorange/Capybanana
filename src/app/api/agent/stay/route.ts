// POST: the agent decides the pet has a quiet day. Resolves immediately.
// Body: { mode?: "home" | "yard" | "rest", note?: string }
//   mode — force where it spends the day; omitted → a low-key day picked from
//   home/yard/rest based on the bag and how it feels (rest if hurt/tired).
import { authed, commit, jsonError } from "@/server/api";
import { stayHome, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { mode?: unknown; note?: unknown } = {};
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

  const mode = typeof body.mode === "string" ? body.mode : undefined;
  const note = typeof body.note === "string" ? body.note : undefined;

  return commit(a.user.petId, stayHome(save, { mode, note }, now));
}
