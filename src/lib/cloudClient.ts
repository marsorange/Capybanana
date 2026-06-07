// Thin client for the WEB (owner) API. The browser is a thin client over the
// same cloud save the external agent drives — it only performs owner actions:
// login, read state (cloudPull), and pack/unpack/collect the bag. The agent's
// own endpoints (create / checkin / day) live under /api/agent/* and are NOT
// called from here.
import type { Gesture, PackedItem } from "@/game/types";
import type { CloudSave } from "@/server/types";

export interface LoginResult {
  user: { id: string; email: string | null };
  bindToken: string;
  connectUrl: string;
  save: CloudSave;
}

export interface MutationResult {
  ok: boolean;
  rev: number;
  save: CloudSave;
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

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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
};
