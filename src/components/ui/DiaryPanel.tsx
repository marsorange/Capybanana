"use client";

import { useState } from "react";

import type { DiaryEntry } from "@/server/types";
import { useGameStore } from "@/state/gameStore";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function moodEmoji(mood: number): string {
  if (mood >= 66) return "😊";
  if (mood >= 33) return "🙂";
  return "😪";
}

// One diary entry, as a flip card: the pet's sweet first-person diary on the
// front; tap to flip to the overworked agent's behind-the-scenes grumble.
function DiaryCard({ entry }: { entry: DiaryEntry }) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!entry.gripe;

  if (flipped && canFlip) {
    return (
      <button
        onClick={() => setFlipped(false)}
        className="block w-full rounded-sticker border-2 border-dashed border-ink/25 bg-ink/[0.06] px-4 py-3 text-left shadow-[0_2px_0_rgba(58,46,42,0.08)]"
      >
        <div className="flex items-baseline justify-between">
          <span className="font-hand text-base text-ink-soft">🤖 它没说的话</span>
          <span className="text-[11px] text-ink-soft/70">{fmtDate(entry.day)}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          {entry.gripe}
        </p>
        <p className="mt-1.5 text-right text-[11px] text-ink-soft/60">
          （轻点翻回 ↩）
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={() => canFlip && setFlipped(true)}
      className="block w-full rounded-sticker border-2 border-ink/10 bg-paper px-4 py-3 text-left shadow-[0_2px_0_rgba(58,46,42,0.08)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-hand text-base text-ink">
          {fmtDate(entry.day)}
        </span>
        <span className="text-sm" title={`心情 ${entry.mood}`}>
          {moodEmoji(entry.mood)}
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        {entry.text}
      </p>
      {canFlip && (
        <p className="mt-1.5 text-right text-[11px] text-ink-soft/55">
          （轻点看 🤖 的碎碎念）
        </p>
      )}
    </button>
  );
}

// The pet's journal. Prefers the agent-written cloud diary (with the flip-side
// grumble); for a guest with no diary, falls back to reading trips back as
// little entries so the panel is never empty.
export default function DiaryPanel({ onClose }: { onClose: () => void }) {
  const companion = useGameStore((s) => s.companion);
  const diary = useGameStore((s) => s.diary);
  const postcards = useGameStore((s) => s.postcards);

  const hasDiary = diary.length > 0;
  const fallback = [...postcards].reverse();

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-ink/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-auto mb-0 flex h-[78%] w-full max-w-md flex-col rounded-t-sticker border-2 border-ink/15 bg-cream shadow-[0_-6px_24px_rgba(58,46,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-hand text-xl text-ink">
            {companion?.name ?? "它"}的日记
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border-2 border-ink/15 bg-paper px-3 py-1 text-sm text-ink-soft"
          >
            关闭
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 pb-6">
          {hasDiary ? (
            diary.map((e) => <DiaryCard key={e.id} entry={e} />)
          ) : fallback.length === 0 ? (
            <div className="mt-16 text-center text-sm text-ink-soft">
              <p className="font-hand text-2xl">还没有日记呢</p>
              <p className="mt-2">
                绑定 Agent 后，它每天会替 {companion?.name ?? "它"} 写一篇。
              </p>
            </div>
          ) : (
            fallback.map((p) => (
              <div
                key={p.id}
                className="rounded-sticker border-2 border-ink/10 bg-paper px-4 py-3 shadow-[0_2px_0_rgba(58,46,42,0.08)]"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-hand text-base text-ink">{p.title}</span>
                  <span className="text-[11px] text-ink-soft">
                    {fmtDate(p.sentAt)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                  {p.message}
                </p>
                <p className="mt-1 text-[11px] text-ink-soft/80">
                  📍 {p.locationName}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
