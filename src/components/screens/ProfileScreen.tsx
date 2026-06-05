"use client";

import { motion } from "framer-motion";
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
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { BackButton, Panel, PrimaryButton } from "../ui/kit";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

const STATS: {
  key: keyof Pick<CapyState, "mood" | "energy" | "courage" | "curiosity" | "injury">;
  label: string;
  color: string;
}[] = [
  { key: "mood", label: "心情", color: "#e9a23b" },
  { key: "energy", label: "体力", color: "#8aa978" },
  { key: "courage", label: "勇气", color: "#d95f59" },
  { key: "curiosity", label: "好奇心", color: "#6fa8c9" },
];

function StatBar({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 whitespace-nowrap text-[13px] text-ink-soft">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-[#bd8a52]/25 bg-cream-deep">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-[13px] tabular-nums text-ink">{value}</span>
    </div>
  );
}

function RecordTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[#bd8a52]/30 bg-cream-soft px-2 py-2.5 text-center">
      <p className="font-hand text-xl leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}

export default function ProfileScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const postcards = useGameStore((s) => s.postcards);
  const souvenirs = useGameStore((s) => s.souvenirs);
  const goTo = useGameStore((s) => s.goTo);
  const restyle = useGameStore((s) => s.restyle);
  const logout = useGameStore((s) => s.logout);
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const bound = useGameStore((s) => !!s.cloud);
  const email = useGameStore((s) => s.cloud?.email ?? null);

  const typeInfo = COMPANION_TYPES.find((t) => t.type === companion.type);
  const persInfo = PERSONALITIES.find((p) => p.value === companion.personality);
  const accInfo = ACCESSORIES.find((a) => a.value === companion.accessory);
  const colorName = PRIMARY_COLORS.find(
    (c) => c.hex.toLowerCase() === companion.primaryColor.toLowerCase(),
  )?.name;
  const stats = useMemo(() => companionStats(companion.createdAt), [companion.createdAt]);

  const adoptedAt = useMemo(() => {
    const d = new Date(companion.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }, [companion.createdAt]);

  return (
    <div className="screen-bg relative flex h-full flex-col">
      {/* spinning portrait of the actual pet */}
      <div className="relative h-[34%] shrink-0 overflow-hidden">
        <SceneCanvas controls="spin">
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
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-5 pt-5">
          <BackButton onClick={() => goTo("home")} />
          <p className="font-hand text-lg text-ink-soft">岛屿伙伴手账</p>
        </div>
      </div>

      <div className="no-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        {/* name plaque + level/陪伴 progress */}
        <Panel className="-mt-8 px-4 py-3.5">
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
            <div className="h-3 overflow-hidden rounded-full border border-[#bd8a52]/30 bg-cream-deep">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#f0c25c] to-[#e0973f]"
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </Panel>

        {/* records */}
        <div className="grid grid-cols-3 gap-2.5">
          <RecordTile value={postcards.length} label="明信片" />
          <RecordTile value={souvenirs.length} label="手信" />
          <RecordTile value={capy.memories.length} label="记忆" />
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

        {/* stats */}
        <Panel className="px-4 py-4" sketch={false}>
          <p className="font-hand text-lg text-ink">今天的岛上天气</p>
          <p className="mb-3 mt-1 text-[12px] leading-relaxed text-ink-soft">
            Agent 做决定前会先看这些。体力太低或伤痛太高时，它更适合留在岛上。
          </p>
          <div className="space-y-2.5">
            {STATS.map((s, i) => (
              <StatBar key={s.key} label={s.label} value={capy[s.key]} color={s.color} delay={0.08 * i} />
            ))}
            {capy.injury > 0 && (
              <StatBar label="伤痛" value={capy.injury} color="#b04a44" delay={0.08 * STATS.length} />
            )}
          </div>
        </Panel>

        {typeInfo?.blurb && (
          <p className="px-1 text-center text-[12px] leading-relaxed text-ink-soft/85">
            {typeInfo.blurb}
            {adoptedAt ? ` · 于 ${adoptedAt} 来到你身边` : ""}
          </p>
        )}
      </div>

      <div className="relative z-10 shrink-0 space-y-2.5 px-5 pb-5 pt-3">
        {bound && (
          <button
            disabled={cloudBusy}
            onClick={() => restyle()}
            className="sketch w-full rounded-[18px] border-2 border-[#bd8a52]/55 bg-cream-soft px-6 py-3 font-hand text-base text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.16)] transition active:translate-y-0.5 disabled:opacity-50"
          >
            {cloudBusy ? "换样子中…" : "🎲 换个样子"}
          </button>
        )}
        <PrimaryButton onClick={() => goTo("home")}>回小屋</PrimaryButton>
        {bound && (
          <div className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-ink-soft/70">
            {email && <span className="truncate">{email}</span>}
            {email && <span aria-hidden>·</span>}
            <button onClick={() => logout()} className="shrink-0 underline underline-offset-4 transition hover:text-accent">
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children, tone = "warm" }: { children: React.ReactNode; tone?: "warm" | "leaf" }) {
  return (
    <span
      className={`rounded-full border-2 px-3 py-1 text-[13px] text-ink ${
        tone === "leaf" ? "border-leaf/35 bg-leaf/12" : "border-[#bd8a52]/35 bg-cream-soft"
      }`}
    >
      {children}
    </span>
  );
}
