"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import PostcardArt from "../ui/PostcardArt";
import { rarityMeta } from "../ui/rarity";
import { Panel, PrimaryButton, ScreenHeader, TabBar } from "../ui/kit";

type Tab = "cards" | "battles";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "明信片" },
  { id: "battles", label: "切磋" },
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

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-[#bd8a52]/40 bg-cream-soft text-3xl">
        {emoji}
      </span>
      <p className="max-w-[230px] text-sm leading-relaxed text-ink-soft/80">{text}</p>
    </div>
  );
}

export default function AlbumScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const postcards = useGameStore((s) => s.postcards);
  const battles = useGameStore((s) => s.battleRecords);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const [tab, setTab] = useState<Tab>("cards");

  return (
    <div className="screen-bg relative flex h-full flex-col">
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢攒下的远方"
        title={`${companion.name} 寄回来的`}
      />

      {/* tabs */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} className="relative z-10 mx-5 mt-3" />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 py-4">
        {tab === "cards" &&
          (postcards.length === 0 ? (
            <Empty emoji="💌" text="我还没往家寄明信片呢。等我出趟远门，把远方寄回来给你。" />
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-[12px] leading-relaxed text-ink-soft/85">
                我寄回来的明信片，都在这儿了。
              </p>
              <div className="grid grid-cols-2 gap-3">
                {postcards.map((pc) => {
                  const meta = rarityMeta(pc.rarity);
                  return (
                    <button
                      key={pc.id}
                      onClick={() => openPostcard(pc.id)}
                      className="ui-wood-surface ui-wood-press block rounded-[18px] p-1.5 text-left"
                    >
                      <div
                        className="overflow-hidden rounded-[13px] border-2 bg-paper"
                        style={{ borderColor: meta.ring }}
                      >
                        <div className="relative aspect-[4/3] w-full">
                          <PostcardArt theme={pc.destinationTheme} rounded={false} />
                          <span
                            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[9px] font-medium leading-none text-paper"
                            style={{ backgroundColor: meta.ring }}
                          >
                            {pc.rarity}
                          </span>
                          {pc.id === pendingId && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-px text-[9px] text-paper">
                              new
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-center text-[11px] text-ink">
                        {pc.locationName}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {tab === "battles" &&
          (battles.length === 0 ? (
            <Empty emoji="🤝" text="还没跟谁切磋过。等我有精神的日子，去会会岛上的小伙伴。" />
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
                            我遇见了 {b.opponentName}
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
                          {b.injury > 0 ? `🩹 擦破了一点 ${b.injury}` : "我没事"}
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
        (tab === "battles" && battles.length === 0)) && (
        <div className="shrink-0 px-5 pb-5">
          <PrimaryButton onClick={() => goTo("home")}>回小屋看看</PrimaryButton>
        </div>
      )}
    </div>
  );
}
