"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { getDestination } from "@/game/destinations";
import type { Postcard } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";
import PostcardArt from "../ui/PostcardArt";

// Cache generated images per postcard so re-opening doesn't refetch.
const imageCache = new Map<string, string | null>();

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function Front({
  card,
  imageUrl,
  loading,
}: {
  card: Postcard;
  imageUrl: string | null;
  loading?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_6px_0_rgba(58,46,42,0.18)] [backface-visibility:hidden]">
      <div className="absolute inset-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={card.locationName} className="h-full w-full object-cover" />
        ) : (
          <PostcardArt theme={card.destinationTheme} rounded={false} />
        )}
      </div>
      {loading && !imageUrl && (
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="animate-pulse rounded-full border-2 border-ink/15 bg-paper/90 px-3 py-1 text-xs text-ink-soft">
            ✦ 正在画明信片…
          </span>
        </div>
      )}
      {/* stamp */}
      <div className="absolute right-3 top-3 flex h-14 w-12 flex-col items-center justify-center rounded-[4px] border-2 border-dashed border-ink/70 bg-paper/90 text-center">
        <span className="text-lg leading-none">
          {getDestination(card.destinationTheme).emoji}
        </span>
        <span className="mt-0.5 text-[9px] text-ink-soft">CAPYBANANA</span>
      </div>
      {/* date postmark */}
      <div className="absolute left-3 top-3 rotate-[-8deg] rounded-full border-2 border-ink/60 bg-paper/70 px-2 py-0.5 text-[10px] text-ink/70">
        {fmtDate(card.sentAt)}
      </div>
      {/* location band */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/55 px-4 py-2.5 text-paper backdrop-blur-sm">
        <span className="font-hand text-lg">{card.locationName}</span>
        <span className="text-xs opacity-90">
          {getDestination(card.destinationTheme).label}
        </span>
      </div>
    </div>
  );
}

function Back({ card, companionName }: { card: Postcard; companionName: string }) {
  return (
    <div className="absolute inset-0 flex flex-col rounded-2xl border-2 border-ink bg-[#fffdf6] p-4 shadow-[0_6px_0_rgba(58,46,42,0.18)] [transform:rotateY(180deg)] [backface-visibility:hidden]">
      <div className="mb-2 flex items-start justify-between">
        <h2 className="font-hand text-xl leading-snug text-ink">{card.title}</h2>
        <span className="shrink-0 rounded-full border-2 border-ink/15 bg-cream-soft px-2 py-0.5 text-[11px] text-ink-soft">
          {card.locationName}
        </span>
      </div>
      <p className="no-scrollbar flex-1 overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed text-ink">
        {card.message}
      </p>
      <div className="mt-3 rounded-xl border-2 border-ink/10 bg-cream-soft px-3 py-2">
        <p className="mb-0.5 text-[11px] font-medium text-accent">
          为什么去了这里
        </p>
        <p className="text-[13px] leading-snug text-ink-soft">{card.reason}</p>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
        <span>— {companionName}</span>
        <span>{fmtDate(card.sentAt)}</span>
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

  const setPostcardImage = useGameStore((s) => s.setPostcardImage);

  const card = postcards.find((p) => p.id === selectedId) ?? postcards[0];
  const isFresh = pendingId != null && card?.id === pendingId;
  const [flipped, setFlipped] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    card?.imageUrl ?? (card ? (imageCache.get(card.id) ?? null) : null),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!card) return;
    // Already generated (persisted on the card) — use it, no refetch.
    if (card.imageUrl) {
      setImageUrl(card.imageUrl);
      return;
    }
    // Already tried and failed (e.g. insufficient balance) — keep SVG art.
    if (card.imageStatus === "error" || imageCache.get(card.id) === null) {
      setImageUrl(null);
      return;
    }
    let alive = true;
    setLoading(true);
    // Rich prompt composed at trip resolution; older cards fall back.
    const prompt =
      card.imagePrompt ??
      `${card.title}，地点「${card.locationName}」，${getDestination(card.destinationTheme).label}，柔和手绘卡通治愈风明信片，低饱和莫兰迪色`;
    fetch("/api/postcard-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((r) => r.json())
      .then((d: { url?: string | null }) => {
        const url = d?.url ?? null;
        imageCache.set(card.id, url);
        setPostcardImage(card.id, url ?? undefined, url ? "ready" : "error");
        if (alive) {
          setImageUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        imageCache.set(card.id, null);
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [card, setPostcardImage]);

  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-soft">还没有明信片。</p>
        <Button onClick={() => goTo("home")}>回小屋</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 text-center">
        {isFresh ? (
          <>
            <h1 className="font-hand text-2xl text-ink">明信片飞回来了！</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {companion.name} 从远方寄来了一张。
            </p>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={() => goTo("album")}
              className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
            >
              ←
            </button>
            <h1 className="font-hand text-xl text-ink">{card.locationName}</h1>
            <span className="w-9" />
          </div>
        )}
      </div>

      {/* flipping card */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className="relative w-full max-w-[330px] cursor-pointer [perspective:1400px]"
          style={{ aspectRatio: "3 / 4" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 17 }}
          >
            <Front card={card} imageUrl={imageUrl} loading={loading} />
            <Back card={card} companionName={companion.name} />
          </motion.div>
        </div>
      </div>

      <p className="px-5 text-center text-xs text-ink-soft/80">
        点一下翻到{flipped ? "正面" : "背面"}
      </p>

      <div className="shrink-0 px-5 pb-5 pt-3">
        {isFresh ? (
          <Button size="lg" className="w-full" onClick={collectPostcard}>
            收进相册 · 回小屋
          </Button>
        ) : (
          <Button
            size="lg"
            variant="soft"
            className="w-full"
            onClick={() => goTo("album")}
          >
            回到相册
          </Button>
        )}
      </div>
    </div>
  );
}
