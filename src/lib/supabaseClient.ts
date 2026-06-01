// Browser-side Supabase Auth client. This is the ONLY login path: the owner
// signs in through Supabase Auth (Google OAuth today; email / magic-link can be
// enabled later in the Supabase dashboard with no code change). After sign-in
// we hand the resulting Supabase access token to /api/auth/supabase, which mints
// our own long-lived bind token — the credential the web client and the AI agent
// both use for /api/agent/*. Supabase only authenticates the owner; it never
// touches the agent's bind-token session.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the public Supabase env is wired up (otherwise login is disabled). */
export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Lazily build the browser singleton. Returns null when unconfigured / on the server. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // We exchange the ?code= ourselves (completeOAuthLogin) for deterministic
        // ordering + visible errors, so turn off the implicit auto-detection.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }
  return client;
}

/** Strip OAuth round-trip params from the address bar without a reload. */
function cleanOAuthParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const p of ["code", "state", "error", "error_description"]) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
      changed = true;
    }
  }
  if (changed)
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/**
 * Finish a Google OAuth redirect: if the URL carries a `?code=`, exchange it for
 * a session and return the access token. Returns null when there's no code to
 * handle. Throws (with the provider's message) on an OAuth error or a failed
 * exchange so the caller can show it.
 */
export async function completeOAuthLogin(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || typeof window === "undefined") return null;

  const params = new URL(window.location.href).searchParams;
  const oauthError = params.get("error_description") ?? params.get("error");
  if (oauthError) {
    cleanOAuthParams();
    throw new Error(decodeURIComponent(oauthError));
  }

  const code = params.get("code");
  if (!code) return null;

  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  cleanOAuthParams();
  if (error) throw new Error(error.message);
  return data.session?.access_token ?? null;
}

/** Kick off Google sign-in. Redirects away to Google, then back to this origin. */
export async function signInWithGoogle(): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase 登录未配置");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
}

/** Drop the local Supabase session (used on explicit logout). */
export async function supabaseSignOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}
