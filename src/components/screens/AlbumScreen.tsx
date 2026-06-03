"use client";

import { useState } from "react";

import { getDestination } from "@/game/destinations";
import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";
import { cn } from "../ui/cn";
import PostcardArt from "../ui/PostcardArt";

type Tab = "cards" | "souvenir" | "misread" | "growth";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "📮 明信片" },
  { id: "souvenir", label: "🎁 纪念品" },
  { id: "misread", label: "📖 误解词典" },
  { id: "growth", label: "🌱 成长" },
];

const STATS: { key: "mood" | "energy" | "curiosity" | "bravery" | "injury" | "bond"; label: string }[] = [
  { key: "mood", label: "心情" },
  { key: "energy", label: "体力" },
  { key: "curiosity", label: "好奇" },
  { key: "bravery", label: "勇敢" },
  { key: "bond", label: "羁绊" },
  { key: "injury", label: "伤痛" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-ink-soft/80">{text}</p>;
}

export default function AlbumScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const postcards = useGameStore((s) => s.postcards);
  const souvenirs = useGameStore((s) => s.souvenirs);
  const misunderstandings = useGameStore((s) => s.misunderstandings);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const [tab, setTab] = useState<Tab>("cards");

  const cards = postcards;

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
        >
          ←
        </button>
        <h1 className="font-hand text-2xl leading-none text-ink">
          {companion.name} 的收藏馆
        </h1>
      </div>

      {/* tabs */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full border-2 px-3 py-1.5 text-sm transition",
              tab === t.id
                ? "border-ink bg-accent text-paper"
                : "border-ink/12 bg-cream-soft text-ink-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        {tab === "cards" &&
          (cards.length === 0 ? (
            <Empty text="还没有明信片，等它哪天真的出门吧。" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => openPostcard(card.id)}
                  className="relative overflow-hidden rounded-sticker border-2 border-ink/15 bg-paper text-left shadow-[0_2px_0_rgba(58,46,42,0.08)] active:translate-y-0.5"
                >
                  <div className="relative aspect-[4/3] w-full">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.imageUrl}
                        alt={card.locationName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PostcardArt theme={card.destinationTheme} rounded={false} />
                    )}
                    {card.id === pendingId && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-paper">
                        new
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate font-hand text-[15px] text-ink">{card.locationName}</p>
                    <p className="flex justify-between text-[11px] text-ink-soft">
                      <span>{getDestination(card.destinationTheme).label}</span>
                      <span>{fmtDate(card.sentAt)}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}

        {tab === "souvenir" &&
          (souvenirs.length === 0 ? (
            <Empty text="还没带回纪念品。等它哪天出门，也许会带回一点小东西。" />
          ) : (
            <ul className="space-y-2">
              {souvenirs.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-sticker border-2 border-ink/12 bg-cream-soft px-4 py-3">
                  <span className="text-2xl">🎁</span>
                  <span className="text-[15px] text-ink">{s}</span>
                </li>
              ))}
            </ul>
          ))}

        {tab === "misread" &&
          (misunderstandings.length === 0 ? (
            <Empty text="它还没误解过你的话…总有一天会的。" />
          ) : (
            <ul className="space-y-2">
              {misunderstandings.map((m, i) => (
                <li key={i} className="rounded-sticker border-2 border-dashed border-ink/20 bg-cream-soft px-4 py-3 text-sm text-ink-soft">
                  {m}
                </li>
              ))}
            </ul>
          ))}

        {tab === "growth" && (
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-sm font-medium text-ink">状态</p>
              <div className="space-y-2">
                {STATS.map((st) => (
                  <div key={st.key} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-xs text-ink-soft">{st.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          st.key === "injury" ? "bg-accent" : "bg-leaf",
                        )}
                        style={{ width: `${capy[st.key]}%` }}
                      />
                    </div>
                    <span className="w-7 shrink-0 text-right text-xs text-ink-soft">{capy[st.key]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 text-sm font-medium text-ink">性格</p>
              {capy.traits.length === 0 ? (
                <p className="text-sm text-ink-soft/80">还没养出特别的性格。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capy.traits.map((t) => (
                    <span key={t} className="rounded-full border-2 border-ink/15 bg-accent/10 px-3 py-1 text-sm text-ink">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="mb-2 text-sm font-medium text-ink">记忆 / 线索</p>
              {capy.memories.length === 0 ? (
                <p className="text-sm text-ink-soft/80">还没有什么值得记住的小事。</p>
              ) : (
                <ul className="space-y-2">
                  {capy.memories.map((m, i) => (
                    <li key={i} className="rounded-xl border-2 border-ink/10 bg-cream-soft px-3 py-2 text-sm text-ink-soft">
                      🌙 {m}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {postcards.length === 0 &&
        souvenirs.length === 0 &&
        tab === "cards" && (
          <div className="shrink-0 px-5 pb-5">
            <Button variant="soft" className="w-full" onClick={() => goTo("home")}>
              回小屋看看
            </Button>
          </div>
        )}
    </div>
  );
}
