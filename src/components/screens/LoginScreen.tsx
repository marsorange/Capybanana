"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";
import CapyLogo from "./CapyLogo";

export default function LoginScreen() {
  const login = useGameStore((s) => s.login);
  const goTo = useGameStore((s) => s.goTo);
  const loginDestination = useGameStore((s) => s.loginDestination);
  const busy = useGameStore((s) => s.cloudBusy);
  const error = useGameStore((s) => s.cloudError);

  const [phone, setPhone] = useState("");
  const normalized = phone.replace(/[\s-]/g, "");
  const ok = /^\+?\d{5,}$/.test(normalized);
  const agentOnboarding = loginDestination === "connect";

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
              用手机号登录，领养一只随机卡皮巴拉，
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
        <input
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20))
          }
          inputMode="tel"
          placeholder="手机号"
          className="w-full rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-center text-lg tracking-wider text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
        />
        {error && <p className="text-center text-sm text-accent">{error}</p>}
        <Button
          size="lg"
          className="w-full"
          disabled={!ok || busy}
          onClick={() => login(normalized, loginDestination)}
        >
          {busy
            ? "登录中…"
            : agentOnboarding
              ? "登录 / 注册并查看绑定页"
              : "登录 / 注册"}
        </Button>
        <p className="text-center text-[11px] text-ink-soft/70">
          不需要密码 · 手机号即身份
        </p>
      </motion.div>

      <button
        onClick={() => goTo("create")}
        className="relative z-10 text-sm text-ink-soft underline underline-offset-4"
      >
        先本地玩，不登录 →
      </button>
    </div>
  );
}
