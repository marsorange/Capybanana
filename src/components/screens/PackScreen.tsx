"use client";

import { useState } from "react";

import type { PackedItem } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Backpack from "../scenes3d/home/parts/Backpack";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";
import CameraCapture from "../ui/CameraCapture";

const MESSAGE_IDEAS = [
  "今天想去有风的地方看看。",
  "如果累了，就在家慢慢休息。",
  "带着这个，找一个安静的小角落吧。",
];
const MAX_PHOTOS = 3;

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

  const addPhoto = (item: PackedItem) =>
    setPhotos((ps) => (ps.length >= MAX_PHOTOS ? ps : [...ps, item]));
  const removePhoto = (id: string) =>
    setPhotos((ps) => ps.filter((p) => p.id !== id));

  const send = () => prepareBag(photos, message);
  const hasClue = photos.length > 0 || message.trim().length > 0;
  const canAddPhoto = photos.length < MAX_PHOTOS;

  return (
    <div className="game-bg relative flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
        >
          ←
        </button>
        <span className="font-hand text-xl text-ink">今日包裹</span>
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
          {photos.length > 0
            ? `背包里 · ${photos.length}/${MAX_PHOTOS} 件线索`
            : "先给它一件今天的线索"}
        </span>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-3">
        <section className="rounded-[20px] border-2 border-ink/10 bg-paper px-4 py-3 shadow-[0_2px_0_rgba(58,46,42,0.05)]">
          <p className="font-hand text-lg leading-none text-ink">
            给 {companion.name} 一点今天的方向
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            它不会照单全收，但会把物品、颜色和你的话悄悄记进今天。
          </p>
        </section>

        {/* photos packed into the bag */}
        <section>
          <div className="mb-2 flex items-end justify-between gap-3">
            <p className="text-sm font-medium text-ink">📷 放入真实物品</p>
            <p className="text-xs text-ink-soft">{photos.length}/{MAX_PHOTOS}</p>
          </div>
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
            {canAddPhoto && (
              <button
                onClick={() => setCameraOpen(true)}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink/25 bg-cream-soft text-ink-soft active:translate-y-0.5"
              >
                <span className="text-2xl">📷</span>
                <span className="text-xs">拍一张</span>
              </button>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft/80">
            颜色、形状和识别出的物体名，都会成为助手判断今天的线索。
          </p>
        </section>

        {/* message */}
        <section>
          <p className="mb-2 text-sm font-medium text-ink">💬 留一句心愿</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 50))}
            placeholder="比如：今天想去有风的地方看看。"
            rows={3}
            className="w-full resize-none rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {MESSAGE_IDEAS.map((idea) => (
              <button
                key={idea}
                onClick={() => setMessage(idea)}
                className="rounded-full border-2 border-ink/10 bg-cream-soft px-3 py-1 text-xs text-ink-soft active:translate-y-0.5"
              >
                {idea}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="game-bottom-panel shrink-0 px-5 py-4">
        <Button size="lg" className="w-full" disabled={!hasClue} onClick={send}>
          {hasClue ? "放到门口，等它决定 →" : "先给它一个线索"}
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
