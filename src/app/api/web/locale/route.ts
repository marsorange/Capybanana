// Web action: the owner picked a UI language (中文 / English) via the in-app
// toggle. Persist it so Agent-triggered, stored text (postcards, souvenirs, the
// activity log) is generated in the owner's language. Body: { locale: "zh"|"en" }.
import { authed, readBody } from "@/server/api";
import { setSaveLocale, tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const body = await readBody(req);
  const locale = body.locale === "en" ? "en" : "zh";
  const now = Date.now();
  const save = setSaveLocale(await tickSave(a.save, now), locale);
  // savePet no-ops for a petless account; the toggle re-pushes once a pet exists.
  await savePet(a.user.petId, save);
  return Response.json({ ok: true, rev: save.rev, save });
}
