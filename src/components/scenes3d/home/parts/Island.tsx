"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { toonMaterial } from "../../materials";
import { HERO_TREE, ISLAND_BOULDERS, ISLAND_POND, MUSHROOM_PATCH } from "../layout";

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
);
// double-sided toon material for the hand-built island shells (winding-proof)
const mi = (c: string) => (
  <primitive object={toonMaterial(c, { side: THREE.DoubleSide })} attach="material" />
);

// ---------------------------------------------------------------------------
// 治愈系森林 palette — soft, harmonious greens that read fresh without going
// neon, warm forest-floor browns, mossy stone, and a small set of cheerful
// (but not candy) accent colors. Kept high-key so the soft shading stays sunny.
const GRASS = "#84c64e"; // fresh, vibrant meadow base
const GRASS_LT = "#a4d76e"; // sunlit highlight tufts
const GRASS_SOFT = "#8fcc5a"; // barely-there sun dapple (blends into the base)
const GRASS_DK = "#6daa44"; // shaded green
const GRASS_EDGE = "#5d9a3a"; // grass rim skirt
const MOSS = "#7cba50"; // soft moss dapple
const MOSS_DK = "#5f9a3e";
// warm faceted earth tones for the island body
const SOIL_TOP = "#c39a64";
const SOIL_1 = "#b07f49";
const SOIL_2 = "#9c6d3b";
const SOIL_3 = "#855b30";
// mossy woodland stone
const ROCK = "#b7b3a3";
const ROCK_DK = "#9c9788";
const ROCK_LT = "#cdc8b7";
// trees
const TRUNK = "#8a5e38";
const TRUNK_DK = "#6f4a2c";
const PINE_1 = "#4f8a47"; // deep conifer
const PINE_2 = "#5d9b52";
const PINE_3 = "#6cac5e"; // lit top tier
const LEAF_A = "#73b056"; // broadleaf canopy
const LEAF_B = "#88bd66";
const LEAF_C = "#65a04a";
// mushrooms
const CAP_RED = "#e06a55";
const CAP_BROWN = "#c98a52";
const CAP_SPOT = "#fbeede";
const STEM = "#f3e7cf";
// pond
const WATER = "#7fc4d6";
const WATER_LT = "#a6dbe6";

const LAWN_R = 7.0; // BIG tray — the whole house footprint sits well inside it
const PI = Math.PI;

// ---------------------------------------------------------------------------
// Faceted "earth tray" geometry. A gently-jittered rounded polygon (a tidy,
// healing-forest island, NOT a sharply broken chunk) caps a chunky thick body
// that tapers to a soft bottom — a stack of rings sharing one profile, scaled
// down as they descend.
const RIM_N = 13; // a few more, smaller facets = a softer rounded island
// gentle per-vertex angle wobble (shared by every layer so the side bands don't
// twist) — organic but tidy, not jagged.
const RIM_ANG = Array.from({ length: RIM_N }, (_, i) => {
  const s = Math.sin(i * 71.3 + 1.2) * 24634.21;
  return (i / RIM_N) * PI * 2 + ((s - Math.floor(s)) - 0.5) * 0.28; // ±0.14 rad
});
// a small per-LAYER radius jitter so the courses stagger slightly (hand-stacked
// look) without the spiky offsets of the old "broken dirt" island.
function layerJitter(seed: number, lo: number, hi: number): number[] {
  return Array.from({ length: RIM_N }, (_, i) => {
    const s = Math.sin(i * 127.1 + seed * 13.7 + 3.7) * 43758.5453;
    return lo + (s - Math.floor(s)) * (hi - lo);
  });
}

function ring(y: number, jit: number[]): THREE.Vector3[] {
  return jit.map((jr, i) => {
    const r = LAWN_R * jr;
    return new THREE.Vector3(Math.cos(RIM_ANG[i]) * r, y, Math.sin(RIM_ANG[i]) * r);
  });
}

