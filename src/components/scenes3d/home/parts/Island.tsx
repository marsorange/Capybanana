"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { toonMaterial } from "../../materials";

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
);

// fresh, varied greens so the lawn never reads as one flat color
const GRASS = "#8ec159";
const GRASS_LT = "#a3d06c";
const GRASS_YEL = "#b6d165";
const GRASS_DK = "#76aa48";
const GRASS_EDGE = "#6c9f43";
// warm faceted earth tones for the soil mound
const SOIL_TOP = "#c49a64";
const SOIL_1 = "#b07f49";
const SOIL_2 = "#9c6d3b";
const SOIL_3 = "#855b30";
const ROCK = "#bcb4a3";
const ROCK_DK = "#a59c8a";
const PINE_DK = "#6f9d57";
const PINE_LT = "#7cab60";
const TRUNK = "#8c5f35";
const SAND = "#e7d3a4";
const SAND_DK = "#cdb583";

const N = 14; // facet count — chunky low-poly silhouette
const LAWN_R = 6.3; // lawn radius (smaller, so less empty green around the house)
const PI = Math.PI;

// ---------------------------------------------------------------------------
// Irregular faceted "earth tray" geometry. The outline is a jittered polygon
// (NOT a clean circle) and the body is a chunky thick tray that tapers to a soft
// bottom — built as a stack of rings sharing the same jittered profile, scaled
// down as they descend, so the whole island reads as a hand-broken chunk of land.
const RIM_N = 13;
// deterministic per-vertex radius jitter for the irregular silhouette
const RIM_JITTER = Array.from({ length: RIM_N }, (_, i) => {
  const s = Math.sin(i * 127.1 + 3.7) * 43758.5453;
  return 0.9 + (s - Math.floor(s)) * 0.2; // 0.90 .. 1.10 (gently irregular)
});

function ring(scale: number, y: number): THREE.Vector3[] {
  return RIM_JITTER.map((jr, i) => {
    const a = (i / RIM_N) * PI * 2;
    const r = LAWN_R * jr * scale;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
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

// ---- scattered ground dressing (kept off the house footprint + walking lanes)
// house footprint: x[-4.6, 0.4], z[-4.6, -0.2]. Everything below stays clear of it.
const CLOVERS: [number, number][] = [
  [4.1, 2.7],
  [-4.0, 2.8],
  [4.5, -1.1],
  [-2.7, 3.9],
];
const ROCKS: [number, number, number][] = [
  [-1.1, 4.5, 0.32],
  [-4.4, 1.8, 0.34],
  [4.3, 2.4, 0.3],
];
const TUFTS: [number, number][] = [
  [-3.8, 3.3],
  [0.4, 4.9],
  [4.5, 1.9],
  [3.3, -3.6],
  [-4.7, -0.9],
];
const PEBBLES: [number, number][] = [
  [-4.0, 2.9],
  [3.1, -3.0],
];
const FLOWERS: [number, number, string][] = [
  [-4.2, 2.6, "#f1a6bd"],
  [4.9, -1.0, "#fff4f0"],
  [-3.4, 3.5, "#f4d35e"],
];
// large, soft color patches that break up the flat lawn (x, z, radius, color)
const GRASS_PATCHES: [number, number, number, string][] = [
  [3.0, 2.2, 2.0, GRASS_LT],
  [-3.8, 1.2, 1.9, GRASS_DK],
  [1.4, 4.0, 1.7, GRASS_YEL],
  [4.2, -1.4, 1.6, GRASS_DK],
  [-1.8, 4.0, 1.6, GRASS_LT],
  [0.5, -3.8, 1.6, GRASS_YEL],
];

// ---------- decorative props for the wide-open left / right grass ----------

// A chunky low-poly conifer: stacked cones on a stubby trunk.
function Pine({
  pos,
  scale = 1,
}: {
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.12, 0.17, 0.6, 6]} />
        {m(TRUNK)}
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <coneGeometry args={[0.6, 0.9, 7]} />
        {m(PINE_DK)}
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <coneGeometry args={[0.46, 0.8, 7]} />
        {m(PINE_LT)}
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <coneGeometry args={[0.32, 0.7, 7]} />
        {m(PINE_DK)}
      </mesh>
    </group>
  );
}

// A round, fluffy faceted broadleaf tree (the big one in the reference corner).
function ShadeTree({
  pos,
  scale = 1,
}: {
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 1.1, 7]} />
        {m(TRUNK)}
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <icosahedronGeometry args={[1.1, 0]} />
        {m("#73ab52")}
      </mesh>
      <mesh position={[0.5, 1.95, 0.2]}>
        <icosahedronGeometry args={[0.66, 0]} />
        {m("#82b860")}
      </mesh>
      <mesh position={[-0.45, 1.85, -0.15]}>
        <icosahedronGeometry args={[0.58, 0]} />
        {m("#6c9f4c")}
      </mesh>
      <mesh position={[0.05, 2.45, -0.05]}>
        <icosahedronGeometry args={[0.5, 0]} />
        {m("#82b860")}
      </mesh>
    </group>
  );
}

