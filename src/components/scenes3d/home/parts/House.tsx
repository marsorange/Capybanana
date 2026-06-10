"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { getDestination } from "@/game/destinations";
import type { DestinationTheme } from "@/game/types";
import Backpack from "./Backpack";
import { commandWalk } from "../interaction/commandBus";
import {
  BED,
  CX,
  CZ,
  D,
  EAVE,
  FLOOR_H,
  LOFT_LANDING,
  LOFT_MAIN,
  PACK,
  PACK_BENCH,
  POSTCARD,
  POSTCARD_BOARD,
  STAIR_BOTTOM,
  STAIR_TOP,
  STAIR_WIDTH,
  STAIR_X,
  W,
  XL,
  XR,
  ZB,
  ZF,
  type Vec3,
} from "../layout";
import { toonMaterial } from "../../materials";

const BACKPACK_SPOT: Vec3 = PACK.pos; // where the pet stands to pack (front-left)
const POSTCARD_SPOT: Vec3 = POSTCARD.pos; // where it stands to read postcards

interface HouseProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

// Footprint + heights all come from ../layout now (single source of truth).
const TOP = EAVE; // eave height (local alias used by the roof code below)

// palette — fresh, bright "日系" cottage
const WALL = "#fdf8ee";
const WALL_BACK = "#f7efdf";
const WAINSCOT = "#efe1c2";
const WOOD = "#d3a468";
const WOOD_DK = "#a87c4c";
const WOOD_LT = "#e4c590";
const FLOOR0 = "#ecca94";
const FLOOR1 = "#f3d9aa";
const ROOF = "#fad96e";
const ROOF_DK = "#f1cb57";
const GREEN = "#92c46b";
const GREEN_DK = "#7caf58";
const CREAM = "#fff6e6";
const PINK = "#f1a6bd";

// The cottage opts OUT of the shared planet bend so its rigid structure stands
// straight while the island ground domes around it. Low rim too: flat-shaded
// boxy walls catch the Fresnel rim across whole faces at grazing angles, which
// reads as a thick white border around the house instead of a subtle edge glow.
const m = (c: string) => (
  <primitive object={toonMaterial(c, { bend: false, rim: 0.1 })} attach="material" />
);
const glow = (c: string, e: string, i = 0.85) => (
  <primitive
    object={toonMaterial(c, { emissive: e, emissiveIntensity: i, bend: false, rim: 0.1 })}
    attach="material"
  />
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

// A square beam connecting two 3D points (rotation via quaternion, so any slope
// works) — used for the staircase stringer + continuous handrail so the railing
// reads as one unbroken piece instead of disconnected per-step caps.
function Beam({
  a,
  b,
  w = 0.08,
  color,
}: {
  a: Vec3;
  b: Vec3;
  w?: number;
  color: string;
}) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={[q.x, q.y, q.z, q.w]}>
      <boxGeometry args={[w, len, w]} />
      {m(color)}
    </mesh>
  );
}

