"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { getDestination } from "@/game/destinations";
import type { Postcard } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import PostcardArt from "../ui/PostcardArt";
import { BackButton, PrimaryButton } from "../ui/kit";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

const CARD =
  "absolute inset-0 overflow-hidden rounded-[24px] border-2 border-[#bd8a52]/55 bg-[#fffaf0] p-2 shadow-[0_8px_0_rgba(150,112,60,0.35),0_22px_36px_-18px_rgba(58,46,42,0.5)] [backface-visibility:hidden]";

function Front({ card }: { card: Postcard }) {
  const dest = getDestination(card.destinationTheme);
  return (
    <div className={CARD}>
      <div className="relative h-[66%] overflow-hidden rounded-[18px] border-2 border-[#bd8a52]/30">
        <PostcardArt theme={card.destinationTheme} rounded={false} />
        <div className="absolute left-3 top-3 rotate-[-8deg] rounded-full border-2 border-[#8a5a30]/55 bg-paper/80 px-2 py-0.5 text-[10px] text-ink/70">
          {fmtDate(card.sentAt)}
        </div>
      </div>
      <div className="absolute right-5 top-5 flex h-16 w-14 flex-col items-center justify-center rounded-[6px] border-2 border-dashed border-[#8a5a30]/60 bg-paper/92 text-center shadow-[0_2px_0_rgba(150,112,60,0.25)]">
        <span className="text-lg leading-none">{dest.emoji}</span>
        <span className="mt-0.5 text-[9px] text-ink-soft">CAPYBANANA</span>
      </div>
      <div className="flex h-[34%] flex-col justify-between px-2 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/70">postcard from</p>
          <h2 className="mt-1 font-hand text-2xl leading-tight text-ink">{card.locationName}</h2>
        </div>
        <div className="flex items-center justify-between border-t-2 border-dashed border-[#bd8a52]/30 pt-2 text-xs text-ink-soft">
          <span>{dest.label}</span>
          <span>轻轻翻面读信 ›</span>
        </div>
      </div>
    </div>
  );
}

function Back({ card, companionName }: { card: Postcard; companionName: string }) {
  const lines = card.message.split("\n").filter(Boolean);
  return (
    <div className={`${CARD} [transform:rotateY(180deg)] bg-[#fffdf6]`}>
      <div className="flex h-full flex-col p-2">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-[#bd8a52]/30 pb-2">
          <div className="min-w-0">
            <p className="text-[11px] text-accent">寄给你的今日小事</p>
            <h2 className="mt-0.5 font-hand text-xl leading-tight text-ink">{card.title}</h2>
          </div>
          <span className="shrink-0 rounded-full border-2 border-[#bd8a52]/35 bg-cream-soft px-2 py-0.5 text-[11px] text-ink-soft">
            {fmtDate(card.sentAt)}
          </span>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto py-3">
          <div className="space-y-2.5">
            {lines.map((line, i) => (
              <p key={`${line}-${i}`} className="font-hand text-[17px] leading-relaxed text-ink">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_42%] gap-3 border-t-2 border-dashed border-[#bd8a52]/30 pt-3">
          <div className="rounded-2xl border border-[#bd8a52]/25 bg-cream-soft px-3 py-2">
            <p className="mb-0.5 text-[11px] font-medium text-accent">它为什么会去这里</p>
            <p className="text-[12px] leading-snug text-ink-soft">{card.reason}</p>
          </div>
          <div className="rounded-2xl border-2 border-[#bd8a52]/30 bg-paper px-3 py-2">
            <p className="text-[10px] text-ink-soft/70">TO</p>
            <p className="font-hand text-lg leading-tight text-ink">你</p>
            <p className="mt-2 text-[10px] text-ink-soft/70">FROM</p>
            <p className="truncate font-hand text-[15px] text-ink-soft">{companionName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostcardScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const postcards = useGameStore((s) => s.postcards);
  const selectedId = useGameStore((s) => s.selectedPostcardId);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const collectPostcard = useGameStore((s) => s.collectPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const card = postcards.find((p) => p.id === selectedId) ?? postcards[0];
  const isFresh = pendingId != null && card?.id === pendingId;
  const [flipped, setFlipped] = useState(false);

  if (!card) {
    return (
      <div className="screen-bg flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-soft">还没有明信片。</p>
        <PrimaryButton className="w-auto px-8" onClick={() => goTo("home")}>
          回小屋
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="screen-bg relative flex h-full flex-col">
      {isFresh ? (
        <div className="px-5 pt-6 text-center">
          <h1 className="font-hand text-2xl text-ink">明信片飞回来了</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {companion.name} 把慢岛群外的一小段远方寄给你。
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 pt-5">
          <BackButton onClick={() => goTo("album")} />
          <h1 className="font-hand text-2xl text-ink">读一张明信片</h1>
        </div>
      )}

      {/* flipping card */}
      <div className="flex flex-1 items-center justify-center px-6 pb-2 pt-6">
        <div
          className="relative w-full max-w-[350px] cursor-pointer [perspective:1400px]"
          style={{ aspectRatio: "4 / 5.35" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 17 }}
          >
            <Front card={card} />
            <Back card={card} companionName={companion.name} />
          </motion.div>
        </div>
      </div>

      <p className="px-5 text-center text-xs text-ink-soft/80">
        点一下翻到{flipped ? "风景面" : "信件面"}
      </p>

      <div className="shrink-0 px-5 pb-5 pt-3">
        {isFresh ? (
          <PrimaryButton onClick={collectPostcard}>收进相册 · 回小屋</PrimaryButton>
        ) : (
          <button
            onClick={() => goTo("album")}
            className="sketch w-full rounded-[20px] border-2 border-[#bd8a52]/55 bg-cream-soft px-6 py-3.5 font-hand text-lg text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_4px_0_rgba(111,84,55,0.16)] transition active:translate-y-0.5"
          >
            回到相册
          </button>
        )}
      </div>
    </div>
  );
}
