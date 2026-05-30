"use client";

import { useState } from "react";

import { ACCESSORIES, PERSONALITY_LABELS, TYPE_LABELS } from "@/game/labels";
import { randomCompanion, type CompanionDraft } from "@/game/randomCompanion";
import { useGameStore } from "@/state/gameStore";
import Companion3D from "../scenes3d/Companion3D";
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

export default function CreateScreen() {
  const createCompanion = useGameStore((s) => s.createCompanion);
  const busy = useGameStore((s) => s.cloudBusy);
  const error = useGameStore((s) => s.cloudError);

  const [draft, setDraft] = useState<CompanionDraft>(() => randomCompanion());
  const [name, setName] = useState(draft.name);

  const reroll = () => {
    const next = randomCompanion();
    setDraft(next);
    setName(next.name);
  };

  const accLabel =
    ACCESSORIES.find((a) => a.value === draft.accessory)?.label ?? "";

  return (
    <div className="flex h-full flex-col">
      {/* live preview of the rolled companion */}
      <div className="relative h-[46%] shrink-0 overflow-hidden bg-gradient-to-b from-cream-soft to-cream-deep">
        <SceneCanvas controls="spin">
          <Pedestal />
          <Companion3D
            type={draft.type}
            color={draft.primaryColor}
            accessory={draft.accessory}
          />
        </SceneCanvas>
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5">
          <h1 className="font-hand text-2xl text-ink">你抽到的旅行伙伴</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            每只都是随机生成的，不喜欢就换一只。
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="rounded-sticker border-2 border-ink/10 bg-cream-soft px-4 py-3 text-center">
          <p className="text-sm text-ink-soft">
            {TYPE_LABELS[draft.type]} · {PERSONALITY_LABELS[draft.personality]}
            {draft.accessory !== "none" ? ` · 戴着${accLabel}` : ""}
          </p>
        </div>

        <section>
          <label className="mb-1.5 block font-hand text-lg text-ink">
            给它起个名字
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            placeholder="名字…"
            className="w-full rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
          />
        </section>

        <button
          onClick={reroll}
          disabled={busy}
          className="w-full rounded-sticker border-2 border-dashed border-ink/25 bg-cream-soft py-3 text-ink-soft transition hover:border-ink/40 disabled:opacity-50"
        >
          🎲 换一只
        </button>

        {error && <p className="text-center text-sm text-accent">{error}</p>}
      </div>

      <div className="shrink-0 border-t-2 border-ink/8 bg-cream/80 px-5 py-4 backdrop-blur">
        <Button
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() => createCompanion({ ...draft, name })}
        >
          {busy ? "正在领养…" : "就它了 →"}
        </Button>
      </div>
    </div>
  );
}
