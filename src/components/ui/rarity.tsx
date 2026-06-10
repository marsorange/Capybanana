// Shared rarity styling for the postcard gacha — frames, badges, glow. Pure
// presentation (the roll itself lives in src/game/gacha.ts). Tuned to the cozy
// 原木 palette: N stays plain, R cool silver-blue, SR warm gold (the top tier).
import type { Rarity } from "@/game/types";
import { cn } from "./cn";

export interface RarityStyle {
  label: string; // 普通 / 稀有 / 史诗
  badge: string; // glyph in the corner chip
  ring: string; // border color (hex)
  glow: string; // reveal glow (rgba)
  chip: string; // tailwind classes for a small label chip
}

export const RARITY_META: Record<Rarity, RarityStyle> = {
  N: {
    label: "普通",
    badge: "",
    ring: "#cdb389",
    glow: "rgba(189,138,82,0)",
    chip: "border-[#cdb389]/55 bg-cream-soft text-ink-soft",
  },
  R: {
    label: "稀有",
    badge: "●",
    ring: "#7fb0d8",
    glow: "rgba(90,150,210,0.38)",
    chip: "border-[#7fb0d8] bg-[#eaf2fb] text-[#3f72a8]",
  },
  SR: {
    label: "史诗",
    badge: "★",
    ring: "#e6b34d",
    glow: "rgba(230,170,70,0.55)",
    chip: "border-[#e6b34d] bg-gradient-to-r from-[#fdf3da] to-[#f6c97a] text-[#b9791f]",
  },
};

// Safe lookup: persisted localStorage saves can carry a legacy/unknown rarity
// (old SSR, or none) that bypassed the server-side coerceRarity, so never index
// RARITY_META blindly — fall back to N so the album can't crash on stale data.
export function rarityMeta(rarity: Rarity | string | null | undefined): RarityStyle {
  return RARITY_META[rarity as Rarity] ?? RARITY_META.N;
}

export const isRareRarity = (r: Rarity): boolean => r === "SR";

/** A compact rarity chip, e.g. "★ 史诗". */
export function RarityBadge({
  rarity,
  className,
}: {
  rarity: Rarity;
  className?: string;
}) {
  const m = rarityMeta(rarity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        m.chip,
        className,
      )}
    >
      {m.badge && <span aria-hidden>{m.badge}</span>}
      {m.label}
    </span>
  );
}
