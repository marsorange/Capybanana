"use client";

import { useMemo } from "react";

import {
  ACCESSORIES,
  COMPANION_TYPES,
  PERSONALITIES,
  PRIMARY_COLORS,
} from "@/game/labels";
import { companionStats } from "@/game/companionLevel";
import type { CapyState } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import CapyAvatar from "../ui/CapyAvatar";
import { cn } from "../ui/cn";
import Icon, { type IconName } from "../ui/Icon";
import { Chip, Panel, PrimaryButton, ProgressBar, ScreenHeader } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

function fmtDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** Small bold section caption at the top of each journal card. */
function SectionTitle({ children }: { children: string }) {
  return <p className="font-hand text-[16px] font-bold leading-none text-ink">{children}</p>;
}

// ── 今天心情 (number-free) ────────────────────────────────────────────────────
// The five core stats stay hidden from the owner — the Agent reads them over
// the API. Here we only surface a soft, qualitative mood: a face + one
// pet-voice line, derived from mood/injury but never showing a number.

type MoodKind = "happy" | "ok" | "low" | "hurt";

function moodOf(capy: CapyState): { kind: MoodKind; word: string; line: string } {
  if (capy.injury > 0)
    return { kind: "hurt", word: "在养伤", line: "蹭破了一点皮，趴一趴就好了。" };
  if (capy.mood >= 70)
    return { kind: "happy", word: "很开心", line: "阳光真好，感觉能去任何地方。" };
  if (capy.mood >= 45)
    return { kind: "ok", word: "还不错", line: "窝在老地方，心里挺安稳的。" };
  return { kind: "low", word: "有点蔫", line: "想多躺一会儿，你来陪陪我呀。" };
}

