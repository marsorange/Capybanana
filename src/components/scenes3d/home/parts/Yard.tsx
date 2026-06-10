"use client";

import { toonMaterial } from "../../materials";

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
);
const glow = (c: string, e: string, i = 0.85) => (
  <primitive object={toonMaterial(c, { emissive: e, emissiveIntensity: i })} attach="material" />
);

// ---------------------------------------------------------------------------
// 原木治愈 cottage-garden palette. Everything man-made in the yard is warm,
// round-edged timber; greens stay fresh, soil stays chocolate, and the only
// saturated pop is the little red mailbox (the reference's focal accent).
const LOG = "#c89058"; // log rails / posts
const LOG_DK = "#96693c"; // shadow wood / feet
const LOG_LT = "#e2b478"; // sunlit caps + seat slats
const LOG_CUT = "#ecd2a3"; // sawn end-grain discs
const LEAF = "#74b052";
const LEAF_LT = "#9bcd6a";
const LEAF_DK = "#5f9a3e";
const SOIL = "#6b4830"; // freshly-tilled chocolate soil
const SOIL_LT = "#855c3b"; // sunlit ridge rows
const SOIL_DK = "#52371f"; // furrow shadow
const MAIL = "#e0594e";
const MAIL_DK = "#a93e35";
const CREAM = "#fff3e0";
const STONE = "#c2b9a4";
const STONE_LT = "#d4cbb6";
const STONE_DK = "#a59c87";
const TIN = "#9db4a4"; // watering can

const PI = Math.PI;

// ---------------------------------------------------------------------------
// SMALL SHARED PIECES

// A cheerful daisy: stem + a ring of 5 plump petals + a sunny center.
function Daisy({
  pos,
  petal,
  center = "#f7d06b",
  scale = 1,
}: {
  pos: [number, number, number];
  petal: string;
  center?: string;
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
        {m("#6f9352")}
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.07, 0.255, Math.sin(a) * 0.07]}
            scale={[1, 0.65, 1]}
          >
            <sphereGeometry args={[0.052, 8, 6]} />
            {m(petal)}
          </mesh>
        );
      })}
      <mesh position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        {m(center)}
      </mesh>
      {/* one little leaf on the stem */}
      <mesh position={[0.05, 0.16, 0]} rotation={[0, 0, -0.9]} scale={[1, 0.5, 0.6]}>
        <sphereGeometry args={[0.04, 6, 5]} />
        {m(LEAF)}
      </mesh>
    </group>
  );
}

// A leafy seedling: a tidy rosette of upright tapered blades around a heart.
function Seedling({
  pos,
  scale = 1,
}: {
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * PI * 2 + 0.3;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.06, 0.1, Math.sin(a) * 0.06]}
            rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}
          >
            <coneGeometry args={[0.045, 0.22, 4]} />
            {m(i % 2 ? LEAF : LEAF_LT)}
          </mesh>
        );
      })}
      <mesh position={[0, 0.05, 0]}>
        <icosahedronGeometry args={[0.05, 0]} />
        {m(LEAF_LT)}
      </mesh>
    </group>
  );
}

