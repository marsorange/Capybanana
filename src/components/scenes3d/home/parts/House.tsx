"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getDestination } from "@/game/destinations";
import type { DestinationTheme } from "@/game/types";
import Backpack from "./Backpack";
import { commandWalk } from "../interaction/commandBus";
import { FLOOR_H, STAIR_HIGH, STAIR_LOW, type Vec3 } from "../layout";

const BACKPACK_SPOT: Vec3 = [-1.0, 0, -0.3];
const POSTCARD_SPOT: Vec3 = [-3.9, 0, -0.8];

interface HouseProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

// footprint — kept in sync with ../layout so the pet roams correctly.
const XL = -4.6;
const XR = 0.4;
const ZB = -4.6;
const ZF = -0.2;
const W = XR - XL;
const D = ZF - ZB;
const CX = (XL + XR) / 2;
const CZ = (ZB + ZF) / 2;
const TOP = 4.7;

// palette — fresh, bright "日系" cottage
const WALL = "#f8f1e2";
const WALL_BACK = "#f1e8d3";
const WAINSCOT = "#e6d6b2";
const WOOD = "#c08f58";
const WOOD_DK = "#8e6238";
const WOOD_LT = "#d6ad74";
const FLOOR0 = "#e2c08a";
const FLOOR1 = "#ecd2a3";
const ROOF = "#f6ce60";
const ROOF_DK = "#ecbf4d";
const ROOF_RIDGE = "#b07d3c";
const GREEN = "#92c46b";
const GREEN_DK = "#7caf58";
const SAGE = "#9dbf8c";
const GOLD = "#e8b85c";
const CREAM = "#fff6e6";
const GLASS = "#cfe9e4";
const PINK = "#f1a6bd";
const RED = "#d95f59";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} flatShading />
);
const glow = (c: string, e: string, i = 0.85) => (
  <meshStandardMaterial color={c} emissive={e} emissiveIntensity={i} roughness={1} metalness={0} flatShading />
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
  rot,
}: {
  args: [number, number, number];
  pos: [number, number, number];
  color: string;
  radius?: number;
  rot?: [number, number, number];
}) {
  return (
    <RoundedBox args={args} radius={radius} smoothness={2} position={pos} rotation={rot}>
      {m(color)}
    </RoundedBox>
  );
}

// A leafy potted plant, reused all over the house.
function Plant({
  pos,
  scale = 1,
  pot = WOOD,
}: {
  pos: [number, number, number];
  scale?: number;
  pot?: string;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.22, 12]} />
        {m(pot)}
      </mesh>
      {([
        [0, 0.34, 0, 0.16, GREEN],
        [0.1, 0.28, 0.05, 0.12, GREEN_DK],
        [-0.08, 0.3, -0.04, 0.11, GREEN],
      ] as const).map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(c)}
        </mesh>
      ))}
    </group>
  );
}

// A framed picture on a wall (faces +x by default via rotation prop).
function Frame({
  pos,
  rot,
  color,
  w = 0.42,
  h = 0.34,
}: {
  pos: [number, number, number];
  rot?: [number, number, number];
  color: string;
  w?: number;
  h?: number;
}) {
  return (
    <group position={pos} rotation={rot}>
      <mesh>
        <planeGeometry args={[w, h]} />
        {m("#5a4636")}
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w - 0.07, h - 0.07]} />
        {m(color)}
      </mesh>
    </group>
  );
}

// A warm hanging pendant lamp with an emissive bulb.
function Pendant({
  pos,
  drop = 0.7,
  shade = WOOD_DK,
}: {
  pos: [number, number, number];
  drop?: number;
  shade?: string;
}) {
  return (
    <group position={pos}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, drop, 6]} />
        {m("#5a4636")}
      </mesh>
      <mesh position={[0, -drop / 2, 0]}>
        <coneGeometry args={[0.18, 0.2, 14, 1, true]} />
        <meshStandardMaterial color={shade} roughness={1} metalness={0} side={2} />
      </mesh>
      <mesh position={[0, -drop / 2 - 0.04, 0]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        {glow("#ffe9a8", "#ffcf63", 0.9)}
      </mesh>
    </group>
  );
}