// triangle fan from a center point to a ring
function fanGeometry(center: THREE.Vector3, r: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [center.x, center.y, center.z];
  r.forEach((v) => pos.push(v.x, v.y, v.z));
  const idx: number[] = [];
  for (let i = 0; i < r.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % r.length));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// a side band (wall) between two rings of equal point count
function bandGeometry(top: THREE.Vector3[], bot: THREE.Vector3[]): THREE.BufferGeometry {
  const n = top.length;
  const pos: number[] = [];
  top.forEach((v) => pos.push(v.x, v.y, v.z));
  bot.forEach((v) => pos.push(v.x, v.y, v.z));
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    const c = n + i;
    const d = n + ((i + 1) % n);
    idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ===========================================================================
// FOREST PROPS — the "natural" woodland layer (trees, stone, fungi, ferns).
// The cultivated yard (path / mailbox / bench / veg bed) lives in Yard.tsx.
// ===========================================================================

// The reference's hero tree: a stout tapered trunk with a little branch stub,
// crowned by ONE generous faceted canopy mass built from overlapping lobes —
// rounded and chunky, the canopy reads as a single soft blob, not separate balls.
function BlobTree({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 1.1, 7]} />
        {m(TRUNK)}
      </mesh>
      {/* a stubby side branch reaching into the canopy */}
      <mesh position={[0.32, 1.0, 0.08]} rotation={[0, 0, -0.85]}>
        <cylinderGeometry args={[0.07, 0.1, 0.5, 6]} />
        {m(TRUNK_DK)}
      </mesh>
      {/* canopy: one big heart + tight overlapping lobes (single soft mass) */}
      <mesh position={[0, 1.95, 0]}>
        <icosahedronGeometry args={[1.05, 0]} />
        {m(LEAF_A)}
      </mesh>
      <mesh position={[0.62, 1.78, 0.28]}>
        <icosahedronGeometry args={[0.64, 0]} />
        {m(LEAF_B)}
      </mesh>
      <mesh position={[-0.6, 1.72, -0.18]}>
        <icosahedronGeometry args={[0.58, 0]} />
        {m(LEAF_C)}
      </mesh>
      <mesh position={[-0.18, 2.2, 0.58]}>
        <icosahedronGeometry args={[0.52, 0]} />
        {m(LEAF_B)}
      </mesh>
      <mesh position={[0.12, 2.62, -0.08]}>
        <icosahedronGeometry args={[0.62, 0]} />
        {m(LEAF_B)}
      </mesh>
    </group>
  );
}

// A chunky low-poly conifer: stacked cones on a stubby trunk, 3 lit tiers.
function Pine({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 0.55, 6]} />
        {m(TRUNK)}
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <coneGeometry args={[0.62, 0.95, 7]} />
        {m(PINE_1)}
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.48, 0.82, 7]} />
        {m(PINE_2)}
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <coneGeometry args={[0.33, 0.7, 7]} />
        {m(PINE_3)}
      </mesh>
    </group>
  );
}

// A trimmed round hedge-bush: a soft faceted dome with a lighter crown lobe
// (the smooth clipped shrub dotting the reference's lawn).
function RoundBush({ pos, scale = 1 }: { pos: [number, number]; scale?: number }) {
  return (
    <group position={[pos[0], 0, pos[1]]} scale={scale}>
      <mesh position={[0, 0.32, 0]} scale={[1.15, 0.85, 1.1]}>
        <icosahedronGeometry args={[0.42, 1]} />
        {m(LEAF_C)}
      </mesh>
      <mesh position={[0.1, 0.52, 0.06]} scale={[0.8, 0.6, 0.78]}>
        <icosahedronGeometry args={[0.34, 1]} />
        {m(LEAF_B)}
      </mesh>
    </group>
  );
}

