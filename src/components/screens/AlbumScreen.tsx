"use client";

import { useState } from "react";

import { DESTINATIONS } from "@/game/destinations";
import { cardId, landmarkForCard, RARITIES, TOTAL_CARDS } from "@/game/gacha";
import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import PostcardArt from "../ui/PostcardArt";
import { RARITY_META } from "../ui/rarity";
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
  const cardDex = useGameStore((s) => s.cardDex);
  const souvenirs = useGameStore((s) => s.souvenirs);
  const battles = useGameStore((s) => s.battleRecords);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const [tab, setTab] = useState<Tab>("cards");
  const owned = new Set(cardDex);

  return (
    <div className="screen-bg relative flex h-full flex-col">
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢攒下的远方"
        title={`${companion.name} 的明信片图鉴`}
        right={
          <span className="shrink-0 rounded-full border-2 border-[#bd8a52]/40 bg-cream-soft px-2.5 py-1 font-hand text-[13px] text-ink-soft">
            {cardDex.length}/{TOTAL_CARDS}
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
        {tab === "cards" && (
          <div className="space-y-4">
            <p className="px-1 text-[12px] leading-relaxed text-ink-soft/85">
              每次出门都可能寄回不同稀有度的明信片。集齐 12 个目的地的 4 种稀有度，凑满 {TOTAL_CARDS} 张。
            </p>
            {DESTINATIONS.map((d) => {
              const ownedHere = RARITIES.filter((r) => owned.has(cardId(d.theme, r))).length;
              return (
                <div key={d.theme}>
                  <div className="mb-1.5 flex items-center justify-between px-0.5">
                    <p className="font-hand text-[15px] text-ink">
                      {d.emoji} {d.label}
                    </p>
                    <span className="text-[11px] text-ink-soft">{ownedHere}/4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {RARITIES.map((r) => {
                      const id = cardId(d.theme, r);
                      const meta = RARITY_META[r];
                      const pc = owned.has(id)
                        ? postcards.find((p) => p.destinationTheme === d.theme && p.rarity === r)
                        : undefined;

                      if (pc) {
                        return (
                          <button
                            key={r}
                            onClick={() => openPostcard(pc.id)}
                            className="block text-left active:translate-y-0.5"
                          >
                            <div
                              className="overflow-hidden rounded-[10px] border-2"
                              style={{ borderColor: meta.ring }}
                            >
                              <div className="relative aspect-[4/3] w-full">
                                <PostcardArt theme={d.theme} rounded={false} />
                                <span
                                  className="absolute left-1 top-1 rounded-full px-1 py-px text-[8px] font-medium leading-none text-paper"
                                  style={{ backgroundColor: meta.ring }}
                                >
                                  {r}
                                </span>
                                {pc.id === pendingId && (
                                  <span className="absolute right-1 top-1 rounded-full bg-accent px-1 py-px text-[8px] text-paper">
                                    new
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="mt-1 truncate text-center text-[10px] text-ink-soft">
                              {landmarkForCard(d.theme, r)}
                            </p>
                          </button>
                        );
                      }

                      return (
                        <div key={r}>
                          <div
                            className="grid aspect-[4/3] w-full place-items-center rounded-[10px] border-2 border-dashed bg-cream-soft/60"
                            style={{ borderColor: `${meta.ring}55` }}
                          >
                            <span className="text-base text-ink-soft/35">？</span>
                          </div>
                          <p className="mt-1 text-center text-[10px] text-ink-soft/45">{meta.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            <Empty text="还没有对战记录。让 Agent 在它状态好的日子带它去比试一场。" />
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

      {((tab === "cards" && postcards.length === 0) ||
        (tab === "keepsakes" && souvenirs.length === 0) ||
        (tab === "battles" && battles.length === 0)) && (
        <div className="shrink-0 px-5 pb-5">
          <PrimaryButton onClick={() => goTo("home")}>回小屋看看</PrimaryButton>
        </div>
      )}
    </div>
  );
}
