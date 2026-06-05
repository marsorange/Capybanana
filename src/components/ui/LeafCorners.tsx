"use client";

// Shared botanical corner decoration — the leafy sprigs that frame every screen
// in the reference art. Purely decorative (pointer-events-none, sits behind
// content). Reused across screens so the storybook framing stays consistent.

type Corner = "tl" | "tr" | "bl" | "br";
const ALL: Corner[] = ["tl", "tr", "bl", "br"];

const LEAF_A = "#7fa64d";
const LEAF_B = "#9cc169";
const LEAF_C = "#6c8f3f";

function Leaf({
  x,
  y,
  rot,
  fill,
  s = 1,
}: {
  x: number;
  y: number;
  rot: number;
  fill: string;
  s?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 C 8 -7 22 -7 29 0 C 22 7 8 7 0 0 Z" fill={fill} />
      <path
        d="M3 0 H 26"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

/** One leafy sprig that grows out of a corner toward the screen center. */
function Sprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 12 C 38 28 62 50 96 100"
        stroke={LEAF_C}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.45}
      />
      <Leaf x={18} y={22} rot={-26} fill={LEAF_A} s={1.05} />
      <Leaf x={40} y={28} rot={20} fill={LEAF_B} s={0.95} />
      <Leaf x={44} y={50} rot={-38} fill={LEAF_A} s={1.15} />
      <Leaf x={66} y={58} rot={14} fill={LEAF_B} s={0.92} />
      <Leaf x={70} y={84} rot={-30} fill={LEAF_C} s={1.05} />
      <Leaf x={94} y={94} rot={24} fill={LEAF_A} s={0.95} />
    </svg>
  );
}

export default function LeafCorners({
  corners = ALL,
  size = "h-28 w-28",
  className = "",
}: {
  corners?: Corner[];
  /** Tailwind size classes for each sprig (default h-28 w-28). */
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {corners.includes("tl") && (
        <Sprig className={`absolute -left-6 -top-6 ${size}`} />
      )}
      {corners.includes("tr") && (
        <Sprig className={`absolute -right-6 -top-6 -scale-x-100 ${size}`} />
      )}
      {corners.includes("bl") && (
        <Sprig className={`absolute -bottom-6 -left-6 -scale-y-100 ${size}`} />
      )}
      {corners.includes("br") && (
        <Sprig className={`absolute -bottom-6 -right-6 -scale-100 ${size}`} />
      )}
    </div>
  );
}