// A little huddle of faceted boulders.
function Boulders({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]} scale={[1.35, 0.88, 1]}>
        <icosahedronGeometry args={[0.52, 0]} />
        {m(ROCK)}
      </mesh>
      <mesh position={[0.55, 0.2, 0.25]}>
        <icosahedronGeometry args={[0.3, 0]} />
        {m(ROCK_DK)}
      </mesh>
      <mesh position={[-0.36, 0.16, 0.32]}>
        <icosahedronGeometry args={[0.23, 0]} />
        {m("#cbc4b4")}
      </mesh>
    </group>
  );
}

// A spiky tuft of grass blades.
function Tuft({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0.06, pos[1]]}>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          position={[i * 0.06, 0.12, i * 0.04]}
          rotation={[0, 0, i * 0.22]}
        >
          <coneGeometry args={[0.03, 0.26, 4]} />
          {m(i % 2 ? "#9ec872" : "#86b35f")}
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
    [0.05, 0.09, 0.08],
  ];
  return (
    <group position={[pos[0], 0.05, pos[1]]}>
      {stones.map(([x, z, r], i) => (
        <mesh key={i} position={[x, r * 0.5, z]} scale={[1.2, 0.65, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(i % 2 ? "#cbc2af" : "#bbb19c")}
        </mesh>
      ))}
    </group>
  );
}

// A single stemmed bloom — simpler than the yard daisies, for filling grass.
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

// ---------------------------------------------------------------------------
// A flat low-poly ribbon laid on the lawn — the winding sandy footpaths. Built
// as a CatmullRom-swept strip in the XZ plane with explicit up-normals + correct
// CCW winding so it reads from above.
function ribbonGeometry(
  pts: [number, number][],
  halfWidth: number,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  );
  const segs = Math.max(28, pts.length * 12);
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPoint(t);
    curve.getTangent(t, tan);
    side.crossVectors(tan, up).normalize();
    const w = halfWidth * (0.45 + 0.55 * Math.min(1, t / 0.12));
    pos.push(p.x - side.x * w, 0, p.z - side.z * w);
    pos.push(p.x + side.x * w, 0, p.z + side.z * w);
    nor.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

function Path({
  pts,
  width = 0.92,
}: {
  pts: [number, number][];
  width?: number;
}) {
  const top = useMemo(() => ribbonGeometry(pts, width / 2), [pts, width]);
  const base = useMemo(() => ribbonGeometry(pts, width / 2 + 0.13), [pts, width]);
  return (
    <group>
      <mesh geometry={base} position={[0, 0.05, 0]}>
        {m(SAND_DK)}
      </mesh>
      <mesh geometry={top} position={[0, 0.064, 0]}>
        {m(SAND)}
      </mesh>
    </group>
  );
}

// The main winding path (front edge → cottage doorstep) + a spur to the garden.
const MAIN_PATH: [number, number][] = [
  [1.8, 4.7],
  [1.1, 3.9],
  [2.1, 2.7],
  [0.6, 1.0],
  [0.7, -0.15], // lands at the house front entrance / doorstep
];
const GARDEN_PATH: [number, number][] = [
  [1.7, 2.9],
  [2.3, 2.4],
  [2.7, 3.0],
];

// ---------------------------------------------------------------------------
// The island is a REAL, IRREGULAR faceted "earth tray": a jittered-polygon grass
// top (not a circle) capping a chunky thick body that tapers to a soft bottom,
// built from rings sharing the jittered profile (see ring/fan/band helpers).
// Everything sits flat on top (no shader deform), and lumps + half-buried rocks
// dapple the flanks so it reads as a hand-broken chunk of land.

// Lumps half-buried in the flanks (azimuth, t down the flank 0..1, scale, tone).
const SOIL_LUMPS: [number, number, number, string][] = [
  [0.5, 0.2, 0.9, SOIL_1],
  [1.5, 0.45, 1.0, SOIL_2],
  [2.6, 0.25, 0.8, SOIL_TOP],
  [3.7, 0.5, 0.95, SOIL_2],
  [4.7, 0.3, 0.85, SOIL_1],
  [5.6, 0.5, 0.9, SOIL_2],
];
// a couple of grey rocks embedded in the upper soil
const FLANK_ROCKS: [number, number, number][] = [
  [2.0, 0.18, 0.7],
  [5.0, 0.22, 0.6],
];

