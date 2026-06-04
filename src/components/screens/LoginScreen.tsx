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
  const loginWithDevIdentity = useGameStore((s) => s.loginWithDevIdentity);
  const devAuthEnabled = process.env.NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH === "1";

  // `redirecting` covers the moment between the click and the browser leaving
  // for Google; `cloudBusy` covers the bridge after we land back here.
  const [redirecting, setRedirecting] = useState(false);
  const [devIdentity, setDevIdentity] = useState("local-dev");
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

  const onDev = async () => {
    setError(null);
    try {
      await loginWithDevIdentity(devIdentity, loginDestination);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="game-bg relative flex h-full flex-col overflow-hidden px-6 pb-6 pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(255,244,205,0.95),transparent_72%)]" />

      {/* brand: floating logo + wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mt-4 flex flex-col items-center text-center"
      >
        <CapyLogo className="h-36 w-36" />
        <h1 className="mt-5 font-hand text-[2.55rem] leading-none text-ink">
          Capybanana
        </h1>
        <p className="mt-3 max-w-[21rem] text-[15px] leading-relaxed text-ink-soft">
          {agentOnboarding ? (
            <>
              先进入小屋，
              <br />
              再把今天的决定交给你信任的小助手。
            </>
          ) : (
            <>
              每天一分钟，给它一个小线索，
              <br />
              它会把日子过成一封寄回来的信。
            </>
          )}
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="game-card relative z-10 mt-8 px-4 py-3"
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-cream-soft px-2 py-3">
            <p className="text-2xl leading-none">🎒</p>
            <p className="mt-1 text-xs text-ink-soft">放线索</p>
          </div>
          <div className="rounded-2xl bg-cream-soft px-2 py-3">
            <p className="text-2xl leading-none">🏡</p>
            <p className="mt-1 text-xs text-ink-soft">等它想</p>
          </div>
          <div className="rounded-2xl bg-cream-soft px-2 py-3">
            <p className="text-2xl leading-none">💌</p>
            <p className="mt-1 text-xs text-ink-soft">收来信</p>
          </div>
        </div>
      </motion.section>

      {/* login */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="relative z-10 mt-auto w-full space-y-3"
      >
        <button
          onClick={onGoogle}
          disabled={!isSupabaseConfigured || busy}
          className="sticker flex w-full items-center justify-center gap-3 rounded-[22px] bg-paper px-4 py-4 text-base font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark className="h-5 w-5" />
          {busy ? "正在打开小屋..." : "用 Google 进入小屋"}
        </button>

        {devAuthEnabled && (
          <>
            <div className="game-card p-2.5">
              <label className="mb-1 block text-[11px] text-ink-soft/80">
                本地身份
              </label>
              <input
                value={devIdentity}
                onChange={(e) => setDevIdentity(e.target.value)}
                placeholder="local-dev"
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none ring-accent/40 transition focus:ring-2"
              />
            </div>
            <button
              onClick={onDev}
              disabled={busy}
              className="sticker flex w-full items-center justify-center gap-2 rounded-[22px] bg-cream-soft px-4 py-3 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "进入中..." : "本地进入"}
            </button>
          </>
        )}

        {(error || cloudError) && (
          <p className="text-center text-sm text-accent">
            {error || cloudError}
          </p>
        )}

        {isSupabaseConfigured ? (
          <p className="text-center text-[11px] text-ink-soft/70">
            云端保存你的小屋、来信和成长记录
          </p>
        ) : devAuthEnabled ? (
          <p className="text-center text-[11px] text-ink-soft/75">
            当前是本地开发入口
          </p>
        ) : (
          <p className="text-center text-[11px] leading-relaxed text-accent/90">
            小屋入口暂未配置完成。
            <br />
            请稍后再试。
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
