"use client";

import { useMemo, useState } from "react";

import { ACCESSORIES, PERSONALITIES } from "@/game/labels";
import { cardId, countCollected, TOTAL_CARDS } from "@/game/gacha";
import type { Postcard } from "@/game/types";
import type { AgentEvent } from "@/server/types";
import { useGameStore } from "@/state/gameStore";
import { dom, useLocale, useTr, type Locale } from "@/i18n";
import { cn } from "../ui/cn";
import Icon, { type IconName } from "../ui/Icon";
import PostcardArt from "../ui/PostcardArt";
import { RarityBadge, rarityMeta } from "../ui/rarity";
import { Panel, ScreenHeader, TabBar } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

type Tab = "cards" | "diary" | "battles";

const S = dom(
  {
    tabCards: "明信片",
    tabDiary: "日记",
    tabBattles: "切磋",
    headerEyebrow: "慢慢攒下的远方",
    titleCards: "明信片手账",
    titleDiary: "小岛日记",
    titleBattles: "切磋记录",
    myPostcards: "我的明信片",
    cardsEmpty: "我还没往家寄明信片呢。等我出趟远门，把远方寄回来给你。",
    cardsFootnote: "没集到的还藏在路上。多陪我出门，就更容易遇到。",
    diaryEmpty: "这本日记还空着。等我开始过日子，每一天都会记在这里。",
    battlesEmpty: "还没跟谁切磋过。等我有精神的日子，去会会岛上的小伙伴。",
    metCreated: "来到小岛",
    metDeparted: "出门",
    metReturned: "回家",
    metPostcard: "寄了信",
    metCheckin: "它来看我",
    metBattle: "切磋",
    resultWin: "胜",
    resultLose: "负",
    resultDraw: "平",
    opponentNpc: "（路过的小家伙）",
    opponentOther: "（别人家的小伙伴）",
    metOpponent: (name: string) => `我遇见了 ${name}`,
    look: (pers: string | null, acc: string | null) =>
      `它${pers ? `是${pers}的性子` : ""}${pers && acc ? "，" : ""}${acc ? `戴着${acc}` : ""}。`,
    diaryDayLabel: (m: number, day: number) => `${m}月${day}日`,
    injury: (n: number) => `擦破了一点 ${n}`,
    noInjury: "我没事",
  },
  {
    tabCards: "Postcards",
    tabDiary: "Diary",
    tabBattles: "Sparring",
    headerEyebrow: "Far-off places, saved up slowly",
    titleCards: "Postcard Journal",
    titleDiary: "Island Diary",
    titleBattles: "Sparring Log",
    myPostcards: "My Postcards",
    cardsEmpty: "I haven't mailed a postcard home yet. Once I head somewhere far, I'll send a piece of it back to you.",
    cardsFootnote: "The ones I'm missing are still out there. Come wander with me and they'll turn up.",
    diaryEmpty: "This diary is still empty. Once I settle into my days, each one will be written here.",
    battlesEmpty: "Haven't sparred with anyone yet. On a peppy day, I'll go meet the friends around the island.",
    metCreated: "Arrived on the island",
    metDeparted: "Set off",
    metReturned: "Came home",
    metPostcard: "Mailed a letter",
    metCheckin: "You checked on me",
    metBattle: "Sparring",
    resultWin: "Win",
    resultLose: "Loss",
    resultDraw: "Draw",
    opponentNpc: " (a passing little one)",
    opponentOther: " (someone else's companion)",
    metOpponent: (name: string) => `I met ${name}`,
    look: (pers: string | null, acc: string | null) => {
      const bits: string[] = [];
      if (pers) bits.push(`a ${pers.toLowerCase()} sort`);
      if (acc) bits.push(`wearing ${acc.toLowerCase()}`);
      return bits.length ? `They were ${bits.join(", ")}.` : "";
    },
    diaryDayLabel: (m: number, day: number) =>
      `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${day}`,
    injury: (n: number) => `Got scuffed up a little: ${n}`,
    noInjury: "I'm fine",
  },
);

// Polaroid jitter so the 手账 grid reads as photos in a journal, not a UI table.
const CARD_TILT = ["-rotate-[0.7deg]", "rotate-[0.6deg]", "rotate-[0.4deg]", "-rotate-[0.5deg]"];

// 日记 entry dressing per event type. Texts come from the server already in the
// pet's first-person voice; here we only pick an icon + a tiny type word.
// This map is ALSO the diary filter: anything not listed (packing, bag cleanup,
// legacy types) is owner-side noise and stays out of the diary.
const EVENT_ICON: Record<string, IconName> = {
  created: "home",
  departed: "map",
  returned: "home",
  postcard: "postmail",
  checkin: "handbook",
  battle: "map",
};

const RESULT_TONE: Record<string, string> = {
  win: "border-leaf/45 bg-leaf/12",
  lose: "border-accent/45 bg-accent/10",
  draw: "border-[#bd8a52]/35 bg-cream-soft",
};

function fmtDiaryTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function Empty({ icon, text }: { icon: IconName; text: string }) {
  // Vertically centered in the scroll area — hung at the top, the card used to
  // sit right above the backdrop's capybara and read like a broken half-card.
  return (
    <div className="flex h-full flex-col justify-center pb-14">
      <Panel className="flex flex-col items-center gap-3.5 px-5 py-10 text-center" sketch={false}>
        <span className="ui-icon-well grid h-16 w-16 place-items-center rounded-full">
          <Icon name={icon} className="h-10 w-10 drop-shadow-[0_3px_2px_rgba(126,83,38,0.16)]" />
        </span>
        <p className="max-w-[230px] text-sm leading-relaxed text-ink-soft/80">{text}</p>
      </Panel>
    </div>
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

  const t = useTr(S);
  const locale = useLocale();

  const TABS: { id: Tab; label: string }[] = [
    { id: "cards", label: t.tabCards },
    { id: "diary", label: t.tabDiary },
    { id: "battles", label: t.tabBattles },
  ];

  const eventWord: Record<string, string> = {
    created: t.metCreated,
    departed: t.metDeparted,
    returned: t.metReturned,
    postcard: t.metPostcard,
    checkin: t.metCheckin,
    battle: t.metBattle,
  };

  // One short line on how the opponent LOOKED — another owner raised that pet to
  // be different from yours, and the record should let you feel it.
  const opponentLook = (personality?: string, accessory?: string): string | null => {
    const pers =
      PERSONALITIES.find((p) => p.value === personality)?.label[locale] ?? null;
    const acc =
      accessory && accessory !== "none"
        ? ACCESSORIES.find((a) => a.value === accessory)?.label[locale] ?? null
        : null;
    if (!pers && !acc) return null;
    return t.look(pers, acc) || null;
  };

  const [tab, setTab] = useState<Tab>("cards");

  // Diary, trimmed for reading: newest-first, owner-side noise filtered out
  // (only EVENT_META types stay), at most one check-in per day (the Agent may
  // ping several times; the latest tells the day), grouped into one page per
  // calendar day so date/time chrome isn't repeated on every line.
  const diaryDays = useMemo(() => {
    const days: { day: string; label: string; entries: AgentEvent[] }[] = [];
    const checkinDays = new Set<string>();
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (!EVENT_ICON[e.type]) continue;
      const d = new Date(e.at);
      if (Number.isNaN(d.getTime())) continue;
      const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (e.type === "checkin") {
        if (checkinDays.has(day)) continue; // newest-first scan keeps the latest
        checkinDays.add(day);
      }
      let bucket = days[days.length - 1];
      if (!bucket || bucket.day !== day) {
        bucket = { day, label: t.diaryDayLabel(d.getMonth() + 1, d.getDate()), entries: [] };
        days.push(bucket);
      }
      bucket.entries.push(e);
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, locale]);
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
        eyebrow={t.headerEyebrow}
        title={tab === "cards" ? t.titleCards : tab === "diary" ? t.titleDiary : t.titleBattles}
        right={<Icon name="postmail" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
      />

      {/* tabs */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} className="relative z-10 mx-5 mt-3" />

      <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-5 pb-9 pt-4">
        {tab === "cards" &&
          (postcards.length === 0 || !hero ? (
            <Empty icon="postmail" text={t.cardsEmpty} />
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
                  {t.myPostcards}
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
                {t.cardsFootnote}
              </p>
            </div>
          ))}

        {tab === "diary" &&
          (diaryDays.length === 0 ? (
            <Empty icon="handbook" text={t.diaryEmpty} />
          ) : (
            <div className="space-y-3">
              {diaryDays.map((d) => (
                <Panel key={d.day} sketch={false} className="px-4 py-3">
                  <p className="font-hand text-[13px] font-bold leading-none text-ink-soft/75">
                    {d.label}
                  </p>
                  <ul className="mt-2.5 space-y-3">
                    {d.entries.map((e) => {
                      return (
                        <li key={e.seq} className="flex items-start gap-2.5">
                          <Icon
                            name={EVENT_ICON[e.type]}
                            className="mt-px h-5 w-5 shrink-0 drop-shadow-[0_1px_1px_rgba(126,83,38,0.12)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-hand text-[13px] font-bold leading-none text-ink">
                                {eventWord[e.type]}
                              </span>
                              <span className="shrink-0 text-[10px] tabular-nums text-ink-soft/55">
                                {fmtDiaryTime(e.at)}
                              </span>
                            </div>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                              {e.text}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ))}
            </div>
          ))}

        {tab === "battles" &&
          (battles.length === 0 ? (
            <Empty icon="map" text={t.battlesEmpty} />
          ) : (
            <ul className="space-y-2.5">
              {battles.map((b) => {
                const tone = RESULT_TONE[b.result] ?? RESULT_TONE.draw;
                const resultLabel =
                  b.result === "win" ? t.resultWin : b.result === "lose" ? t.resultLose : t.resultDraw;
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
                              {t.metOpponent(b.opponentName)}
                              {b.isNpc ? t.opponentNpc : t.opponentOther}
                            </span>
                          </span>
                          {look && (
                            <span className="block text-[11px] text-ink-soft/75">{look}</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border-2 px-2.5 py-0.5 font-hand text-[13px] text-ink",
                            tone,
                          )}
                        >
                          {resultLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b.story}</p>
                      <p className="mt-1.5 flex justify-between text-[11px] text-ink-soft/80">
                        <span>
                          {b.injury > 0 ? t.injury(b.injury) : t.noInjury}
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

    </div>
  );
}
