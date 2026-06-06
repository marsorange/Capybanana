// GET a single postcard by id.
import { authed, jsonError } from "@/server/api";
import { tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = await tickSave(a.save, Date.now());
  await savePet(a.user.petId, save);

  const { id } = await params;
  const card = save.postcards.find((p) => p.id === id);
  if (!card) return jsonError("没有这张明信片", 404);
  return Response.json({ ok: true, postcard: card });
}