// A row of colorful book spines for a shelf.
function Books({
  pos,
  count = 6,
  len = 0.7,
}: {
  pos: [number, number, number];
  count?: number;
  len?: number;
}) {
  const cols = ["#d98a6a", "#7fae9b", "#e6b85c", "#9a86b8", "#cf6f63", "#85a86a"];
  const gap = len / count;
  return (
    <group position={pos}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, 0.14, -len / 2 + gap * (i + 0.5)]}>
          <boxGeometry args={[0.16, 0.26 + (i % 3) * 0.03, gap * 0.82]} />
          {m(cols[i % cols.length])}
        </mesh>
      ))}
    </group>
  );
}

// A little stoppered preserve jar for the pantry shelves.
function Jar({ pos, color }: { pos: [number, number, number]; color: string }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.16, 8]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.04, 8]} />
        {m(WOOD_DK)}
      </mesh>
    </group>
  );
}

// A slumped burlap sack of grain.
function Sack({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.24, 7]} />
        {m("#d8c39a")}
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <coneGeometry args={[0.07, 0.08, 7]} />
        {m("#c8b186")}
      </mesh>
    </group>
  );
}

// A woven basket, optionally holding round produce.
function Basket({ pos, fruit = "#e88a3c" }: { pos: [number, number, number]; fruit?: string }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.16, 9]} />
        {m("#b27f44")}
      </mesh>
      {[[-0.05, 0.04], [0.05, -0.03], [0.0, 0.06]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]}>
          <icosahedronGeometry args={[0.05, 0]} />
          {m(fruit)}
        </mesh>
      ))}
    </group>
  );
}

// A tiny faceted capybara figurine — a cozy easter egg on the shelf.
function MiniCapy({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos} scale={0.8}>
      <mesh position={[0, 0.1, 0]} scale={[1.25, 0.85, 1]}>
        <icosahedronGeometry args={[0.12, 0]} />
        {m("#c79a5e")}
      </mesh>
      <mesh position={[0.12, 0.14, 0]}>
        <icosahedronGeometry args={[0.085, 0]} />
        {m("#c79a5e")}
      </mesh>
      <mesh position={[0.2, 0.13, 0]} scale={[0.9, 0.7, 0.7]}>
        <icosahedronGeometry args={[0.05, 0]} />
        {m("#d8b27e")}
      </mesh>
    </group>
  );
}

// A flat right-triangle gable end that closes the side of the sliced roof.
// The triangular attic face (gable wall) under the roof ridge.
function IsoGable({
  x,
  halfRun,
  h,
  color,
}: {
  x: number;
  halfRun: number;
  h: number;
  color: string;
}) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfRun, 0);
    s.lineTo(halfRun, 0);
    s.lineTo(0, h);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [halfRun, h]);
  return (
    <mesh position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geo}>
      <meshStandardMaterial
        color={color}
        roughness={1}
        metalness={0}
        flatShading
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// One tiled roof slope: a faceted plank dressed with raised, alternating tile
// courses so the roof reads as hand-laid tiles instead of a flat slab.
function RoofSlope({
  z,
  rot,
  width,
}: {
  z: number;
  rot: number;
  width: number;
}) {
  const courses = [-1.16, -0.58, 0, 0.58, 1.16];
  return (
    <group position={[0, 0.92, z]} rotation={[rot, 0, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.16, 2.92]} />
        {m(ROOF_DK)}
      </mesh>
      {courses.map((cz, i) => (
        <mesh key={i} position={[0, 0.1, cz]}>
          <boxGeometry args={[width + 0.06, 0.12, 0.48]} />
          {m(i % 2 ? "#f8d775" : ROOF)}
        </mesh>
      ))}
    </group>
  );
}

