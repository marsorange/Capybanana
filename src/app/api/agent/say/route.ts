// POST a few words to the pet. It's remembered and becomes the note on its
// next trip (which resolveDay reads and may delightfully misread).
// Body: { text: string }
import { authed, commit, jsonError } from "@/server/api";
import { sayTo, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { text?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return jsonError("text 不能为空", 400);

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);
  return commit(a.user.petId, sayTo(save, text, now));
}
