"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import { getDestination } from "@/game/destinations";
import type { DestinationTheme } from "@/game/types";
import Backpack from "./Backpack";
import { getToonGradient, INK } from "./materials";
import { FLOOR_H, STAIR_HIGH, STAIR_LOW } from "./villaLayout";

interface VillaProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

const WALL = "#f3e6cf";
const WALL_BACK = "#efe0c6";
const FLOOR0 = "#e3c9a3";
const FLOOR1 = "#e8d2ad";
const ROOF = "#c98f6f";

// building bounds
const X0 = -2.6;
const X1 = 2.6;
const ZB = -1.6; // back wall
const ZF = 1.1; // open front
const DEPTH = ZF - ZB; // 2.7
const CZ = (ZF + ZB) / 2; // center z
const WIDTH = X1 - X0; // 5.2
const TOP = 3.9;

export default function Villa({
  mode,
  postcardThemes = [],
  onOpenPack,
  onOpenAlbum,
}: VillaProps) {
  const grad = getToonGradient();
  const toon = (c: string) => <meshToonMaterial color={c} gradientMap={grad} />;

  return (
    <group>
      {/* ground floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CZ]} receiveShadow>
        <planeGeometry args={[WIDTH, DEPTH]} />
        {toon(FLOOR0)}
      </mesh>
      {/* back wall (full height) */}
      <mesh position={[0, TOP / 2, ZB]} receiveShadow>
        <planeGeometry args={[WIDTH, TOP]} />
        {toon(WALL_BACK)}
      </mesh>
      {/* left + right walls */}
      <mesh position={[X0, TOP / 2, CZ]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[DEPTH, TOP]} />
        {toon(WALL)}
      </mesh>
      <mesh position={[X1, TOP / 2, CZ]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[DEPTH, TOP]} />
        {toon(WALL)}
      </mesh>
      {/* roof */}
      <mesh position={[0, TOP + 0.05, CZ]}>
        <boxGeometry args={[WIDTH + 0.3, 0.16, DEPTH + 0.3]} />
        {toon(ROOF)}
        <Outlines thickness={0.02} color={INK} />
      </mesh>

      {/* loft slab (covers left portion only -> double-height living on the right) */}
      <group>
        <mesh position={[-1.05, FLOOR_H - 0.04, CZ]}>
          <boxGeometry args={[3.1, 0.1, DEPTH]} />
          {toon(FLOOR1)}
          <Outlines thickness={0.015} color={INK} />
        </mesh>
        {/* loft railing along the open edge (x = 0.5) */}
        <mesh position={[0.5, FLOOR_H + 0.28, CZ]}>
          <boxGeometry args={[0.06, 0.06, DEPTH]} />
          {toon("#caa57a")}
        </mesh>
        {[-1.1, -0.3, 0.4, 1.0].map((z, i) => (
          <mesh key={i} position={[0.5, FLOOR_H + 0.14, z]}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
            {toon("#caa57a")}
          </mesh>
        ))}
        {/* loft front railing */}
        <mesh position={[-1.05, FLOOR_H + 0.28, ZF - 0.04]}>
          <boxGeometry args={[3.1, 0.06, 0.06]} />
          {toon("#caa57a")}
        </mesh>
      </group>

      {/* stairs from ground (right) up to loft (left) */}
      <group>
        {Array.from({ length: 7 }).map((_, i) => {
          const t = i / 6;
          const x = STAIR_LOW[0] + (STAIR_HIGH[0] - STAIR_LOW[0]) * t;
          const y = 0.16 + 1.66 * t;
          return (
            <mesh key={i} position={[x, y - 0.07, STAIR_LOW[2]]} castShadow>
              <boxGeometry args={[0.24, 0.14, 0.62]} />
              {toon("#caa176")}
              <Outlines thickness={0.012} color={INK} />
            </mesh>
          );
        })}
      </group>

      {/* divider hint between storage and living (low partition) */}
      <mesh position={[-0.35, 0.55, -0.6]}>
        <boxGeometry args={[0.08, 1.1, 1.9]} />
        {toon("#e7d6ba")}
      </mesh>

      {/* ============ STORAGE (left, ground) ============ */}
      <group>
        {/* 仓库 shelves on the left wall */}
        {[0.55, 1.15].map((y, i) => (
          <mesh key={i} position={[X0 + 0.22, y, -0.4]}>
            <boxGeometry args={[0.34, 0.06, 1.4]} />
            {toon("#b98a5c")}
            <Outlines thickness={0.012} color={INK} />
          </mesh>
        ))}
        {/* little stored crates / jars on shelves */}
        {[
          [-0.85, 0.65, "#d98a4f"],
          [-0.6, 1.25, "#8aa978"],
          [-1.05, 1.25, "#6fa8c9"],
        ].map(([z, y, c], i) => (
          <mesh key={i} position={[X0 + 0.22, y as number, z as number]} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            {toon(c as string)}
            <Outlines thickness={0.012} color={INK} />
          </mesh>
        ))}
        {/* storage sign */}
        <mesh position={[-1.75, 1.7, ZB + 0.04]}>
          <planeGeometry args={[0.7, 0.3]} />
          {toon("#fff3cf")}
        </mesh>

        {/* the backpack lives in storage — click to pack */}
        {mode === "home" && (
          <group position={[-1.95, 0, 0.35]} scale={0.9}>
            <Backpack
              onClick={(e) => {
                e.stopPropagation();
                onOpenPack?.();
              }}
            />
          </group>
        )}
      </group>

      {/* ============ LIVING (right, ground, double height) ============ */}
      <group>
        {/* rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.1, 0.01, 0.45]}>
          <circleGeometry args={[0.95, 32]} />
          {toon("#e7b9a6")}
        </mesh>
        {/* desk against back wall */}
        <group position={[1.5, 0, -1.2]}>
          <RoundedBox args={[1.3, 0.08, 0.6]} radius={0.03} smoothness={2} position={[0, 0.78, 0]} castShadow>
            {toon("#bd8a5c")}
            <Outlines thickness={0.015} color={INK} />
          </RoundedBox>
          {[
            [-0.55, -0.22],
            [0.55, -0.22],
            [-0.55, 0.22],
            [0.55, 0.22],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.39, z]}>
              <cylinderGeometry args={[0.04, 0.04, 0.78, 8]} />
              {toon("#a9774b")}
            </mesh>
          ))}
          {/* lamp */}
          <group position={[0.45, 0.82, -0.1]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.34, 8]} />
              {toon("#9a8f86")}
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <coneGeometry args={[0.15, 0.16, 16, 1, true]} />
              {toon("#f0c25a")}
              <Outlines thickness={0.018} color={INK} />
            </mesh>
            <pointLight position={[0, 0.34, 0.05]} intensity={mode === "away" ? 4 : 6} distance={3.4} decay={2} color="#ffd9a0" />
          </group>
          {/* note */}
          <mesh position={[-0.35, 0.83, 0.05]} rotation={[-Math.PI / 2, 0, 0.2]}>
            <planeGeometry args={[0.26, 0.26]} />
            {toon(mode === "away" ? "#f6c89a" : "#fff3b0")}
          </mesh>
        </group>
        {/* window on back wall (living) */}
        <Window x={1.7} y={1.55} />
        {/* plant */}
        <group position={[2.2, 0, -0.7]}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.13, 0.36, 14]} />
            {toon("#cf7b59")}
            <Outlines thickness={0.02} color={INK} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <icosahedronGeometry args={[0.34, 0]} />
            {toon("#8aa978")}
            <Outlines thickness={0.025} color={INK} />
          </mesh>
        </group>
        {/* door on right wall */}
        <group position={[X1 - 0.02, 0, 0.55]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.7, 0]}>
            <planeGeometry args={[0.7, 1.4]} />
            {toon("#a9774b")}
          </mesh>
          <mesh position={[0.22, 0.7, 0.01]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            {toon("#f4d35e")}
          </mesh>
        </group>
        {/* wall postcards (click -> album) */}
        <group position={[0.6, 1.55, ZB + 0.03]} onClick={onOpenAlbum}>
          {postcardThemes.length === 0 ? (
            <PinnedCard x={0} tilt={0.05} theme="seaside" faded />
          ) : (
            postcardThemes.slice(0, 3).map((theme, i) => (
              <PinnedCard
                key={i}
                x={(i - (Math.min(postcardThemes.length, 3) - 1) / 2) * 0.62}
                tilt={i % 2 === 0 ? 0.06 : -0.06}
                theme={theme}
              />
            ))
          )}
        </group>
      </group>

      {/* ============ LOFT BEDROOM (left) ============ */}
      <group position={[0, FLOOR_H, 0]}>
        {/* bed */}
        <group position={[-1.6, 0, -0.55]}>
          <RoundedBox args={[1.0, 0.3, 1.5]} radius={0.07} smoothness={2} position={[0, 0.18, 0]} castShadow>
            {toon("#c98f7d")}
            <Outlines thickness={0.018} color={INK} />
          </RoundedBox>
          <RoundedBox args={[0.96, 0.16, 1.46]} radius={0.07} smoothness={2} position={[0, 0.38, 0]}>
            {toon("#f3ddd0")}
          </RoundedBox>
          <RoundedBox args={[0.7, 0.16, 0.36]} radius={0.07} smoothness={2} position={[0, 0.44, -0.52]}>
            {toon("#fffaf2")}
            <Outlines thickness={0.018} color={INK} />
          </RoundedBox>
        </group>
        {/* loft rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.6, 0.01, 0.4]}>
          <circleGeometry args={[0.55, 28]} />
          {toon("#d9c3a3")}
        </mesh>
        {/* loft window */}
        <Window x={-0.75} y={0.95} />
      </group>
    </group>
  );
}