// A low loft railing between two [x,z] points at loft level: evenly spaced
// balusters + a continuous top handrail + a thin foot rail. Kept short so it
// guards the edge without blocking the iso sightline into the bedroom.
function Railing({
  a,
  b,
  y = FLOOR_H,
}: {
  a: [number, number];
  b: [number, number];
  y?: number;
}) {
  const [ax, az] = a;
  const [bx, bz] = b;
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(2, Math.round(len / 0.7)); // sparser balusters
  return (
    <group>
      {Array.from({ length: n + 1 }).map((_, i) => {
        const t = i / n;
        return (
          <mesh key={i} position={[ax + (bx - ax) * t, y + 0.27, az + (bz - az) * t]}>
            <boxGeometry args={[0.06, 0.54, 0.06]} />
            {m(WOOD)}
          </mesh>
        );
      })}
      <Beam a={[ax, y + 0.54, az]} b={[bx, y + 0.54, bz]} w={0.07} color={WOOD_DK} />
      <Beam a={[ax, y + 0.1, az]} b={[bx, y + 0.1, bz]} w={0.045} color={WOOD} />
    </group>
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

// A solid wall with REAL window openings punched through it (ExtrudeGeometry +
// holes), each fitted with a translucent glass pane + a wood-trimmed jamb. The
// hole shows the sky/exterior behind, so the windows actually transmit light
// instead of being boxes stuck on the wall surface.
type Hole = { u: number; v: number; w: number; h: number };
function WindowWall({
  axis,
  at,
  uCenter,
  uLen,
  height,
  thickness,
  color,
  holes,
}: {
  axis: "x" | "z";
  at: number; // constant coordinate (XL for left, ZB for back)
  uCenter: number; // centre of the in-plane horizontal axis (CZ / CX)
  uLen: number;
  height: number;
  thickness: number;
  color: string;
  holes: Hole[]; // u already in wall-local horizontal (world - uCenter, +z-aligned)
}) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-uLen / 2, 0);
    s.lineTo(uLen / 2, 0);
    s.lineTo(uLen / 2, height);
    s.lineTo(-uLen / 2, height);
    s.closePath();
    holes.forEach(({ u, v, w, h }) => {
      const p = new THREE.Path();
      p.moveTo(u - w / 2, v - h / 2);
      p.lineTo(u + w / 2, v - h / 2);
      p.lineTo(u + w / 2, v + h / 2);
      p.lineTo(u - w / 2, v + h / 2);
      p.closePath();
      s.holes.push(p);
    });
    const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
    g.translate(0, 0, -thickness / 2);
    return g;
  }, [uLen, height, thickness, holes]);

  const position: [number, number, number] =
    axis === "z" ? [uCenter, 0, at] : [at, 0, uCenter];
  const rotation: [number, number, number] =
    axis === "z" ? [0, 0, 0] : [0, -Math.PI / 2, 0];
  const innerZ = axis === "z" ? thickness / 2 : -thickness / 2; // interior face

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo}>{m(color)}</mesh>
      {holes.map((hl, i) => (
        <group key={i} position={[hl.u, hl.v, 0]}>
          {/* translucent glass pane — the sky shows through it (透光) */}
          <mesh>
            <planeGeometry args={[hl.w, hl.h]} />
            <meshStandardMaterial
              color="#d3ece7"
              transparent
              opacity={0.4}
              emissive="#eaf6f3"
              emissiveIntensity={0.4}
              roughness={1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* wood-trim jamb on the interior face */}
          <Box args={[hl.w + 0.16, 0.09, 0.14]} pos={[0, hl.h / 2 + 0.05, innerZ]} color={WOOD} />
          <Box args={[hl.w + 0.16, 0.09, 0.14]} pos={[0, -hl.h / 2 - 0.05, innerZ]} color={WOOD} />
          <Box args={[0.09, hl.h + 0.2, 0.14]} pos={[hl.w / 2 + 0.05, 0, innerZ]} color={WOOD} />
          <Box args={[0.09, hl.h + 0.2, 0.14]} pos={[-hl.w / 2 - 0.05, 0, innerZ]} color={WOOD} />
          {/* a cream cross-mullion */}
          <Box args={[hl.w, 0.05, 0.05]} pos={[0, 0, innerZ * 0.4]} color={CREAM} />
          <Box args={[0.05, hl.h, 0.05]} pos={[0, 0, innerZ * 0.4]} color={CREAM} />
        </group>
      ))}
    </group>
  );
}

// Window openings, in wall-local horizontal u (= world z−CZ for the -x wall,
// world x−CX for the -z wall) + vertical v. Module-level so the extruded wall
// geometry memo stays stable across renders.
// All at LOFT level (the ground-floor walls are tucked under the loft / behind
// furniture, so windows there read as occluded). Spaced to flank the wall shelf
// at x≈−2.55 (back) and to sit in front of the bed (left), so nothing overlaps.
const LEFT_HOLES: Hole[] = [
  { u: -0.2, v: 3.32, w: 0.8, h: 0.8 }, // loft window (front of the bed, clear)
];
const BACK_HOLES: Hole[] = [
  { u: -1.4, v: 3.32, w: 0.85, h: 0.85 }, // loft window (left, above the bed)
  { u: 0.5, v: 3.32, w: 0.85, h: 0.85 }, // loft window (right of the shelf)
];

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