// A horizontal round log rail between two local points along one axis.
function Rail({
  pos,
  axis,
  len,
  r = 0.045,
}: {
  pos: [number, number, number];
  axis: "x" | "z";
  len: number;
  r?: number;
}) {
  return (
    <mesh
      position={pos}
      rotation={axis === "x" ? [0, 0, PI / 2] : [PI / 2, 0, 0]}
    >
      <cylinderGeometry args={[r, r, len, 6]} />
      {m(LOG)}
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// 苗圃 — the kitchen garden. A log-rail fence (round posts with sawn caps + two
// slim rails per side) wraps a mounded chocolate bed with three sunlit ridge
// rows; greens sprout in tidy lines with one cabbage, a carrot top and a single
// proud orange tulip. A sprout sign leans by the front corner.
const HX = 1.3; // half-width (x)
const HZ = 0.95; // half-depth (z)
function VegPatch() {
  const posts: [number, number][] = [
    [-HX, -HZ], [0, -HZ], [HX, -HZ],
    [-HX, HZ], [0, HZ], [HX, HZ],
    [-HX, 0], [HX, 0],
  ];
  const ridges = [-0.55, 0, 0.55]; // planted rows along x
  return (
    <group>
      {/* round log posts with sawn-top discs */}
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.07, 0.085, 0.6, 6]} />
            {m(LOG_DK)}
          </mesh>
          <mesh position={[0, 0.605, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.025, 6]} />
            {m(LOG_CUT)}
          </mesh>
        </group>
      ))}
      {/* two slim rails per side */}
      {[0.26, 0.47].map((y, i) => (
        <group key={i}>
          <Rail pos={[0, y, -HZ]} axis="x" len={2 * HX - 0.1} />
          <Rail pos={[0, y, HZ]} axis="x" len={2 * HX - 0.1} />
          <Rail pos={[-HX, y, 0]} axis="z" len={2 * HZ - 0.1} />
          <Rail pos={[HX, y, 0]} axis="z" len={2 * HZ - 0.1} />
        </group>
      ))}

      {/* mounded soil: dark base + three sunlit ridge rows with shadow furrows */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[2 * HX - 0.18, 0.32, 2 * HZ - 0.18]} />
        {m(SOIL)}
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[2 * HX - 0.32, 0.04, 2 * HZ - 0.32]} />
        {m(SOIL_DK)}
      </mesh>
      {ridges.map((z, i) => (
        <mesh key={`rg${i}`} position={[0, 0.37, z]}>
          <boxGeometry args={[2 * HX - 0.44, 0.09, 0.3]} />
          {m(i % 2 ? SOIL : SOIL_LT)}
        </mesh>
      ))}

      {/* planted rows (kept inside |x|≤0.95 so nothing clips the rails) */}
      {/* back row: tidy greens */}
      {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
        <Seedling key={`a${i}`} pos={[x, 0.4, -0.55]} scale={0.9 + (i % 2) * 0.14} />
      ))}
      {/* middle row: a round cabbage, a sprout, a carrot top */}
      <group position={[-0.62, 0.42, 0]}>
        <mesh position={[0, 0.09, 0]}>
          <icosahedronGeometry args={[0.14, 0]} />
          {m(LEAF)}
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <icosahedronGeometry args={[0.085, 0]} />
          {m(LEAF_LT)}
        </mesh>
      </group>
      <Seedling pos={[0.08, 0.4, 0]} scale={1.0} />
      <group position={[0.74, 0.4, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <coneGeometry args={[0.07, 0.17, 7]} />
          {m("#e88a3c")}
        </mesh>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * PI * 2;
          return (
            <mesh
              key={k}
              position={[Math.cos(a) * 0.04, 0.17, Math.sin(a) * 0.04]}
              rotation={[Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]}
            >
              <coneGeometry args={[0.02, 0.17, 4]} />
              {m(LEAF_LT)}
            </mesh>
          );
        })}
      </group>
      {/* front row: greens + ONE proud orange tulip (the reference's accent) */}
      {[-0.85, -0.2, 0.4].map((x, i) => (
        <Seedling key={`c${i}`} pos={[x, 0.4, 0.55]} scale={0.86 + (i % 2) * 0.16} />
      ))}
      <group position={[0.95, 0.42, 0.55]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 5]} />
          {m("#6f9352")}
        </mesh>
        <mesh position={[0.06, 0.14, 0]} rotation={[0, 0, -0.8]} scale={[1, 0.45, 0.5]}>
          <sphereGeometry args={[0.07, 6, 5]} />
          {m(LEAF)}
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <coneGeometry args={[0.075, 0.18, 6]} />
          {m("#ec7a48")}
        </mesh>
        <mesh position={[0, 0.54, 0]}>
          <sphereGeometry args={[0.05, 6, 5]} />
          {m("#f29a62")}
        </mesh>
      </group>

      {/* sprout sign leaning by the front-right corner (faces the camera) */}
      <group position={[HX + 0.28, 0, HZ - 0.14]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.26, 0]} rotation={[0.08, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 0.52, 6]} />
          {m(LOG_DK)}
        </mesh>
        <mesh position={[0, 0.5, 0.03]} rotation={[0.08, 0, 0.04]}>
          <boxGeometry args={[0.36, 0.26, 0.05]} />
          {m(LOG_LT)}
        </mesh>
        <mesh position={[0, 0.5, 0.065]} rotation={[0.08, 0, 0.04]}>
          <boxGeometry args={[0.3, 0.2, 0.01]} />
          {m(LOG_CUT)}
        </mesh>
        {/* the little sprout icon */}
        <mesh position={[0, 0.465, 0.085]}>
          <cylinderGeometry args={[0.012, 0.012, 0.07, 5]} />
          {m(LEAF_DK)}
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.035, 0.52, 0.085]}
            rotation={[0, 0, s * -0.8]}
            scale={[1, 0.55, 0.5]}
          >
            <sphereGeometry args={[0.04, 6, 5]} />
            {m(LEAF)}
          </mesh>
        ))}
      </group>
    </group>
  );
}

