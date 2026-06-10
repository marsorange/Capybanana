"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { getDestination } from "@/game/destinations";
import type { Postcard } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import Icon from "../ui/Icon";
import PostcardArt from "../ui/PostcardArt";
import { isRareRarity, rarityMeta, RarityBadge } from "../ui/rarity";
import { PrimaryButton, ScreenHeader, SecondaryButton } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

const CARD =
  "tex-grain absolute inset-0 overflow-hidden rounded-[24px] border-2 border-[#e4c89c] bg-paper/95 p-2 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_6px_0_rgba(143,101,54,0.16),0_22px_36px_-22px_rgba(58,46,42,0.5)] [backface-visibility:hidden]";

// ── postal trimmings (procedural — no emoji) ─────────────────────────────────

/** A tiny perforated stamp whose picture is the destination's own scenery. */
function Stamp({ theme, className }: { theme: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[6px] border-2 border-dashed border-[#d9b982] bg-paper p-[3px] shadow-[0_2px_0_rgba(150,112,60,0.16)]",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-[3px]">
        <PostcardArt theme={theme} rounded={false} />
      </div>
      <p className="pt-[2px] text-center text-[6.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">
        Capybanana
      </p>
    </div>
  );
}

/** A round ink postmark franking the stamp's corner. */
function Postmark({ date, className }: { date: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="none" stroke="#8c684a" opacity={0.75}>
        <circle cx="32" cy="32" r="29" strokeWidth="2.4" strokeDasharray="3.5 4" />
        <circle cx="32" cy="32" r="21.5" strokeWidth="1.5" />
      </g>
      <text x="32" y="29.5" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1" fill="#8c684a" opacity={0.8}>
        CAPY
      </text>
      <text x="32" y="40.5" textAnchor="middle" fontSize="7" fill="#8c684a" opacity={0.8}>
        {date}
      </text>
    </svg>
  );
}

const FlipHintIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a8 8 0 0 1 13.5-3.3L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 14a8 8 0 0 1-13.5 3.3L4 15" />
    <path d="M4 20v-5h5" />
  </svg>
);

// ── the two faces ────────────────────────────────────────────────────────────

// Front = pure scenery. All chips/badges live in the caption strip below the
// art so nothing covers the picture (especially on small phones).
function Front({ card }: { card: Postcard }) {
  const dest = getDestination(card.destinationTheme);
  return (
    <div className={CARD}>
      <div
        className="relative h-[64%] overflow-hidden rounded-[18px] border-2"
        style={{ borderColor: rarityMeta(card.rarity).ring }}
      >
        <PostcardArt theme={card.destinationTheme} rounded={false} />
      </div>
      <div className="flex h-[36%] flex-col justify-between px-2 pb-1.5 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-soft/65">postcard from</p>
            <h2 className="mt-1 truncate font-hand text-2xl leading-tight text-ink">{card.locationName}</h2>
          </div>
          <RarityBadge rarity={card.rarity} className="mt-1 shrink-0" />
        </div>
        <div className="flex items-center justify-between border-t-2 border-dashed border-[#bd8a52]/30 pt-2 text-xs text-ink-soft">
          <span>{dest.label}</span>
          <span className="tabular-nums">{fmtDate(card.sentAt)}</span>
        </div>
      </div>
    </div>
  );
}

