"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import { isSupabaseConfigured, signInWithGoogle } from "@/lib/supabaseClient";
import CapyLogo from "./CapyLogo";

export default function LoginScreen() {
  const loginDestination = useGameStore((s) => s.loginDestination);
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const cloudError = useGameStore((s) => s.cloudError);

  // `redirecting` covers the moment between the click and the browser leaving
  // for Google; `cloudBusy` covers the bridge after we land back here.
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = redirecting || cloudBusy;
  const agentOnboarding = loginDestination === "connect";

  const onGoogle = async () => {
    setError(null);
    setRedirecting(true);
    try {
      await signInWithGoogle(); // navigates away to Google on success
    } catch (e) {
      setRedirecting(false);
      setError((e as Error).message);
    }
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-7">
      {/* soft, cozy backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream-soft via-cream to-cream-deep" />
      <div className="pointer-events-none absolute -left-16 top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-24 h-52 w-52 rounded-full bg-sky/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-[#f2d06b]/25 blur-3xl" />

      {/* brand: floating logo + wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <CapyLogo className="h-40 w-40" />
        <h1 className="mt-5 font-hand text-[2.4rem] leading-none text-ink">
          Capybanana
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
          {agentOnboarding ? (
            <>
              测试新用户登录后，
              <br />
              直接展示绑定 AI Agent 的引导页。
            </>
          ) : (
            <>
              用 Google 登录，领养一只随机卡皮巴拉，
              <br />
              还能让你的 AI Agent 来陪它。
            </>
          )}
        </p>
      </motion.div>

      {/* login */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="relative z-10 w-full space-y-3"
      >
        <button
          onClick={onGoogle}
          disabled={!isSupabaseConfigured || busy}
          className="flex w-full items-center justify-center gap-3 rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3.5 text-base font-medium text-ink shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark className="h-5 w-5" />
          {busy ? "登录中…" : "用 Google 登录"}
        </button>

        {(error || cloudError) && (
          <p className="text-center text-sm text-accent">
            {error || cloudError}
          </p>
        )}

        {isSupabaseConfigured ? (
          <p className="text-center text-[11px] text-ink-soft/70">
            首次登录即自动领养 · 云端存档
          </p>
        ) : (
          <p className="text-center text-[11px] leading-relaxed text-accent/90">
            登录暂不可用：未配置 Supabase。
            <br />
            请设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY。
          </p>
        )}
      </motion.div>
    </div>
  );
}

/** Google "G" mark (inline SVG so we add no asset / network dependency). */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
