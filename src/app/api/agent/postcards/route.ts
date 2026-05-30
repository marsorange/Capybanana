// GET every postcard the companion has sent home (newest first).
import { authed } from "@/server/api";
import { tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = tickSave(a.save, Date.now());
  await savePet(a.user.petId, save);

  return Response.json({
    ok: true,
    rev: save.rev,
    postcards: save.postcards.map((p) => ({
      id: p.id,
      title: p.title,
      locationName: p.locationName,
      destinationTheme: p.destinationTheme,
      message: p.message,
      reason: p.reason,
      sentAt: p.sentAt,
    })),
  });
}
