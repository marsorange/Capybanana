// Web read: the owner's thin client polls this (cloudPull) to project the latest
// cloud save into its store. Catches the lifecycle up to now, then returns the
// full CloudSave. (The agent reads its own curated bundle via /api/agent/checkin.)
import { authed } from "@/server/api";
import { tickSave } from "@/server/engine";
import { agentSeenAt, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = await tickSave(a.save, Date.now());
  // Persist only when the tick actually resolved something (avoids a DB write on
  // every 5s idle poll).
  if (save.rev !== a.save.rev) await savePet(a.user.petId, save);
  // While the account is petless, the connect gate wants the sub-signal "has
  // the Agent at least touched the API (read skill.md)?" — token use doesn't
  // bump rev, so it rides alongside the save instead of inside it.
  const seenAt = save.companion ? null : await agentSeenAt(a.user.id);
  return Response.json({ ok: true, rev: save.rev, save, agentSeenAt: seenAt });
}
