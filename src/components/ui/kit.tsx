"use client";

// Shared "storybook" UI kit — the light hand-drawn / wooden material system
// established on the home screen, packaged so every screen stays consistent.
// The hand-drawn wobble comes from the global #rough SVG filter (PortraitFrame).
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

// Shared warm-border tokens, for reference. NB: Tailwind scans source for
// literal arbitrary values, so these must be written out in classes as
// border-[#e4c89c] (soft paper edge) / border-[#d9b982] (wood-tile edge).

const PANEL =
  "tex-grain rounded-[22px] border-2 border-[#e4c89c] bg-paper/95 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_4px_0_rgba(143,101,54,0.14),0_14px_26px_-18px_rgba(58,46,42,0.42)]";

export function Panel({
  className,
  children,
  sketch = true,
}: {
  className?: string;
  children: ReactNode;
  sketch?: boolean;
}) {
  return (
    <div className={cn(PANEL, sketch && "sketch", className)}>{children}</div>
  );
}

export function BackButton({
  onClick,
  label = "返回",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ui-wood-surface ui-wood-press grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="#7c5c34"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14.5 5.5 8 12l6.5 6.5" />
      </svg>
    </button>
  );
}

export function ScreenHeader({
  onBack,
  eyebrow,
  title,
  right,
  className,
}: {
  onBack?: () => void;
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative z-20 flex items-center gap-2.5 px-3.5 pt-4", className)}>
      {onBack && <BackButton onClick={onBack} />}
      <div className="ui-wood-surface min-w-0 flex-1 rounded-[28px] px-4 py-2.5 text-left">
        {eyebrow && <p className="truncate text-[12px] leading-none text-ink-soft">{eyebrow}</p>}
        <h1 className="truncate font-hand text-[22px] leading-tight text-[#4f3828]">{title}</h1>
      </div>
      {right && (
        <div className="ui-wood-surface grid h-12 w-12 shrink-0 place-items-center rounded-full">
          {right}
        </div>
      )}
    </header>
  );
}

/** Primary call-to-action — coral sticker with a hand-drawn outline. */
export function PrimaryButton({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      style={{ ["--sketch-color" as string]: "rgba(150,70,58,0.55)" }}
      className={cn(
        "sketch relative w-full overflow-hidden rounded-[24px] border-2 border-[#b8504a] bg-gradient-to-b from-[#f28c70] to-[#df614f] px-6 py-4 text-center font-hand text-xl font-bold text-[#fffdf8] shadow-[inset_0_2px_0_rgba(255,255,255,0.38),0_6px_0_rgba(150,70,58,0.46),0_14px_24px_-18px_rgba(58,46,42,0.45)] transition active:translate-y-1 active:shadow-[inset_0_2px_0_rgba(255,255,255,0.38),0_2px_0_rgba(150,70,58,0.46)] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Secondary CTA — soft cream sticker with a hand-drawn outline. Pairs with
 *  PrimaryButton for "回到 / 复制 / 再想想" style actions. `size="sm"` for a
 *  compact inline button. (cn is a plain concat — no tailwind-merge — so size is
 *  a prop, not a className override, to avoid CSS-order surprises.) */
export function SecondaryButton({
  className,
  children,
  size = "md",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: "md" | "sm" }) {
  return (
    <button
      className={cn(
        "ui-wood-surface ui-wood-press w-full text-center font-hand text-[#5f442d] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        size === "sm"
          ? "rounded-[18px] px-5 py-2.5 text-[15px]"
          : "rounded-[22px] px-6 py-3.5 text-lg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Soft rounded chip — identity tags, traits, accessories. */
export function Chip({
  children,
  tone = "warm",
}: {
  children: ReactNode;
  tone?: "warm" | "leaf" | "accent";
}) {
  const toneCls =
    tone === "leaf"
      ? "border-leaf/35 bg-leaf/12 text-ink"
      : tone === "accent"
        ? "border-accent/35 bg-accent/10 text-accent"
        : "border-[#d9b982] bg-cream-soft text-ink";
  return (
    <span className={cn("rounded-full border-2 px-3 py-1 text-[13px]", toneCls)}>
      {children}
    </span>
  );
}

/** Pill tab selector — cream wood pills, coral sticker for the active one. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("ui-bottom-dock flex gap-1 rounded-[24px] p-1", className)}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "ui-bottom-tab min-w-0 flex-1 rounded-[18px] px-4 py-2 font-hand text-[15px] transition active:translate-y-0.5",
              on
                ? "ui-bottom-tab-active font-bold text-leaf"
                : "text-ink-soft",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Warm gold progress bar on a recessed cream track. Set `animateIn` for a
 *  one-time fill (profile); leave off for frequently-updated values (travel). */
export function ProgressBar({
  value,
  className,
  animateIn = false,
}: {
  value: number; // 0..1
  className?: string;
  animateIn?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        "h-3 overflow-hidden rounded-full border border-[#d9b982] bg-cream-deep",
        className,
      )}
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-[#f0c25c] to-[#e0973f]"
        initial={{ width: animateIn ? 0 : `${pct}%` }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: animateIn ? 0.8 : 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
