"use client";

// Local-only preview for iterating on the protagonist 3D model without going
// through Google login. Open http://localhost:3000/dev/character — drag to
// orbit, and use the controls to flip through species / color / accessory.
// Not linked anywhere in the product; it just renders CharacterModel directly.

import { useState } from "react";

import { CHARACTERS } from "@/game/characters";
import { ACCESSORIES, COMPANION_TYPES } from "@/game/labels";
import type { Accessory, CompanionType } from "@/game/types";
import CharacterModel from "@/components/scenes3d/character/CharacterModel";
import SceneCanvas from "@/components/scenes3d/SceneCanvas";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.95, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

const PRESET_COLORS = [
  "#c8893b", // capybara orange
  "#e0a256", // shiba
  "#f1ebe2", // bunny cream
  "#8c8a90", // raccoon grey
  "#a05a3c", // cocoa
  "#7fae8f", // mint
  "#9a86c4", // lilac
  "#3a2e2a", // ink
];

export default function CharacterPreviewPage() {
  const [type, setType] = useState<CompanionType>("capybara");
  const [accessory, setAccessory] = useState<Accessory>("scarf");
  const [color, setColor] = useState("#c8893b");
  const [spin, setSpin] = useState(true);
  // Bump to force a fresh entrance animation / re-roll of seeded features.
  const [seedN, setSeedN] = useState(0);

  const seed = `dev|${type}|${color}|${accessory}|${seedN}`;

  return (
    <div className="flex h-dvh w-full flex-col bg-cream text-ink">
      <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-cream-soft to-cream-deep">
        <SceneCanvas controls={spin ? "spin" : "orbit"} enableZoom>
          <Pedestal />
          <CharacterModel
            key={seed}
            type={type}
            color={color}
            accessory={accessory}
            seed={seed}
          />
        </SceneCanvas>
        <div className="pointer-events-none absolute left-4 top-4 text-xs text-ink-soft">
          <p className="font-hand text-lg text-ink">角色预览 · dev</p>
          <p>拖动旋转 · 双指/滚轮缩放</p>
        </div>
      </div>

      <div className="no-scrollbar max-h-[52%] shrink-0 space-y-4 overflow-y-auto border-t-2 border-ink/10 bg-cream/90 px-4 py-4 backdrop-blur">
        <Row label="物种">
          {COMPANION_TYPES.map((t) => {
            const def = CHARACTERS.find((c) => c.species === t.type);
            return (
              <Chip
                key={t.type}
                active={type === t.type}
                onClick={() => {
                  setType(t.type);
                  if (def) {
                    setColor(def.defaultColor);
                    setAccessory(def.accessory);
                  }
                }}
              >
                {t.emoji} {t.label}
              </Chip>
            );
          })}
        </Row>

        <Row label="配饰">
          {ACCESSORIES.map((a) => (
            <Chip
              key={a.value}
              active={accessory === a.value}
              onClick={() => setAccessory(a.value)}
            >
              {a.emoji} {a.label}
            </Chip>
          ))}
        </Row>

        <Row label="颜色">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-8 w-8 rounded-full border-2 ${
                color.toLowerCase() === c ? "border-accent" : "border-ink/15"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-2 border-ink/15 bg-transparent"
          />
        </Row>

        <div className="flex flex-wrap gap-2">
          <Chip active={spin} onClick={() => setSpin((s) => !s)}>
            {spin ? "⏸ 停止自转" : "▶ 自动旋转"}
          </Chip>
          <Chip active={false} onClick={() => setSeedN((n) => n + 1)}>
            🎲 重掷特征 / 重播入场
          </Chip>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-soft">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
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
      className={`rounded-full border-2 px-3 py-1 text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-ink"
          : "border-ink/15 bg-cream-soft text-ink-soft hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  );
}
