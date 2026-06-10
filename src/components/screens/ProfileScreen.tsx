"use client";

import { useMemo } from "react";

import {
  ACCESSORIES,
  COMPANION_TYPES,
  PERSONALITIES,
  PRIMARY_COLORS,
} from "@/game/labels";
import { companionStats } from "@/game/companionLevel";
import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { Chip, Panel, PrimaryButton, ProgressBar, ScreenHeader } from "../ui/kit";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

function RecordTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="ui-wood-surface rounded-[18px] px-2 py-2.5 text-center">
      <p className="font-hand text-xl leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}

export default function ProfileScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const postcards = useGameStore((s) => s.postcards);
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

  const adoptedAt = useMemo(() => {
    const d = new Date(companion.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }, [companion.createdAt]);

  return (
    <div className="screen-bg relative flex h-full flex-col">
      {/* fixed top bar — always visible */}
      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="慢慢长大的样子"
        title="我和你的手账"
        className="z-20 shrink-0 pb-1"
      />

      {/* portrait + every card scroll together so nothing is hard-cut at the
          fold; the footer below stays pinned. */}
      <div className="no-scrollbar relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
        <div className="relative -mx-5 h-[180px] shrink-0">
          <SceneCanvas controls="spin" postfx postfxTilt={false}>
            <group position={[0, -0.58, 0]} scale={0.84}>
              <Pedestal />
              <CharacterModel
                type={companion.type}
                color={companion.primaryColor}
                accessory={companion.accessory}
                seed={companion.id}
              />
            </group>
          </SceneCanvas>
        </div>

        {/* name plaque + level/陪伴 progress */}
        <Panel className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate font-hand text-[26px] leading-tight text-ink">
                {companion.name}
              </h1>
              {typeInfo && (
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {typeInfo.label}
                  {colorName ? ` · ${colorName}` : ""}
                </p>
              )}
            </div>
            <span className="sketch tex-wood shrink-0 rounded-full border-2 border-[#cdab6e] px-3 py-1 font-hand text-sm wood-text">
              Lv.{stats.level}
            </span>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-ink-soft">
              <span>陪伴 {stats.days} 天</span>
              <span>距下一级还有 {stats.daysToNext} 天</span>
            </div>
            <ProgressBar value={stats.progress} animateIn />
          </div>
        </Panel>

        {/* records */}
        <div className="grid grid-cols-2 gap-2.5">
          <RecordTile value={postcards.length} label="明信片" />
          <RecordTile value={cardDex.length} label="图鉴" />
        </div>

        {/* identity chips */}
        <div className="flex flex-wrap gap-2">
          {persInfo && <Chip>{persInfo.label}</Chip>}
          {accInfo && companion.accessory !== "none" && <Chip>{accInfo.label}</Chip>}
          {capy.traits.map((t) => (
            <Chip key={t} tone="leaf">
              {t}
            </Chip>
          ))}
        </div>

        {/* The pet's five core stats are intentionally hidden from the owner —
            only 陪伴时长 (above) is shown. The Agent reads the stats over the API
            to decide the day; here we keep a soft, number-free note. */}
        <Panel className="px-4 py-4" sketch={false}>
          <p className="font-hand text-lg text-ink">我的小心思</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            今天好不好，我会悄悄告诉岛外向导。你每天来陪我一下，就够啦。
          </p>
        </Panel>

        {typeInfo?.blurb && (
          <p className="px-1 text-center text-[12px] leading-relaxed text-ink-soft/85">
            {typeInfo.blurb}
            {adoptedAt ? ` · 于 ${adoptedAt} 来到你身边` : ""}
          </p>
        )}
      </div>

      <div className="relative z-10 shrink-0 space-y-2.5 px-5 pb-5 pt-3">
        <PrimaryButton onClick={() => goTo("home")}>回小屋</PrimaryButton>
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
