"use client";

import { useState } from "react";

import type { PackedItem } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Backpack from "../scenes3d/home/parts/Backpack";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";
import CameraCapture from "../ui/CameraCapture";

function Pedestal() {
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.0, 40]} />
      <meshStandardMaterial color="#f1e2c8" roughness={1} metalness={0} />
    </mesh>
  );
}

export default function PackScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const existing = useGameStore((s) => s.packedBag);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  const [photos, setPhotos] = useState<PackedItem[]>(
    () => existing?.items.filter((i) => i.kind === "photo") ?? [],
  );
  const [message, setMessage] = useState(existing?.message ?? "");
  const [cameraOpen, setCameraOpen] = useState(false);

  const addPhoto = (item: PackedItem) => setPhotos((ps) => [...ps, item]);
  const removePhoto = (id: string) =>
    setPhotos((ps) => ps.filter((p) => p.id !== id));

  const send = () => prepareBag(photos, message);

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
        >
          ←
        </button>
        <span className="font-hand text-xl text-ink">
          给 {companion.name} 的今日包裹
        </span>
        <span className="w-9" />
      </div>

      {/* 3D bag */}
      <div className="relative h-[34%] shrink-0">
        <SceneCanvas controls="spin">
          <Pedestal />
          <group scale={2.1} position={[0, 0.08, 0]}>
            <Backpack />
          </group>
        </SceneCanvas>
        <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-xs text-ink-soft/70">
          {photos.length > 0 ? `背包里 · ${photos.length} 件` : "拍点东西放进背包"}
        </span>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-3">
        {/* photos packed into the bag */}
        <section>
          <p className="mb-2 text-sm font-medium text-ink">📷 拍下要带走的东西</p>
          <div className="flex flex-wrap items-start gap-2.5">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo}
                  alt={p.label}
                  className="h-20 w-20 rounded-xl border-2 border-ink object-cover"
                />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-paper text-xs"
                >
                  ×
                </button>
                {p.hint && (
                  <p className="mt-1 max-w-20 truncate text-center text-xs text-ink-soft">
                    {p.hint}
                  </p>
                )}
              </div>
            ))}
            <button
              onClick={() => setCameraOpen(true)}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink/25 bg-cream-soft text-ink-soft"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">拍一张</span>
            </button>
          </div>
        </section>

        {/* message */}
        <section>
          <p className="mb-2 text-sm font-medium text-ink">💬 留一句话</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 50))}
            placeholder="今天想对它说点什么…它会读到的（也可能读歪）。"
            rows={2}
            className="w-full resize-none rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
          />
        </section>
      </div>

      <div className="shrink-0 border-t-2 border-ink/8 bg-cream/80 px-5 py-4 backdrop-blur">
        <Button size="lg" className="w-full" onClick={send}>
          准备好了，看它今天怎么过 →
        </Button>
      </div>

      {cameraOpen && (
        <CameraCapture
          onAdd={addPhoto}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
