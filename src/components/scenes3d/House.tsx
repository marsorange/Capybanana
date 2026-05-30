"use client";

import { Html, RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { getDestination } from "@/game/destinations";
import type { DestinationTheme } from "@/game/types";
import Backpack from "./Backpack";
import { commandWalk } from "./commandBus";
import { FLOOR_H, STAIR_HIGH, STAIR_LOW, type Vec3 } from "./villaLayout";

const BACKPACK_SPOT: Vec3 = [-1.0, 0, -0.3];
const POSTCARD_SPOT: Vec3 = [-3.9, 0, -0.8];

interface HouseProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

// footprint
const XL = -4.6;
const XR = 0.4;
const ZB = -4.6;
const ZF = -0.2;
const W = XR - XL;
const D = ZF - ZB;
const CX = (XL + XR) / 2;
const CZ = (ZB + ZF) / 2;
const TOP = 4.2;

// palette
const WALL = "#ecdcb9";
const WALL_BACK = "#e6d3aa";
const WOOD = "#a9774b";
const WOOD_DK = "#8a5a32";
const FLOOR0 = "#cf9f63";
const FLOOR1 = "#dab985";
const TILE = "#edb43f";
const TILE_DK = "#dc9b2c";
const GREEN = "#8fae66";
const GREEN_DK = "#7ba65f";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

function Box({
  args,
  pos,
  color,
  rot,
}: {
  args: [number, number, number];
  pos: [number, number, number];
  color: string;
  rot?: [number, number, number];
}) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={args} />
      {m(color)}
    </mesh>
  );
}

function RB({
  args,
  pos,
  color,
  radius = 0.06,
}: {
  args: [number, number, number];
  pos: [number, number, number];
  color: string;
  radius?: number;
}) {
  return (
    <RoundedBox args={args} radius={radius} smoothness={2} position={pos}>
      {m(color)}
    </RoundedBox>
  );
}

function Hint({
  pos,
  icon,
  label,
  onClick,
}: {
  pos: [number, number, number];
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Html position={pos} center zIndexRange={[20, 0]}>
      <button
        onClick={onClick}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        className="flex -translate-y-1 animate-float-soft items-center gap-1 whitespace-nowrap rounded-full border-2 border-ink bg-paper/95 px-2 py-1 text-sm text-ink shadow-[0_2px_0_rgba(58,46,42,0.2)]"
      >
        <span>{icon}</span>
        {hover && <span className="pr-0.5 text-xs">{label}</span>}
      </button>
    </Html>
  );
}

