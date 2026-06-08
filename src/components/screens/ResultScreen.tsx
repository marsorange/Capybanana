"use client";

import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { Panel, PrimaryButton } from "../ui/kit";

type KindTheme = { emoji: string; caption: string; glow: string; pedestal: string; accent: string };

// Per-outcome palette — a soft glow behind the pet + a matching accent. Kept
// pale so the page stays light. Loosely keyed (with a fallback below) so it
// survives any OutcomeKind tweak.
const KIND_THEME: Record<string, KindTheme> = {
  home: { emoji: "🏡", caption: "今天没出门，窝了一天", glow: "#ffe6b8", pedestal: "#f1e2c0", accent: "#e9a23b" },
  yard: { emoji: "🌿", caption: "在岛上四处晃了晃", glow: "#d8eebb", pedestal: "#dce8c6", accent: "#8aa978" },
  travel: { emoji: "✈️", caption: "我回来啦", glow: "#c5e7e3", pedestal: "#d3e7e2", accent: "#6fa8c9" },
  rest: { emoji: "😴", caption: "好好睡了一天", glow: "#e7d8f1", pedestal: "#e7dcef", accent: "#b59ed0" },
  battle: { emoji: "⚔️", caption: "切磋了一场", glow: "#f4d9d8", pedestal: "#eed7d6", accent: "#d95f59" },
};

function Pedestal({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

export default function ResultScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const result = useGameStore((s) => s.lastResult);
  const goTo = useGameStore((s) => s.goTo);

  if (!result) {
    return (
      <div className="screen-bg flex h-full flex-col items-center justify-center gap-4 px-6">
        <PrimaryButton className="w-auto px-8" onClick={() => goTo("home")}>
          回小屋
        </PrimaryButton>
      </div>
    );
  }

  const theme = KIND_THEME[result.kind] ?? KIND_THEME.home;

  return (
    <div className="screen-bg relative flex h-full flex-col">
      {/* hero: the real pet, in 3D, slowly spinning on a little pedestal */}
      <div className="relative h-[40%] shrink-0 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 55% at 50% 60%, ${theme.glow} 0%, transparent 70%)` }}
        />
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

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute inset-x-5 top-5 z-10"
        >
          <Panel className="px-4 py-3 text-center">
            <p className="text-sm text-ink-soft">{theme.caption}</p>
            <h1 className="mt-1 font-hand text-2xl leading-tight text-ink">{result.title}</h1>
          </Panel>
        </motion.div>
      </div>

      <div className="relative flex flex-1 flex-col">
        {/* emoji medallion straddling the seam */}
        <motion.div
          initial={{ scale: 0, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="sketch z-10 mx-auto -mt-7 grid h-14 w-14 place-items-center rounded-full border-2 border-[#bd8a52]/55 bg-paper text-3xl shadow-[0_3px_0_rgba(111,84,55,0.18)]"
        >
          {theme.emoji}
        </motion.div>

        <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-6 pb-4 pt-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Panel className="px-5 py-4">
              <p className="mb-1.5 text-[11px] font-medium" style={{ color: theme.accent }}>
                跟你说说今天
              </p>
              <p className="text-[15px] leading-relaxed text-ink">{result.story}</p>
            </Panel>
          </motion.div>

          {result.souvenir && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <Panel sketch={false} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-ink-soft">
                <span className="text-lg">🎁</span>
                <span>
                  我带回了 <b className="text-ink">{result.souvenir}</b>
                </span>
              </Panel>
            </motion.div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-6 pt-3">
          <PrimaryButton onClick={() => goTo("home")}>收好，回小屋</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
