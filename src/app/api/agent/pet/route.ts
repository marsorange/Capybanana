// GET the pet's current state (lifecycle caught up to now).
import { authed, commit } from "@/server/api";
import { tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = tickSave(a.save, Date.now());
  return commit(a.user.petId, save);
}