function Window({ x, y }: { x: number; y: number }) {
  const grad = getToonGradient();
  const toon = (c: string) => <meshToonMaterial color={c} gradientMap={grad} />;
  return (
    <group position={[x, y, ZB + 0.02]}>
      <mesh>
        <planeGeometry args={[1.1, 1.0]} />
        {toon("#bfe3e0")}
      </mesh>
      <mesh position={[0.28, 0.26, 0.01]}>
        <circleGeometry args={[0.14, 18]} />
        {toon("#f4d98a")}
      </mesh>
      <mesh position={[-0.18, -0.36, 0.01]}>
        <circleGeometry args={[0.42, 22]} />
        {toon("#9fc08a")}
      </mesh>
      {/* frame bars */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.16, 0.06, 0.03]} />
        {toon("#fffaf2")}
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 1.06, 0.03]} />
        {toon("#fffaf2")}
      </mesh>
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
  const grad = getToonGradient();
  const { mid } = getDestination(theme).palette;
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, tilt]}>
      <mesh>
        <planeGeometry args={[0.5, 0.38]} />
        <meshToonMaterial color={INK} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.44, 0.32]} />
        <meshToonMaterial
          color={faded ? "#e7d9c2" : mid}
          gradientMap={grad}
          transparent
          opacity={faded ? 0.6 : 1}
        />
      </mesh>
      <mesh position={[0, 0.21, 0.02]}>
        <circleGeometry args={[0.03, 12]} />
        <meshToonMaterial color="#d95f59" gradientMap={grad} />
      </mesh>
    </group>
  );
}
