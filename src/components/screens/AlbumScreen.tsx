"use client";

import { useMemo, useState } from "react";

import { ACCESSORIES, PERSONALITIES } from "@/game/labels";
import { cardId, countCollected, TOTAL_CARDS } from "@/game/gacha";
import type { Postcard } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import Icon, { type IconName } from "../ui/Icon";
import PostcardArt from "../ui/PostcardArt";
import { RarityBadge, rarityMeta } from "../ui/rarity";
import { Panel, PrimaryButton, ScreenHeader, TabBar } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

type Tab = "cards" | "diary" | "battles";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "明信片" },
  { id: "diary", label: "日记" },
  { id: "battles", label: "切磋" },
];

// Polaroid jitter so the 手账 grid reads as photos in a journal, not a UI table.
const CARD_TILT = ["-rotate-[0.7deg]", "rotate-[0.6deg]", "rotate-[0.4deg]", "-rotate-[0.5deg]"];

// 日记 entry dressing per event type. Texts come from the server already in the
// pet's first-person voice; here we only pick an icon + a tiny type word.
const EVENT_META: Record<string, { icon: IconName; word: string }> = {
  created: { icon: "home", word: "来到小岛" },
  packed: { icon: "package", word: "收到包裹" },
  departed: { icon: "map", word: "出门" },
  returned: { icon: "home", word: "回家" },
  postcard: { icon: "postmail", word: "寄了信" },
  checkin: { icon: "handbook", word: "它来看我" },
  battle: { icon: "map", word: "切磋" },
  bagExpired: { icon: "package", word: "收拾包裹" },
};
const EVENT_FALLBACK: { icon: IconName; word: string } = { icon: "plant", word: "小事" };

// The Agent's stress chip inside a checkin diary entry (mirrors the home note).
const DIARY_STRESS: Record<string, { label: string; cls: string }> = {
  light: { label: "它很轻松", cls: "border-leaf/45 bg-leaf/12 text-leaf" },
  normal: { label: "它还不错", cls: "border-[#cdab6e]/60 bg-cream-soft text-ink-soft" },
  tired: { label: "它有点累", cls: "border-[#e0973f]/50 bg-[#fdf3da] text-[#b9791f]" },
  exhausted: { label: "它累坏了", cls: "border-accent/45 bg-accent/10 text-accent" },
};

function fmtDiaryAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const RESULT_META: Record<string, { label: string; tone: string }> = {
  win: { label: "胜", tone: "border-leaf/45 bg-leaf/12" },
  lose: { label: "负", tone: "border-accent/45 bg-accent/10" },
  draw: { label: "平", tone: "border-[#bd8a52]/35 bg-cream-soft" },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// One short line on how the opponent LOOKED — another owner raised that pet to
// be different from yours, and the record should let you feel it.
function opponentLook(personality?: string, accessory?: string): string | null {
  const pers = PERSONALITIES.find((p) => p.value === personality)?.label;
  const acc =
    accessory && accessory !== "none"
      ? ACCESSORIES.find((a) => a.value === accessory)?.label
      : undefined;
  if (!pers && !acc) return null;
  return `它${pers ? `是${pers}的性子` : ""}${pers && acc ? "，" : ""}${acc ? `戴着${acc}` : ""}。`;
}

function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Panel className="flex flex-col items-center gap-3.5 px-5 py-12 text-center" sketch={false}>
      <span className="ui-icon-well grid h-16 w-16 place-items-center rounded-full">
        <Icon name={icon} className="h-10 w-10 drop-shadow-[0_3px_2px_rgba(126,83,38,0.16)]" />
      </span>
      <p className="max-w-[230px] text-sm leading-relaxed text-ink-soft/80">{text}</p>
    </Panel>
  );
}

