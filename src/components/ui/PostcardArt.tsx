"use client";

import { getDestination } from "@/game/destinations";
import { cn } from "./cn";

const VB = "0 0 320 200";

function lighten(hex: string, amt = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// `theme` is a string (not DestinationTheme) so retired-theme legacy postcards
// (harbor/hotspring/…) still render their old art instead of crashing.
function Scene({ theme }: { theme: string }) {
  const { sky, mid, ground, accent } = getDestination(theme).palette;
  const skyLight = lighten(sky, 0.45);

  switch (theme) {
    case "seaside":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <circle cx={250} cy={48} r={22} fill={accent} />
          <path d="M0 120 Q80 108 160 120 T320 120 V200 H0 Z" fill={mid} />
          <path d="M0 150 Q90 140 170 150 T320 150 V200 H0 Z" fill={ground} />
          <path d="M120 132 l26 0 -6 12 -14 0 Z" fill="#fffdf8" stroke="#3a2e2a" strokeWidth={1.5} />
          <line x1={133} y1={118} x2={133} y2={132} stroke="#3a2e2a" strokeWidth={1.5} />
          <path d="M133 119 l14 6 -14 5 Z" fill={accent} />
        </>
      );
    case "harbor":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <rect y={118} width={320} height={82} fill={mid} />
          <rect x={36} y={36} width={16} height={86} fill={ground} stroke="#3a2e2a" strokeWidth={1.5} />
          <rect x={32} y={28} width={24} height={12} fill={accent} stroke="#3a2e2a" strokeWidth={1.5} />
          <circle cx={44} cy={34} r={3} fill="#fff3c4" />
          <path d="M150 118 h70 l-10 18 h-50 Z" fill="#fffdf8" stroke="#3a2e2a" strokeWidth={1.5} />
          <rect x={176} y={96} width={3} height={22} fill="#3a2e2a" />
          <path d="M179 98 l20 8 -20 7 Z" fill={accent} />
        </>
      );
    case "forest":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <rect y={150} width={320} height={50} fill={ground} />
          {[40, 110, 200, 270].map((x, i) => (
            <g key={i} transform={`translate(${x} ${110 + (i % 2) * 14})`}>
              <rect x={-4} y={36} width={8} height={20} fill="#9a6f47" />
              <path d="M0 -36 L26 24 L-26 24 Z" fill={mid} />
              <path d="M0 -16 L20 34 L-20 34 Z" fill={lighten(mid, 0.16)} opacity={0.9} />
            </g>
          ))}
        </>
      );
    case "snow":
      return (
        <>
          <rect width={320} height={200} fill={sky} />
          <path d="M0 130 Q100 100 200 128 T320 124 V200 H0 Z" fill={mid} />
          <path d="M0 158 Q120 142 240 158 T320 156 V200 H0 Z" fill={ground} />
          {[60, 150, 240].map((x, i) => (
            <g key={i} transform={`translate(${x} ${118 + i * 4})`}>
              <rect x={-2} y={0} width={4} height={24} fill="#7d6a5a" />
              <line x1={0} y1={6} x2={-12} y2={-2} stroke="#7d6a5a" strokeWidth={2} />
              <line x1={0} y1={10} x2={12} y2={2} stroke="#7d6a5a" strokeWidth={2} />
            </g>
          ))}
          {[[40, 40], [100, 70], [170, 30], [230, 60], [285, 36], [140, 96]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.4} fill="#ffffff" />
          ))}
        </>
      );
    case "hotspring":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <rect y={140} width={320} height={60} fill={accent} opacity={0.5} />
          <ellipse cx={160} cy={150} rx={150} ry={20} fill={lighten(accent, 0.5)} />
          {[80, 160, 240].map((x, i) => (
            <path
              key={i}
              d={`M${x} 140 q-10 -18 0 -34 q10 -16 0 -32`}
              fill="none"
              stroke="#fffdf8"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
          <path d="M0 150 q40 -24 80 0 V200 H0 Z" fill={ground} />
          <path d="M320 150 q-40 -24 -80 0 V200 H320 Z" fill={mid} />
        </>
      );
    case "mountain":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <path d="M-10 200 L90 70 L160 200 Z" fill={mid} />
          <path d="M120 200 L230 50 L330 200 Z" fill={ground} />
          <path d="M210 76 L230 50 L252 80 L236 74 L226 84 Z" fill={accent} />
          <ellipse cx={70} cy={56} rx={26} ry={10} fill="#fffdf8" opacity={0.85} />
        </>
      );
    case "flowerfield":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <circle cx={56} cy={44} r={18} fill="#f4d35e" />
          <path d="M0 120 Q160 96 320 120 V200 H0 Z" fill={mid} />
          <rect y={150} width={320} height={50} fill={ground} />
          {[[40, 150], [85, 168], [140, 150], [185, 172], [240, 152], [286, 168], [115, 184], [210, 186]].map(
            ([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <line x1={0} y1={0} x2={0} y2={14} stroke="#6f8f52" strokeWidth={2} />
                <circle cx={0} cy={-2} r={4.5} fill={i % 2 ? accent : "#f4d35e"} />
              </g>
            ),
          )}
        </>
      );
    case "raincity":
      return (
        <>
          <rect width={320} height={200} fill={sky} />
          {[[20, 90], [70, 60], [120, 100], [170, 50], [220, 84], [266, 64]].map(
            ([x, h], i) => (
              <rect key={i} x={x} y={200 - h - 30} width={42} height={h + 30} fill={mid} stroke="#3a2e2a" strokeWidth={1.2} />
            ),
          )}
          <rect x={178} y={120} width={10} height={12} fill={accent} />
          {Array.from({ length: 18 }).map((_, i) => {
            const x = 12 + i * 17;
            return <line key={i} x1={x} y1={(i * 23) % 60} x2={x - 6} y2={((i * 23) % 60) + 14} stroke="#cdd6e2" strokeWidth={1.5} />;
          })}
        </>
      );
    case "town":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <rect y={150} width={320} height={50} fill={ground} />
          {[[20, 96], [86, 110], [200, 100], [262, 112]].map(([x, top], i) => (
            <g key={i}>
              <rect x={x} y={top} width={54} height={150 - top} fill={lighten(mid, 0.15)} stroke="#3a2e2a" strokeWidth={1.2} />
              <path d={`M${x - 4} ${top} L${x + 27} ${top - 18} L${x + 58} ${top} Z`} fill={mid} stroke="#3a2e2a" strokeWidth={1.2} strokeLinejoin="round" />
            </g>
          ))}
          <rect x={150} y={66} width={30} height={84} fill={lighten(mid, 0.25)} stroke="#3a2e2a" strokeWidth={1.4} />
          <circle cx={165} cy={84} r={9} fill="#fffdf8" stroke="#3a2e2a" strokeWidth={1.4} />
          <line x1={165} y1={84} x2={165} y2={78} stroke="#3a2e2a" strokeWidth={1.4} />
          <line x1={165} y1={84} x2={170} y2={86} stroke="#3a2e2a" strokeWidth={1.4} />
        </>
      );
    case "nightstation":
      return (
        <>
          <rect width={320} height={200} fill={sky} />
          {[[30, 30], [90, 22], [160, 40], [210, 20], [270, 34], [130, 18], [240, 54]].map(
            ([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={1.6} fill="#fff3c4" />
            ),
          )}
          <circle cx={262} cy={36} r={14} fill="#f0ead0" opacity={0.9} />
          <rect y={150} width={320} height={50} fill={ground} />
          <rect x={40} y={96} width={150} height={56} rx={4} fill={mid} stroke="#3a2e2a" strokeWidth={1.4} />
          <rect x={56} y={110} width={20} height={28} fill={accent} opacity={0.85} />
          <rect x={88} y={110} width={20} height={28} fill={accent} opacity={0.85} />
          <line x1={232} y1={70} x2={232} y2={150} stroke="#3a2e2a" strokeWidth={2.5} />
          <circle cx={232} cy={72} r={6} fill={accent} />
          <ellipse cx={232} cy={150} rx={26} ry={6} fill={accent} opacity={0.3} />
        </>
      );
    case "starfield":
      return (
        <>
          <rect width={320} height={200} fill={sky} />
          {/* soft galaxy band */}
          <path d="M-20 40 Q160 90 340 60 L340 96 Q160 126 -20 76 Z" fill={lighten(mid, 0.3)} opacity={0.35} />
          {[
            [24, 26], [60, 54], [96, 30], [130, 64], [168, 26], [206, 58],
            [244, 34], [280, 62], [300, 28], [44, 88], [150, 100], [270, 96],
            [110, 86], [210, 92], [78, 110], [240, 118],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 2.2 : 1.3} fill="#fdf6d8" opacity={0.9} />
          ))}
          <path d="M196 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" fill={accent} />
          <path d="M0 150 Q90 132 180 150 T320 146 V200 H0 Z" fill={ground} />
          <path d="M0 168 Q120 156 240 168 T320 166 V200 H0 Z" fill={mid} opacity={0.8} />
        </>
      );
    case "desert":
      return (
        <>
          <rect width={320} height={200} fill={skyLight} />
          <circle cx={250} cy={52} r={20} fill={accent} opacity={0.85} />
          <path d="M0 132 Q90 108 180 130 T320 124 V200 H0 Z" fill={lighten(mid, 0.1)} />
          <path d="M0 156 Q110 134 220 156 T320 152 V200 H0 Z" fill={mid} />
          <path d="M0 178 Q120 162 240 178 T320 176 V200 H0 Z" fill={ground} />
          {/* a little oasis palm */}
          <line x1={64} y1={170} x2={60} y2={140} stroke="#7a5a36" strokeWidth={3} />
          {[-1, -0.3, 0.4, 1].map((d, i) => (
            <path
              key={i}
              d={`M60 140 q${d * 22} ${-8 - Math.abs(d) * 4} ${d * 30} ${4 + Math.abs(d) * 2}`}
              fill="none"
              stroke="#6f8f52"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </>
      );
  }
}

// PLACEHOLDER rarity dressing — the whole postcard art (scenes included) gets
// replaced by real produced card images later; until then this cheap overlay at
// least makes an R/SR pull LOOK different from an N at reveal time. Safe to
// delete wholesale when the real art lands.
function RarityOverlay({ rarity }: { rarity?: string }) {
  if (rarity === "R")
    return (
      <g pointerEvents="none">
        <rect width={320} height={200} fill="#7fb0d8" opacity={0.1} />
        {[[42, 38], [120, 24], [212, 46], [282, 30], [70, 92], [254, 104]].map(
          ([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y - 5} l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z`}
              fill="#ffffff"
              opacity={0.85}
            />
          ),
        )}
      </g>
    );
  if (rarity === "SR")
    return (
      <g pointerEvents="none">
        {/* golden-hour wash + light shafts + gold sparkles */}
        <rect width={320} height={200} fill="#e6b34d" opacity={0.16} />
        <g opacity={0.2} fill="#fff3c4">
          <polygon points="60,-20 110,-20 10,220 -40,220" />
          <polygon points="210,-20 240,-20 140,220 110,220" />
        </g>
        {[[36, 36], [104, 20], [170, 44], [238, 26], [292, 52], [60, 110], [216, 118], [140, 84]].map(
          ([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y - 6} l1.9 4 4 1.9 -4 1.9 -1.9 4 -1.9 -4 -4 -1.9 4 -1.9 Z`}
              fill={i % 3 === 0 ? "#ffe9ad" : "#f6c97a"}
              opacity={0.95}
            />
          ),
        )}
      </g>
    );
  return null;
}

export default function PostcardArt({
  theme,
  rarity,
  className,
  rounded = true,
}: {
  theme: string;
  rarity?: string; // N renders plain; R/SR get the placeholder dressing above
  className?: string;
  rounded?: boolean;
}) {
  return (
    <svg
      viewBox={VB}
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", rounded && "rounded-[10px]", className)}
      role="img"
      aria-label={getDestination(theme).label}
    >
      <Scene theme={theme} />
      <RarityOverlay rarity={rarity} />
    </svg>
  );
}
