"use client";

import { useRef, useState } from "react";

import type { Accessory } from "@/game/types";
import { pick } from "@/game/util";
import { CapybaraGuts } from "./Capybara2D";

const STROKE = "#6b5440";

interface HomeRoomProps {
  mode: "home" | "away";
  color: string;
  accessory: Accessory;
  clickLines: string[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

function HintPill({
  x,
  y,
  icon,
  label,
}: {
  x: number;
  y: number;
  icon: string;
  label: string;
}) {
  const w = 30 + label.length * 16;
  return (
    <g transform={`translate(${x} ${y})`} className="animate-float-soft" style={{ pointerEvents: "none" }}>
      <rect x={-w / 2} y={-15} width={w} height={30} rx={15} fill="#fffdf8" stroke={STROKE} strokeWidth={2} />
      <text x={0} y={5} textAnchor="middle" fontSize={16} fill={STROKE}>
        {icon} {label}
      </text>
    </g>
  );
}

export default function HomeRoom({
  mode,
  color,
  accessory,
  clickLines,
  onOpenPack,
  onOpenAlbum,
}: HomeRoomProps) {
  const [bubble, setBubble] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const speak = () => {
    setBubble(pick(clickLines));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBubble(null), 3600);
  };

  return (
    <svg
      viewBox="0 0 480 820"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7ecd5" />
          <stop offset="1" stopColor="#eaddbf" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9dcef" />
          <stop offset="0.6" stopColor="#cfeae5" />
          <stop offset="1" stopColor="#e4f1df" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6ab70" />
          <stop offset="1" stopColor="#c6975a" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe6a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* walls + floor */}
      <rect x="0" y="0" width="480" height="556" fill="url(#wall)" />
      <rect x="0" y="540" width="480" height="280" fill="url(#floor)" />
      <rect x="0" y="532" width="480" height="16" fill="#b88a59" />
      {[600, 660, 720, 780].map((y) => (
        <path key={y} d={`M0 ${y} Q240 ${y - 8} 480 ${y}`} fill="none" stroke="#b98a55" strokeWidth="2" opacity="0.5" />
      ))}

      {/* window */}
      <g>
        <rect x="64" y="92" width="300" height="232" rx="20" fill="#b07d49" stroke={STROKE} strokeWidth="3" />
        <rect x="80" y="108" width="268" height="200" rx="10" fill="url(#sky)" />
        <circle cx="296" cy="156" r="24" fill="#fbe6a0" />
        <ellipse cx="140" cy="150" rx="34" ry="12" fill="#ffffff" opacity="0.85" />
        <ellipse cx="200" cy="176" rx="26" ry="10" fill="#ffffff" opacity="0.7" />
        <path d="M80 250 Q150 214 230 244 T348 240 L348 308 L80 308 Z" fill="#a9cf90" />
        <path d="M80 270 Q160 248 250 270 T348 264 L348 308 L80 308 Z" fill="#8fbf7f" />
        <path d="M80 292 Q180 282 280 292 T348 290 L348 308 L80 308 Z" fill="#bfe0dc" />
        {/* mullions */}
        <line x1="214" y1="108" x2="214" y2="308" stroke="#c9a06a" strokeWidth="5" />
        <line x1="80" y1="208" x2="348" y2="208" stroke="#c9a06a" strokeWidth="5" />
      </g>

      {/* framed leaf picture */}
      <g transform="translate(404 150)">
        <rect x="-26" y="-30" width="52" height="60" rx="4" fill="#fffaf2" stroke={STROKE} strokeWidth="2.5" />
        <path d="M0 14 Q-14 0 0 -16 Q14 0 0 14 Z" fill="#9cc488" />
        <line x1="0" y1="14" x2="0" y2="-16" stroke="#6f8f52" strokeWidth="1.6" />
      </g>

      {/* hanging lamp + warm glow */}
      <circle cx="150" cy="402" r="78" fill="url(#glow)" />
      <line x1="150" y1="92" x2="150" y2="356" stroke="#6b5440" strokeWidth="3" />
      <path d="M126 356 L174 356 L166 388 L134 388 Z" fill="#edb24a" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="150" cy="392" rx="14" ry="5" fill="#fff0bf" />

      {/* wall shelf + plant */}
      <g transform="translate(120 432)">
        <rect x="-34" y="0" width="68" height="8" rx="3" fill="#b6854f" stroke={STROKE} strokeWidth="2" />
        <rect x="-26" y="-22" width="18" height="22" rx="3" fill="#cf8b66" stroke={STROKE} strokeWidth="2" />
        <path d="M-17 -22 Q-28 -44 -17 -52 Q-6 -44 -17 -22 Z" fill="#8fb86c" stroke={STROKE} strokeWidth="2" />
        <path d="M-17 -22 Q-6 -40 6 -46" fill="none" stroke="#8fb86c" strokeWidth="4" strokeLinecap="round" />
        <rect x="6" y="-16" width="14" height="16" rx="3" fill="#7fa86a" stroke={STROKE} strokeWidth="2" />
      </g>

      {/* rug */}
      <ellipse cx="240" cy="712" rx="156" ry="46" fill="#e7b9a6" />
      <ellipse cx="240" cy="712" rx="132" ry="36" fill="none" stroke="#d99" strokeWidth="3" opacity="0.7" />

      {/* bed (left) */}
      <g transform="translate(54 556)">
        <rect x="0" y="20" width="150" height="70" rx="12" fill="#c98f7d" stroke={STROKE} strokeWidth="3" />
        <rect x="6" y="6" width="138" height="40" rx="12" fill="#f1ddcd" stroke={STROKE} strokeWidth="2.5" />
        <rect x="6" y="22" width="138" height="24" rx="8" fill="#bfe07d" />
        <rect x="6" y="32" width="138" height="14" fill="#a9cf6a" opacity="0.6" />
        <rect x="14" y="2" width="46" height="26" rx="10" fill="#fffaf2" stroke={STROKE} strokeWidth="2.5" />
      </g>

      {/* plant pot (front-right) */}
      <g transform="translate(412 678)">
        <path d="M-22 0 L22 0 L17 34 L-17 34 Z" fill="#cf8b66" stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
        <path d="M0 0 Q-30 -34 -16 -60 Q0 -44 0 0 Z" fill="#7fa86a" stroke={STROKE} strokeWidth="2.5" />
        <path d="M0 0 Q30 -36 14 -64 Q0 -44 0 0 Z" fill="#8fb86c" stroke={STROKE} strokeWidth="2.5" />
        <path d="M0 0 Q4 -46 0 -70 Q-6 -44 0 0 Z" fill="#94c270" stroke={STROKE} strokeWidth="2.5" />
      </g>

      {/* wall postcards (-> album) */}
      {onOpenAlbum && (
        <g style={{ cursor: "pointer" }} onClick={onOpenAlbum}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${340 + i * 54} ${150}) rotate(${i % 2 ? 5 : -5})`}>
              <rect x="-22" y="-16" width="44" height="34" rx="3" fill="#fffdf8" stroke={STROKE} strokeWidth="2.5" />
              <rect x="-18" y="-12" width="36" height="18" rx="2" fill={["#8ecbd6", "#9cc488", "#e9b9c6"][i]} />
              <circle cx="0" cy="-13" r="3" fill="#d95f59" />
            </g>
          ))}
          <HintPill x={394} y={104} icon="📮" label="明信片" />
        </g>
      )}

      {/* backpack (-> pack) */}
      {mode === "home" && onOpenPack && (
        <g style={{ cursor: "pointer" }} onClick={onOpenPack}>
          <g transform="translate(392 648)">
            <ellipse cx="0" cy="58" rx="34" ry="8" fill="rgba(80,60,40,0.16)" />
            <rect x="-30" y="-6" width="60" height="64" rx="20" fill="#dd9152" stroke={STROKE} strokeWidth="3" />
            <rect x="-18" y="16" width="36" height="30" rx="10" fill="#ecae6e" stroke={STROKE} strokeWidth="2.5" />
            <path d="M-30 6 Q0 -22 30 6 L30 16 Q0 -8 -30 16 Z" fill="#c87a3c" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
          </g>
          <HintPill x={392} y={576} icon="🧳" label="打包" />
        </g>
      )}

      {/* the companion */}
      {mode === "home" ? (
        <g style={{ cursor: "pointer" }} onClick={speak}>
          <g transform="translate(168 556) scale(1.3)">
            <CapybaraGuts color={color} accessory={accessory} />
          </g>
        </g>
      ) : (
        <HintPill x={240} y={636} icon="🚪" label="它出门旅行去啦" />
      )}

      {/* speech bubble */}
      {bubble && (
        <g transform="translate(240 512)" style={{ pointerEvents: "none" }}>
          <rect x="-130" y="-34" width="260" height="48" rx="16" fill="#fffdf8" stroke={STROKE} strokeWidth="2.5" />
          <path d="M-10 12 L0 26 L10 12 Z" fill="#fffdf8" stroke={STROKE} strokeWidth="2.5" />
          <rect x="-10" y="10" width="20" height="6" fill="#fffdf8" />
          <text x="0" y="-4" textAnchor="middle" fontSize="17" fill="#3a2e2a">
            {bubble}
          </text>
        </g>
      )}
    </svg>
  );
}
