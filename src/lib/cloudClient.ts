// Thin client for the WEB (owner) API. The browser is a thin client over the
// same cloud save the external agent drives — it only performs owner actions:
// login, read state (cloudPull), and pack/unpack/collect the bag. The agent's
// own endpoints (create / checkin / day) live under /api/agent/* and are NOT
// called from here.
import type { Gesture, PackedItem } from "@/game/types";
import type { CloudSave } from "@/server/types";

export interface LoginResult {
  user: { id: string; email: string | null };
  bindToken: string; // the web session token (cloud.bindToken)
  // The Agent bind link — null on a returning login once an Agent is bound (the
  // web reuses its persisted connectUrl, or the owner regenerates it on demand).
  connectUrl: string | null;
  save: CloudSave;
}

export interface MutationResult {
  ok: boolean;
  rev: number;
  save: CloudSave;
  // /api/web/state only, while the account is petless: when the Agent last
  // touched the API with its bind token (non-null = it has read skill.md).
  agentSeenAt?: string | null;
}

type Method = "GET" | "POST";

async function call<T>(
  method: Method,
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token && method === "POST") headers["authorization"] = `Bearer ${token}`;

  const url =
    method === "GET" && token
      ? `${path}${path.includes("?") ? "&" : "?"}bind=${encodeURIComponent(token)}`
      : path;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // A wedged server instance must FAIL the call, not strand it forever —
      // a hung fetch here is what froze the connect-gate poll (the pet arrived
      // server-side but no response ever came back, so the UI never flipped).
      // With a deadline, the next 5s poll retries fresh and recovers on its own.
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    const name = (e as DOMException).name;
    if (name === "TimeoutError" || name === "AbortError") {
      const err = new Error("请求超时了，稍后会自动再试");
      (err as Error & { status?: number }).status = 0;
      throw err;
    }
    throw e;
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok || data?.ok === false) {
    const err = new Error((data?.error as string) || `请求失败（${res.status}）`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export const cloud = {
  // Bridge a verified Supabase Auth session into our bind-token account.
  loginSupabase: (accessToken: string) =>
    call<LoginResult & { ok: true }>("POST", "/api/auth/supabase", undefined, {
      accessToken,
    }),
  // Local dev-only auth bridge (no Supabase needed).
  loginDev: (identity?: string) =>
    call<LoginResult & { ok: true }>("POST", "/api/auth/dev", undefined, {
      identity,
    }),
  // Poll the latest cloud save (cloudPull).
  state: (token: string) =>
    call<MutationResult>("GET", "/api/web/state", token),
  // Pack today's bag (owner prepares the luggage; the agent decides the day).
  pack: (
    token: string,
    items: PackedItem[],
    message: string,
    gesture?: Gesture,
  ) =>
    call<MutationResult>("POST", "/api/web/pack", token, {
      items,
      message,
      gesture,
    }),
  // Clear the prepared bag (web calls this when it finds the bag stale on home).
  unpack: (token: string) =>
    call<MutationResult>("POST", "/api/web/unpack", token),
  // Tuck the waiting postcard into the album.
  collect: (token: string) =>
    call<MutationResult>("POST", "/api/web/collect", token),
  // Mint a fresh Agent bind link (revokes the old one → old Agent disconnects).
  regenerateAgentLink: (token: string) =>
    call<{ ok: true; connectUrl: string }>("POST", "/api/auth/agent-link", token),
};