// A huddle of mossy faceted boulders — grey stone capped with soft moss.
function Boulders({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.3, 0]} scale={[1.35, 0.9, 1]}>
        <icosahedronGeometry args={[0.54, 0]} />
        {m(ROCK)}
      </mesh>
      <mesh position={[0, 0.52, 0]} scale={[1.15, 0.5, 0.95]}>
        <icosahedronGeometry args={[0.4, 0]} />
        {m(MOSS)}
      </mesh>
      <mesh position={[0.56, 0.2, 0.26]}>
        <icosahedronGeometry args={[0.3, 0]} />
        {m(ROCK_DK)}
      </mesh>
      <mesh position={[-0.38, 0.17, 0.32]}>
        <icosahedronGeometry args={[0.24, 0]} />
        {m(ROCK_LT)}
      </mesh>
    </group>
  );
}

// A single toadstool: domed cap + cream spots + a stubby stem.
function Mushroom({
  pos,
  scale = 1,
  cap = CAP_RED,
}: {
  pos: [number, number, number];
  scale?: number;
  cap?: string;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.06, 0.075, 0.18, 7]} />
        {m(STEM)}
      </mesh>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.15, 10, 8, 0, PI * 2, 0, PI / 2]} />
        {m(cap)}
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.08, 0.24, Math.sin(a) * 0.08]}>
            <sphereGeometry args={[0.022, 6, 6]} />
            {m(CAP_SPOT)}
          </mesh>
        );
      })}
    </group>
  );
}

// A little cluster of toadstools nestled in the grass.
function MushroomCluster({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <Mushroom pos={[0, 0, 0]} scale={1} />
      <Mushroom pos={[0.16, 0, 0.1]} scale={0.66} cap={CAP_BROWN} />
      <Mushroom pos={[-0.13, 0, 0.12]} scale={0.5} cap={CAP_RED} />
    </group>
  );
}

// A low fern/shrub clump: a few angled leaf blades fanning out of the grass.
function Fern({ pos, scale = 1 }: { pos: [number, number]; scale?: number }) {
  return (
    <group position={[pos[0], 0.02, pos[1]]} scale={scale}>
      {[-0.5, -0.2, 0.1, 0.4].map((a, i) => (
        <mesh
          key={i}
          position={[Math.sin(a) * 0.12, 0.16, Math.cos(a) * 0.04]}
          rotation={[0.5, a * 1.4, a * 0.6]}
        >
          <coneGeometry args={[0.07, 0.4, 4]} />
          {m(i % 2 ? GRASS_DK : MOSS)}
        </mesh>
      ))}
    </group>
  );
}

// A spiky tuft of grass blades.
function Tuft({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0.06, pos[1]]}>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * 0.06, 0.12, i * 0.04]} rotation={[0, 0, i * 0.22]}>
          <coneGeometry args={[0.03, 0.28, 4]} />
          {m(i % 2 ? GRASS_LT : GRASS_DK)}
        </mesh>
      ))}
    </group>
  );
}

// A small scatter of pebbles.
function PebbleCluster({ pos }: { pos: [number, number] }) {
  const stones: [number, number, number][] = [
    [0, 0.16, 0.16],
    [0.18, 0.12, 0.1],
    [-0.14, 0.1, 0.12],
  ];
  return (
    <group position={[pos[0], 0.05, pos[1]]}>
      {stones.map(([x, z, r], i) => (
        <mesh key={i} position={[x, r * 0.5, z]} scale={[1.2, 0.65, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(i % 2 ? ROCK_LT : ROCK)}
        </mesh>
      ))}
    </group>
  );
}

// A single stemmed bloom — simple wildflowers dotting the meadow (kept lighter
// than the cultivated yard daisies so the two read at different "detail tiers").
function Bloom({ pos, color }: { pos: [number, number]; color: string }) {
  return (
    <group position={[pos[0], 0.06, pos[1]]}>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 5]} />
        {m("#6f9352")}
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <icosahedronGeometry args={[0.07, 0]} />
        {m(color)}
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        {m("#f7d06b")}
      </mesh>
    </group>
  );
}

