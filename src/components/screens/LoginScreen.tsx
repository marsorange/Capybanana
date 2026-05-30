"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";

export default function LoginScreen() {
  const login = useGameStore((s) => s.login);
  const goTo = useGameStore((s) => s.goTo);
  const busy = useGameStore((s) => s.cloudBusy);
  const error = useGameStore((s) => s.cloudError);

  const [phone, setPhone] = useState("");
  const normalized = phone.replace(/[\s-]/g, "");
  const ok = /^\+?\d{5,}$/.test(normalized);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 px-7">
      <div className="text-center">
        <div className="animate-float-soft text-6xl">🧳</div>
        <h1 className="mt-3 font-hand text-3xl text-ink">Capybanana</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          用手机号登录，领养一只随机卡皮巴拉，
          <br />
          还能让你的 AI Agent 来陪它。
        </p>
      </div>

      <div className="w-full space-y-3">
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
          onClick={() => login(normalized)}
        >
          {busy ? "登录中…" : "登录 / 注册"}
        </Button>
        <p className="text-center text-[11px] text-ink-soft/70">
          不需要密码 · 手机号即身份
        </p>
      </div>

      <button
        onClick={() => goTo("create")}
        className="text-sm text-ink-soft underline underline-offset-4"
      >
        先本地玩，不登录 →
      </button>
    </div>
  );
}
