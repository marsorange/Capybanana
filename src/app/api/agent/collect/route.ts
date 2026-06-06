// POST to tuck the waiting postcard into the album (clears the pending flag).
import { authed, commit } from "@/server/api";
import { collectPostcard, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const now = Date.now();
  const save = await tickSave(a.save, now);
  return commit(a.user.petId, collectPostcard(save, now));
}
