"use client";

import { useState } from "react";

import { getDestination } from "@/game/destinations";
import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import PostcardArt from "../ui/PostcardArt";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";

type Tab = "cards" | "keepsakes" | "battles";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "明信片" },
  { id: "keepsakes", label: "手信" },
  { id: "battles", label: "对战" },
];

const RESULT_META: Record<string, { label: string; emoji: string; tone: string }> = {
  win: { label: "胜", emoji: "🏆", tone: "border-leaf/45 bg-leaf/12" },
  lose: { label: "负", emoji: "🩹", tone: "border-accent/45 bg-accent/10" },
  draw: { label: "平", emoji: "🤝", tone: "border-[#bd8a52]/35 bg-cream-soft" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function Empty({ text }: { text: string }) {
  return <p className="py-14 text-center text-sm leading-relaxed text-ink-soft/80">{text}</p>;
}

export default function AlbumScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const postcards = useGameStore((s) => s.postcards);
  const souvenirs = useGameStore((s) => s.souvenirs);
  const battles = useGameStore((s) => s.battleRecords);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const [tab, setTab] = useState<Tab>("cards");

  const cards = postcards;
  const latest = cards[0];
  const olderCards = cards.slice(1);

  return (
    <div className="screen-bg relative flex h-full flex-col">
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢攒下的远方"
        title={`${companion.name} 的明信片手账`}
        right={
          <span className="shrink-0 rounded-full border-2 border-[#bd8a52]/40 bg-cream-soft px-2.5 py-1 font-hand text-[13px] text-ink-soft">
            {postcards.length}/24
          </span>
        }
      />

      {/* tabs */}
      <div className="relative z-10 mt-3 flex gap-2 px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 font-hand text-[15px] transition",
              tab === t.id
                ? "border-[#b8504a] bg-accent text-paper shadow-[0_2px_0_rgba(150,70,58,0.4)]"
                : "border-[#bd8a52]/35 bg-cream-soft text-ink-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 py-4">
        {tab === "cards" &&
          (cards.length === 0 ? (
            <Empty text="还没有明信片。先准备一个包裹，让 Agent 判断今天有没有风可以出门。" />
          ) : (
            <div className="space-y-4">
              {latest && (
                <button onClick={() => openPostcard(latest.id)} className="block w-full text-left active:translate-y-0.5">
                  <Panel className="overflow-hidden p-2">
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[14px] border-2 border-[#bd8a52]/30">
                      <PostcardArt theme={latest.destinationTheme} rounded={false} />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-paper/85 px-2 py-0.5 text-[11px] text-ink-soft">
                        最新来信
                      </span>
                      {latest.id === pendingId && (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5 text-[10px] text-paper">
                          new
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-2 px-1.5 pb-0.5 pt-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-hand text-xl leading-tight text-ink">{latest.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-soft">{latest.locationName}</p>
                      </div>
                      <span className="shrink-0 text-[12px] text-ink-soft/80">{fmtDate(latest.sentAt)}</span>
                    </div>
                  </Panel>
                </button>
              )}

              {olderCards.length > 0 && (
                <>
                  <p className="px-1 font-hand text-base text-ink-soft">我的明信片</p>
                  <div className="grid grid-cols-2 gap-3">
                    {olderCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => openPostcard(card.id)}
                        className="block text-left active:translate-y-0.5"
                      >
                        <Panel sketch={false} className="overflow-hidden p-1.5">
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[11px] border border-[#bd8a52]/25">
                            <PostcardArt theme={card.destinationTheme} rounded={false} />
                            {card.id === pendingId && (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-paper">
                                new
                              </span>
                            )}
                          </div>
                          <div className="px-1 pb-0.5 pt-2">
                            <p className="truncate font-hand text-[15px] leading-tight text-ink">{card.locationName}</p>
                            <p className="mt-0.5 flex justify-between text-[11px] text-ink-soft">
                              <span className="truncate">{getDestination(card.destinationTheme).label}</span>
                              <span className="shrink-0">{fmtDate(card.sentAt).slice(5)}</span>
                            </p>
                          </div>
                        </Panel>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}

        {tab === "keepsakes" &&
          (souvenirs.length === 0 ? (
            <Empty text="还没带回手信。远方需要一点时间，也需要一点体力。" />
          ) : (
            <ul className="space-y-2.5">
              {souvenirs.map((s, i) => (
                <li key={i}>
                  <Panel sketch={false} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#bd8a52]/30 bg-cream-soft text-2xl">
                      🎁
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-hand text-[16px] text-ink">{s}</span>
                      <span className="text-[12px] text-ink-soft">从某一天带回来的小证据</span>
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          ))}

        {tab === "battles" &&
          (battles.length === 0 ? (
            <Empty text="还没有对战记录。让 Agent 在它勇气足、体力够的日子带它去比试一场。" />
          ) : (
            <ul className="space-y-2.5">
              {battles.map((b) => {
                const meta = RESULT_META[b.result] ?? RESULT_META.draw;
                return (
                  <li key={b.id}>
                    <Panel sketch={false} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-hand text-[16px] text-ink">{b.title}</span>
                          <span className="text-[12px] text-ink-soft">
                            对手 {b.opponentName}
                            {b.isNpc ? "（路过的小家伙）" : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border-2 px-2.5 py-0.5 font-hand text-[13px] text-ink",
                            meta.tone,
                          )}
                        >
                          {meta.emoji} {meta.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b.story}</p>
                      <p className="mt-1.5 flex justify-between text-[11px] text-ink-soft/80">
                        <span>
                          {b.injury > 0 ? `🩹 受伤 ${b.injury}` : "毫发无伤"}
                          {b.spoils ? ` · 🎁 ${b.spoils}` : ""}
                        </span>
                        <span>{fmtDate(b.createdAt)}</span>
                      </p>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>

      {((tab === "cards" && cards.length === 0) ||
        (tab === "keepsakes" && souvenirs.length === 0) ||
        (tab === "battles" && battles.length === 0)) && (
        <div className="shrink-0 px-5 pb-5">
          <PrimaryButton onClick={() => goTo("home")}>回小屋看看</PrimaryButton>
        </div>
      )}
    </div>
  );
}
