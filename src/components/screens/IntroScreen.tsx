"use client";

import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { Panel, PrimaryButton } from "../ui/kit";

const STEPS = [
  { label: "看小岛", text: "先看它今天累不累。" },
  { label: "给线索", text: "拍物品，留一句话。" },
  { label: "等来信", text: "出门或休息，由 Agent 判断。" },
];

function FloatingIsland() {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, 0, 0]} scale={[1.45, 0.22, 1.05]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#87b76a" />
      </mesh>
      <mesh position={[0, -0.28, 0]} scale={[1.15, 0.6, 0.82]}>
        <coneGeometry args={[1, 1.15, 7]} />
        <meshLambertMaterial color="#bd8750" />
      </mesh>
      <mesh position={[0.46, 0.28, -0.1]} scale={[0.72, 0.72, 0.72]}>
        <boxGeometry args={[0.5, 0.42, 0.48]} />
        <meshLambertMaterial color="#fff3d8" />
      </mesh>
      <mesh position={[0.46, 0.58, -0.1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.48, 0.42, 4]} />
        <meshLambertMaterial color="#d95f59" />
      </mesh>
    </group>
  );
}

export default function IntroScreen() {
  const companion = useGameStore((s) => s.companion);
  const completeIntro = useGameStore((s) => s.completeIntro);
  const connectUrl = useGameStore((s) => s.connectUrl);

  const name = companion?.name ?? "它";

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden px-5 pb-5 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 text-center"
      >
        <p className="text-xs font-semibold text-accent">欢迎来到慢岛群</p>
        <h1 className="mt-1 font-hand text-[2rem] leading-none text-ink">这里住着 {name}</h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[13px] leading-relaxed text-ink-soft">
          你越忙，岛上的风越重。每天一分钟，确认它和你都还好吗。
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.12 }}
        className="sketch tex-grain relative z-10 mt-4 h-[34vh] min-h-[240px] overflow-hidden rounded-[28px] border-2 border-[#bd8a52]/50 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_5px_0_rgba(111,84,55,0.16)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(197,228,210,0.6), rgba(255,246,226,0.5)), #fffaf0",
        }}
      >
        <SceneCanvas controls="spin" cameraPosition={[0, 1.45, 4]} target={[0, 0.1, 0]}>
          <FloatingIsland />
          {companion && (
            <group position={[-0.5, -0.08, 0.36]} scale={0.48}>
              <CharacterModel
                type={companion.type}
                color={companion.primaryColor}
                accessory={companion.accessory}
                seed={companion.id}
              />
            </group>
          )}
        </SceneCanvas>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
          <span className="storybook-ribbon px-3 py-1 text-xs font-semibold">慢慢生活，慢慢长大</span>
        </div>
      </motion.div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.05 }}
          >
            <Panel sketch={false} className="px-2.5 py-3 text-center">
              <p className="font-hand text-lg leading-tight text-ink">{step.label}</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-soft">{step.text}</p>
            </Panel>
          </motion.div>
        ))}
      </div>

      <Panel sketch={false} className="relative z-10 mt-4 px-4 py-3">
        <p className="text-center text-sm leading-relaxed text-ink-soft">
          这不是每日任务表。你只给一点线索，剩下的让 Agent 替它判断。
        </p>
      </Panel>

      <div className="relative z-10 mt-auto space-y-2.5 pt-4">
        <PrimaryButton onClick={() => completeIntro("home")}>去小岛看看</PrimaryButton>
        {connectUrl && (
          <button
            onClick={() => completeIntro("connect")}
            className="sketch w-full rounded-[20px] border-2 border-[#bd8a52]/55 bg-cream-soft px-6 py-3 font-hand text-base text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.16)] transition active:translate-y-0.5"
          >
            先接入 Agent
          </button>
        )}
      </div>
    </div>
  );
}
