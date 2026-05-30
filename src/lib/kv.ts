// Tiny key/value abstraction over a hosted Redis (Upstash / Vercel KV).
//
// On Vercel, create a Storage → "Upstash for Redis" database and it injects the
// REST credentials as env vars. We accept either naming convention:
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (Upstash native)
//   KV_REST_API_URL        / KV_REST_API_TOKEN          (Vercel KV)
//
// When neither is set (e.g. local dev with no KV yet) we fall back to an
// in-process Map so the app still runs — data just won't survive a restart or
// span serverless instances. Mirrors the postcard route's "degrade gracefully"
// stance rather than crashing.
import { Redis } from "@upstash/redis";

export interface KV {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  sAdd(key: string, member: string): Promise<void>;
  sMembers(key: string): Promise<string[]>;
}

function restCredentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function makeUpstash(cfg: { url: string; token: string }): KV {
  const redis = new Redis(cfg);
  return {
    async getJSON<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async setJSON<T>(key: string, value: T) {
      await redis.set(key, value);
    },
    async del(key: string) {
      await redis.del(key);
    },
    async sAdd(key: string, member: string) {
      await redis.sadd(key, member);
    },
    async sMembers(key: string) {
      return ((await redis.smembers(key)) as string[]) ?? [];
    },
  };
}

function makeMemory(): KV {
  const values = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  return {
    async getJSON<T>(key: string) {
      return values.has(key) ? (structuredClone(values.get(key)) as T) : null;
    },
    async setJSON<T>(key: string, value: T) {
      values.set(key, structuredClone(value));
    },
    async del(key: string) {
      values.delete(key);
      sets.delete(key);
    },
    async sAdd(key: string, member: string) {
      const s = sets.get(key) ?? new Set<string>();
      s.add(member);
      sets.set(key, s);
    },
    async sMembers(key: string) {
      return [...(sets.get(key) ?? [])];
    },
  };
}

const credentials = restCredentials();

/** True when a real hosted KV is wired up (vs. the ephemeral in-memory fallback). */
export const KV_PERSISTENT = credentials !== null;

if (!KV_PERSISTENT) {
  console.warn(
    process.env.NODE_ENV === "production"
      ? "[kv] No KV env (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) — accounts WILL NOT persist across serverless invocations. Add a Vercel Storage → Upstash for Redis database."
      : "[kv] No Upstash/Vercel KV env found — using in-memory store (data is not persisted).",
  );
}

export const kv: KV = credentials ? makeUpstash(credentials) : makeMemory();
