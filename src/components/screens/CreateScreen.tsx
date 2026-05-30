"use client";

import { useState } from "react";

import {
  ACCESSORIES,
  COMPANION_TYPES,
  PERSONALITIES,
  PRIMARY_COLORS,
} from "@/game/labels";
import type {
  Accessory,
  CompanionType,
  Personality,
} from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Companion3D from "../scenes3d/Companion3D";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";
import { cn } from "../ui/cn";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sticker border-2 px-3 py-2 text-sm transition",
        active
          ? "border-ink bg-accent text-paper shadow-[0_2px_0_rgba(58,46,42,0.2)]"
          : "border-ink/12 bg-cream-soft text-ink hover:border-ink/30",
      )}
    >
      {children}
    </button>
  );
}

export default function CreateScreen() {
  const createCompanion = useGameStore((s) => s.createCompanion);

  const [name, setName] = useState("");
  const [type, setType] = useState<CompanionType>("animal");
  const [color, setColor] = useState(PRIMARY_COLORS[0].hex);
  const [personality, setPersonality] = useState<Personality>("gentle");
  const [accessory, setAccessory] = useState<Accessory>("none");

  const canCreate = name.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* live preview */}
      <div className="relative h-[40%] shrink-0 overflow-hidden bg-gradient-to-b from-cream-soft to-cream-deep">
        <SceneCanvas controls="spin">
          <Pedestal />
          <Companion3D type={type} color={color} accessory={accessory} />
        </SceneCanvas>
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5">
          <h1 className="font-hand text-2xl text-ink">捏一个旅行伙伴</h1>
          <p className="mt-0.5 text-sm text-ink-soft">它会住进你的小屋，替你出门旅行。</p>
        </div>
      </div>

      {/* form */}
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section>
          <label className="mb-1.5 block font-hand text-lg text-ink">名字</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            placeholder="给它取个名字…"
            className="w-full rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
          />
        </section>

        <section>
          <label className="mb-2 block font-hand text-lg text-ink">是什么</label>
          <div className="grid grid-cols-3 gap-2">
            {COMPANION_TYPES.map((t) => (
              <Chip key={t.type} active={type === t.type} onClick={() => setType(t.type)}>
                <span className="mr-1">{t.emoji}</span>
                {t.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block font-hand text-lg text-ink">主色</label>
          <div className="flex flex-wrap gap-2.5">
            {PRIMARY_COLORS.map((c) => (
              <button
                key={c.hex}
                aria-label={c.name}
                onClick={() => setColor(c.hex)}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition",
                  color === c.hex
                    ? "scale-110 border-ink shadow-[0_2px_0_rgba(58,46,42,0.25)]"
                    : "border-ink/15",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block font-hand text-lg text-ink">性格</label>
          <div className="grid grid-cols-3 gap-2">
            {PERSONALITIES.map((p) => (
              <Chip
                key={p.value}
                active={personality === p.value}
                onClick={() => setPersonality(p.value)}
              >
                <span className="mr-1">{p.emoji}</span>
                {p.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block font-hand text-lg text-ink">小配件</label>
          <div className="grid grid-cols-3 gap-2">
            {ACCESSORIES.map((a) => (
              <Chip
                key={a.value}
                active={accessory === a.value}
                onClick={() => setAccessory(a.value)}
              >
                <span className="mr-1">{a.emoji}</span>
                {a.label}
              </Chip>
            ))}
          </div>
        </section>
      </div>

      {/* action */}
      <div className="shrink-0 border-t-2 border-ink/8 bg-cream/80 px-5 py-4 backdrop-blur">
        <Button
          size="lg"
          className="w-full"
          disabled={!canCreate}
          onClick={() =>
            createCompanion({ name, type, primaryColor: color, personality, accessory })
          }
        >
          {canCreate ? "就让它住进来 →" : "先给它起个名字吧"}
        </Button>
      </div>
    </div>
  );
}