function MoodFace({ kind, className }: { kind: MoodKind; className?: string }) {
  const ink = "#7a5a32";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="#f7d98c" stroke="#e3b35e" strokeWidth="2.5" />
      <g fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round">
        {kind === "happy" && (
          <>
            <path d="M13.5 21.5 q3.5 -4.5 7 0" />
            <path d="M27.5 21.5 q3.5 -4.5 7 0" />
            <path d="M16 29 q8 7.5 16 0" />
          </>
        )}
        {kind === "ok" && (
          <>
            <circle cx="17" cy="21" r="1.4" fill={ink} stroke="none" />
            <circle cx="31" cy="21" r="1.4" fill={ink} stroke="none" />
            <path d="M18 30 q6 4.5 12 0" />
          </>
        )}
        {kind === "low" && (
          <>
            <circle cx="17" cy="22" r="1.4" fill={ink} stroke="none" />
            <circle cx="31" cy="22" r="1.4" fill={ink} stroke="none" />
            <path d="M18 33 q6 -4 12 0" />
          </>
        )}
        {kind === "hurt" && (
          <>
            <path d="M14 21.5 h6" />
            <path d="M28 21.5 h6" />
            <path d="M21 31.5 q3 2.5 6 0" />
            <g transform="rotate(-32 35 13)">
              <rect x="29.5" y="10" width="11" height="5.5" rx="2.4" fill="#f6ede0" stroke="#d9b982" strokeWidth="1.2" />
              <rect x="33" y="10" width="4" height="5.5" fill="#ecd9bb" stroke="none" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

// ── 成就徽章 — display-only milestones derived from real save data ───────────
function MedalTile({
  icon,
  label,
  date,
  earned,
}: {
  icon: IconName;
  label: string;
  date: string | null;
  earned: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 text-center", !earned && "opacity-45")}>
      <span
        className={cn(
          "grid h-[62px] w-[62px] place-items-center rounded-full border-2 p-[5px]",
          earned
            ? "border-[#cdab6e] bg-gradient-to-b from-[#fdf3da] to-[#f1d291] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.8),0_3px_0_rgba(150,112,60,0.18)]"
            : "border-dashed border-[#cdab6e]/60 bg-cream-soft",
        )}
      >
        <span className="ui-icon-well h-full w-full rounded-full">
          <Icon name={icon} className="h-7 w-7 drop-shadow-[0_2px_2px_rgba(126,83,38,0.16)]" />
        </span>
      </span>
      <p className="font-hand text-[13px] leading-none text-ink">{label}</p>
      <p className="text-[10px] leading-none tabular-nums text-ink-soft/70">
        {earned && date ? date : "还在路上"}
      </p>
    </div>
  );
}

export default function ProfileScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const postcards = useGameStore((s) => s.postcards);
  const battles = useGameStore((s) => s.battleRecords);
  const companionDays = useGameStore((s) => s.companionDays);
  const cardDex = useGameStore((s) => s.cardDex);
  const goTo = useGameStore((s) => s.goTo);
  const logout = useGameStore((s) => s.logout);
  const bound = useGameStore((s) => !!s.cloud);
  const email = useGameStore((s) => s.cloud?.email ?? null);

  const typeInfo = COMPANION_TYPES.find((t) => t.type === companion.type);
  const persInfo = PERSONALITIES.find((p) => p.value === companion.personality);
  const accInfo = ACCESSORIES.find((a) => a.value === companion.accessory);
  const colorName = PRIMARY_COLORS.find(
    (c) => c.hex.toLowerCase() === companion.primaryColor.toLowerCase(),
  )?.name;
  const stats = useMemo(() => companionStats(companionDays), [companionDays]);
  const mood = moodOf(capy);

  const adoptedAt = useMemo(() => fmtDate(companion.createdAt), [companion.createdAt]);
  const firstPostcardAt = useMemo(() => {
    if (postcards.length === 0) return null;
    const earliest = postcards.reduce((a, b) => (a.sentAt <= b.sentAt ? a : b));
    return fmtDate(earliest.sentAt);
  }, [postcards]);
  const firstBattleAt = useMemo(() => {
    if (battles.length === 0) return null;
    const earliest = battles.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    return fmtDate(earliest.createdAt);
  }, [battles]);

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-agent-ref.png"
        overlay="panel"
        imageClassName="object-[50%_46%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/88 via-cream-soft/45 to-transparent" />

      {/* fixed top bar — always visible */}
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢长大的样子"
        title={`${companion.name} 的成长`}
        right={<Icon name="handbook" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
        className="z-20 shrink-0 pb-1"
      />

      {/* journal cards scroll together; the footer below stays pinned */}
      <div className="no-scrollbar relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-2.5">
        {/* identity — round portrait + name + the one visible meter (陪伴 level) */}
        <Panel className="px-4 py-4">
          <div className="flex items-center gap-3.5">
            <span className="shrink-0 rounded-full border-2 border-[#e2c596] bg-paper p-0.5 shadow-[0_3px_0_rgba(143,101,54,0.14)]">
              <CapyAvatar variant="sticker" className="h-[74px] w-[74px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-hand text-[24px] leading-tight text-ink">
                {companion.name}
              </h1>
              {typeInfo && (
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {typeInfo.label}
                  {colorName ? ` · ${colorName}` : ""}
                  {adoptedAt ? ` · ${adoptedAt} 来到你身边` : ""}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="shrink-0 rounded-full bg-gradient-to-b from-[#f0c25c] to-[#e0973f] px-2.5 py-1 font-hand text-[13px] font-bold leading-none text-[#fffdf8] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_0_rgba(150,112,60,0.25)]">
                  Lv.{stats.level}
                </span>
                <span className="text-[11px] tabular-nums text-ink-soft">
                  陪伴 {stats.days} / {stats.days + stats.daysToNext} 天
                </span>
              </div>
              <ProgressBar value={stats.progress} animateIn className="mt-1.5" />
            </div>
          </div>
        </Panel>

        <Panel className="px-4 py-3" sketch={false}>
          <div className="flex items-start gap-3">
            <span className="ui-icon-well grid h-10 w-10 shrink-0 place-items-center rounded-full">
              <Icon name="handbook" className="h-6 w-6 drop-shadow-[0_2px_2px_rgba(126,83,38,0.14)]" />
            </span>
            <div className="min-w-0">
              <p className="font-hand text-[17px] leading-tight text-ink">
                这里只记你能看见的成长。
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                心情、印记、信件和切磋会慢慢留下来；具体数值还是交给 Agent 照看。
              </p>
            </div>
          </div>
        </Panel>

        {/* 今天心情 — qualitative only, the numbers stay the Agent's secret */}
        <Panel className="relative overflow-hidden px-4 py-3.5" sketch={false}>
          <SectionTitle>今天心情</SectionTitle>
          <div className="mt-2.5 flex items-center gap-3 pr-14">
            <MoodFace kind={mood.kind} className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <p className="font-hand text-[18px] leading-none text-ink">{mood.word}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{mood.line}</p>
            </div>
          </div>
          <Icon
            name="plant"
            className="pointer-events-none absolute bottom-2 right-3 h-12 w-12 drop-shadow-[0_3px_2px_rgba(126,83,38,0.14)]"
          />
        </Panel>

        {/* 成长记录 — three plain numbers with hairline dividers */}
        <Panel className="px-4 py-3.5" sketch={false}>
          <SectionTitle>成长记录</SectionTitle>
          <div className="mt-2.5 grid grid-cols-3 divide-x divide-[#e4c89c]/80">
            {[
              { value: postcards.length, label: "明信片" },
              { value: cardDex.length, label: "图鉴" },
              { value: battles.length, label: "切磋" },
            ].map((it) => (
              <div key={it.label} className="py-1 text-center">
                <p className="font-hand text-[22px] leading-none text-ink">{it.value}</p>
                <p className="mt-1.5 text-[11px] leading-none text-ink-soft">{it.label}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* 成长印记 — personality / accessory / earned traits */}
        <Panel className="px-4 py-3.5" sketch={false}>
          <SectionTitle>成长印记</SectionTitle>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {persInfo && <Chip>{persInfo.label}</Chip>}
            {accInfo && companion.accessory !== "none" && <Chip>{accInfo.label}</Chip>}
            {capy.traits.map((t) => (
              <Chip key={t} tone="leaf">
                {t}
              </Chip>
            ))}
          </div>
          {capy.traits.length === 0 && (
            <p className="mt-2 text-[11px] leading-snug text-ink-soft/75">
              难忘的日子会留下新的印记，慢慢来。
            </p>
          )}
        </Panel>

        {/* 成就徽章 — derived from the save itself, no separate system */}
        <Panel className="px-4 py-3.5" sketch={false}>
          <SectionTitle>成就徽章</SectionTitle>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MedalTile icon="home" label="来到岛上" date={adoptedAt} earned={adoptedAt != null} />
            <MedalTile icon="postmail" label="第一封信" date={firstPostcardAt} earned={firstPostcardAt != null} />
            <MedalTile icon="map" label="初次切磋" date={firstBattleAt} earned={firstBattleAt != null} />
          </div>
        </Panel>
      </div>

      <div
        className="game-bottom-panel relative z-10 shrink-0 space-y-2 px-5 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <PrimaryButton size="sm" onClick={() => goTo("home")}>回小屋</PrimaryButton>
        {bound && (
          <div className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-ink-soft/70">
            {email && <span className="truncate">{email}</span>}
            {email && <span aria-hidden>·</span>}
            <button
              onClick={() => logout()}
              className="ui-wood-press shrink-0 rounded-full border border-[#d9b982]/65 bg-paper/70 px-2.5 py-1 transition hover:text-accent"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
