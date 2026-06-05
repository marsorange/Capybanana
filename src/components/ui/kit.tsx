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
  "tex-grain rounded-[20px] border-2 border-[#bd8a52]/45 bg-paper shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.16),0_12px_24px_-16px_rgba(58,46,42,0.4)]";

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
      className="sketch tex-wood grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#cdab6e] shadow-[inset_0_1.5px_0_rgba(255,250,236,0.6),0_3px_0_rgba(150,112,60,0.4)] transition active:translate-y-0.5"
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
        "sketch relative w-full rounded-[20px] border-2 border-[#b8504a] bg-gradient-to-b from-[#ef7e74] to-[#d9554f] px-6 py-3.5 text-center font-hand text-lg font-semibold text-[#fffdf8] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_4px_0_rgba(150,70,58,0.55)] transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
