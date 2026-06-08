"use client";

// Shared "storybook" UI kit — the light hand-drawn / wooden material system
// established on the home screen, packaged so every screen stays consistent.
//   • Panel       — a light paper card (paper grain + optional hand-drawn edge)
//   • ScreenHeader — wood back button + title row for content screens
//   • BackButton   — pale-wood disc with a hand-drawn outline
// The hand-drawn wobble comes from the global #rough SVG filter (PortraitFrame)
// via the .sketch utility. Reserve .sketch for a few hero elements per screen
// (filters aren't free) — list/grid items pass sketch={false}.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

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
      className="sketch tex-grain grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border-2 border-[#e4c89c] bg-paper/95 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_4px_0_rgba(143,101,54,0.16)] transition active:translate-y-0.5"
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
    <header className={cn("relative z-10 flex items-center gap-3 px-5 pt-5", className)}>
      {onBack && <BackButton onClick={onBack} />}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-[12px] leading-none text-ink-soft">{eyebrow}</p>}
        <h1 className="truncate font-hand text-2xl leading-tight text-ink">{title}</h1>
      </div>
      {right}
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
        "sketch relative w-full rounded-[24px] border-2 border-[#b8504a] bg-gradient-to-b from-[#f28c70] to-[#df614f] px-6 py-4 text-center font-hand text-xl font-bold text-[#fffdf8] shadow-[inset_0_2px_0_rgba(255,255,255,0.38),0_6px_0_rgba(150,70,58,0.46),0_14px_24px_-18px_rgba(58,46,42,0.45)] transition active:translate-y-1 active:shadow-[inset_0_2px_0_rgba(255,255,255,0.38),0_2px_0_rgba(150,70,58,0.46)] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
