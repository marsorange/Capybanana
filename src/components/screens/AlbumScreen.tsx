"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import PostcardArt from "../ui/PostcardArt";
import { RARITY_META } from "../ui/rarity";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";

type Tab = "cards" | "keepsakes" | "battles";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "明信片" },
  { id: "keepsakes", label: "手信" },
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

  return (
    <div className="screen-bg relative flex h-full flex-col">
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢攒下的远方"
        title={`${companion.name} 寄回来的`}
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
          (postcards.length === 0 ? (
            <Empty text="我还没往家寄明信片呢。等我出趟远门。" />
          ) : (
            <div className="space-y-3">
              <p className="px-1 text-[12px] leading-relaxed text-ink-soft/85">
                我寄回来的明信片，都在这儿了。
              </p>
              <div className="grid grid-cols-2 gap-3">
                {postcards.map((pc) => {
                  const meta = RARITY_META[pc.rarity];
                  return (
                    <button
                      key={pc.id}
                      onClick={() => openPostcard(pc.id)}
                      className="block text-left active:translate-y-0.5"
                    >
                      <div
                        className="overflow-hidden rounded-[12px] border-2"
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

        {tab === "keepsakes" &&
          (souvenirs.length === 0 ? (
            <Empty text="我还没带回手信呢。等我走远一点。" />
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
                      <span className="text-[12px] text-ink-soft">某天，我从远方带回来的</span>
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          ))}

        {tab === "battles" &&
          (battles.length === 0 ? (
            <Empty text="还没跟谁比过。等我有精神的日子吧。" />
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
        (tab === "keepsakes" && souvenirs.length === 0) ||
        (tab === "battles" && battles.length === 0)) && (
        <div className="shrink-0 px-5 pb-5">
          <PrimaryButton onClick={() => goTo("home")}>回小屋看看</PrimaryButton>
        </div>
      )}
    </div>
  );
}
