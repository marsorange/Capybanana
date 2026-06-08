// Shared helpers for the bind-authenticated route handlers.
import { readBind } from "./bind";
import { summarizePet, tickSave } from "./engine";
import { resolveBind, savePet } from "./store";
import type { CloudSave, User } from "./types";

export function jsonError(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

type AuthErrorCode = "missing_token" | "invalid_token" | "connection_revoked";

// A *terminal* auth failure (HTTP 401, `terminal: true`): the Agent should stop
// its daily loop and not retry — as opposed to a transient 5xx/503, which it
// should retry later. skill.md spells this contract out for the Agent.
const AUTH_ERROR_MESSAGE: Record<AuthErrorCode, string> = {
  missing_token:
    "缺少 bind 令牌（用 ?bind= 或 Authorization: Bearer）。请停止每日例程，并让主人在网页上重新生成连接链接发给你。",
  invalid_token:
    "绑定令牌无效。请停止每日例程、不要重试；让主人在网页上重新生成连接链接并发给你。",
  connection_revoked:
    "这个连接已失效：主人重新生成了连接链接（或换了一个 Agent）。请立即停止每日例程、不要再每天发请求。若主人还想让你继续照看，会把新的连接链接发给你。",
};

export function authError(code: AuthErrorCode): Response {
  return Response.json(
    { ok: false, error: code, terminal: true, message: AUTH_ERROR_MESSAGE[code] },
    { status: 401 },
  );
}

/** Resolve the caller's bind token → owner + current (pre-tick) save. */
export async function authed(
  req: Request,
): Promise<{ user: User; save: CloudSave } | Response> {
  const token = readBind(req);
  if (!token) return authError("missing_token");
  const r = await resolveBind(token);
  if (r.status === "revoked") return authError("connection_revoked");
  if (r.status === "unknown") return authError("invalid_token");
  return { user: r.user, save: r.save };
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

/** Tolerantly parse a JSON request body, returning `{}` for empty/invalid input. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) as Record<string, unknown>) ?? {};
  } catch {
    return {}; // empty / non-JSON body is fine — handlers treat fields as optional
  }
}

export interface ActionCtx {
  user: User;
  now: number;
  req: Request;
  body: Record<string, unknown>;
}

type ActionFn = (
  save: CloudSave,
  ctx: ActionCtx,
) => CloudSave | Response | Promise<CloudSave | Response>;

/**
 * Wrap a mutating handler in the shared plumbing every route repeats:
 *   authed → parse body → tickSave → companion gate → run → commit.
 * The handler returns the next save (committed for you) or its own Response for
 * cases that need a custom envelope/status. `runtime`/`dynamic` still live as
 * literal exports in each route file (Next reads them via static analysis).
 */
export function petAction(
  fn: ActionFn,
  opts: { requireCompanion?: boolean; requireNoCompanion?: boolean } = {},
): (req: Request) => Promise<Response> {
  const { requireCompanion = true, requireNoCompanion = false } = opts;
  return async (req: Request): Promise<Response> => {
    const a = await authed(req);
    if (a instanceof Response) return a;
    const body = await readBody(req);
    const now = Date.now();
    const save = await tickSave(a.save, now);
    if (requireNoCompanion && save.companion)
      return jsonError("已经有一只宠物了", 409);
    if (requireCompanion && !save.companion)
      return jsonError("还没有宠物，请先调用 create", 409);
    const result = await fn(save, { user: a.user, now, req, body });
    if (result instanceof Response) return result;
    return commit(a.user.petId, result);
  };
}

/**
 * The agent's curated "current info" bundle: the pet summary plus recent
 * activity, postcards and sparring records — everything the daily check-in read
 * used to require four separate endpoints for. `since` filters the event log.
 */
export function agentStateBody(save: CloudSave, since = 0) {
  return {
    ok: true as const,
    rev: save.rev,
    pet: summarizePet(save),
    events: save.events.filter((e) => e.seq > since),
    postcards: save.postcards.map((p) => ({
      id: p.id,
      title: p.title,
      locationName: p.locationName,
      destinationTheme: p.destinationTheme,
      message: p.message,
      reason: p.reason,
      sentAt: p.sentAt,
    })),
    battles: save.battleRecords.map((b) => ({
      id: b.id,
      day: b.day,
      opponentName: b.opponentName,
      opponentSpecies: b.opponentSpecies,
      isNpc: b.isNpc,
      result: b.result,
      title: b.title,
      story: b.story,
      injury: b.injury,
      spoils: b.spoils,
      ratingDelta: b.ratingDelta,
      createdAt: b.createdAt,
    })),
  };
}