// A small tin watering can resting by the bed.
function WateringCan({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.26, 9]} />
        {m(TIN)}
      </mesh>
      <mesh position={[0, 0.265, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.05, 9]} />
        {m("#8aa191")}
      </mesh>
      {/* spout */}
      <mesh position={[0.17, 0.17, 0]} rotation={[0, 0, -0.85]}>
        <cylinderGeometry args={[0.025, 0.035, 0.2, 6]} />
        {m(TIN)}
      </mesh>
      <mesh position={[0.235, 0.23, 0]} rotation={[0, 0, -0.85]}>
        <cylinderGeometry args={[0.045, 0.025, 0.05, 7]} />
        {m("#8aa191")}
      </mesh>
      {/* arc handle */}
      <mesh position={[-0.1, 0.26, 0]} rotation={[PI / 2, 0, 0.5]}>
        <torusGeometry args={[0.09, 0.018, 6, 10, PI]} />
        {m("#8aa191")}
      </mesh>
    </group>
  );
}

// A cozy little log pile (two below, one on top) with sawn end-grain faces.
function LogPile({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  const logs: [number, number][] = [
    [-0.13, 0.11],
    [0.13, 0.11],
    [0, 0.31],
  ];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {logs.map(([x, y], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh rotation={[PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.66, 7]} />
            {m(i === 2 ? LOG : LOG_DK)}
          </mesh>
          <mesh position={[0, 0, 0.335]} rotation={[PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.012, 7]} />
            {m(LOG_CUT)}
          </mesh>
        </group>
      ))}
      {/* one tiny mushroom sprouting beside the pile */}
      <group position={[0.3, 0, 0.22]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 0.12, 6]} />
          {m("#f3e7cf")}
        </mesh>
        <mesh position={[0, 0.13, 0]} scale={[1, 0.7, 1]}>
          <sphereGeometry args={[0.09, 8, 6, 0, PI * 2, 0, PI / 2]} />
          {m("#e06a55")}
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 收件箱 — the cheery red mailbox beside the postcard board: a log post with a
// cross-brace, a rounded red body with a darker half-round lid, a cream door
// with a letter slot, and the raised yellow flag. A little parcel waits below.
function Mailbox({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* post + foot + cross brace */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.72, 7]} />
        {m(LOG)}
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.08, 8]} />
        {m(LOG_DK)}
      </mesh>
      <mesh position={[0, 0.62, 0.1]} rotation={[0.7, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.26, 6]} />
        {m(LOG_DK)}
      </mesh>
      {/* body: red box + darker rounded lid, opening toward the camera (+z) */}
      <group position={[0, 0.82, 0.06]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.27, 0.46]} />
          {m(MAIL)}
        </mesh>
        <mesh position={[0, 0.135, 0]} rotation={[PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.46, 12, 1, false, -PI / 2, PI]} />
          {m(MAIL_DK)}
        </mesh>
        {/* cream door + slot + tiny knob */}
        <mesh position={[0, 0.02, 0.235]}>
          <boxGeometry args={[0.27, 0.3, 0.025]} />
          {m(CREAM)}
        </mesh>
        <mesh position={[0, 0.09, 0.252]}>
          <boxGeometry args={[0.17, 0.035, 0.012]} />
          {m(MAIL_DK)}
        </mesh>
        <mesh position={[0, -0.04, 0.255]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          {m("#e7b85c")}
        </mesh>
        {/* raised yellow flag on the side */}
        <mesh position={[0.19, 0.1, -0.08]}>
          <boxGeometry args={[0.025, 0.22, 0.03]} />
          {m("#f4d35e")}
        </mesh>
        <mesh position={[0.19, 0.2, -0.01]}>
          <boxGeometry args={[0.018, 0.11, 0.12]} />
          {m("#f9e58a")}
        </mesh>
      </group>
      {/* a little parcel waiting at the foot of the post */}
      <group position={[0.26, 0, 0.16]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.2, 0.18, 0.2]} />
          {m("#d8b27e")}
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.21, 0.19, 0.05]} />
          {m("#b98a55")}
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.05, 0.19, 0.21]} />
          {m("#b98a55")}
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// A squat 原木 garden lantern: stone footing, square wood post, a warm glowing
// head framed by four corner sticks under a pyramid cap (the reference's lamp).
function WoodLantern({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.1, 8]} />
        {m(STONE)}
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.11, 0.85, 0.11]} />
        {m(LOG_DK)}
      </mesh>
      {/* head: base plate, corner sticks, glowing core */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.3]} />
        {m(LOG)}
      </mesh>
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.12, 1.11, sz * 0.12]}>
          <boxGeometry args={[0.035, 0.26, 0.035]} />
          {m(LOG_DK)}
        </mesh>
      ))}
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[0.17, 0.2, 0.17]} />
        {glow("#ffe7a0", "#ffce63", 1.1)}
      </mesh>
      {/* pyramid cap + finial */}
      <mesh position={[0, 1.3, 0]} rotation={[0, PI / 4, 0]}>
        <coneGeometry args={[0.24, 0.16, 4]} />
        {m(LOG)}
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        {m(LOG_DK)}
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// A chunky two-slat garden bench with a gently reclined backrest.
function GardenBench({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* solid plank legs */}
      {[-0.44, 0.44].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0.02]}>
          <boxGeometry args={[0.08, 0.32, 0.34]} />
          {m(LOG_DK)}
        </mesh>
      ))}
      {/* seat: two warm slats with a visible gap */}
      {[-0.085, 0.09].map((z, i) => (
        <mesh key={i} position={[0, 0.345, z + 0.02]}>
          <boxGeometry args={[1.06, 0.06, 0.15]} />
          {m(LOG_LT)}
        </mesh>
      ))}
      {/* reclined back posts + two back slats */}
      {[-0.44, 0.44].map((x, i) => (
        <mesh key={i} position={[x, 0.55, -0.16]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.07, 0.5, 0.07]} />
          {m(LOG_DK)}
        </mesh>
      ))}
      {[0.52, 0.68].map((y, i) => (
        <mesh key={i} position={[0, y, -0.16 - (y - 0.35) * 0.22]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[1.06, 0.1, 0.05]} />
          {m(i % 2 ? LOG : LOG_LT)}
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// YARD — composition. Lanes the pet actually walks (doorstep → garden → farm,
// and over to the postcard board) stay clear; everything decorative gathers
// into three corners exactly like the reference:
//   • front-left  苗圃 corner — veg patch + watering can + log pile
//   • front-right 休息 corner — lantern + bench + flowers
//   • right-back  信件 corner — mailbox beside the postcard board
// with a tidy stepping-stone path running between them.
export default function Yard() {
  // the stepping-stone walk: deck edge → front rim, a gentle S (x, z, scale)
  const stones: [number, number, number][] = [
    [0.55, 0.3, 1.0],
    [0.95, 1.05, 0.86],
    [1.25, 1.9, 1.05],
    [1.42, 2.78, 0.9],
    [1.7, 3.6, 1.0],
    [2.05, 4.4, 0.82],
  ];

  return (
    <group>
      {/* stepping stones: flat 7-facet slabs with a sunlit top inset */}
      {stones.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, i * 0.9, 0]} scale={[s, 1, s]}>
          <mesh position={[0, 0.045, 0]} scale={[1, 1, 0.84]}>
            <cylinderGeometry args={[0.32, 0.36, 0.09, 7]} />
            {m(i % 2 ? STONE : STONE_DK)}
          </mesh>
          <mesh position={[0, 0.095, 0]} scale={[1, 1, 0.84]}>
            <cylinderGeometry args={[0.22, 0.24, 0.03, 7]} />
            {m(STONE_LT)}
          </mesh>
        </group>
      ))}

      {/* ===== 苗圃 corner (front-left) ===== */}
      <group position={[-0.6, 0, 2.5]}>
        <VegPatch />
      </group>
      <WateringCan pos={[-2.3, 0, 1.75]} rot={0.9} />
      <LogPile pos={[-2.55, 0, 3.4]} rot={0.35} />

      {/* ===== 信件 corner (right-back, beside the postcard board) ===== */}
      <Mailbox pos={[3.7, 0, -0.45]} rot={-0.45} />

      {/* ===== 休息 corner (front-right) ===== */}
      <WoodLantern pos={[2.35, 0, 2.5]} />
      <GardenBench pos={[3.95, 0, 1.8]} rot={-0.55} />

      {/* daisies gathered where they tell the story: flanking the path, around
          the bench, by the mailbox and at the veg-patch corners (the wild
          meadow blooms out by the rim belong to Island.tsx) */}
      {([
        [1.85, 1.45, "#fff6ee", 1.0],
        [0.75, 1.6, "#f4d35e", 0.9],
        [2.5, 3.4, "#f0a6bd", 1.0],
        [1.3, 4.5, "#fff6ee", 0.85],
        [3.1, 2.6, "#f4d35e", 1.0],
        [4.4, 2.5, "#e8607a", 0.9],
        [3.3, 0.6, "#fff6ee", 0.95],
        [4.35, -1.15, "#f0a6bd", 0.9],
        [-2.1, 2.6, "#fff6ee", 0.9],
        [0.85, 3.3, "#bfa3df", 0.85],
      ] as const).map(([x, z, c, s], i) => (
        <Daisy key={i} pos={[x, 0, z]} petal={c} scale={s} />
      ))}
    </group>
  );
}
