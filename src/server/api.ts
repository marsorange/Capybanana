// Shared helpers for the bind-authenticated route handlers.
import { readBind } from "./bind";
import { summarizePet } from "./engine";
import { resolveBind, savePet } from "./store";
import type { CloudSave, User } from "./types";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

/** Resolve the caller's bind token → owner + current (pre-tick) save. */
export async function authed(
  req: Request,
): Promise<{ user: User; save: CloudSave } | Response> {
  const token = readBind(req);
  if (!token)
    return jsonError("缺少 bind 令牌（用 ?bind= 或 Authorization: Bearer）", 401);
  const found = await resolveBind(token);
  if (!found) return jsonError("无效或已失效的 bind 令牌", 401);
  return found;
}

/** Persist the save and reply with the standard envelope (raw save + summary). */
export async function commit(petId: string, save: CloudSave): Promise<Response> {
  await savePet(petId, save);
  return Response.json({
    ok: true,
    rev: save.rev,
    save,
    pet: summarizePet(save),
  });
}

/**
 * Persist the (already-ticked) save but reply with an error envelope. Used when
 * an agent action is refused (e.g. already acted today / too hurt): we still want
 * any trip that resolved during the tick to be saved, and to hand the agent the
 * current `pet` summary so it can see why it's blocked.
 */
export async function commitError(
  petId: string,
  save: CloudSave,
  message: string,
  status = 409,
): Promise<Response> {
  await savePet(petId, save);
  return Response.json(
    { ok: false, error: message, rev: save.rev, pet: summarizePet(save) },
    { status },
  );
}

/** Absolute origin for building the bind link (deployed domain on Vercel). */
export function baseUrl(req: Request): string {
  if (process.env.APP_BASE_URL)
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
