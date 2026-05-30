import { randomBytes } from "node:crypto";

// High-entropy opaque token (40 hex chars). This is the only credential the
// agent (and the owner's web client) presents, so it must be unguessable.
export function newToken(): string {
  return randomBytes(20).toString("hex");
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
