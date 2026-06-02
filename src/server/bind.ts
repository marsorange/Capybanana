import { createHash, createHmac, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "capy_ag_";

// High-entropy opaque token. This is the only credential the agent (and the
// owner's web client) presents, so it must be unguessable.
export function newToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function tokenHash(token: string): string {
  const secret = process.env.AGENT_TOKEN_SECRET;
  if (secret) return createHmac("sha256", secret).update(token).digest("hex");

  if (process.env.NODE_ENV === "production") {
    throw new Error("AGENT_TOKEN_SECRET is required in production.");
  }
  return createHash("sha256").update(token).digest("hex");
}

// Accept the bind token either as `?bind=<token>` (so a plain `Read <url>` /
// GET works) or as an `Authorization: Bearer <token>` header (for POSTs).
export function readBind(req: Request): string | null {
  const fromQuery = new URL(req.url).searchParams.get("bind");
  if (fromQuery) return fromQuery.trim();

  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.slice(7).trim();

  return null;
}
