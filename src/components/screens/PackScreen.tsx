"use client";

import { useState } from "react";

import { MAX_LUGGAGE } from "@/game/labels";
import type { PackedItem } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Backpack from "../scenes3d/Backpack";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";
import CameraCapture from "../ui/CameraCapture";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.0, 40]} />
      <meshLambertMaterial color="#f1e2c8" />
    </mesh>
  );
}

export default function PackScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const existing = useGameStore((s) => s.packedBag);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  const [items, setItems] = useState<PackedItem[]>(existing?.items ?? []);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);

  const full = items.length >= MAX_LUGGAGE;

  const addItem = (item: PackedItem) =>
    setItems((prev) => (prev.length >= MAX_LUGGAGE ? prev : [...prev, item]));
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="relative flex h-full flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
          aria-label="返回"
        >
          ←
        </button>
        <span className="font-hand text-xl text-ink">帮 {companion.name} 装行李</span>
        <span className="text-sm text-ink-soft">{items.length}/{MAX_LUGGAGE}</span>
      </div>

      {/* 3D bag */}
      <div className="relative flex-1">
        <SceneCanvas controls="spin">
          <Pedestal />
          <group scale={1.7} position={[0, 0.1, 0]}>
            <Backpack />
          </group>
        </SceneCanvas>

        {/* packed things as small slots */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-3">
          {Array.from({ length: MAX_LUGGAGE }).map((_, i) => {
            const it = items[i];
            return it ? (
              <div
                key={it.id}
                className="pointer-events-auto relative h-14 w-14 overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-[0_2px_0_rgba(58,46,42,0.15)]"
              >
                {it.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photo} alt={it.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🎁</div>
                )}
                <button
                  onClick={() => removeItem(it.id)}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-ink/70 text-xs text-paper"
                  aria-label="拿出来"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                key={`e${i}`}
                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-ink/25 text-xl text-ink/25"
              >
                +
              </div>
            );
          })}
        </div>
      </div>

      {/* two simple entries */}
      <div className="flex items-center justify-center gap-10 pb-2 pt-1">
        <button
          onClick={() => setCameraOpen(true)}
          disabled={full}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          <span className="sticker flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-paper">
            📷
          </span>
          <span className="text-xs text-ink-soft">拍样东西</span>
        </button>
        <button
          onClick={() => setTalkOpen(true)}
          className="flex flex-col items-center gap-1"
        >
          <span className="sticker flex h-16 w-16 items-center justify-center rounded-full bg-cream-soft text-2xl">
            💬
          </span>
          <span className="text-xs text-ink-soft">
            {message.trim() ? "已留言" : "说句话"}
          </span>
        </button>
      </div>

      {/* confirm */}
      <div className="shrink-0 px-5 pb-5 pt-2">
        <Button size="lg" className="w-full" onClick={() => prepareBag(items, message)}>
          准备好了，等它出发 →
        </Button>
      </div>

      {cameraOpen && (
        <CameraCapture onAdd={addItem} onClose={() => setCameraOpen(false)} />
      )}

      {/* talk sheet */}
      {talkOpen && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-ink/40" onClick={() => setTalkOpen(false)}>
          <div
            className="rounded-t-3xl border-2 border-b-0 border-ink bg-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-hand text-lg text-ink">今天想对它说点什么？</p>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 60))}
              placeholder="想去哪、心情怎样都行，它会读到的。"
              rows={3}
              className="w-full resize-none rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
            />
            <Button className="mt-3 w-full" onClick={() => setTalkOpen(false)}>
              好了
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
