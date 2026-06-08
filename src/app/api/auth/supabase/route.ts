// Supabase Auth bridge. The owner signs in client-side via Supabase (Google
// OAuth); the browser posts the resulting Supabase access token here. We verify
// it by asking Supabase who it belongs to, then find/create OUR account keyed by
// the Supabase user id and hand back the cloud-session envelope:
// { user, bindToken, connectUrl, save }. The bind token stays the credential for
// /api/agent/* — Supabase only authenticates the human owner.
import { createClient } from "@supabase/supabase-js";

import { baseUrl, jsonError } from "@/server/api";
import { SQL_PERSISTENT } from "@/server/db";
import { summarizePet, tickSave } from "@/server/engine";
import { loginBySupabase, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonError(
      "服务器未配置 Supabase Auth（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）。",
      503,
    );
  }

  // Cloud accounts now require the SQL schema from supabase/migrations.
  if (!SQL_PERSISTENT) {
    return jsonError(
      "服务器未配置 PostgreSQL（POSTGRES_URL），云存档不可用。请先配置数据库并运行 supabase/migrations。",
      503,
    );
  }

  let body: { accessToken?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken : "";
  if (!accessToken) return jsonError("缺少 Supabase 登录令牌", 400);

  // Verify the access token by asking Supabase's auth server who it belongs to.
  // This validates signature + expiry for ANY Supabase provider (Google, email…)
  // without us having to handle the JWT secret/JWKS ourselves.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    console.error(
      "[auth/supabase] getUser failed:",
      error?.status,
      error?.message,
      "tokenLen:",
      accessToken.length,
    );
    return jsonError("Google 登录校验失败，请重新登录", 401);
  }

  const { user, save, connectToken } = await loginBySupabase(
    data.user.id,
    data.user.email ?? null,
  );
  const now = Date.now();
  // A pet is NOT auto-created on login. It only comes into existence when the
  // owner's Agent binds and registers it via POST /api/agent/create (the Agent
  // also names it). Until then the save stays petless and the web client waits
  // on the connect screen — an unbound account isn't "on the island" yet.
  const ticked = await tickSave(save, now);
  if (ticked.rev !== save.rev) await savePet(user.petId, ticked);

  // connectToken (the Agent bind link) is only re-minted while petless; once an
  // Agent is bound it's null and the web reuses the connectUrl it persisted (or
  // the owner regenerates it from the connect screen). bindToken is the web
  // session token — a separate scope, so login never disconnects the Agent.
  const connectUrl = connectToken
    ? `${baseUrl(req)}/agent/skill.md?bind=${connectToken}`
    : null;
  return Response.json({
    ok: true,
    user: { id: user.id, email: user.email },
    bindToken: user.bindToken,
    connectUrl,
    save: ticked,
    pet: summarizePet(ticked),
  });
}
