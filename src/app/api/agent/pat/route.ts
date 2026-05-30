// POST a head pat — a small bond + mood bump.
import { authed, commit, jsonError } from "@/server/api";
import { patHead, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);
  return commit(a.user.petId, patHead(save, now));
}
