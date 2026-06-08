"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import { isSupabaseConfigured, signInWithGoogle } from "@/lib/supabaseClient";

// Full-bleed cover art for the login screen. Drop the illustration here:
//   public/login-bg.png
// Until the file exists the warm `screen-bg` gradient shows through, so the
// page never looks broken. Swap the path/format if you name the asset
// differently (e.g. "/login-bg.jpg").
const BG_IMAGE = "/login-bg.png";

export default function LoginScreen() {
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const cloudError = useGameStore((s) => s.cloudError);
  const loginWithDevIdentity = useGameStore((s) => s.loginWithDevIdentity);
  const devAuthEnabled = process.env.NEXT_PUBLIC_CAPY_DEV_LOCAL_AUTH === "1";

  const [redirecting, setRedirecting] = useState(false);
  const [devIdentity, setDevIdentity] = useState("local-dev");
  const [error, setError] = useState<string | null>(null);
  const busy = redirecting || cloudBusy;

  const onGoogle = async () => {
    setError(null);
    setRedirecting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setRedirecting(false);
      setError((e as Error).message);
    }
  };

  const onDev = async () => {
    setError(null);
    try {
      await loginWithDevIdentity(devIdentity);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    // Cover-art layout: full-bleed background, title floating up top, sign-in
    // pinned to the bottom. `screen-bg` is the warm fallback before the art
    // loads; the image layer sits on top of it.
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      {/* background illustration (provided later) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      />
      {/* legibility scrim: faint warm wash up top for the title, soft shade at
          the bottom so the button + footer read on any art */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/30 via-transparent to-[rgba(38,28,22,0.32)]" />

      <div className="relative z-10 flex h-full flex-col px-6 pb-8 pt-[13vh]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="shrink-0 text-center"
        >
          <h1
            className="wood-logo font-hand text-[3.1rem] leading-none"
            style={{ textShadow: "0 2px 0 #e7c287, 0 4px 0 rgba(83,50,27,0.2), 0 6px 18px rgba(255,250,235,0.55)" }}
          >
            Capybanana
          </h1>
          <div className="storybook-ribbon mx-auto mt-3 px-4 py-1.5 text-sm font-semibold">
            我在小岛上等你
          </div>
        </motion.div>

        {/* spacer pushes the sign-in to the bottom edge */}
        <div className="flex-1" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="w-full shrink-0 space-y-3"
        >
          <button
            onClick={onGoogle}
            disabled={!isSupabaseConfigured || busy}
            className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-[#bd8a52]/25 bg-paper/95 px-4 py-4 font-hand text-base text-ink shadow-[0_10px_28px_-10px_rgba(40,28,18,0.5),inset_0_1.5px_0_rgba(255,255,255,0.8)] backdrop-blur-sm transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleMark className="h-5 w-5" />
            {busy ? "正在推开小岛的门…" : "用 Google 找到我"}
          </button>

          {devAuthEnabled && (
            <div className="space-y-2 rounded-[18px] bg-paper/70 p-2.5 backdrop-blur-sm">
              <input
                value={devIdentity}
                onChange={(e) => setDevIdentity(e.target.value)}
                placeholder="local-dev"
                className="w-full rounded-xl border-2 border-[#bd8a52]/35 bg-paper px-3 py-2 text-sm text-ink outline-none ring-accent/40 transition focus:ring-2"
              />
              <button
                onClick={onDev}
                disabled={busy}
                className="w-full rounded-[14px] border-2 border-[#bd8a52]/45 bg-cream-soft px-4 py-2.5 text-sm text-ink transition active:translate-y-0.5 disabled:opacity-60"
              >
                {busy ? "进岛中…" : "本地进岛"}
              </button>
            </div>
          )}

          {(error || cloudError) && (
            <p className="text-center text-sm font-semibold text-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              {error || cloudError}
            </p>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-cream-soft/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
            <LockMark className="h-3 w-3 shrink-0" />
            {isSupabaseConfigured
              ? "我的小屋、来信和慢慢长大的样子，都会替你收着"
              : devAuthEnabled
                ? "当前是本地开发入口"
                : "小岛入口暂未配置完成，请稍后再试。"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/** Google "G" mark (inline SVG so we add no asset / network dependency). */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Tiny padlock for the cloud-save footnote. */
function LockMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="currentColor" opacity="0.92" />
      <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
