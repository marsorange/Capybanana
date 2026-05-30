"use client";

import type { Accessory } from "@/game/types";

const STROKE = "#6b5440";

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function darken(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c * (1 - amt));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** The capybara drawn in a 0..120 x, 0..116 y box. Embed inside any <svg>. */
export function CapybaraGuts({
  color = "#b98a5c",
  accessory = "none",
}: {
  color?: string;
  accessory?: Accessory;
}) {
  const belly = lighten(color, 0.32);
  const ear = darken(color, 0.12);

  return (
    <>
      <ellipse cx="60" cy="108" rx="34" ry="7" fill="rgba(80,60,40,0.18)" />
      <g className="animate-breathe">
        <ellipse cx="46" cy="100" rx="9" ry="7" fill={ear} stroke={STROKE} strokeWidth="2.4" />
        <ellipse cx="74" cy="100" rx="9" ry="7" fill={ear} stroke={STROKE} strokeWidth="2.4" />
        <ellipse cx="36" cy="33" rx="9" ry="8" fill={ear} stroke={STROKE} strokeWidth="2.4" />
        <ellipse cx="84" cy="33" rx="9" ry="8" fill={ear} stroke={STROKE} strokeWidth="2.4" />
        <path
          d="M22 62 C22 38 38 26 60 26 C82 26 98 38 98 62 C98 88 82 100 60 100 C38 100 22 88 22 62 Z"
          fill={color}
          stroke={STROKE}
          strokeWidth="3"
        />
        <path
          d="M34 74 C34 60 46 54 60 54 C74 54 86 60 86 74 C86 88 74 96 60 96 C46 96 34 88 34 74 Z"
          fill={belly}
          opacity="0.85"
        />
        <ellipse cx="40" cy="68" rx="7" ry="5" fill="#f0a6ac" opacity="0.8" />
        <ellipse cx="80" cy="68" rx="7" ry="5" fill="#f0a6ac" opacity="0.8" />
        <g className="animate-blink">
          <ellipse cx="49" cy="60" rx="4.6" ry="5.4" fill={STROKE} />
          <ellipse cx="71" cy="60" rx="4.6" ry="5.4" fill={STROKE} />
          <circle cx="50.5" cy="58" r="1.5" fill="#fffdf8" />
          <circle cx="72.5" cy="58" r="1.5" fill="#fffdf8" />
        </g>
        <ellipse cx="60" cy="78" rx="15" ry="11" fill={belly} stroke={STROKE} strokeWidth="2.4" />
        <ellipse cx="54" cy="76" rx="2" ry="2.6" fill={STROKE} />
        <ellipse cx="66" cy="76" rx="2" ry="2.6" fill={STROKE} />
        <path d="M57 84 Q60 87 63 84" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round" />

        {accessory === "scarf" && (
          <path d="M28 86 Q60 98 92 86 L90 94 Q60 106 30 94 Z" fill="#d95f59" stroke={STROKE} strokeWidth="2.4" strokeLinejoin="round" />
        )}
        {accessory === "hat" && (
          <g>
            <ellipse cx="60" cy="26" rx="26" ry="6" fill="#5b6b8a" stroke={STROKE} strokeWidth="2.4" />
            <path d="M44 24 Q46 6 60 6 Q74 6 76 24 Z" fill="#5b6b8a" stroke={STROKE} strokeWidth="2.4" strokeLinejoin="round" />
          </g>
        )}
        {accessory === "glasses" && (
          <g fill="none" stroke={STROKE} strokeWidth="2.6">
            <circle cx="49" cy="60" r="8" />
            <circle cx="71" cy="60" r="8" />
            <path d="M57 60 H63" />
          </g>
        )}
        {accessory === "flower" && (
          <g transform="translate(86 28)">
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <circle key={i} cx={Math.cos(a) * 6} cy={Math.sin(a) * 6} r="4" fill="#f0a6ac" stroke={STROKE} strokeWidth="1.6" />
              );
            })}
            <circle r="4" fill="#f4d35e" />
          </g>
        )}
        {accessory === "bell" && (
          <g>
            <path d="M30 84 Q60 96 90 84" fill="none" stroke="#caa25a" strokeWidth="5" strokeLinecap="round" />
            <circle cx="60" cy="93" r="6" fill="#f4d35e" stroke={STROKE} strokeWidth="2.4" />
          </g>
        )}
      </g>
    </>
  );
}

export default function Capybara2D({
  color = "#b98a5c",
  accessory = "none",
  className,
}: {
  color?: string;
  accessory?: Accessory;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 116" className={className} style={{ overflow: "visible" }}>
      <CapybaraGuts color={color} accessory={accessory} />
    </svg>
  );
}
