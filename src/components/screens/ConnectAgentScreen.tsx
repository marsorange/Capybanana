"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";

function SmallTile({
  icon,
  label,
  text,
}: {
  icon: string;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[18px] border-2 border-ink/8 bg-paper px-3 py-3">
      <p className="text-2xl leading-none">{icon}</p>
      <p className="mt-1 font-hand text-base leading-tight text-ink">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

export default function ConnectAgentScreen() {
  const connectUrl = useGameStore((s) => s.connectUrl);
  const companion = useGameStore((s) => s.companion);
  const cloudError = useGameStore((s) => s.cloudError);
  const goTo = useGameStore((s) => s.goTo);
  const [copied, setCopied] = useState<string | null>(null);

  const snippet = connectUrl ? `Read ${connectUrl}` : "";
  const hasPet = !!companion;

  const copy = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard blocked — the text is selectable below anyway */
    }
  };

  return (
    <div className="game-bg no-scrollbar flex h-full flex-col overflow-y-auto px-5 pb-5 pt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => goTo("home")}
          className="game-icon-tile flex h-14 w-14 items-center justify-center text-2xl text-ink-soft"
        >
          ←
        </button>
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">把决定权交给小助手</p>
          <h1 className="truncate font-hand text-2xl leading-tight text-ink">
            助手信箱
          </h1>
        </div>
      </div>

      {/* live status */}
      <div
        className={
          "game-card mt-5 px-4 py-3 text-sm " +
          (hasPet
            ? "text-ink"
            : "text-ink-soft")
        }
      >
        {hasPet ? (
          <>
            <p className="font-hand text-lg leading-none text-ink">
              {companion!.name} 已经在小屋里
            </p>
            <p className="mt-2 leading-relaxed text-ink-soft">
              复制下面这句话发给你的助手。之后它就能读取今天的包裹，并替它决定出门还是留在家。
            </p>
          </>
        ) : (
          <>正在整理小屋，请稍等一下。</>
        )}
      </div>

      {/* 1) the skill-doc command link */}
      <div className="game-card mt-4 p-4">
        <p className="mb-2 text-[11px] font-medium text-accent">
          发给助手的口令
        </p>
        <code className="block break-all rounded-xl bg-cream-soft px-3 py-2.5 text-sm text-ink">
          {snippet || "口令还没准备好，请回到小屋后再试。"}
        </code>
        <Button
          variant="soft"
          className="mt-3 w-full"
          disabled={!snippet}
          onClick={() => copy("cmd", snippet)}
        >
          {copied === "cmd" ? "已复制" : "复制口令"}
        </Button>
        <p className="mt-2 text-[11px] text-ink-soft/70">
          这句话可以打开你的小屋信箱，只发给你信任的助手。
        </p>
      </div>

      {cloudError && (
        <p className="mt-3 text-center text-sm text-accent">{cloudError}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SmallTile icon="🎒" label="看包裹" text="读取你今天放进背包的线索和心愿。" />
        <SmallTile icon="🧭" label="做决定" text="选择旅行、院子、休息，或继续待在家。" />
        <SmallTile icon="💬" label="陪它说话" text="偶尔摸摸头，说一句短短的话。" />
        <SmallTile icon="💌" label="读来信" text="等它回来后，看看这一天留下了什么。" />
      </div>

      <div className="game-bottom-panel -mx-5 mt-auto px-5 pb-1 pt-4">
        {hasPet ? (
          <Button size="lg" className="w-full" onClick={() => goTo("home")}>
            回小屋
          </Button>
        ) : (
          <Button size="lg" variant="soft" className="w-full" disabled>
            小屋准备中
          </Button>
        )}
      </div>
    </div>
  );
}
