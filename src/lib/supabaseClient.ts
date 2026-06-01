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
        detectSessionInUrl: true, // handle the ?code=… on the OAuth round-trip
        flowType: "pkce",
      },
    });
  }
  return client;
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
