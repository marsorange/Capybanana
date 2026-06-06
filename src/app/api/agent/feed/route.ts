// GET the activity log since a cursor, so an agent can "check in" and narrate
// what's happened. Query: ?since=<seq> (the last seq it saw; 0/absent = all).
import { authed } from "@/server/api";
import { summarizePet, tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = await tickSave(a.save, Date.now());
  await savePet(a.user.petId, save);

  const since = Number(new URL(req.url).searchParams.get("since")) || 0;
  const events = save.events.filter((e) => e.seq > since);

  return Response.json({
    ok: true,
    rev: save.rev,
    since,
    events,
    pet: summarizePet(save),
  });
}