// double-sided toon material for the hand-built island shells (winding-proof)
const mi = (c: string) => (
  <primitive object={toonMaterial(c, { side: THREE.DoubleSide })} attach="material" />
);

export default function Island() {
  const mainPath = MAIN_PATH;
  const gardenPath = GARDEN_PATH;
  // the irregular tray: a grass-top fan + tapering soil bands over a soft base,
  // all sharing the jittered rim profile.
  const island = useMemo(() => {
    const topC = new THREE.Vector3(0, 0.04, 0);
    const r0 = ring(1.0, 0.04); // grass rim
    const r1 = ring(0.99, -0.5); // grass skirt bottom / soil top
    const r2 = ring(0.84, -1.35); // soil mid
    const r3 = ring(0.54, -2.2); // soil low
    const baseC = new THREE.Vector3(0, -2.75, 0);
    return {
      grass: fanGeometry(topC, r0),
      skirt: bandGeometry(r0, r1),
      soilA: bandGeometry(r1, r2),
      soilB: bandGeometry(r2, r3),
      base: fanGeometry(baseC, r3),
    };
  }, []);
  const lumps = useMemo(
    () =>
      SOIL_LUMPS.map(([az, t, sc, tone]) => {
        const y = -0.55 - t * 1.5;
        const r = LAWN_R * 0.9 - t * 3.0;
        return {
          pos: [Math.cos(az) * r, y, Math.sin(az) * r] as [
            number,
            number,
            number,
          ],
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
          pos: [Math.cos(az) * r, y, Math.sin(az) * r] as [
            number,
            number,
            number,
          ],
          sc,
        };
      }),
    [],
  );

  return (
    <group>
      {/* irregular faceted grass top (a jittered polygon, not a circle) */}
      <mesh geometry={island.grass}>{mi(GRASS)}</mesh>
      {/* soft color patches dappling the lawn so it isn't one flat green */}
      {GRASS_PATCHES.map(([x, z, r, c], i) => (
        <mesh key={`gp${i}`} position={[x, 0.06, z]} scale={[1, 0.022, 1]}>
          <icosahedronGeometry args={[r * 0.85, 1]} />
          {m(c)}
        </mesh>
      ))}
      {/* grassy rim skirt + the thick tapering soil body + soft base */}
      <mesh geometry={island.skirt}>{mi(GRASS_EDGE)}</mesh>
      <mesh geometry={island.soilA}>{mi(SOIL_TOP)}</mesh>
      <mesh geometry={island.soilB}>{mi(SOIL_1)}</mesh>
      <mesh geometry={island.base}>{mi(SOIL_2)}</mesh>
      {/* lumps + rocks dappling the flank for a hand-sculpted, varied surface */}
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

      {/* winding sandy footpaths */}
      <Path pts={mainPath} width={0.98} />
      <Path pts={gardenPath} width={0.62} />

      {/* grey rocks dotted on the lawn */}
      {ROCKS.map(([x, z, r], i) => (
        <mesh key={`r${i}`} position={[x, 0.06 + r * 0.4, z]} scale={[1, 0.78, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(i % 2 ? ROCK : "#cbc4b4")}
        </mesh>
      ))}

      {/* clover tufts */}
      {CLOVERS.map(([x, z], i) => (
        <group key={`c${i}`} position={[x, 0.08, z]}>
          {[0, 1, 2].map((j) => {
            const a = (j / 3) * PI * 2;
            return (
              <mesh key={j} position={[Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07]}>
                <icosahedronGeometry args={[0.07, 0]} />
                {m(j % 2 ? "#9ec872" : "#86b35f")}
              </mesh>
            );
          })}
        </group>
      ))}

      {/* grass tufts, pebbles, blooms — filling the wide-open grass */}
      {TUFTS.map((p, i) => (
        <Tuft key={`t${i}`} pos={p} />
      ))}
      {PEBBLES.map((p, i) => (
        <PebbleCluster key={`p${i}`} pos={p} />
      ))}
      {FLOWERS.map(([x, z, c], i) => (
        <Bloom key={`f${i}`} pos={[x, z]} color={c} />
      ))}

      {/* ---- feature props dressing the empty left / right sides ---- */}
      {/* left side */}
      <Pine pos={[-4.7, 0, 1.5]} scale={1.0} />
      <Pine pos={[-3.8, 0, 3.7]} scale={0.74} />
      <Boulders pos={[-4.4, 0, 2.8]} />
      {/* right-BACK corner — the big shade tree, pushed back so it never
          occludes the pet or the house's open cutaway face */}
      <ShadeTree pos={[4.6, 0, -3.6]} scale={1.0} />
      <Boulders pos={[5.0, 0, 0.6]} />
    </group>
  );
}
