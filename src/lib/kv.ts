// Tiny key/value abstraction over a hosted store. Three backends, picked from
// whatever env the deployment provides:
//
//   1. Upstash / Vercel KV (Redis, REST) — UPSTASH_REDIS_REST_URL/TOKEN or
//      KV_REST_API_URL/TOKEN.
//   2. Postgres (e.g. Supabase) — POSTGRES_URL (pooled) and friends. We keep a
//      couple of tiny tables and create them on demand, so no manual SQL setup.
//   3. In-process Map — only when nothing above is configured. Survives within a
//      single long-running process (local `next dev`) but NOT across Vercel's
//      serverless instances, so it's a dev-only convenience.
import { Redis } from "@upstash/redis";
import postgres from "postgres";

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

function postgresUrl(): string | null {
  // Prefer the pooled connection for serverless. NON_POOLING is a last resort.
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    null
  );
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

function makePostgres(url: string): KV {
  // Cache the client + schema-init promise on globalThis so Next.js HMR and warm
  // serverless invocations reuse one connection instead of leaking new ones.
  const g = globalThis as typeof globalThis & {
    __capyPg?: ReturnType<typeof postgres>;
    __capyPgReady?: Promise<void>;
  };

  const sql = (g.__capyPg ??= postgres(url, {
    max: 1, // one connection per serverless instance
    prepare: false, // required for pgbouncer transaction pooling (Supabase :6543)
    idle_timeout: 20,
    connect_timeout: 15,
  }));

  // Create the two backing tables once. If init fails, clear the cached promise
  // so the next call retries rather than wedging on a rejected promise forever.
  const ready = (): Promise<void> =>
    (g.__capyPgReady ??= (async () => {
      await sql`create table if not exists capy_kv (k text primary key, v jsonb not null)`;
      await sql`create table if not exists capy_kv_set (k text not null, member text not null, primary key (k, member))`;
    })().catch((e) => {
      g.__capyPgReady = undefined;
      throw e;
    }));

  return {
    async getJSON<T>(key: string) {
      await ready();
      const rows = await sql<{ v: T }[]>`select v from capy_kv where k = ${key}`;
      return rows.length ? rows[0].v : null;
    },
    async setJSON<T>(key: string, value: T) {
      await ready();
      await sql`
        insert into capy_kv (k, v) values (${key}, ${sql.json(value as never)})
        on conflict (k) do update set v = excluded.v
      `;
    },
    async del(key: string) {
      await ready();
      await sql`delete from capy_kv where k = ${key}`;
      await sql`delete from capy_kv_set where k = ${key}`;
    },
    async sAdd(key: string, member: string) {
      await ready();
      await sql`
        insert into capy_kv_set (k, member) values (${key}, ${member})
        on conflict do nothing
      `;
    },
    async sMembers(key: string) {
      await ready();
      const rows = await sql<
        { member: string }[]
      >`select member from capy_kv_set where k = ${key}`;
      return rows.map((r) => r.member);
    },
  };
}

function makeMemory(): KV {
  // Stash on globalThis so Next.js dev HMR (which re-evaluates modules) doesn't
  // wipe accounts on every file save. A full server restart still clears it —
  // that's what a real KV is for.
  const g = globalThis as typeof globalThis & {
    __capyKVValues?: Map<string, unknown>;
    __capyKVSets?: Map<string, Set<string>>;
  };
  const values = (g.__capyKVValues ??= new Map<string, unknown>());
  const sets = (g.__capyKVSets ??= new Map<string, Set<string>>());
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

const upstash = restCredentials();
const pgUrl = upstash ? null : postgresUrl();

/** True when a real hosted store is wired up (vs. the ephemeral in-memory fallback). */
export const KV_PERSISTENT = upstash !== null || pgUrl !== null;

/** Which backend is active — handy for diagnostics/health checks. */
export const KV_BACKEND: "upstash" | "postgres" | "memory" = upstash
  ? "upstash"
  : pgUrl
    ? "postgres"
    : "memory";

if (!KV_PERSISTENT) {
  console.warn(
    process.env.NODE_ENV === "production"
      ? "[kv] No KV env (UPSTASH_REDIS_REST_URL/TOKEN, KV_REST_API_URL/TOKEN, or POSTGRES_URL) — accounts WILL NOT persist across serverless invocations. Add a database in Vercel Storage."
      : "[kv] No hosted store env found — using in-memory store (data is not persisted).",
  );
}

export const kv: KV = upstash
  ? makeUpstash(upstash)
  : pgUrl
    ? makePostgres(pgUrl)
    : makeMemory();