// A small woodland pond — a soft faceted water disc with lily pads, a couple of
// reedy cattails and a stone or two on its rim. The pet's nav clamp (r≈5) keeps
// it from ever stepping in.
function Pond({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* mossy bank ring */}
      <mesh position={[0, 0.03, 0]} scale={[1.15, 1, 1.0]}>
        <cylinderGeometry args={[1.0, 1.12, 0.12, 11]} />
        {m(MOSS_DK)}
      </mesh>
      {/* water surface, just below the bank lip */}
      <mesh position={[0, 0.07, 0]} scale={[1.12, 1, 0.97]}>
        <cylinderGeometry args={[0.9, 0.9, 0.06, 11]} />
        {m(WATER)}
      </mesh>
      <mesh position={[-0.18, 0.1, 0.12]} scale={[0.55, 1, 0.5]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 9]} />
        {m(WATER_LT)}
      </mesh>
      {/* lily pads */}
      {([[0.35, 0.2], [-0.3, -0.25], [0.1, -0.4]] as const).map(([x, z], i) => (
        <mesh key={i} position={[x * 1.0, 0.11, z * 0.9]} scale={[1, 0.18, 1]}>
          <icosahedronGeometry args={[0.16, 0]} />
          {m(i % 2 ? LEAF_A : LEAF_C)}
        </mesh>
      ))}
      {/* a little lily bloom */}
      <mesh position={[0.35, 0.14, 0.18]}>
        <sphereGeometry args={[0.05, 7, 6]} />
        {m("#f4b8cd")}
      </mesh>
      {/* cattail reeds at the back edge */}
      {([[-0.7, -0.5], [-0.55, -0.62]] as const).map(([x, z], i) => (
        <group key={`r${i}`} position={[x, 0.1, z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 5]} />
            {m(GRASS_DK)}
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <capsuleGeometry args={[0.04, 0.14, 4, 8]} />
            {m(TRUNK_DK)}
          </mesh>
        </group>
      ))}
      {/* a rim stone */}
      <mesh position={[0.85, 0.12, -0.5]} scale={[1.2, 0.7, 1]}>
        <icosahedronGeometry args={[0.26, 0]} />
        {m(ROCK)}
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scatter / placement. Everything below stays off the house footprint
// (x[-4.6,0.4], z[-4.6,-0.2]), the veg patch (≈x[-1.9,0.7], z[1.55,3.45]), the
// yard's three prop corners and the stepping-stone lane down the front-right.

// soft sunlit patches very gently dappling the lawn — kept close to the base
// green + LIGHTER-only (no dark moss blobs) so the meadow reads as one clean,
// vibrant green like the reference instead of a mottled, busy surface.
const GRASS_PATCHES: [number, number, number, string][] = [
  [2.7, 1.9, 2.3, GRASS_SOFT],
  [-3.3, 1.0, 2.0, GRASS_SOFT],
  [1.2, 3.6, 1.8, GRASS_SOFT],
  [0.5, -3.2, 2.0, GRASS_SOFT],
];

// grey rocks dotted on the lawn (x, z, radius) — all OUTSIDE the pet's reach
// (NAV_CLAMP_R≈5) so they need no obstacle footprint in layout.ts
const ROCKS: [number, number, number][] = [
  [-0.6, 5.4, 0.3], [5.4, -0.7, 0.4], [-5.4, 1.9, 0.36],
  [0.3, 5.9, 0.32], [-5.3, -1.4, 0.3], [5.2, 2.9, 0.26],
];

// a sparse scatter of grass tufts near the rim — just enough to soften the edge
// (quality over quantity: a clean lawn reads better than a carpet of spikes).
const TUFTS: [number, number][] = [
  [-3.5, 2.9], [4.4, 0.6], [-4.2, -0.7], [5.4, 1.4], [-2.3, 5.0],
  [3.3, 4.6], [5.8, 0.2], [-5.0, -1.7], [1.6, -5.1], [2.8, -3.4],
];

const PEBBLES: [number, number][] = [
  [2.9, -3.0], [-1.8, 4.9], [-5.3, 0.6],
];

