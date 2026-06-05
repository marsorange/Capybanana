"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import { isSupabaseConfigured, signInWithGoogle } from "@/lib/supabaseClient";
import LeafCorners from "../ui/LeafCorners";

const FEATURES: Array<[string, string]> = [
  ["打包", "给今日线索"],
  ["判断", "Agent 决定"],
  ["来信", "收藏回忆"],
];

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
    // center + scroll: tall screens center the column, short screens scroll —
    // every section is shrink-0 so nothing is clipped at any viewport height.
    <div className="screen-bg no-scrollbar relative flex h-full flex-col justify-center gap-6 overflow-y-auto px-5 py-8">
      <LeafCorners corners={["tl", "tr"]} className="z-0 opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 shrink-0 text-center"
      >
        <h1 className="wood-logo font-hand text-[3rem] leading-none">Capybanana</h1>
        <div className="storybook-ribbon mx-auto mt-2.5 px-4 py-1.5 text-sm font-semibold">
          每天一分钟，陪它过日子
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.08 }}
        className="sketch tex-grain relative z-10 shrink-0 overflow-hidden rounded-[28px] border-2 border-[#bd8a52]/50 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_5px_0_rgba(111,84,55,0.16),0_18px_34px_-18px_rgba(58,46,42,0.45)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(197,228,210,0.65), rgba(255,246,226,0.55)), #fffaf0",
        }}
      >
        <div className="px-5 pt-5 text-center">
          <p className="font-hand text-xl leading-tight text-ink">慢岛群陪伴小游戏</p>
          <p className="mx-auto mt-1.5 max-w-[17rem] text-xs leading-relaxed text-ink-soft">
            你的 Agent 使用节奏，会变成这座小岛的天气。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {FEATURES.map(([label, text]) => (
            <div
              key={label}
              className="rounded-[16px] border-2 border-[#bd8a52]/35 bg-paper/85 px-2 py-2.5 text-center"
            >
              <p className="font-hand text-lg leading-none text-ink">{label}</p>
              <p className="mt-1 text-[10px] leading-tight text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="relative z-10 w-full shrink-0 space-y-3"
      >
        <button
          onClick={onGoogle}
          disabled={!isSupabaseConfigured || busy}
          className="sketch flex w-full items-center justify-center gap-3 rounded-[20px] border-2 border-[#bd8a52]/55 bg-paper px-4 py-4 font-hand text-base text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_4px_0_rgba(111,84,55,0.18)] transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleMark className="h-5 w-5" />
          {busy ? "正在打开小岛…" : "用 Google 进入小屋"}
        </button>

        {devAuthEnabled && (
          <>
            <input
              value={devIdentity}
              onChange={(e) => setDevIdentity(e.target.value)}
              placeholder="local-dev"
              className="w-full rounded-xl border-2 border-[#bd8a52]/35 bg-paper px-3 py-2 text-sm text-ink outline-none ring-accent/40 transition focus:ring-2"
            />
            <button
              onClick={onDev}
              disabled={busy}
              className="w-full rounded-[16px] border-2 border-[#bd8a52]/45 bg-cream-soft px-4 py-2.5 text-sm text-ink transition active:translate-y-0.5 disabled:opacity-60"
            >
              {busy ? "进入中…" : "本地进入"}
            </button>
          </>
        )}

        {(error || cloudError) && (
          <p className="text-center text-sm text-accent">{error || cloudError}</p>
        )}

        <p className="text-center text-[11px] leading-relaxed text-ink-soft/75">
          {isSupabaseConfigured
            ? "云端保存你的小屋、来信和成长记录"
            : devAuthEnabled
              ? "当前是本地开发入口"
              : "小岛入口暂未配置完成，请稍后再试。"}
        </p>
      </motion.div>
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