// A subtle pulsing ground ring that marks an interactive spot (no emoji).
function Beacon({ pos, color = "#e8b85c" }: { pos: [number, number, number]; color?: string }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const k = (Math.sin(s.clock.elapsedTime * 2) + 1) / 2;
    if (ring.current) {
      const sc = 0.8 + k * 0.55;
      ring.current.scale.set(sc, sc, sc);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - k * 0.4;
    }
  });
  return (
    <mesh ref={ring} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.34, 0.44, 28]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
    </mesh>
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
      {/* ===== SHELL ===== */}
      {/* ground floor slab + plinth */}
      <RB args={[W, 0.2, D]} pos={[CX, 0.06, CZ]} color={FLOOR0} radius={0.05} />
      <Box args={[W + 0.16, 0.12, D + 0.16]} pos={[CX, 0.02, CZ]} color={WOOD_DK} />

      {/* -x wall (left) with a wainscot band */}
      <RB args={[0.18, TOP, D]} pos={[XL, TOP / 2, CZ]} color={WALL} radius={0.04} />
      <Box args={[0.2, 0.9, D]} pos={[XL + 0.005, 0.5, CZ]} color={WAINSCOT} />
      {/* -z wall (back) */}
      <RB args={[W, TOP, 0.18]} pos={[CX, TOP / 2, ZB]} color={WALL_BACK} radius={0.04} />
      <Box args={[W, 0.9, 0.2]} pos={[CX, 0.5, ZB + 0.005]} color={WAINSCOT} />
      {/* corner post + floor trims */}
      <Box args={[0.24, TOP, 0.24]} pos={[XL, TOP / 2, ZB]} color={WOOD} />
      <Box args={[W, 0.14, 0.16]} pos={[CX, FLOOR_H - 0.02, ZB + 0.04]} color={WOOD_DK} />
      <Box args={[0.16, 0.14, D]} pos={[XL + 0.04, FLOOR_H - 0.02, CZ]} color={WOOD_DK} />

      {/* ---- timber frame: corner posts at the open cut edges + wall-top plates
            + a loft-edge fascia, so the cross-section reads as a built house ---- */}
      <Box args={[0.24, TOP, 0.24]} pos={[XL + 0.02, TOP / 2, ZF]} color={WOOD} />
      <Box args={[0.24, TOP, 0.24]} pos={[XR, TOP / 2, ZB + 0.02]} color={WOOD} />
      <Box args={[0.22, 0.2, D + 0.1]} pos={[XL + 0.02, TOP - 0.1, CZ]} color={WOOD} />
      <Box args={[W + 0.1, 0.2, 0.22]} pos={[CX, TOP - 0.1, ZB + 0.02]} color={WOOD} />
      <Box args={[3.5, 0.24, 0.18]} pos={[XL + 1.75, FLOOR_H - 0.1, ZF]} color={WOOD} />
      <Box args={[0.18, 0.24, D]} pos={[XL + 0.05, FLOOR_H - 0.1, CZ]} color={WOOD} />

      {/* loft slab + railing */}
      <RB args={[3.5, 0.22, D]} pos={[XL + 1.75, FLOOR_H - 0.11, CZ]} color={FLOOR1} radius={0.04} />
      <Box args={[0.12, 0.24, D]} pos={[-1.05, FLOOR_H - 0.1, CZ]} color={WOOD} />
      {[-0.65, -1.3, -2.0, -2.7, -3.9].map((z, i) => (
        <Box key={i} args={[0.07, 0.42, 0.07]} pos={[-1.1, FLOOR_H + 0.2, z]} color={WOOD} />
      ))}
      <Box args={[0.08, 0.09, 1.9]} pos={[-1.1, FLOOR_H + 0.36, -1.0]} color={WOOD_DK} />

      {/* stairs + runner */}
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8;
        const x = STAIR_LOW[0] + (STAIR_HIGH[0] - STAIR_LOW[0]) * t;
        const z = STAIR_LOW[2] + (STAIR_HIGH[2] - STAIR_LOW[2]) * t;
        const y = 0.18 + (FLOOR_H - 0.18) * t;
        return (
          <group key={i}>
            <Box args={[0.46, 0.16, 0.56]} pos={[x, y - 0.08, z]} color={WOOD_LT} />
            <Box args={[0.22, 0.04, 0.56]} pos={[x, y + 0.01, z]} color={RED} />
          </group>
        );
      })}

      {/* ===== ROOF — a proper tiled gable. Eaves sit at the wall-top so the
            iso sightlines pass UNDER the front eave into the rooms (no occlusion),
            while the warm tiled slopes + rounded ridge give it real character. */}
      <group position={[CX, TOP, CZ]}>
        {/* cream attic gables on each end (the +x one faces the camera) */}
        <IsoGable x={2.9} halfRun={2.25} h={1.8} color={WALL_BACK} />
        <IsoGable x={-2.9} halfRun={2.25} h={1.8} color={WALL_BACK} />
        {/* back slope: full tiled plane */}
        <RoofSlope z={-1.12} rot={-0.685} width={5.8} />
        {/* truncated FRONT: a short tiled lip at the ridge, then exposed rafters
            below it — a refined, sectioned cutaway roof */}
        <group position={[0, 0.92, 1.12]} rotation={[0.685, 0, 0]}>
          <mesh position={[0, 0, -1.06]}>
            <boxGeometry args={[5.8, 0.16, 0.8]} />
            {m(ROOF_DK)}
          </mesh>
          <mesh position={[0, 0.1, -1.18]}>
            <boxGeometry args={[5.86, 0.12, 0.46]} />
            {m("#f8d775")}
          </mesh>
          {/* dark tile-thickness band at the cut edge */}
          <mesh position={[0, 0, -0.64]}>
            <boxGeometry args={[5.82, 0.22, 0.1]} />
            {m("#c69a55")}
          </mesh>
          {/* exposed rafters spanning the open front */}
          {[-2.5, -1.9, -1.3, -0.7, -0.1, 0.5, 1.1, 1.7, 2.4].map((rx, i) => (
            <mesh key={i} position={[rx, -0.06, 0.34]}>
              <boxGeometry args={[0.1, 0.13, 1.78]} />
              {m(WOOD)}
            </mesh>
          ))}
          {/* eave purlin tying the rafter ends */}
          <mesh position={[0, -0.06, 1.18]}>
            <boxGeometry args={[5.8, 0.14, 0.12]} />
            {m(WOOD_DK)}
          </mesh>
        </group>
        {/* rounded faceted ridge beam */}
        <mesh position={[0, 1.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 6.0, 6]} />
          {m("#e0a93c")}
        </mesh>
        {/* wood fascia boards along the two eaves */}
        <Box args={[5.95, 0.16, 0.16]} pos={[0, 0.02, 2.18]} color={WOOD} />
        <Box args={[5.95, 0.16, 0.16]} pos={[0, 0.02, -2.18]} color={WOOD} />
        {/* wood barge boards framing the gable slopes */}
        {[2.98, -2.98].map((gx) =>
          [1.12, -1.12].map((sz, i) => (
            <mesh
              key={`${gx}-${i}`}
              position={[gx, 0.92, sz]}
              rotation={[i ? -0.685 : 0.685, 0, 0]}
            >
              <boxGeometry args={[0.14, 0.24, 2.95]} />
              {m(WOOD)}
            </mesh>
          )),
        )}
        {/* round attic window on the camera-facing gable */}
        <group position={[2.93, 0.78, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <circleGeometry args={[0.32, 20]} />
            {m(GLASS)}
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <ringGeometry args={[0.32, 0.42, 20]} />
            {m(CREAM)}
          </mesh>
          <Box args={[0.66, 0.05, 0.04]} pos={[0, 0, 0.02]} color={CREAM} />
          <Box args={[0.05, 0.66, 0.04]} pos={[0, 0, 0.02]} color={CREAM} />
        </group>
        {/* a little potted plant perched on the ridge */}
        <group position={[1.5, 1.95, 0]}>
          <RB args={[0.36, 0.3, 0.34]} pos={[0, 0, 0]} color={CREAM} radius={0.05} />
          <mesh position={[0, 0.26, 0]}>
            <icosahedronGeometry args={[0.22, 0]} />
            {m(GREEN)}
          </mesh>
          <mesh position={[0.12, 0.34, 0.06]}>
            <icosahedronGeometry args={[0.14, 0]} />
            {m(GREEN_DK)}
          </mesh>
        </group>
      </group>

      {/* ===== WINDOWS / WALL ART ===== */}
      {/* round window (back wall, bedroom) with frame */}
      <group position={[-3.2, 3.3, ZB + 0.13]}>
        <mesh>
          <circleGeometry args={[0.46, 24]} />
          {m(GLASS)}
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.46, 0.55, 24]} />
          {m(CREAM)}
        </mesh>
        <Box args={[0.94, 0.06, 0.04]} pos={[0, 0, 0.02]} color={CREAM} />
        <Box args={[0.06, 0.94, 0.04]} pos={[0, 0, 0.02]} color={CREAM} />
      </group>
      {/* kitchen window on back wall + curtains */}
      <group position={[-0.5, 1.55, ZB + 0.12]}>
        <Box args={[0.95, 0.8, 0.04]} pos={[0, 0, 0]} color={GLASS} />
        <Box args={[1.06, 0.9, 0.05]} pos={[0, 0, -0.01]} color={CREAM} />
        <Box args={[0.06, 0.8, 0.06]} pos={[0, 0, 0.03]} color={CREAM} />
        <Box args={[0.22, 0.82, 0.05]} pos={[-0.37, 0, 0.04]} color="#e6a7a0" />
        <Box args={[0.22, 0.82, 0.05]} pos={[0.37, 0, 0.04]} color="#e6a7a0" />
      </group>
      {/* tall window on -x wall (living) + curtains */}
      <group position={[XL + 0.11, 1.85, -1.95]}>
        <Box args={[0.05, 1.0, 0.9]} pos={[0, 0, 0]} color={GLASS} />
        <Box args={[0.06, 1.1, 1.02]} pos={[-0.01, 0, 0]} color={CREAM} />
        <Box args={[0.06, 0.06, 0.92]} pos={[0.02, 0, 0]} color={CREAM} />
        <Box args={[0.06, 1.04, 0.24]} pos={[0.03, 0, -0.36]} color="#e6a7a0" />
        <Box args={[0.06, 1.04, 0.24]} pos={[0.03, 0, 0.36]} color="#e6a7a0" />
      </group>
      {/* gallery wall on -x wall (above sofa) */}
      <Frame pos={[XL + 0.12, 1.65, -0.55]} rot={[0, Math.PI / 2, 0]} color="#e8b85c" w={0.4} h={0.5} />
      <Frame pos={[XL + 0.12, 1.5, -1.1]} rot={[0, Math.PI / 2, 0]} color="#88b39c" w={0.34} h={0.28} />
      {/* wall clock on back wall */}
      <group position={[-2.4, 1.7, ZB + 0.13]}>
        <mesh>
          <circleGeometry args={[0.2, 20]} />
          {m(CREAM)}
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.2, 0.24, 20]} />
          {m(WOOD_DK)}
        </mesh>
        <Box args={[0.015, 0.13, 0.02]} pos={[0, 0.04, 0.02]} color="#5a4636" />
        <Box args={[0.09, 0.015, 0.02]} pos={[0.03, 0, 0.02]} color="#5a4636" />
      </group>

      {/* ===== LIVING ===== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.16, -1.0]}>
        <circleGeometry args={[1.25, 28]} />
        {m("#ecc2a8")}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.17, -1.0]}>
        <ringGeometry args={[0.95, 1.1, 28]} />
        {m("#e0a98c")}
      </mesh>
      {/* golden sofa with green cushions, facing the room */}
      <group position={[-4.05, 0, -1.0]}>
        <RB args={[0.6, 0.46, 1.9]} pos={[0, 0.36, 0]} color={GOLD} radius={0.12} />
        <RB args={[0.66, 0.42, 1.9]} pos={[0.18, 0.6, 0]} color="#f0c66e" radius={0.12} />
        <RB args={[0.46, 0.22, 0.55]} pos={[0.22, 0.62, -0.55]} color={GREEN} radius={0.08} />
        <RB args={[0.46, 0.22, 0.55]} pos={[0.22, 0.62, 0.55]} color={GREEN_DK} radius={0.08} />
        <RB args={[0.6, 0.5, 0.18]} pos={[0.02, 0.42, 0.92]} color="#d9a64e" radius={0.09} />
        <RB args={[0.6, 0.5, 0.18]} pos={[0.02, 0.42, -0.92]} color="#d9a64e" radius={0.09} />
      </group>
      {/* coffee table + tiny plant */}
      <group position={[-2.85, 0, -0.55]}>
        <RB args={[0.7, 0.1, 0.7]} pos={[0, 0.34, 0]} color={WOOD} radius={0.03} />
        {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([x, z], i) => (
          <Box key={i} args={[0.06, 0.34, 0.06]} pos={[x, 0.17, z]} color={WOOD_DK} />
        ))}
        <mesh position={[0, 0.46, 0]}>
          <icosahedronGeometry args={[0.1, 0]} />
          {glow("#c8f08a", "#9be05a", 0.6)}
        </mesh>
      </group>
      {/* pantry larder against -x wall — jars, sacks, baskets, books */}
      <group position={[-4.22, 0, -2.95]}>
        <RB args={[0.44, 2.05, 1.3]} pos={[0, 1.02, 0]} color={WOOD} radius={0.04} />
        <Box args={[0.5, 2.1, 0.1]} pos={[0.02, 1.02, 0.6]} color={WOOD_DK} />
        <Box args={[0.5, 2.1, 0.1]} pos={[0.02, 1.02, -0.6]} color={WOOD_DK} />
        {[0.42, 0.86, 1.3, 1.74].map((y, i) => (
          <Box key={i} args={[0.4, 0.05, 1.2]} pos={[0, y, 0]} color="#a9774b" />
        ))}
        {/* bottom: books + a sack */}
        <Books pos={[0.04, 0.44, -0.2]} count={5} len={0.7} />
        <Sack pos={[0.02, 0.46, 0.34]} />
        {/* shelf 2: jars */}
        {(["#cf6f63", "#e6b85c", "#7fae9b", "#9a86b8"] as const).map((c, i) => (
          <Jar key={i} pos={[0.06, 0.9, -0.42 + i * 0.28]} color={c} />
        ))}
        {/* shelf 3: baskets + crate */}
        <Basket pos={[0.05, 1.34, -0.28]} fruit="#e88a3c" />
        <Basket pos={[0.05, 1.34, 0.06]} fruit="#cf6f63" />
        <Box args={[0.26, 0.22, 0.26]} pos={[0.04, 1.45, 0.36]} color="#bd8a52" />
        {/* top: a plant + the capybara figurine */}
        <Plant pos={[0.04, 1.78, -0.3]} scale={0.7} />
        <MiniCapy pos={[0.06, 1.78, 0.28]} />
      </group>
      {/* floor lamp */}
      <group position={[-1.55, 0, -0.55]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.06, 14]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 1.2, 8]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 1.32, 0]}>
          <cylinderGeometry args={[0.2, 0.26, 0.3, 16, 1, true]} />
          <meshStandardMaterial color="#fff0c8" emissive="#ffd98a" emissiveIntensity={0.7} roughness={1} side={2} />
        </mesh>
      </group>
      {/* cozy pet bed on the living-room floor */}
      <group position={[-2.4, 0, -1.75]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.42, 0.46, 0.2, 18]} />
          {m("#e8b85c")}
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.1, 18]} />
          {m("#fff1d6")}
        </mesh>
      </group>
      <Pendant pos={[-3.0, 1.65, -1.4]} drop={0.5} shade={RED} />

      {/* ===== KITCHEN (back wall) ===== */}
      <group position={[-3.2, 0, -4.05]}>
        <RB args={[2.1, 0.76, 0.5]} pos={[0, 0.38, 0]} color={WOOD} radius={0.04} />
        <Box args={[2.16, 0.09, 0.56]} pos={[0, 0.78, 0]} color="#d8b27e" />
        {/* sink */}
        <Box args={[0.44, 0.05, 0.34]} pos={[-0.55, 0.81, 0]} color="#cdd6d0" />
        <mesh position={[-0.55, 0.92, -0.08]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.18, 8]} />
          {m("#b9c0bb")}
        </mesh>
        {/* stove + pot */}
        <Box args={[0.5, 0.06, 0.4]} pos={[0.55, 0.81, 0]} color="#5a4f48" />
        <mesh position={[0.55, 0.93, 0]}>
          <cylinderGeometry args={[0.15, 0.13, 0.16, 14]} />
          {m("#c25f55")}
        </mesh>
        {/* upper cabinets */}
        <Box args={[1.4, 0.5, 0.26]} pos={[0, 1.7, -0.12]} color={WOOD_LT} />
        <Box args={[0.66, 0.46, 0.02]} pos={[-0.36, 1.7, 0.02]} color={WOOD_DK} />
        <Box args={[0.66, 0.46, 0.02]} pos={[0.36, 1.7, 0.02]} color={WOOD_DK} />
        {/* hanging pots */}
        {[-0.2, 0.05, 0.3].map((x, i) => (
          <mesh key={i} position={[x, 1.28, 0.18]}>
            <cylinderGeometry args={[0.07 + i * 0.01, 0.06, 0.12, 12]} />
            {m(["#c98f64", "#b9c0bb", "#d98a6a"][i])}
          </mesh>
        ))}
        {/* kettle + fruit bowl on counter */}
        <mesh position={[0.0, 0.92, 0.08]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          {m("#e6b85c")}
        </mesh>
        <mesh position={[-0.05, 0.86, 0.16]}>
          <cylinderGeometry args={[0.12, 0.13, 0.07, 14]} />
          {m("#dcd2c0")}
        </mesh>
      </group>
      {/* sage-green fridge with a freezer seam + handles */}
      <RB args={[0.64, 1.5, 0.54]} pos={[-1.4, 0.76, -4.05]} color={SAGE} radius={0.07} />
      <Box args={[0.66, 0.04, 0.05]} pos={[-1.1, 1.02, -3.79]} color="#86a877" />
      <Box args={[0.04, 0.34, 0.06]} pos={[-1.12, 1.3, -3.78]} color={WOOD_DK} />
      <Box args={[0.04, 0.42, 0.06]} pos={[-1.12, 0.72, -3.78]} color={WOOD_DK} />

      {/* ===== DINING ===== */}
      <group position={[-2.5, 0, -3.05]}>
        <mesh position={[0, 0.64, 0]}>
          <cylinderGeometry args={[0.52, 0.5, 0.1, 20]} />
          {m("#c79256")}
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 0.56, 10]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.08, 14]} />
          {m(WOOD_DK)}
        </mesh>
        {[0.62, -0.62].map((z, i) => (
          <RB key={i} args={[0.34, 0.36, 0.34]} pos={[0, 0.18, z]} color="#d8b27e" radius={0.05} />
        ))}
        {/* vase + flowers centerpiece */}
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.14, 10]} />
          {m(GLASS)}
        </mesh>
        {[PINK, "#f7d06b", CREAM].map((c, i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.06, 0.88, Math.sin(a) * 0.06]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              {m(c)}
            </mesh>
          );
        })}
      </group>
      <Pendant pos={[-2.5, 1.7, -3.05]} drop={0.45} shade={GREEN_DK} />

      {/* ===== LOFT: bedroom + bath ===== */}
      <group position={[0, FLOOR_H, 0]}>
        {/* round rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.02, -2.7]}>
          <circleGeometry args={[0.7, 24]} />
          {m("#cfe0d0")}
        </mesh>
        {/* bed: headboard on -x wall, extends into room */}
        <group position={[-3.7, 0, -3.4]}>
          <RB args={[1.7, 0.36, 1.3]} pos={[0, 0.24, 0]} color={WOOD} radius={0.05} />
          <RB args={[1.6, 0.22, 1.2]} pos={[0, 0.48, 0]} color="#bfe07d" radius={0.06} />
          <RB args={[1.6, 0.1, 0.5]} pos={[0, 0.6, 0.36]} color="#f6ead2" radius={0.05} />
          <RB args={[0.5, 0.5, 1.05]} pos={[-0.58, 0.55, 0]} color={CREAM} radius={0.07} />
          <RB args={[0.42, 0.2, 0.34]} pos={[-0.34, 0.66, -0.32]} color={PINK} radius={0.05} />
          <RB args={[0.42, 0.2, 0.34]} pos={[-0.34, 0.66, 0.3]} color="#e7b85c" radius={0.05} />
        </group>
        {/* nightstand + lamp */}
        <group position={[-4.2, 0, -2.2]}>
          <RB args={[0.5, 0.5, 0.5]} pos={[0, 0.26, 0]} color={WOOD} radius={0.05} />
          <mesh position={[0, 0.58, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.18, 8]} />
            {m(WOOD_DK)}
          </mesh>
          <mesh position={[0, 0.74, 0]}>
            <cylinderGeometry args={[0.13, 0.16, 0.2, 14, 1, true]} />
            <meshStandardMaterial color="#fff0c8" emissive="#ffd98a" emissiveIntensity={0.75} roughness={1} side={2} />
          </mesh>
        </group>
        {/* bath: tub + mirror + towel */}
        <group position={[-1.7, 0, -3.8]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.5, 0.44, 0.6, 18]} />
            {m(CREAM)}
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.1, 18]} />
            {m("#8fd0d6")}
          </mesh>
        </group>
        {/* mirror on back wall (above the tub) */}
        <group position={[-1.7, 1.0, ZB + 0.14]}>
          <mesh>
            <circleGeometry args={[0.24, 20]} />
            {m("#d4ecec")}
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <ringGeometry args={[0.24, 0.29, 20]} />
            {m(WOOD_DK)}
          </mesh>
        </group>
        {/* loft shelf + plant + books on back wall */}
        <group position={[-2.6, 1.05, -4.36]}>
          <Box args={[0.7, 0.06, 0.24]} pos={[0, 0, 0]} color={WOOD} />
          <Plant pos={[-0.2, 0.03, 0]} scale={0.8} />
          <Books pos={[0.18, -0.08, 0]} count={4} len={0.36} />
        </group>
        {/* hanging plant from loft ceiling */}
        <group position={[-2.1, 1.7, -2.2]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 6]} />
            {m("#5a4636")}
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m(WOOD)}
          </mesh>
          {[-0.06, 0.08, 0.0].map((x, i) => (
            <mesh key={i} position={[x, -0.12 - i * 0.04, 0.02 * i]}>
              <coneGeometry args={[0.05, 0.22, 6]} />
              {m(GREEN)}
            </mesh>
          ))}
        </group>
      </group>

      {/* string lights along the loft edge */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-1.1, FLOOR_H + 0.7 + Math.sin(i) * 0.04, -0.4 - i * 0.62]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          {glow(["#ffe39c", "#ffd2a8", "#ffe39c"][i % 3], "#ffce63", 0.9)}
        </mesh>
      ))}

      {/* wall postcards (diegetic -> album) */}
      <group position={[XL + 0.13, 1.55, -3.8]} rotation={[0, Math.PI / 2, 0]} onClick={goAlbum}>
        {(postcardThemes.length ? postcardThemes.slice(0, 3) : (["seaside"] as DestinationTheme[])).map(
          (theme, i, arr) => (
            <PinnedCard key={i} x={(i - (arr.length - 1) / 2) * 0.64} tilt={i % 2 === 0 ? 0.06 : -0.06} theme={theme} faded={!postcardThemes.length} />
          ),
        )}
      </group>

      {/* backpack (diegetic -> pack); the labelled "打包" marker rings it */}
      {mode === "home" && (
        <group
          position={[-1.5, 0, -0.7]}
          scale={1.0}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            goPack();
          }}
        >
          <Backpack />
        </group>
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
