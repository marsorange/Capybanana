// Thin client for the cloud API. The owner's web client and an external AI
// agent talk to the exact same /api/agent/* endpoints; the web client just
// holds its bind token in the persisted store.
import type { CompanionDraft } from "@/game/randomCompanion";
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
  pet: (token: string) => call<MutationResult>("GET", "/api/agent/pet", token),
  create: (token: string, companion: CompanionDraft) =>
    call<MutationResult>("POST", "/api/agent/create", token, { companion }),
  pack: (
    token: string,
    items: PackedItem[],
    message: string,
    gesture?: Gesture,
  ) =>
    call<MutationResult>("POST", "/api/agent/pack", token, {
      items,
      message,
      gesture,
    }),
  // Clear the prepared bag (web calls this when it finds the bag stale on home).
  unpack: (token: string) =>
    call<MutationResult>("POST", "/api/agent/unpack", token),
  pat: (token: string) => call<MutationResult>("POST", "/api/agent/pat", token),
  // Agent-driven day decision. Current supported actions: travel / stay.
  day: (
    token: string,
    body:
      | { action: "travel"; destination?: string; note?: string }
      | { action: "stay"; mode?: string; note?: string },
  ) => call<MutationResult>("POST", "/api/agent/day", token, body),
  // Backward-compatible helpers for older callers.
  travel: (token: string, destination?: string, note?: string) =>
    cloud.day(token, { action: "travel", destination, note }),
  stay: (token: string, mode?: string, note?: string) =>
    cloud.day(token, { action: "stay", mode, note }),
  collect: (token: string) =>
    call<MutationResult>("POST", "/api/agent/collect", token),
  // Re-roll / set the pet's look (type/color/accessory). Empty opts → random.
  restyle: (
    token: string,
    opts?: { random?: boolean; type?: string; primaryColor?: string; accessory?: string },
  ) => call<MutationResult>("POST", "/api/agent/restyle", token, opts ?? { random: true }),
};
