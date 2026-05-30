// Thin client for the cloud API. The owner's web client and an external AI
// agent talk to the exact same /api/agent/* endpoints; the web client just
// holds its bind token in the persisted store.
import type { CompanionDraft } from "@/game/randomCompanion";
import type { Gesture, PackedItem } from "@/game/types";
import type { CloudSave } from "@/server/types";

export interface LoginResult {
  user: { id: string; phone: string };
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
  if (!res.ok || data?.ok === false)
    throw new Error((data?.error as string) || `请求失败（${res.status}）`);
  return data as T;
}

export const cloud = {
  login: (phone: string) =>
    call<LoginResult & { ok: true }>("POST", "/api/auth/login", undefined, {
      phone,
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
  pat: (token: string) => call<MutationResult>("POST", "/api/agent/pat", token),
  collect: (token: string) =>
    call<MutationResult>("POST", "/api/agent/collect", token),
};
