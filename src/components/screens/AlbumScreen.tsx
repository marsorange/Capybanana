"use client";

import { getDestination } from "@/game/destinations";
import { useGameStore } from "@/state/gameStore";
import PostcardArt from "../ui/PostcardArt";
import Button from "../ui/Button";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function AlbumScreen() {
  const postcards = useGameStore((s) => s.postcards);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
          aria-label="返回"
        >
          ←
        </button>
        <div>
          <h1 className="font-hand text-2xl leading-none text-ink">明信片相册</h1>
          <p className="mt-1 text-sm text-ink-soft">
            收到 {postcards.length} 张 · 它走过的地方
          </p>
        </div>
      </div>

      {postcards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-5xl">📮</div>
          <p className="text-ink-soft">还没有明信片，等它第一次出门吧。</p>
          <Button variant="soft" onClick={() => goTo("home")}>
            回小屋看看
          </Button>
        </div>
      ) : (
        <div className="no-scrollbar grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5">
          {postcards.map((card) => (
            <button
              key={card.id}
              onClick={() => openPostcard(card.id)}
              className="group relative overflow-hidden rounded-sticker border-2 border-ink/15 bg-paper text-left shadow-[0_2px_0_rgba(58,46,42,0.08)] transition active:translate-y-0.5"
            >
              <div className="relative aspect-[4/3] w-full">
                <PostcardArt theme={card.destinationTheme} rounded={false} />
                {card.id === pendingId && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-paper">
                    new
                  </span>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate font-hand text-[15px] text-ink">
                  {card.locationName}
                </p>
                <p className="flex items-center justify-between text-[11px] text-ink-soft">
                  <span>{getDestination(card.destinationTheme).label}</span>
                  <span>{fmtDate(card.sentAt)}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
