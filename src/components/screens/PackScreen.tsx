"use client";

import { useState } from "react";

import { LUGGAGE, MAX_LUGGAGE } from "@/game/labels";
import type { LuggageItem, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";
import CameraCapture from "../ui/CameraCapture";
import { cn } from "../ui/cn";

const QUICK_TAGS = [
  "想去海边",
  "想看看雪",
  "想要安静一点",
  "想去热闹的地方",
  "随便走走",
];

export default function PackScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const existing = useGameStore((s) => s.packedBag);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  const [items, setItems] = useState<PackedItem[]>(existing?.items ?? []);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [cameraOpen, setCameraOpen] = useState(false);

  const full = items.length >= MAX_LUGGAGE;

  const addItem = (item: PackedItem) => {
    setItems((prev) => (prev.length >= MAX_LUGGAGE ? prev : [...prev, item]));
  };
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const addPreset = (l: (typeof LUGGAGE)[number]) => {
    if (full || items.some((i) => i.preset === l.item)) return;
    addItem({
      id: uid("pi"),
      kind: "preset",
      preset: l.item as LuggageItem,
      label: l.label,
    });
  };

  const addTag = (tag: string) => {
    setMessage((m) => {
      if (!m.trim()) return tag;
      if (m.includes(tag)) return m;
      return `${m}，${tag}`;
    });
  };

  const slots = [...items];
  while (slots.length < MAX_LUGGAGE) slots.push(null as unknown as PackedItem);

  return (
    <div className="relative flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <button
          onClick={() => goTo("home")}
          className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-ink-soft"
          aria-label="返回"
        >
          ←
        </button>
        <div>
          <h1 className="font-hand text-2xl leading-none text-ink">
            帮 {companion.name} 收拾行李箱
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            拍下身边的东西，让它带走（最多 {MAX_LUGGAGE} 样）。
          </p>
        </div>
      </div>

      {/* suitcase */}
      <div className="mx-5 mt-4">
        <div className="relative rounded-[18px] border-2 border-ink bg-[#c98a52] p-3 shadow-[0_4px_0_rgba(58,46,42,0.2)]">
          {/* handle */}
          <div className="absolute -top-3 left-1/2 h-3 w-16 -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-ink bg-[#b2763f]" />
          {/* straps */}
          <div className="absolute inset-y-2 left-1/4 w-2 rounded bg-[#a06a38]" />
          <div className="absolute inset-y-2 right-1/4 w-2 rounded bg-[#a06a38]" />
          <div className="relative grid grid-cols-3 gap-2.5 rounded-[12px] bg-[#e9d3b4] p-2.5">
            {slots.map((it, idx) =>
              it ? (
                <div
                  key={it.id}
                  className="relative aspect-square overflow-hidden rounded-[10px] border-2 border-ink/20 bg-paper"
                >
                  {it.kind === "photo" && it.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.photo} alt={it.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">
                      {LUGGAGE.find((l) => l.item === it.preset)?.emoji ?? "🎁"}
                    </div>
                  )}
                  <button
                    onClick={() => removeItem(it.id)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-paper text-xs text-ink"
                    aria-label="拿出来"
                  >
                    ×
                  </button>
                  {it.hint && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-ink/55 px-1 text-center text-[9px] text-paper">
                      {it.hint}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  key={`empty-${idx}`}
                  className="flex aspect-square items-center justify-center rounded-[10px] border-2 border-dashed border-ink/25 text-2xl text-ink/25"
                >
                  +
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* scroll area */}
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <button
          onClick={() => setCameraOpen(true)}
          disabled={full}
          className={cn(
            "sticker flex w-full items-center justify-center gap-2 rounded-sticker bg-accent py-3 text-base font-medium text-paper",
            full && "opacity-45",
          )}
        >
          📷 拍一件真实物品带上
        </button>

        <div>
          <p className="mb-2 text-sm text-ink-soft">或放入一样预设小物：</p>
          <div className="grid grid-cols-3 gap-2">
            {LUGGAGE.map((l) => {
              const has = items.some((i) => i.preset === l.item);
              const disabled = has || full;
              return (
                <button
                  key={l.item}
                  onClick={() => addPreset(l)}
                  disabled={disabled}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-sticker border-2 px-2 py-2 text-center transition",
                    has
                      ? "border-ink bg-accent/10"
                      : "border-ink/12 bg-cream-soft",
                    disabled && !has && "opacity-40",
                  )}
                >
                  <span className="text-xl">{l.emoji}</span>
                  <span className="text-[12px] font-medium text-ink">{l.label}</span>
                  <span className="text-[10px] leading-tight text-ink-soft">
                    {l.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section>
          <label className="mb-2 block font-hand text-lg text-ink">
            今天想对它说点什么？
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 60))}
            placeholder="想去哪、心情怎样都可以…它会读到的。"
            rows={2}
            className="w-full resize-none rounded-sticker border-2 border-ink/15 bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-sm text-ink-soft hover:border-ink/30"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* action */}
      <div className="shrink-0 border-t-2 border-ink/8 bg-cream/80 px-5 py-4 backdrop-blur">
        <Button
          size="lg"
          className="w-full"
          onClick={() => prepareBag(items, message)}
        >
          把行李准备好 →
        </Button>
        <p className="mt-2 text-center text-xs text-ink-soft/80">
          准备好后，它会自己决定什么时候出门。
        </p>
      </div>

      {cameraOpen && (
        <CameraCapture onAdd={addItem} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}