// Back = the letter. Stamp + postmark sit in the top-right corner like real
// mail; the body is ruled letter paper that scrolls if the note runs long.
function Back({ card, companionName }: { card: Postcard; companionName: string }) {
  const lines = card.message.split("\n").filter(Boolean);
  return (
    <div className={`${CARD} [transform:rotateY(180deg)] bg-[#fffdf6]`}>
      <div className="flex h-full flex-col p-2">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-[#bd8a52]/30 pb-2">
          <div className="min-w-0 pt-1">
            <p className="text-[11px] text-accent">今天的一点小事</p>
            <h2 className="mt-0.5 font-hand text-xl leading-tight text-ink">{card.title}</h2>
          </div>
          <div className="relative shrink-0 pr-1 pt-0.5">
            <Stamp theme={card.destinationTheme} className="h-[58px] w-[50px]" />
            <Postmark date={fmtDate(card.sentAt)} className="absolute -bottom-3 -right-2 h-11 w-11 -rotate-12" />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto py-2.5">
          <div
            className="px-1"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0 29px, rgba(189,138,82,0.26) 29px 30px)",
            }}
          >
            {lines.map((line, i) => (
              <p key={`${line}-${i}`} className="font-hand text-[17px] leading-[30px] text-ink">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_42%] gap-3 border-t-2 border-dashed border-[#bd8a52]/30 pt-3">
          <div className="rounded-2xl border border-[#d9b982]/45 bg-cream-soft px-3 py-2">
            <p className="mb-0.5 text-[11px] font-medium text-accent">我为什么去了那儿</p>
            <p className="text-[12px] leading-snug text-ink-soft">{card.reason}</p>
          </div>
          <div className="ui-wood-surface rounded-2xl px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">to</p>
            <p className="font-hand text-lg leading-tight text-ink">你</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">from</p>
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
  const rare = card ? isRareRarity(card.rarity) : false;
  const [flipped, setFlipped] = useState(false);

  if (!card) {
    return (
      <div className="screen-bg relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-6 text-center">
        <ScreenArtwork
          src="/art/lowpoly-travel-ref.png"
          overlay="soft"
          imageClassName="object-[50%_38%]"
        />
        <div className="ui-wood-surface relative z-10 grid h-20 w-20 place-items-center rounded-[26px]">
          <Icon name="postmail" className="h-12 w-12" />
        </div>
        <p className="relative z-10 font-hand text-[16px] text-ink-soft">我还没寄过明信片。</p>
        <PrimaryButton size="sm" className="relative z-10 w-auto px-10" onClick={() => goTo("home")}>
          回小屋
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-travel-ref.png"
        overlay="travel"
        imageClassName="object-[50%_36%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/88 via-cream-soft/45 to-transparent" />

      {isFresh ? (
        <div className="relative z-10 px-5 pt-5 text-center">
          <div className="ui-wood-surface mx-auto w-fit max-w-full rounded-[28px] px-5 py-2.5">
            <h1 className="font-hand text-2xl text-ink">
              {rare ? `${rarityMeta(card.rarity).label}明信片！` : "我给你寄信啦"}
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {rare ? "这张，我等了好久才遇上。" : "把远方的一小段，寄给你。"}
            </p>
          </div>
        </div>
      ) : (
        <ScreenHeader
          onBack={() => goTo("album")}
          eyebrow="来自远方的一小段"
          title="读一张明信片"
          right={<Icon name="postmail" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
        />
      )}

      {/* flipping card — width is clamped by the viewport height so the whole
          card always fits between header and dock (no clipping on short phones) */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-3">
        <div
          className="relative cursor-pointer [perspective:1400px]"
          style={{
            aspectRatio: "4 / 5.35",
            width: "min(100%, 340px, calc((100dvh - 250px) * 0.72))",
          }}
          onClick={() => setFlipped((f) => !f)}
        >
          {rare && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-5 rounded-[44px]"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${rarityMeta(card.rarity).glow} 0%, transparent 68%)`,
              }}
              initial={{ opacity: 0.5, scale: 0.96 }}
              animate={
                isFresh
                  ? { opacity: [0.5, 0.95, 0.5], scale: [0.96, 1.02, 0.96] }
                  : { opacity: 0.55, scale: 1 }
              }
              transition={
                isFresh
                  ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.4 }
              }
            />
          )}
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

      <button
        onClick={() => setFlipped((f) => !f)}
        className="ui-wood-surface ui-wood-press mx-auto mb-2 flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-ink-soft"
      >
        <FlipHintIcon className="h-3.5 w-3.5 text-[#8c684a]" />
        翻到{flipped ? "风景面" : "信件面"}
      </button>

      <div
        className="game-bottom-panel relative z-20 shrink-0 px-5 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        {isFresh ? (
          <PrimaryButton size="sm" onClick={collectPostcard}>收进相册 · 回小屋</PrimaryButton>
        ) : (
          <SecondaryButton size="sm" onClick={() => goTo("album")}>回到相册</SecondaryButton>
        )}
      </div>
    </div>
  );
}