// the wild meadow blooms (x, z, color) — small cheerful flowers near the rim,
// thickest along the front-right meadow like the reference, never a carpet
const FLOWERS: [number, number, string][] = [
  [-3.5, 2.2, "#f0a6bd"], [4.7, -1.9, "#fff6ee"], [-2.5, 4.6, "#f6d35e"],
  [4.9, 1.0, "#bfa3df"], [5.0, 3.6, "#fff6ee"], [2.9, 5.0, "#f6d35e"],
  [5.7, -1.4, "#fff6ee"], [-0.4, 5.7, "#f0a6bd"], [-4.6, 2.9, "#f6d35e"],
  [-2.4, 5.3, "#bfa3df"], [1.1, 5.3, "#fff6ee"], [-4.4, 4.2, "#f0a6bd"],
];

// Lumps + half-buried rocks dappling the island flank (azimuth, t, scale, tone).
const SOIL_LUMPS: [number, number, number, string][] = [
  [0.5, 0.2, 0.9, SOIL_1],
  [1.6, 0.45, 1.0, SOIL_2],
  [2.7, 0.25, 0.8, SOIL_TOP],
  [3.8, 0.5, 0.95, SOIL_2],
  [4.8, 0.3, 0.85, SOIL_1],
  [5.7, 0.5, 0.9, SOIL_2],
];
const FLANK_ROCKS: [number, number, number][] = [
  [2.0, 0.18, 0.7],
  [5.0, 0.22, 0.6],
];

