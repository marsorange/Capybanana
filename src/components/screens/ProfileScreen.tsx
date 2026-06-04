"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

import {
  ACCESSORIES,
  COMPANION_TYPES,
  PERSONALITIES,
  PRIMARY_COLORS,
} from "@/game/labels";
import type { CapyState } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

const STATS: {
  key: keyof Pick<CapyState, "mood" | "energy" | "courage">;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { key: "mood", label: "心情", emoji: "💛", color: "#E9A23B" },
  { key: "energy", label: "体力", emoji: "⚡", color: "#8AA978" },
  { key: "courage", label: "勇气", emoji: "⛰️", color: "#D95F59" },
];

function StatBar({
  emoji,
  label,
  value,
  color,
  delay,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm text-ink-soft">
        {emoji} {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      <span className="w-7 shrink-0 text-right text-sm tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

export default function ProfileScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const goTo = useGameStore((s) => s.goTo);
  const restyle = useGameStore((s) => s.restyle);
  const logout = useGameStore((s) => s.logout);
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const bound = useGameStore((s) => !!s.cloud);
  const email = useGameStore((s) => s.cloud?.email ?? null);

  const typeInfo = COMPANION_TYPES.find((t) => t.type === companion.type);
  const persInfo = PERSONALITIES.find(
    (p) => p.value === companion.personality,
  );
  const accInfo = ACCESSORIES.find((a) => a.value === companion.accessory);
  const colorName = PRIMARY_COLORS.find(
    (c) => c.hex.toLowerCase() === companion.primaryColor.toLowerCase(),
  )?.name;

  const adoptedAt = useMemo(() => {
    const d = new Date(companion.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }, [companion.createdAt]);

  return (
    <div className="game-bg flex h-full flex-col">
      {/* spinning portrait of the actual pet */}
      <div className="relative h-[40%] shrink-0 overflow-hidden">
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
        <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-3 px-5 pt-5">
          <button
            onClick={() => goTo("home")}
            className="game-icon-tile flex h-14 w-14 items-center justify-center text-2xl text-ink-soft"
          >
            ←
          </button>
          <div className="game-card min-w-0 flex-1 px-4 py-3">
            <p className="text-sm text-ink-soft">小伙伴手账</p>
            <h1 className="truncate font-hand text-3xl leading-tight text-ink">
              {companion.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {/* identity chips */}
        <div className="flex flex-wrap gap-2">
          {typeInfo && (
            <span className="rounded-full border-2 border-ink/10 bg-cream-soft px-3 py-1 text-sm text-ink">
              {typeInfo.emoji} {typeInfo.label}
            </span>
          )}
          {persInfo && (
            <span className="rounded-full border-2 border-ink/10 bg-cream-soft px-3 py-1 text-sm text-ink">
              {persInfo.emoji} {persInfo.label}
            </span>
          )}
          {accInfo && companion.accessory !== "none" && (
            <span className="rounded-full border-2 border-ink/10 bg-cream-soft px-3 py-1 text-sm text-ink">
              {accInfo.emoji} {accInfo.label}
            </span>
          )}
          {colorName && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-cream-soft px-3 py-1 text-sm text-ink">
              <span
                className="h-3 w-3 rounded-full border border-ink/15"
                style={{ backgroundColor: companion.primaryColor }}
              />
              {colorName}
            </span>
          )}
        </div>

        {/* personality blurb */}
        {(typeInfo || persInfo) && (
          <p className="game-card px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
            {typeInfo?.blurb}
            {typeInfo && persInfo ? "，" : ""}
            {persInfo?.desc}。
          </p>
        )}

        {/* stats */}
        <section className="game-card px-4 py-4">
          <p className="mb-3 font-hand text-lg text-ink">今天的状态</p>
          <div className="space-y-2.5">
            {STATS.map((s, i) => (
              <StatBar
                key={s.key}
                emoji={s.emoji}
                label={s.label}
                value={capy[s.key]}
                color={s.color}
                delay={0.08 * i}
              />
            ))}
            {capy.injury > 0 && (
              <StatBar
                emoji="🩹"
                label="伤痛"
                value={capy.injury}
                color="#b04a44"
                delay={0.08 * STATS.length}
              />
            )}
          </div>
        </section>

        {/* learned traits */}
        {capy.traits.length > 0 && (
          <section className="game-card px-4 py-4">
            <p className="mb-2 font-hand text-lg text-ink">记住的小性格</p>
            <div className="flex flex-wrap gap-2">
              {capy.traits.map((t) => (
                <span
                  key={t}
                  className="rounded-full border-2 border-leaf/30 bg-leaf/10 px-3 py-1 text-sm text-ink"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {adoptedAt && (
          <p className="text-center text-xs text-ink-soft/70">
            于 {adoptedAt} 来到你身边
          </p>
        )}
      </div>

      <div className="game-bottom-panel shrink-0 space-y-2.5 px-5 py-4">
        {bound && (
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            disabled={cloudBusy}
            onClick={() => restyle()}
          >
            {cloudBusy ? "换衣服中..." : "换个样子"}
          </Button>
        )}
        <Button size="lg" className="w-full" onClick={() => goTo("home")}>
          回小屋
        </Button>
        {bound && (
          <div className="flex items-center justify-center gap-2 pt-0.5 text-xs text-ink-soft/70">
            {email && <span className="truncate">{email}</span>}
            {email && <span aria-hidden>·</span>}
            <button
              onClick={() => logout()}
              className="shrink-0 underline underline-offset-4 transition hover:text-accent"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
