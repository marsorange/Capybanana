// POST to clear the prepared bag. The web client calls this when it finds the
// "今日包裹" has gone stale on home entry (older than a day) — the staleness
// decision lives on the client; the server just performs the clear here.
// Idempotent: returns ok even when nothing is packed.
import { authed, commit } from "@/server/api";
import { clearBag, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  const now = Date.now();
  const save = tickSave(a.save, now);
  return commit(a.user.petId, clearBag(save, now));
}