export default function House({
  mode,
  postcardThemes = [],
  onOpenPack,
  onOpenAlbum,
}: HouseProps) {
  // tap -> walk the companion over, then open
  const goPack = () => {
    if (!onOpenPack) return;
    if (mode === "away") onOpenPack();
    else commandWalk(BACKPACK_SPOT, 0, onOpenPack);
  };
  const goAlbum = () => {
    if (!onOpenAlbum) return;
    if (mode === "away") onOpenAlbum();
    else commandWalk(POSTCARD_SPOT, 0, onOpenAlbum);
  };

  return (
    <group>
      {/* ground floor + trim */}
      <RB args={[W, 0.18, D]} pos={[CX, 0.05, CZ]} color={FLOOR0} radius={0.04} />
      <Box args={[0.16, TOP, D]} pos={[XL, TOP / 2, CZ]} color={WALL} />
      <Box args={[W, TOP, 0.16]} pos={[CX, TOP / 2, ZB]} color={WALL_BACK} />
      <Box args={[0.22, TOP, 0.22]} pos={[XL, TOP / 2, ZB]} color={WOOD} />
      <Box args={[W, 0.16, 0.18]} pos={[CX, FLOOR_H - 0.02, ZB + 0.03]} color={WOOD_DK} />
      <Box args={[0.18, 0.16, D]} pos={[XL + 0.03, FLOOR_H - 0.02, CZ]} color={WOOD_DK} />

      {/* loft slab + railing */}
      <RB args={[3.5, 0.2, D]} pos={[XL + 1.75, FLOOR_H - 0.1, CZ]} color={FLOOR1} radius={0.03} />
      <Box args={[0.12, 0.22, D]} pos={[-1.05, FLOOR_H - 0.1, CZ]} color={WOOD} />
      {[-0.7, -0.1, -3.9].map((z, i) => (
        <Box key={i} args={[0.08, 0.4, 0.08]} pos={[-1.1, FLOOR_H + 0.2, z]} color={WOOD} />
      ))}
      <Box args={[0.07, 0.08, 1.7]} pos={[-1.1, FLOOR_H + 0.34, -0.9]} color={WOOD_DK} />

      {/* stairs */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = i / 7;
        const x = STAIR_LOW[0] + (STAIR_HIGH[0] - STAIR_LOW[0]) * t;
        const z = STAIR_LOW[2] + (STAIR_HIGH[2] - STAIR_LOW[2]) * t;
        const y = 0.18 + (FLOOR_H - 0.18) * t;
        return <Box key={i} args={[0.44, 0.16, 0.54]} pos={[x, y - 0.08, z]} color="#c89a64" />;
      })}

      {/* tiled gable roof */}
      <group position={[CX, TOP, CZ]}>
        <Box args={[W + 0.7, 0.18, D + 0.7]} pos={[0, 0.02, 0]} color={WOOD} />
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * 1.18, 0.6, 0]} rotation={[0, 0, side * -0.6]}>
            <boxGeometry args={[2.2, 0.18, D + 0.7]} />
            {m(TILE)}
          </mesh>
        ))}
        <Box args={[0.28, 0.22, D + 0.7]} pos={[0, 1.16, 0]} color={TILE_DK} />
        <mesh position={[0, 0.58, -(D / 2) - 0.18]}>
          <cylinderGeometry args={[1.08, 1.08, 0.14, 3]} />
          {m(WALL_BACK)}
        </mesh>
        {/* rooftop plant */}
        <group position={[-1.55, 0.9, 1.0]}>
          <RB args={[0.36, 0.3, 0.36]} pos={[0, 0, 0]} color="#dcd6c6" radius={0.05} />
          <mesh position={[0, 0.3, 0]}>
            <icosahedronGeometry args={[0.24, 0]} />
            {m(GREEN)}
          </mesh>
        </group>
      </group>

      {/* round window (back wall, bedroom) */}
      <group position={[-3.1, 3.05, ZB + 0.12]}>
        <mesh>
          <circleGeometry args={[0.42, 24]} />
          {m("#bfe3e0")}
        </mesh>
        <Box args={[0.86, 0.06, 0.04]} pos={[0, 0, 0.02]} color="#fffaf2" />
        <Box args={[0.06, 0.86, 0.04]} pos={[0, 0, 0.02]} color="#fffaf2" />
      </group>
      {/* leaf art + window on -x wall */}
      <Box args={[0.04, 0.5, 0.4]} pos={[XL + 0.11, 1.55, -3.4]} color="#fffaf2" />
      <Box args={[0.05, 0.7, 0.9]} pos={[XL + 0.1, 1.7, -2.0]} color="#bfe3e0" />

      {/* ===== LIVING ===== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.7, 0.15, -0.85]}>
        <circleGeometry args={[1.2, 28]} />
        {m("#e7b9a6")}
      </mesh>
      <group position={[-4.0, 0, -1.2]}>
        <RB args={[0.55, 0.5, 1.7]} pos={[0, 0.4, 0]} color={GREEN} radius={0.1} />
        <RB args={[0.6, 0.4, 1.7]} pos={[0.16, 0.62, 0]} color="#9cbd72" radius={0.1} />
        <RB args={[0.44, 0.2, 0.5]} pos={[0.2, 0.6, -0.5]} color="#edc75a" radius={0.08} />
        <RB args={[0.44, 0.2, 0.5]} pos={[0.2, 0.6, 0.5]} color="#edc75a" radius={0.08} />
      </group>
      <group position={[-2.8, 0, -0.5]}>
        <RB args={[0.72, 0.28, 0.72]} pos={[0, 0.18, 0]} color={WOOD} radius={0.05} />
        <mesh position={[0, 0.42, 0]}>
          <icosahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial color="#c8f08a" emissive="#9be05a" emissiveIntensity={0.7} roughness={1} />
        </mesh>
      </group>
      {/* floor lamp (emissive glow, no real light for perf) */}
      <group position={[-1.5, 0, -1.5]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 1.2, 6]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 1.28, 0]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshStandardMaterial color="#ffe39c" emissive="#ffce63" emissiveIntensity={0.85} roughness={1} />
        </mesh>
      </group>

      {/* ===== KITCHEN ===== */}
      <group position={[-3.2, 0, -4.05]}>
        <RB args={[2.0, 0.72, 0.5]} pos={[0, 0.36, 0]} color={WOOD} radius={0.04} />
        <Box args={[2.04, 0.08, 0.56]} pos={[0, 0.74, 0]} color="#caa274" />
        <Box args={[0.42, 0.05, 0.34]} pos={[-0.5, 0.77, 0]} color="#cdd6d0" />
        <Box args={[1.4, 0.06, 0.22]} pos={[0, 1.5, -0.12]} color={WOOD} />
        <mesh position={[-0.3, 1.66, -0.1]}>
          <icosahedronGeometry args={[0.14, 0]} />
          {m(GREEN)}
        </mesh>
      </group>
      <RB args={[0.6, 1.42, 0.5]} pos={[-1.35, 0.72, -4.05]} color={GREEN_DK} radius={0.06} />

      {/* ===== DINING ===== */}
      <group position={[-2.45, 0, -3.05]}>
        <RB args={[0.95, 0.1, 0.72]} pos={[0, 0.62, 0]} color="#bd8a5c" radius={0.03} />
        {[-0.37, 0.37].map((x, i) => (
          <Box key={i} args={[0.07, 0.6, 0.07]} pos={[x, 0.31, 0]} color={WOOD} />
        ))}
        {[0.56, -0.56].map((z, i) => (
          <RB key={i} args={[0.34, 0.34, 0.34]} pos={[0, 0.17, z]} color="#caa274" radius={0.05} />
        ))}
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          {m("#d98a6a")}
        </mesh>
      </group>

      {/* ===== LOFT: bedroom + bath ===== */}
      <group position={[0, FLOOR_H, 0]}>
        <group position={[-3.6, 0, -3.4]}>
          <RB args={[1.5, 0.34, 1.25]} pos={[0, 0.22, 0]} color={WOOD} radius={0.05} />
          <RB args={[1.42, 0.2, 1.16]} pos={[0, 0.44, 0]} color="#bfe07d" radius={0.06} />
          <RB args={[1.42, 0.08, 0.5]} pos={[0, 0.56, 0.34]} color="#f3ead4" radius={0.05} />
          <RB args={[0.55, 0.34, 1.0]} pos={[-0.46, 0.5, 0]} color="#fffaf2" radius={0.06} />
          <RB args={[0.4, 0.18, 0.32]} pos={[-0.2, 0.58, -0.3]} color="#edc75a" radius={0.05} />
        </group>
        <group position={[-4.3, 0, -2.3]}>
          <RB args={[0.5, 0.5, 0.5]} pos={[0, 0.25, 0]} color={WOOD} radius={0.05} />
          <mesh position={[0, 0.66, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color="#ffe39c" emissive="#ffce63" emissiveIntensity={0.85} roughness={1} />
          </mesh>
        </group>
        <group position={[-1.7, 0, -3.7]}>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.56, 0.5, 0.64, 16]} />
            {m(WOOD)}
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.47, 0.47, 0.1, 16]} />
            {m("#7ec7cf")}
          </mesh>
        </group>
        <group position={[-2.55, 1.0, -4.4]}>
          <Box args={[0.6, 0.06, 0.22]} pos={[0, 0, 0]} color={WOOD} />
          <mesh position={[0, 0.18, 0]}>
            <icosahedronGeometry args={[0.18, 0]} />
            {m(GREEN)}
          </mesh>
        </group>
      </group>

      {/* wall postcards (diegetic -> album) */}
      <group position={[XL + 0.12, 1.45, -0.8]} rotation={[0, Math.PI / 2, 0]} onClick={goAlbum}>
        {(postcardThemes.length ? postcardThemes.slice(0, 3) : (["seaside"] as DestinationTheme[])).map(
          (theme, i, arr) => (
            <PinnedCard key={i} x={(i - (arr.length - 1) / 2) * 0.64} tilt={i % 2 === 0 ? 0.06 : -0.06} theme={theme} faded={!postcardThemes.length} />
          ),
        )}
      </group>
      <Hint pos={[-4.45, 2.2, -0.8]} icon="📮" label="明信片" onClick={goAlbum} />

      {/* backpack (diegetic -> pack) */}
      {mode === "home" && (
        <>
          <group
            position={[-1.5, 0, -0.7]}
            scale={0.95}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              goPack();
            }}
          >
            <Backpack />
          </group>
          <Hint pos={[-1.5, 1.1, -0.7]} icon="🧳" label="打包行李" onClick={goPack} />
        </>
      )}
    </group>
  );
}

function PinnedCard({
  x,
  tilt,
  theme,
  faded,
}: {
  x: number;
  tilt: number;
  theme: DestinationTheme;
  faded?: boolean;
}) {
  const { mid } = getDestination(theme).palette;
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, tilt]}>
      <mesh>
        <planeGeometry args={[0.52, 0.4]} />
        <meshStandardMaterial color="#3a2e2a" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.46, 0.34]} />
        <meshStandardMaterial color={faded ? "#e7d9c2" : mid} roughness={1} metalness={0} transparent opacity={faded ? 0.6 : 1} />
      </mesh>
    </group>
  );
}
