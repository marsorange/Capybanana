"use client";

import { useGameStore } from "@/state/gameStore";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// A lightweight journal: the pet's trips read back as little diary entries.
// (Newest first.) Cloud-written diaries can be folded in here later.
export default function DiaryPanel({ onClose }: { onClose: () => void }) {
  const companion = useGameStore((s) => s.companion);
  const postcards = useGameStore((s) => s.postcards);
  const entries = [...postcards].reverse();

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
          {entries.length === 0 ? (
            <div className="mt-16 text-center text-sm text-ink-soft">
              <p className="font-hand text-2xl">还没有日记呢</p>
              <p className="mt-2">等它出门旅行回来，就会写下今天啦。</p>
            </div>
          ) : (
            entries.map((p) => (
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
