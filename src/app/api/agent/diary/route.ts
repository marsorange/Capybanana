// The pet's daily diary, written by the agent in the pet's voice.
//   POST { text }  — write/replace today's entry (<= 200 chars, one per day).
//   GET  ?limit=N  — read recent entries (newest first; default 30, max 90).
import { authed, commit, jsonError } from "@/server/api";
import { summarizePet, tickSave, writeDiary, DIARY_MAX } from "@/server/engine";
import { savePet } from "@/server/store";

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
  if ([...text].length > DIARY_MAX)
    return jsonError(`日记最多 ${DIARY_MAX} 字`, 400);

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);
  return commit(a.user.petId, writeDiary(save, text, now));
}

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = tickSave(a.save, Date.now());
  await savePet(a.user.petId, save);

  const raw = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 90) : 30;

  return Response.json({
    ok: true,
    rev: save.rev,
    diary: (save.diary ?? []).slice(0, limit),
    pet: summarizePet(save),
  });
}