export default function Island() {
  // the rounded tray: a grass-top fan + tapering soil bands over a soft base.
  const island = useMemo(() => {
    const topC = new THREE.Vector3(0, 0.05, 0);
    const r0 = ring(0.05, layerJitter(0, 0.95, 1.06)); // grass rim (tidy)
    const r1 = ring(-0.75, layerJitter(1, 0.92, 1.03)); // soil top (slight ledge)
    const r2 = ring(-1.6, layerJitter(2, 0.85, 0.98)); // soil upper
    const r3 = ring(-2.45, layerJitter(3, 0.72, 0.9)); // soil mid
    const r4 = ring(-3.15, layerJitter(4, 0.54, 0.76)); // soil low (fuller base)
    const baseC = new THREE.Vector3(0, -3.7, 0); // deep, solid planet bottom
    return {
      grass: fanGeometry(topC, r0),
      skirt: bandGeometry(r0, r1),
      soilA: bandGeometry(r1, r2),
      soilB: bandGeometry(r2, r3),
      soilC: bandGeometry(r3, r4),
      base: fanGeometry(baseC, r4),
    };
  }, []);
  const lumps = useMemo(
    () =>
      SOIL_LUMPS.map(([az, t, sc, tone]) => {
        const y = -0.55 - t * 1.5;
        const r = LAWN_R * 0.9 - t * 3.0;
        return {
          pos: [Math.cos(az) * r, y, Math.sin(az) * r] as [number, number, number],
          sc,
          tone,
        };
      }),
    [],
  );
  const flankRocks = useMemo(
    () =>
      FLANK_ROCKS.map(([az, t, sc]) => {
        const y = -0.5 - t * 1.4;
        const r = LAWN_R * 0.92 - t * 2.8;
        return {
          pos: [Math.cos(az) * r, y, Math.sin(az) * r] as [number, number, number],
          sc,
        };
      }),
    [],
  );

  return (
    <group>
      {/* rounded faceted grass top */}
      <mesh geometry={island.grass}>{mi(GRASS)}</mesh>
      {/* soft sun patches dappling the lawn so it isn't one flat green */}
      {GRASS_PATCHES.map(([x, z, r, c], i) => (
        <mesh key={`gp${i}`} position={[x, 0.06, z]} scale={[1, 0.022, 1]}>
          <icosahedronGeometry args={[r * 0.85, 1]} />
          {m(c)}
        </mesh>
      ))}
      {/* grassy rim skirt + chunky soil pile + faceted base */}
      <mesh geometry={island.skirt}>{mi(GRASS_EDGE)}</mesh>
      <mesh geometry={island.soilA}>{mi(SOIL_TOP)}</mesh>
      <mesh geometry={island.soilB}>{mi(SOIL_1)}</mesh>
      <mesh geometry={island.soilC}>{mi(SOIL_2)}</mesh>
      <mesh geometry={island.base}>{mi(SOIL_3)}</mesh>
      {/* lumps + rocks dappling the flank for a hand-sculpted surface */}
      {lumps.map((l, i) => (
        <mesh key={`lp${i}`} position={l.pos} scale={[l.sc * 1.2, l.sc * 0.8, l.sc]}>
          <icosahedronGeometry args={[0.75, 0]} />
          {m(l.tone)}
        </mesh>
      ))}
      {flankRocks.map((r, i) => (
        <mesh key={`fr${i}`} position={r.pos} scale={[r.sc * 1.3, r.sc, r.sc]}>
          <icosahedronGeometry args={[0.6, 0]} />
          {m(i % 2 ? ROCK : ROCK_DK)}
        </mesh>
      ))}

      {/* grey rocks dotted on the lawn */}
      {ROCKS.map(([x, z, r], i) => (
        <mesh key={`r${i}`} position={[x, 0.06 + r * 0.4, z]} scale={[1, 0.78, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(i % 2 ? ROCK : ROCK_LT)}
        </mesh>
      ))}

      {/* grass tufts, pebbles, wildflowers — filling the open meadow */}
      {TUFTS.map((p, i) => (
        <Tuft key={`t${i}`} pos={p} />
      ))}
      {PEBBLES.map((p, i) => (
        <PebbleCluster key={`p${i}`} pos={p} />
      ))}
      {FLOWERS.map(([x, z, c], i) => (
        <Bloom key={`f${i}`} pos={[x, z]} color={c} />
      ))}

      {/* ===== the forest ring ===== set back at the rim, composed per the
          reference: the HERO blob tree rises right behind the mail corner, a
          smaller pair anchor the right meadow and the back-left, and a few
          conifers fill the back rim for skyline depth (never blocking the
          cutaway interior). */}
      <BlobTree pos={HERO_TREE} scale={1.25} />
      <BlobTree pos={[5.8, 0, 1.5]} scale={0.8} />
      {/* (no tree directly behind the house — anything big enough to read there
          either pierces the -x wall or overhangs the rim) */}
      {/* conifers along the left + back rim (behind the solid walls) */}
      <Pine pos={[-5.9, 0, -0.9]} scale={1.05} />
      <Pine pos={[-5.3, 0, 2.0]} scale={0.84} />
      <Pine pos={[1.7, 0, -5.5]} scale={0.9} />
      <Pine pos={[4.0, 0, -4.7]} scale={0.7} />
      {/* a short one at the front-left corner (doesn't block the view) */}
      <Pine pos={[-4.5, 0, 4.6]} scale={0.56} />

      {/* trimmed round bushes — the smooth clipped shrubs from the reference,
          one anchoring the front-right meadow like the picture */}
      <RoundBush pos={[4.6, 3.5]} scale={1.15} />
      <RoundBush pos={[5.9, -0.5]} scale={0.9} />
      <RoundBush pos={[-5.9, 0.4]} scale={1.0} />
      <RoundBush pos={[-2.7, 5.4]} scale={0.8} />
      <RoundBush pos={[2.3, 5.3]} scale={0.7} />

      {/* mossy boulders: a huddle by the pack corner (the reference's rocks
          beside the table), plus rim accents */}
      <Boulders pos={ISLAND_BOULDERS} scale={0.8} />
      <Boulders pos={[5.5, 0, -3.5]} scale={0.9} />
      <Boulders pos={[0.4, 0, 5.8]} scale={0.85} />

      {/* mushrooms + ferns nestled at the tree bases (sparse — the open lawn
          stays clean) */}
      <MushroomCluster pos={[-5.0, 2.9]} />
      <MushroomCluster pos={MUSHROOM_PATCH} />
      <Fern pos={[-5.5, -1.8]} scale={1.0} />
      <Fern pos={[5.3, -1.9]} scale={0.95} />
      <Fern pos={[-3.3, 4.9]} scale={0.85} />

      {/* a small woodland pond out in the front-left meadow */}
      <Pond pos={ISLAND_POND} />
    </group>
  );
}
