"use client";

import { useState } from "react";

import { LUGGAGE } from "@/game/labels";
import type { LuggageItem, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import Backpack from "../scenes3d/Backpack";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Button from "../ui/Button";
import CameraCapture from "../ui/CameraCapture";
import { cn } from "../ui/cn";

const QUICK_TAGS = ["今天别太累", "想去海边", "想要安静一点", "随便走走"];

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

  const existingPhoto = existing?.items.find((i) => i.kind === "photo") ?? null;
  const existingSmall =
    existing?.items.find((i) => i.kind === "preset")?.preset ?? null;

  const [photo, setPhoto] = useState<PackedItem | null>(existingPhoto);
  const [small, setSmall] = useState<LuggageItem | null>(existingSmall);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [pat, setPat] = useState(existing?.gesture === "pat");
  const [cameraOpen, setCameraOpen] = useState(false);

  const send = () => {
    const items: PackedItem[] = [];
    if (photo) items.push(photo);
    if (small) {
      const meta = LUGGAGE.find((l) => l.item === small);
      items.push({
        id: uid("pi"),
        kind: "preset",
        preset: small,
        label: meta?.label ?? "小物",
      });
    }
    prepareBag(items, message, pat ? "pat" : undefined);
  };

  const addTag = (tag: string) =>
    setMessage((m) => (!m.trim() ? tag : m.includes(tag) ? m : `${m}，${tag}`));

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
      <div className="h-[26%] shrink-0">
        <SceneCanvas controls="spin">
          <Pedestal />
          <group scale={1.6} position={[0, 0.1, 0]}>
            <Backpack />
          </group>
        </SceneCanvas>
      </div>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-3">
        {/* photo */}
        <section>
          <p className="mb-2 text-sm font-medium text-ink">📷 一个现实拍照物</p>
          {photo ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.photo}
                alt={photo.label}
                className="h-20 w-20 rounded-xl border-2 border-ink object-cover"
              />
              <button
                onClick={() => setPhoto(null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-paper text-xs"
              >
                ×
              </button>
              {photo.hint && (
                <p className="mt-1 text-xs text-ink-soft">看出来：{photo.hint}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setCameraOpen(true)}
              className="sticker rounded-sticker bg-accent px-4 py-2.5 text-paper"
            >
              📷 拍一张
            </button>
          )}
        </section>

        {/* small item */}
        <section>
          <p className="mb-2 text-sm font-medium text-ink">🎒 一个随身小物</p>
          <div className="flex flex-wrap gap-2">
            {LUGGAGE.map((l) => (
              <button
                key={l.item}
                onClick={() => setSmall(small === l.item ? null : l.item)}
                className={cn(
                  "flex items-center gap-1.5 rounded-sticker border-2 px-3 py-2 text-sm transition",
                  small === l.item
                    ? "border-ink bg-accent/10 text-ink"
                    : "border-ink/12 bg-cream-soft text-ink",
                )}
              >
                <span className="text-lg">{l.emoji}</span>
                {l.label}
              </button>
            ))}
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
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-sm text-ink-soft"
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* gesture */}
        <section>
          <button
            onClick={() => setPat((p) => !p)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-sticker border-2 py-2.5 text-sm transition",
              pat
                ? "border-ink bg-accent/10 text-ink"
                : "border-ink/12 bg-cream-soft text-ink-soft",
            )}
          >
            {pat ? "🫶 摸了摸它的头 ♡" : "🫳 摸摸头（可选）"}
          </button>
        </section>
      </div>

      <div className="shrink-0 border-t-2 border-ink/8 bg-cream/80 px-5 py-4 backdrop-blur">
        <Button size="lg" className="w-full" onClick={send}>
          准备好了，看它今天怎么过 →
        </Button>
      </div>

      {cameraOpen && (
        <CameraCapture
          onAdd={(item) => setPhoto(item)}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}
