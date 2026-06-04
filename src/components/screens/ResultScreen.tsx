"use client";

import { motion } from "framer-motion";

import type { DayOutcome, OutcomeKind } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";

// Per-outcome palette so the result page feels like "that kind of day": a soft
// gradient sky, a warm glow behind the pet, and a matching accent.
const KIND_THEME: Record<
  OutcomeKind,
  {
    emoji: string;
    caption: string;
    from: string;
    to: string;
    glow: string;
    pedestal: string;
    accent: string;
  }
> = {
  home: {
    emoji: "🏡",
    caption: "在家窝了一天",
    from: "#fff7ec",
    to: "#f3e3c4",
    glow: "#ffe6b8",
    pedestal: "#f1e2c0",
    accent: "#E9A23B",
  },
  yard: {
    emoji: "🌿",
    caption: "在院子里晃悠",
    from: "#f3f8ec",
    to: "#dcebcc",
    glow: "#d2ecb6",
    pedestal: "#dce8c6",
    accent: "#8AA978",
  },
  travel: {
    emoji: "✈️",
    caption: "出远门回来啦",
    from: "#ecf5f7",
    to: "#cfe6e6",
    glow: "#bfe6e2",
    pedestal: "#d3e7e2",
    accent: "#6FA8C9",
  },
  rest: {
    emoji: "😴",
    caption: "好好休息的一天",
    from: "#f5f1f8",
    to: "#e4d8ee",
    glow: "#e6d4f2",
    pedestal: "#e7dcef",
    accent: "#C9B6D6",
  },
  secret: {
    emoji: "🌙",
    caption: "藏着一个小秘密",
    from: "#eef0f8",
    to: "#d9dbef",
    glow: "#d6d8f4",
    pedestal: "#dedfee",
    accent: "#8E86C9",
  },
};

const EFFECT_META: Record<string, { label: string; emoji: string }> = {
  mood: { label: "心情", emoji: "💛" },
  energy: { label: "体力", emoji: "⚡" },
  courage: { label: "勇气", emoji: "⛰️" },
  injury: { label: "伤痛", emoji: "🩹" },
};

function Pedestal({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function EffectChips({ effects }: { effects: DayOutcome["effects"] }) {
  const entries = Object.entries(effects).filter(([, v]) => v && v !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {entries.map(([k, v], i) => {
        const value = v as number;
        const up = value > 0;
        // For everything but 伤痛, "up" is good news.
        const good = k === "injury" ? !up : up;
        const meta = EFFECT_META[k] ?? { label: k, emoji: "✨" };
        return (
          <motion.span
            key={k}
            initial={{ scale: 0, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 18,
              delay: 0.35 + i * 0.05,
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm shadow-[0_2px_0_rgba(58,46,42,0.08)] ${
              good
                ? "border-leaf/45 bg-leaf/12 text-ink"
                : "border-accent/45 bg-accent/10 text-ink"
            }`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
            <span className="font-bold tabular-nums">
              {up ? "▲" : "▼"}
              {Math.abs(value)}
            </span>
          </motion.span>
        );
      })}
    </div>
  );
}

export default function ResultScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const result = useGameStore((s) => s.lastResult);
  const goTo = useGameStore((s) => s.goTo);

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Button onClick={() => goTo("home")}>回家</Button>
      </div>
    );
  }

  const theme = KIND_THEME[result.kind] ?? KIND_THEME.home;

  return (
    <div className="game-bg flex h-full flex-col">
      {/* hero: the real pet, in 3D, slowly spinning on a little pedestal */}
      <div className="relative h-[42%] shrink-0 overflow-hidden">
        <SceneCanvas controls="spin">
          <group position={[0, -0.56, 0]} scale={0.84}>
            <Pedestal color={theme.pedestal} />
            <CharacterModel
              type={companion.type}
              color={companion.primaryColor}
              accessory={companion.accessory}
              seed={companion.id}
            />
          </group>
        </SceneCanvas>

        {/* caption + title */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute inset-x-5 top-5 z-10 text-center"
        >
          <div className="game-card px-4 py-3">
          <p className="text-sm text-ink-soft">{theme.caption}</p>
          <h1 className="mt-1 font-hand text-2xl leading-tight text-ink">
            {result.title}
          </h1>
          </div>
        </motion.div>
      </div>

      <div className="relative flex flex-1 flex-col">
        {/* emoji medallion straddling the seam */}
        <motion.div
          initial={{ scale: 0, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="z-10 mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-cream bg-paper text-3xl"
          style={{ boxShadow: `0 4px 0 ${theme.accent}33` }}
        >
          {theme.emoji}
        </motion.div>

        <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-6 pb-4 pt-3">
          {/* the story of the day */}
          <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
            className="game-card px-5 py-4"
          >
            <p
              className="mb-1.5 text-[11px] font-medium"
              style={{ color: theme.accent }}
            >
              今天留下了什么
            </p>
            <p className="text-[15px] leading-relaxed text-ink">
              {result.story}
            </p>
          </motion.div>

          {result.misunderstanding && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="rounded-[18px] border-2 border-dashed border-ink/20 bg-cream-soft px-4 py-3 text-center"
            >
              <p className="mb-1 text-xs font-medium text-accent">
                误解词典 +1
              </p>
              <p className="text-sm text-ink-soft">{result.misunderstanding}</p>
            </motion.div>
          )}

          {result.souvenir && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="game-card flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-ink-soft"
            >
              <span className="text-lg">🎁</span>
              <span>
                它带回了 <b className="text-ink">{result.souvenir}</b>
              </span>
            </motion.div>
          )}

          <EffectChips effects={result.effects} />
        </div>

        <div className="game-bottom-panel shrink-0 px-5 pb-6 pt-4">
          <Button size="lg" className="w-full" onClick={() => goTo("home")}>
            收好，回小屋
          </Button>
        </div>
      </div>
    </div>
  );
}