// A small stone chimney placed in the roof group's local space.
function Chimney() {
  return (
    <group position={[0.55, 0.72, -1.0]}>
      {/* gray faceted STONE stack on the right slope */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.5, 0.34, 0.5]} />
        {m("#8d8579")}
      </mesh>
      <mesh position={[0, 0.64, 0]}>
        <boxGeometry args={[0.44, 0.96, 0.44]} />
        {m("#a9a195")}
      </mesh>
      {/* raised stone-course lines */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.47, 0.06, 0.47]} />
        {m("#7f786b")}
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.47, 0.06, 0.47]} />
        {m("#7f786b")}
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <boxGeometry args={[0.58, 0.14, 0.58]} />
        {m("#6f6759")}
      </mesh>
    </group>
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

      {/* -x wall (left) — solid with REAL punched windows + a wainscot band */}
      <WindowWall
        axis="x"
        at={XL}
        uCenter={CZ}
        uLen={D}
        height={TOP}
        thickness={0.18}
        color={WALL}
        holes={LEFT_HOLES}
      />
      <Box args={[0.2, 0.9, D]} pos={[XL + 0.005, 0.5, CZ]} color={WAINSCOT} />
      {/* -z wall (back) — solid with REAL punched windows + a wainscot band */}
      <WindowWall
        axis="z"
        at={ZB}
        uCenter={CX}
        uLen={W}
        height={TOP}
        thickness={0.18}
        color={WALL_BACK}
        holes={BACK_HOLES}
      />
      <Box args={[W, 0.9, 0.2]} pos={[CX, 0.5, ZB + 0.005]} color={WAINSCOT} />
      {/* back-left corner post (the thin floor trims were removed — the floor
          band below already reads the level division) */}
      <Box args={[0.24, TOP, 0.24]} pos={[XL, TOP / 2, ZB]} color={WOOD} />

      {/* ---- timber frame: a corner post at EACH of the four corners + a
            CONTINUOUS wall-top plate ring around all four eaves, so the roof and
            its gable ends rest on a built structure instead of floating over the
            open cutaway sides. ---- */}
      <Box args={[0.24, TOP, 0.24]} pos={[XL + 0.02, TOP / 2, ZF]} color={WOOD} />
      <Box args={[0.24, TOP, 0.24]} pos={[XR, TOP / 2, ZB + 0.02]} color={WOOD} />
      <Box args={[0.24, TOP, 0.24]} pos={[XR, TOP / 2, ZF]} color={WOOD} />
      {/* top-plate ring: left, back, front, right */}
      <Box args={[0.22, 0.2, D + 0.1]} pos={[XL + 0.02, TOP - 0.1, CZ]} color={WOOD} />
      <Box args={[W + 0.1, 0.2, 0.22]} pos={[CX, TOP - 0.1, ZB + 0.02]} color={WOOD} />
      <Box args={[W + 0.1, 0.2, 0.22]} pos={[CX, TOP - 0.1, ZF]} color={WOOD} />
      <Box args={[0.22, 0.2, D + 0.1]} pos={[XR, TOP - 0.1, CZ]} color={WOOD} />

      {/* ONE chunky wood floor-division band wrapping the inside corner (a solid
          block, not thin stick framing) — the only timber on the cream walls so
          the cottage reads as clean wood blocks, not a cage of beams. */}
      <Box args={[W, 0.3, 0.14]} pos={[CX, FLOOR_H - 0.04, ZB + 0.11]} color={WOOD_LT} />
      <Box args={[0.14, 0.3, D]} pos={[XL + 0.1, FLOOR_H - 0.04, CZ]} color={WOOD_LT} />

      {/* ===== LOFT FLOOR — an L: the MAIN bedroom bar (left, against both solid
            walls) + a back LANDING strip the straight stair tops out onto.
            Railings guard every open edge, with a GAP where the stair arrives. */}
      <RB
        args={[LOFT_MAIN.x1 - LOFT_MAIN.x0, 0.22, LOFT_MAIN.z1 - LOFT_MAIN.z0]}
        pos={[
          (LOFT_MAIN.x0 + LOFT_MAIN.x1) / 2,
          FLOOR_H - 0.11,
          (LOFT_MAIN.z0 + LOFT_MAIN.z1) / 2,
        ]}
        color={FLOOR1}
        radius={0.04}
      />
      <RB
        args={[LOFT_LANDING.x1 - LOFT_LANDING.x0, 0.22, LOFT_LANDING.z1 - LOFT_LANDING.z0]}
        pos={[
          (LOFT_LANDING.x0 + LOFT_LANDING.x1) / 2,
          FLOOR_H - 0.11,
          (LOFT_LANDING.z0 + LOFT_LANDING.z1) / 2,
        ]}
        color={FLOOR1}
        radius={0.04}
      />
      {/* loft-edge fascia under the front rail */}
      <Box
        args={[LOFT_MAIN.x1 - LOFT_MAIN.x0, 0.18, 0.12]}
        pos={[(LOFT_MAIN.x0 + LOFT_MAIN.x1) / 2, FLOOR_H - 0.12, LOFT_MAIN.z1]}
        color={WOOD}
      />
      {/* railings tracing the open perimeter: the loft's front edge, its right
          edge along the stairwell (the gap at the back is where the stair tops
          out onto the floor), and the landing's open right edge. */}
      <Railing a={[LOFT_MAIN.x0, LOFT_MAIN.z1]} b={[LOFT_MAIN.x1, LOFT_MAIN.z1]} />
      <Railing a={[LOFT_MAIN.x1, LOFT_MAIN.z1]} b={[LOFT_MAIN.x1, STAIR_TOP[2]]} />
      <Railing a={[LOFT_LANDING.x1, STAIR_TOP[2]]} b={[LOFT_LANDING.x1, LOFT_LANDING.z0]} />

      {/* ===== STRAIGHT STAIRCASE (right bay, runs along z at x=STAIR_X) — a
            single flight the pet climbs as a real ramp. Treads + risers, a solid
            stringer board on each side, one continuous handrail + balusters +
            newel posts on the camera-facing edge. ===== */}
      {Array.from({ length: 10 }).map((_, i) => {
        const t = i / 9;
        const z = STAIR_BOTTOM[2] + (STAIR_TOP[2] - STAIR_BOTTOM[2]) * t;
        const y = STAIR_BOTTOM[1] + (STAIR_TOP[1] - STAIR_BOTTOM[1]) * t;
        return (
          <group key={i}>
            <Box args={[STAIR_WIDTH, 0.12, 0.46]} pos={[STAIR_X, y - 0.06, z]} color={WOOD_LT} />
            <Box args={[STAIR_WIDTH, 0.24, 0.06]} pos={[STAIR_X, y - 0.14, z + 0.19]} color={WOOD} />
          </group>
        );
      })}
      {/* solid stringer boards down both open edges */}
      {[STAIR_X - STAIR_WIDTH / 2, STAIR_X + STAIR_WIDTH / 2].map((sx, i) => (
        <Beam
          key={i}
          a={[sx, 0.02, STAIR_BOTTOM[2]]}
          b={[sx, FLOOR_H - 0.08, STAIR_TOP[2]]}
          w={0.14}
          color={WOOD}
        />
      ))}
      {/* continuous handrail on the camera-facing (+x) edge */}
      <Beam
        a={[STAIR_X + STAIR_WIDTH / 2, 0.82, STAIR_BOTTOM[2]]}
        b={[STAIR_X + STAIR_WIDTH / 2, FLOOR_H + 0.52, STAIR_TOP[2]]}
        w={0.08}
        color={WOOD_DK}
      />
      {/* just three simple balusters under the handrail (kept minimal) */}
      {[0.22, 0.5, 0.78].map((t, i) => {
        const z = STAIR_BOTTOM[2] + (STAIR_TOP[2] - STAIR_BOTTOM[2]) * t;
        const yBot = STAIR_BOTTOM[1] + (STAIR_TOP[1] - STAIR_BOTTOM[1]) * t;
        return (
          <Box
            key={i}
            args={[0.05, 0.58, 0.05]}
            pos={[STAIR_X + STAIR_WIDTH / 2, yBot + 0.29, z]}
            color={WOOD}
          />
        );
      })}
      {/* a newel post at the bottom + top of the flight */}
      <Box args={[0.11, 1.0, 0.11]} pos={[STAIR_X + STAIR_WIDTH / 2, STAIR_BOTTOM[1] + 0.5, STAIR_BOTTOM[2]]} color={WOOD} />
      <Box args={[0.11, 0.95, 0.11]} pos={[STAIR_X + STAIR_WIDTH / 2, STAIR_TOP[1] + 0.4, STAIR_TOP[2]]} color={WOOD} />

      {/* ===== ROOF — a proper tiled gable. Eaves sit at the wall-top so the
            iso sightlines pass UNDER the front eave into the rooms (no occlusion),
            while the warm tiled slopes + rounded ridge give it real character. */}
      <group position={[CX, TOP, CZ]}>
        {/* gable ends. The OUTER (-x, over the solid wall) keeps a cream infill;
            the INNER (+x, camera-side) is left OPEN (just its wood frame below) so
            it no longer occludes the loft — you see straight through it. */}
        <IsoGable x={-2.5} halfRun={2.25} h={1.8} color={WALL_BACK} />
        {/* (gable trusses removed — too many beams; the cream gable stays clean) */}
        {/* HALF-OPEN roof: BACK slope fully tiled; the FRONT is ONE clean yellow
            band off the ridge, the rest open with a few THICK rafters showing. */}
        <RoofSlope z={-1.12} rot={-0.685} width={5.2} />
        {/* a SLIM yellow band at the ridge (depth matched to the back slope's
            tile courses, not a wide strip) */}
        <group position={[0, 1.58, 0.28]} rotation={[0.685, 0, 0]}>
          <mesh>
            <boxGeometry args={[5.2, 0.2, 0.56]} />
            {m(ROOF)}
          </mesh>
          <Box args={[5.28, 0.16, 0.13]} pos={[0, -0.05, 0.28]} color={WOOD} />
        </group>
        {/* SIX evenly-spaced bars across the open front COUNTING the two gable-
            edge frames at x=±2.5 — these four interior rafters fall on the 1.0
            spacing between them. */}
        {[-1.5, -0.5, 0.5, 1.5].map((rx, i) => (
          <Beam key={i} a={[rx, 0.04, 2.22]} b={[rx, 1.78, 0.04]} w={0.15} color={WOOD} />
        ))}
        {/* rounded faceted ridge beam */}
        <mesh position={[0, 1.82, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 5.3, 6]} />
          {m("#e0a93c")}
        </mesh>
        {/* wood fascia along the back eave */}
        <Box args={[5.3, 0.16, 0.16]} pos={[0, 0.02, -2.18]} color={WOOD} />
        {/* WOOD FRAME on each gable: just the TWO sloped barge boards (eave →
            ridge). The bottom horizontal beam was dropped — the eave/top-plate
            already reads the base line. */}
        {[2.5, -2.5].map((gx) => (
          <group key={gx}>
            <Beam a={[gx, 0.04, -2.22]} b={[gx, 1.78, 0.04]} w={0.15} color={WOOD} />
            <Beam a={[gx, 0.04, 2.22]} b={[gx, 1.78, 0.04]} w={0.15} color={WOOD} />
          </group>
        ))}
        {/* gray STONE chimney on the RIGHT slope above the hearth */}
        <Chimney />
      </group>

      {/* (Windows are now REAL openings punched through the -x and -z walls by
          WindowWall above — translucent glass + wood jambs — so they transmit
          light instead of being boxes stuck on the wall.) */}


      {/* ===== GROUND FLOOR — the pet roams the open front; furnished along the
            visible front strip + left wall (the back is tucked under the loft). */}
      {/* cozy round rug under the pet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.05, -1.2]}>
        <circleGeometry args={[1.15, 24]} />
        {m("#e7c9a6")}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.06, -1.2]}>
        <ringGeometry args={[0.86, 1.0, 24]} />
        {m("#d9b083")}
      </mesh>
      {/* ===== KITCHEN along the left wall — base cabinets + countertop, a sink,
            a little stove with a pot, an upper cabinet + an open shelf (the
            reference's cozy ground-floor kitchen) ===== */}
      <group position={[-4.18, 0, -1.05]}>
        {/* base cabinet run + countertop */}
        <RB args={[0.52, 0.68, 1.5]} pos={[0, 0.34, 0]} color={WOOD} radius={0.04} />
        <Box args={[0.58, 0.08, 1.56]} pos={[0, 0.71, 0]} color="#d8c39c" />
        {/* cabinet-door seams on the +x face */}
        {[-0.52, -0.05, 0.42].map((z, i) => (
          <Box key={i} args={[0.02, 0.5, 0.03]} pos={[0.27, 0.36, z]} color={WOOD_DK} />
        ))}
        {/* sink basin + faucet (front end) */}
        <Box args={[0.34, 0.12, 0.42]} pos={[0.02, 0.69, 0.52]} color="#aebcb8" />
        <mesh position={[-0.05, 0.85, 0.52]}>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 6]} />
          {m("#b9b1a3")}
        </mesh>
        <mesh position={[0.0, 0.95, 0.52]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.14, 6]} />
          {m("#b9b1a3")}
        </mesh>
        {/* stove top + burners + a pot (back end) */}
        <Box args={[0.44, 0.05, 0.44]} pos={[0.02, 0.76, -0.5]} color="#3a332c" />
        {([[-0.1, -0.6], [0.12, -0.4]] as const).map(([x, z], i) => (
          <mesh key={i} position={[0.02 + x * 0.4, 0.79, -0.5 + (z + 0.5)]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.08, 12]} />
            {m("#5a5048")}
          </mesh>
        ))}
        <mesh position={[0.02, 0.87, -0.5]}>
          <cylinderGeometry args={[0.13, 0.12, 0.16, 12]} />
          {m("#9a8d7a")}
        </mesh>
        <mesh position={[0.13, 0.92, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
          {m(WOOD_DK)}
        </mesh>
        {/* upper wall cabinet + an open shelf with a plant, a jar and books */}
        <RB args={[0.34, 0.46, 0.82]} pos={[-0.06, 1.68, -0.42]} color={WOOD} radius={0.04} />
        <Box args={[0.34, 0.04, 0.62]} pos={[-0.06, 1.42, 0.46]} color={WOOD_DK} />
        <Plant pos={[-0.06, 1.44, 0.62]} scale={0.46} />
        <Jar pos={[-0.06, 1.44, 0.34]} color="#cf8f5a" />
        <Books pos={[-0.06, 1.44, -0.62]} count={4} len={0.36} />
        {/* hanging-utensil rail */}
        <Box args={[0.03, 0.03, 0.5]} pos={[0.22, 1.12, 0.1]} color={WOOD_DK} />
        {/* a fruit basket on the counter */}
        <Basket pos={[0.0, 0.76, 0.04]} />
      </group>
      {/* a warm pendant lamp over the kitchen */}
      <Pendant pos={[-3.7, 2.0, -1.0]} drop={0.5} />
      {/* a framed picture on the left wall, above the kitchen */}
      <Frame pos={[XL + 0.11, 1.7, -1.6]} rot={[0, Math.PI / 2, 0]} color="#e0b48f" w={0.46} h={0.4} />

      {/* a cozy little dining spot — a chunky round table (teapot + cup) flanked
          by a pair of stools */}
      <group position={[-1.7, 0, -0.6]}>
        <mesh position={[0, 0.47, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.08, 16]} />
          {m(WOOD_LT)}
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.46, 8]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.22, 0.24, 0.05, 12]} />
          {m(WOOD_DK)}
        </mesh>
        {/* teapot + cup */}
        <mesh position={[0.06, 0.57, -0.02]}>
          <sphereGeometry args={[0.1, 12, 8]} />
          {m("#d98a6a")}
        </mesh>
        <mesh position={[0.18, 0.56, 0.02]} rotation={[0, 0, -0.5]}>
          <torusGeometry args={[0.045, 0.013, 6, 10]} />
          {m("#d98a6a")}
        </mesh>
        <mesh position={[-0.15, 0.54, 0.12]}>
          <cylinderGeometry args={[0.055, 0.05, 0.08, 10]} />
          {m(CREAM)}
        </mesh>
      </group>
      {/* a single stool by the table */}
      <group position={[-1.7, 0, 0.18]}>
        <mesh position={[0, 0.31, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
          {m("#cdb892")}
        </mesh>
        {([[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]] as const).map(
          ([x, z], i) => (
            <mesh key={i} position={[x, 0.15, z]}>
              <cylinderGeometry args={[0.022, 0.022, 0.3, 6]} />
              {m(WOOD_DK)}
            </mesh>
          ),
        )}
      </group>
      {/* a grounded open BOOKSHELF cabinet (books + a plant on top) — replaces
          the loose floor plant, gives the ground floor a real piece of furniture */}
      <group position={[-1.45, 0, -1.35]}>
        <Box args={[0.9, 0.9, 0.05]} pos={[0, 0.47, -0.16]} color={WOOD} />
        <Box args={[0.06, 0.9, 0.4]} pos={[-0.42, 0.47, 0]} color={WOOD} />
        <Box args={[0.06, 0.9, 0.4]} pos={[0.42, 0.47, 0]} color={WOOD} />
        <Box args={[0.84, 0.05, 0.4]} pos={[0, 0.06, 0]} color={WOOD} />
        <Box args={[0.84, 0.05, 0.38]} pos={[0, 0.5, 0]} color={WOOD_DK} />
        <Box args={[0.98, 0.06, 0.46]} pos={[0, 0.93, 0]} color={WOOD_LT} />
        {([0.72, 0.3] as const).map((sy, s) =>
          ([-0.3, -0.15, 0, 0.15, 0.3] as const).map((bx, i) => (
            <Box
              key={`${s}-${i}`}
              args={[0.1, 0.2 + ((i + s) % 3) * 0.04, 0.26]}
              pos={[bx, sy, 0.02]}
              color={
                ["#d98a6a", "#7fae9b", "#e6b85c", "#9a86b8", "#cf6f63", "#85a86a"][
                  (s * 2 + i) % 6
                ]
              }
            />
          )),
        )}
        <Plant pos={[0.26, 0.96, 0]} scale={0.52} />
      </group>

      {/* ===== LOFT: a simple bedroom ===== */}
      <group position={[0, FLOOR_H, 0]}>
        {/* round rug by the bed */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.0, 0.02, -2.7]}>
          <circleGeometry args={[0.7, 24]} />
          {m("#cfe0d0")}
        </mesh>
        {/* a second round rug on the new landing floor beside the stairs */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.9, 0.02, -2.9]}>
          <circleGeometry args={[0.62, 24]} />
          {m("#e7c9a6")}
        </mesh>
        {/* bed: in the back-left corner, headboard on -x wall, extends into room */}
        <group position={[BED[0], 0, BED[2]]}>
          <RB args={[1.7, 0.36, 1.3]} pos={[0, 0.24, 0]} color={WOOD} radius={0.05} />
          <RB args={[1.6, 0.22, 1.2]} pos={[0, 0.48, 0]} color="#bfe07d" radius={0.06} />
          <RB args={[1.6, 0.1, 0.5]} pos={[0, 0.6, 0.36]} color="#f6ead2" radius={0.05} />
          <RB args={[0.5, 0.5, 1.05]} pos={[-0.58, 0.55, 0]} color={CREAM} radius={0.07} />
          <RB args={[0.42, 0.2, 0.34]} pos={[-0.34, 0.66, -0.32]} color={PINK} radius={0.05} />
          <RB args={[0.42, 0.2, 0.34]} pos={[-0.34, 0.66, 0.3]} color="#e7b85c" radius={0.05} />
        </group>
        {/* nightstand + lamp */}
        <group position={[-4.3, 0, -3.0]}>
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
        {/* wall shelf between the round window and the fireplace: a potted plant
            + the tiny capybara figurine, with a framed picture above */}
        <group position={[-2.55, 0.95, ZB + 0.2]}>
          <Box args={[0.8, 0.06, 0.26]} pos={[0, 0, 0]} color={WOOD} />
          <Plant pos={[-0.22, 0.03, 0]} scale={0.6} />
          <MiniCapy pos={[0.2, 0.04, 0]} />
        </group>
        <Frame pos={[-2.5, 1.42, ZB + 0.12]} color="#9ec3d6" w={0.36} h={0.42} />
      {/* (indoor stone fireplace + chimney breast removed per request — the
            loft is kept simple; only the small roof chimney remains) */}
      </group>

      {/* outdoor notice board by the entrance (diegetic -> album). Self-contained
          here (frame + posts + little roof + the pinned cards) so the postcard
          interaction lives with the house's other interactive props. */}
      <group position={POSTCARD_BOARD} rotation={[0, -0.6, 0]} onClick={goAlbum}>
        {[-0.62, 0.62].map((x, i) => (
          <mesh key={i} position={[x, 0.55, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 1.1, 7]} />
            {m(WOOD_DK)}
          </mesh>
        ))}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.5, 0.84, 0.08]} />
          {m(WOOD)}
        </mesh>
        <mesh position={[0, 1.0, 0.05]}>
          <boxGeometry args={[1.32, 0.66, 0.02]} />
          {m("#caa274")}
        </mesh>
        {/* little leafy gable roof over the board */}
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * 0.4, 1.52, 0]} rotation={[0, 0, side * -0.5]}>
            <boxGeometry args={[0.9, 0.07, 0.5]} />
            {m(GREEN)}
          </mesh>
        ))}
        <group position={[0, 1.0, 0.07]}>
          {(postcardThemes.length ? postcardThemes.slice(0, 3) : (["seaside"] as DestinationTheme[])).map(
            (theme, i, arr) => (
              <PinnedCard key={i} x={(i - (arr.length - 1) / 2) * 0.46} tilt={i % 2 === 0 ? 0.05 : -0.05} theme={theme} faded={!postcardThemes.length} />
            ),
          )}
        </group>
      </group>

      {/* backpack (diegetic -> pack); the labelled "打包" marker rings it */}
      {mode === "home" && (
        <group
          position={PACK_BENCH}
          scale={1.0}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            goPack();
          }}
        >
          {/* low plank bench the pack rests on (the reference's 打包 corner) */}
          <mesh position={[0, 0.21, 0.04]}>
            <boxGeometry args={[1.0, 0.07, 0.5]} />
            {m(WOOD_LT)}
          </mesh>
          {([[-0.42, -0.16], [0.42, -0.16], [-0.42, 0.24], [0.42, 0.24]] as const).map(
            ([x, z], i) => (
              <mesh key={i} position={[x, 0.09, z]}>
                <boxGeometry args={[0.07, 0.22, 0.07]} />
                {m(WOOD_DK)}
              </mesh>
            ),
          )}
          {/* folded map laid on the bench */}
          <mesh position={[0.36, 0.255, 0.06]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[0.32, 0.24]} />
            {m("#e3d6ba")}
          </mesh>
          {/* small crate tucked beside the bench */}
          <mesh position={[-0.05, 0.13, -0.42]}>
            <boxGeometry args={[0.3, 0.26, 0.3]} />
            {m("#bd8a52")}
          </mesh>
          {/* the pack, raised onto the bench */}
          <group position={[-0.12, 0.25, 0.04]}>
            <Backpack />
          </group>
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