export default function AlbumScreen() {
  const postcards = useGameStore((s) => s.postcards);
  const battles = useGameStore((s) => s.battleRecords);
  const events = useGameStore((s) => s.events);
  const cardDex = useGameStore((s) => s.cardDex);
  const pendingId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const goTo = useGameStore((s) => s.goTo);

  const [tab, setTab] = useState<Tab>("cards");

  // Diary reads newest-first (the log itself is append-ordered).
  const diary = useMemo(() => [...events].reverse(), [events]);
  const collected = useMemo(() => countCollected(cardDex), [cardDex]);
  // 手账 rule: each (destination × rarity) card appears ONCE. The FIRST-received
  // instance keeps the slot, so its date reads as "the day I collected it";
  // later duplicates only feed the hidden curiosity bonus.
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    const out: Postcard[] = [];
    for (let i = postcards.length - 1; i >= 0; i--) {
      const pc = postcards[i];
      const id = cardId(pc.destinationTheme, pc.rarity);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(pc);
    }
    return out.reverse(); // newest-collected first
  }, [postcards]);
  // The featured card on top: the newest letter itself (dupe or not).
  const hero = postcards[0];

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-travel-ref.png"
        overlay="soft"
        imageClassName="object-[50%_38%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/88 via-cream-soft/45 to-transparent" />

      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢攒下的远方"
        title={tab === "cards" ? "明信片手账" : tab === "diary" ? "小岛日记" : "切磋记录"}
        right={<Icon name="postmail" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
      />

      {/* tabs */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} className="relative z-10 mx-5 mt-3" />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 py-4">
        {tab === "cards" &&
          (postcards.length === 0 || !hero ? (
            <Empty icon="postmail" text="我还没往家寄明信片呢。等我出趟远门，把远方寄回来给你。" />
          ) : (
            <div className="space-y-4 pt-1">
              {/* 最新的一张 — featured big polaroid */}
              <button
                onClick={() => openPostcard(hero.id)}
                className="relative mx-auto block w-full max-w-[330px] -rotate-[0.6deg] rounded-[16px] border-2 border-[#eadbbd] bg-paper p-2.5 pb-2 text-left shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85),0_6px_0_rgba(143,101,54,0.12),0_20px_32px_-22px_rgba(58,46,42,0.5)] transition active:translate-y-0.5"
              >
                <div
                  className="overflow-hidden rounded-[11px] border-2"
                  style={{ borderColor: rarityMeta(hero.rarity).ring }}
                >
                  <div className="relative aspect-[4/3] w-full">
                    <PostcardArt theme={hero.destinationTheme} rarity={hero.rarity} rounded={false} />
                    {hero.id === pendingId && (
                      <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] leading-none text-paper">
                        new
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-hand text-[17px] leading-tight text-ink">
                      {hero.title}
                    </span>
                    <span className="text-[11px] tabular-nums text-ink-soft/75">
                      {fmtDate(hero.sentAt)} · {hero.locationName}
                    </span>
                  </span>
                  <RarityBadge rarity={hero.rarity} className="shrink-0" />
                </div>
                {/* a little leaf sticker, like the reference 手账 */}
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 grid h-9 w-9 place-items-center rounded-full border-2 border-[#e2c596] bg-paper shadow-[0_2px_0_rgba(143,101,54,0.16)]"
                >
                  <Icon name="plant" className="h-5 w-5" />
                </span>
              </button>

              {/* the collection — each card once, first-received keeps the slot */}
              <div className="flex items-baseline justify-between px-1">
                <span className="font-hand text-[16px] font-bold leading-none text-ink">
                  我的明信片
                </span>
                <span className="font-hand text-[14px] leading-none text-ink-soft">
                  <span className="text-accent">{collected}</span> / {TOTAL_CARDS}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {uniqueCards.map((pc, i) => {
                  const meta = rarityMeta(pc.rarity);
                  return (
                    <button
                      key={pc.id}
                      onClick={() => openPostcard(pc.id)}
                      className={cn(
                        "block rounded-[14px] border-2 border-[#eadbbd] bg-paper p-1.5 pb-1.5 text-left shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85),0_4px_0_rgba(143,101,54,0.12),0_14px_22px_-18px_rgba(58,46,42,0.45)] transition active:translate-y-0.5",
                        CARD_TILT[i % CARD_TILT.length],
                      )}
                    >
                      <div className="overflow-hidden rounded-[9px]">
                        <div className="relative aspect-[4/3] w-full">
                          <PostcardArt theme={pc.destinationTheme} rarity={pc.rarity} rounded={false} />
                          {pc.id === pendingId && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-accent px-1.5 py-px text-[9px] text-paper">
                              new
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-1 px-1 pt-1.5">
                        <span className="min-w-0">
                          <span className="block truncate font-hand text-[13px] leading-tight text-ink">
                            {pc.title}
                          </span>
                          <span className="text-[10px] tabular-nums text-ink-soft/70">
                            {fmtDate(pc.sentAt)}
                          </span>
                        </span>
                        <span
                          className="mb-0.5 shrink-0 rounded-full px-1.5 py-px text-[9px] font-medium leading-none text-paper"
                          style={{ backgroundColor: meta.ring }}
                        >
                          {pc.rarity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="px-1 text-center text-[11px] leading-relaxed text-ink-soft/65">
                没集到的还藏在路上。多陪我出门，就更容易遇到。
              </p>
            </div>
          ))}

        {tab === "diary" &&
          (diary.length === 0 ? (
            <Empty icon="handbook" text="这本日记还空着。等我开始过日子，每一天都会记在这里。" />
          ) : (
            <div className="space-y-3">
              <Panel className="px-4 py-3" sketch={false}>
                <p className="font-hand text-[16px] leading-tight text-ink">
                  我的小日子，都记在这本子上。
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                  谁来看过我、我去了哪儿、带回了什么——给 Agent 看，也给你看。
                </p>
              </Panel>
              <ul className="space-y-2.5">
                {diary.map((e) => {
                  const meta = EVENT_META[e.type] ?? EVENT_FALLBACK;
                  const stress = e.type === "checkin" && e.stress ? DIARY_STRESS[e.stress] : null;
                  return (
                    <li key={e.seq}>
                      <Panel sketch={false} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="ui-icon-well grid h-9 w-9 shrink-0 place-items-center rounded-full">
                            <Icon name={meta.icon} className="h-6 w-6 drop-shadow-[0_2px_2px_rgba(126,83,38,0.14)]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="shrink-0 font-hand text-[13px] font-bold leading-none text-ink">
                                  {meta.word}
                                </span>
                                {stress && (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none",
                                      stress.cls,
                                    )}
                                  >
                                    {stress.label}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-[10px] tabular-nums text-ink-soft/60">
                                {fmtDiaryAt(e.at)}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                              {e.text}
                            </p>
                          </div>
                        </div>
                      </Panel>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        {tab === "battles" &&
          (battles.length === 0 ? (
            <Empty icon="map" text="还没跟谁切磋过。等我有精神的日子，去会会岛上的小伙伴。" />
          ) : (
            <ul className="space-y-2.5">
              {battles.map((b) => {
                const meta = RESULT_META[b.result] ?? RESULT_META.draw;
                const look = opponentLook(b.opponentPersonality, b.opponentAccessory);
                return (
                  <li key={b.id}>
                    <Panel sketch={false} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-hand text-[16px] text-ink">{b.title}</span>
                          <span className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                            {b.opponentColor && (
                              <span
                                aria-hidden
                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/15"
                                style={{ background: b.opponentColor }}
                              />
                            )}
                            <span className="min-w-0 truncate">
                              我遇见了 {b.opponentName}
                              {b.isNpc ? "（路过的小家伙）" : "（别人家的小伙伴）"}
                            </span>
                          </span>
                          {look && (
                            <span className="block text-[11px] text-ink-soft/75">{look}</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border-2 px-2.5 py-0.5 font-hand text-[13px] text-ink",
                            meta.tone,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b.story}</p>
                      <p className="mt-1.5 flex justify-between text-[11px] text-ink-soft/80">
                        <span>
                          {b.injury > 0 ? `擦破了一点 ${b.injury}` : "我没事"}
                          {b.spoils ? ` · ${b.spoils}` : ""}
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
        (tab === "diary" && diary.length === 0) ||
        (tab === "battles" && battles.length === 0)) && (
        <div className="shrink-0 px-5 pb-5">
          <PrimaryButton onClick={() => goTo("home")}>回小屋看看</PrimaryButton>
        </div>
      )}
    </div>
  );
}
