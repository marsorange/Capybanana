"use client";

import { toonMaterial } from "../../materials";

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
);
const glow = (c: string, e: string, i = 0.85) => (
  <primitive object={toonMaterial(c, { emissive: e, emissiveIntensity: i })} attach="material" />
);

// warm, refined cottage-yard palette to sit beside the forest
const WOOD = "#c08a52"; // raised-bed boards (warm, a touch richer than the house)
const WOOD_DK = "#8c5f35"; // posts + lower board / shadow tone
const WOOD_LT = "#d8ac6f"; // top cap rail + post caps (sunlit edge)
const LEAF = "#74b052";
const LEAF_LT = "#9bcd6a";
const SOIL = "#6b4830"; // dark, freshly-tilled chocolate soil (reference)
const SOIL_LT = "#825939"; // sunlit soil mound
const SOIL_DK = "#553a26"; // furrow shadow lines
const BANANA = "#f4c84a"; // the little Capybanana sign
const MAIL = "#e3645b";
const MAIL_DK = "#8f3b35";
const STONE = "#bdb39d";
const STONE_LT = "#cdc4af";
const LANTERN = "#6a564a";

const PI = Math.PI;

// A daisy-style flower: stem + ring of petals + center.
function Flower({
  pos,
  petal,
  center = "#f7d06b",
}: {
  pos: [number, number, number];
  petal: string;
  center?: string;
}) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
        {m("#6f9352")}
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.07, 0.26, Math.sin(a) * 0.07]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            {m(petal)}
          </mesh>
        );
      })}
      <mesh position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.045, 8, 6]} />
        {m(center)}
      </mesh>
    </group>
  );
}

// A leafy garden seedling: a tidy rosette of a few upright tapered blades around
// a small heart — the fresh "just-sprouted greens" the reference plants in rows.
function Seedling({
  pos,
  scale = 1,
  leaf = LEAF,
}: {
  pos: [number, number, number];
  scale?: number;
  leaf?: string;
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
            {m(i % 2 ? leaf : LEAF_LT)}
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

// One side of the raised bed: two stacked horizontal boards (darker base + lit
// top course) with a slim cap rail. `axis` is the direction the boards run.
function PlankWall({
  pos,
  axis,
  len,
}: {
  pos: [number, number, number];
  axis: "x" | "z";
  len: number;
}) {
  // one 0.08-thick board running along `axis`
  const board: [number, number, number] = axis === "x" ? [len, 0.2, 0.08] : [0.08, 0.2, len];
  return (
    <group position={pos}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={board} />
        {m(WOOD_DK)}
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={board} />
        {m(WOOD)}
      </mesh>
      {/* slim cap rail, slightly overhanging the boards */}
      <mesh position={[0, 0.475, 0]}>
        <boxGeometry args={axis === "x" ? [len + 0.04, 0.05, 0.14] : [0.14, 0.05, len + 0.04]} />
        {m(WOOD_LT)}
      </mesh>
    </group>
  );
}

// The little Capybanana sign tacked to the camera-facing board.
function BananaSign({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      {/* wooden plaque */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.22, 0.04]} />
        {m(WOOD_LT)}
      </mesh>
      <mesh position={[0, 0.3, 0.021]}>
        <boxGeometry args={[0.25, 0.17, 0.01]} />
        {m("#e8c489")}
      </mesh>
      {/* a cheery banana crescent */}
      <mesh position={[0, 0.3, 0.04]} rotation={[0, 0, 0.7]}>
        <torusGeometry args={[0.07, 0.025, 6, 10, PI * 0.95]} />
        {m(BANANA)}
      </mesh>
      {/* two little tack heads */}
      {[-0.11, 0.11].map((x, i) => (
        <mesh key={i} position={[x, 0.39, 0.025]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          {m(WOOD_DK)}
        </mesh>
      ))}
    </group>
  );
}

// A wooden raised planter bed: 4 corner posts + stacked plank walls wrapping a
// recessed soil bed. The soil top sits BELOW the wall cap, so the leafy rows
// peek over the rim without poking through the timber (no 穿模). Replaces the
// old white picket fence the reference doesn't have.
const HX = 1.25; // half-width (x)
const HZ = 1.0; //  half-depth (z)
const POST = 0.16;
function RaisedBed() {
  // tidy 2×4 grid of greens inside the rim (well clear of the boards)
  const cols = [-0.78, -0.26, 0.26, 0.78];
  const rows = [-0.42, 0.42];
  return (
    <group>
      {/* corner posts (with a little sunlit cap), proud above the boards */}
      {([[HX, HZ], [-HX, HZ], [HX, -HZ], [-HX, -HZ]] as const).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[POST, 0.56, POST]} />
            {m(WOOD_DK)}
          </mesh>
          <mesh position={[0, 0.585, 0]}>
            <boxGeometry args={[0.2, 0.06, 0.2]} />
            {m(WOOD_LT)}
          </mesh>
        </group>
      ))}
      {/* four plank walls, ending flush against the posts */}
      <PlankWall pos={[0, 0, HZ]} axis="x" len={2 * HX - POST} />
      <PlankWall pos={[0, 0, -HZ]} axis="x" len={2 * HX - POST} />
      <PlankWall pos={[HX, 0, 0]} axis="z" len={2 * HZ - POST} />
      <PlankWall pos={[-HX, 0, 0]} axis="z" len={2 * HZ - POST} />

      {/* recessed soil bed (top at y=0.33, below the wall cap) + a sunlit mound.
          Sized a hair inside the inner board faces so the soil never pokes out. */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2 * HX - 0.16, 0.3, 2 * HZ - 0.16]} />
        {m(SOIL)}
      </mesh>
      <mesh position={[0, 0.335, 0]}>
        <boxGeometry args={[2 * HX - 0.32, 0.03, 2 * HZ - 0.32]} />
        {m(SOIL_LT)}
      </mesh>
      {/* furrow shadow lines under each planted row */}
      {rows.map((z, i) => (
        <mesh key={`fr${i}`} position={[0, 0.35, z]}>
          <boxGeometry args={[2 * HX - 0.5, 0.02, 0.12]} />
          {m(SOIL_DK)}
        </mesh>
      ))}

      {/* the planted rows: mostly leafy greens, one round cabbage, one carrot,
          one bright tulip — kept inside |x|≤0.9 / |z|≤0.6 so nothing clips */}
      {cols.map((x, c) =>
        rows.map((z, r) => {
          const key = `${c}-${r}`;
          const pos: [number, number, number] = [x, 0.34, z];
          // a round cabbage at one spot, a carrot at another, greens elsewhere
          if (c === 1 && r === 0) {
            return (
              <group key={key} position={pos}>
                <mesh position={[0, 0.08, 0]}>
                  <icosahedronGeometry args={[0.13, 0]} />
                  {m(LEAF)}
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                  <icosahedronGeometry args={[0.08, 0]} />
                  {m(LEAF_LT)}
                </mesh>
              </group>
            );
          }
          if (c === 3 && r === 1) {
            return (
              <group key={key} position={pos}>
                <mesh position={[0, 0.05, 0]}>
                  <coneGeometry args={[0.07, 0.16, 7]} />
                  {m("#e88a3c")}
                </mesh>
                {[0, 1, 2].map((k) => {
                  const a = (k / 3) * PI * 2;
                  return (
                    <mesh
                      key={k}
                      position={[Math.cos(a) * 0.04, 0.16, Math.sin(a) * 0.04]}
                      rotation={[Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]}
                    >
                      <coneGeometry args={[0.02, 0.16, 4]} />
                      {m(LEAF_LT)}
                    </mesh>
                  );
                })}
              </group>
            );
          }
          return <Seedling key={key} pos={pos} scale={0.92 + ((c + r) % 2) * 0.12} />;
        }),
      )}
      {/* one bright tulip standing among the greens */}
      <group position={[0.0, 0.34, 0.0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.36, 5]} />
          {m("#6f9352")}
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.07, 0.17, 6]} />
          {m("#e8607a")}
        </mesh>
      </group>

      {/* the Capybanana sign on the camera-facing (+z) board */}
      <BananaSign pos={[0.45, 0, HZ + 0.06]} />
    </group>
  );
}

export default function Yard() {
  // a winding path of small FLAT faceted stone slabs (x, z, scale)
  const stones: [number, number, number][] = [
    [0.55, 0.2, 1.0],
    [0.95, 1.0, 0.9],
    [1.2, 1.85, 1.05],
    [1.35, 2.75, 0.92],
    [1.6, 3.6, 1.0],
    [1.95, 4.4, 0.88],
  ];

  return (
    <group>
      {/* stepping-stone path — flat faceted stone slabs */}
      {stones.map(([x, z, s], i) => (
        <group key={i} position={[x, 0.05, z]} rotation={[0, i * 1.1, 0]} scale={[s, 1, s]}>
          <mesh scale={[1, 0.3, 0.84]}>
            <icosahedronGeometry args={[0.3, 0]} />
            {m(STONE)}
          </mesh>
          <mesh position={[0, 0.04, 0]} scale={[0.7, 0.18, 0.6]}>
            <icosahedronGeometry args={[0.3, 0]} />
            {m(STONE_LT)}
          </mesh>
        </group>
      ))}

      {/* ===== MAILBOX — a cute bright-red rounded mailbox beside the postcard
            board (rendered by House at POSTCARD_BOARD ≈ [2.6,0,-0.9]) ===== */}
      <group position={[3.5, 0, -1.1]} rotation={[0, -0.6, 0]}>
        {/* warm wood post */}
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.06, 0.075, 0.68, 8]} />
          {m(WOOD)}
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.08, 10]} />
          {m(WOOD_DK)}
        </mesh>
        {/* rounded red body */}
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[0.36, 0.28, 0.44]} />
          {m(MAIL)}
        </mesh>
        <mesh position={[0, 0.92, 0]} rotation={[PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.44, 16, 1, false, 0, PI]} />
          {m(MAIL)}
        </mesh>
        {/* cream front plate + dark letter slot */}
        <mesh position={[0, 0.82, 0.225]}>
          <boxGeometry args={[0.3, 0.32, 0.03]} />
          {m("#fff3e2")}
        </mesh>
        <mesh position={[0, 0.88, 0.245]}>
          <boxGeometry args={[0.18, 0.035, 0.02]} />
          {m(MAIL_DK)}
        </mesh>
        {/* cheery raised flag */}
        <mesh position={[0.21, 0.88, -0.05]}>
          <boxGeometry args={[0.03, 0.22, 0.03]} />
          {m("#f4d35e")}
        </mesh>
        <mesh position={[0.21, 0.97, 0.02]}>
          <boxGeometry args={[0.02, 0.12, 0.13]} />
          {m("#f9e58a")}
        </mesh>
      </group>

      {/* ===== STONE GARDEN LANTERN (warm glow, beside the path) ===== */}
      <group position={[1.8, 0, 2.6]}>
        {/* stacked stone base + post */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 0.12, 8]} />
          {m(STONE)}
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 1.2, 8]} />
          {m(LANTERN)}
        </mesh>
        {/* lantern head — box housing with a warm glowing light */}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          {m(LANTERN)}
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.16, 0.18, 0.16]} />
          {glow("#ffe7a0", "#ffce63", 1.1)}
        </mesh>
        {/* little pyramid cap */}
        <mesh position={[0, 1.58, 0]}>
          <coneGeometry args={[0.18, 0.16, 4]} />
          {m(LANTERN)}
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          {m(WOOD_DK)}
        </mesh>
      </group>

      {/* ===== WOODEN BENCH (right of the path) ===== */}
      <group position={[4.0, 0, 1.4]} rotation={[0, -PI / 2.2, 0]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.3]} />
          {m(WOOD_LT)}
        </mesh>
        <mesh position={[0, 0.46, -0.12]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.26]} />
          {m(WOOD_LT)}
        </mesh>
        {/* a slim back slat for a touch more detail */}
        <mesh position={[0, 0.6, -0.18]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[1.0, 0.05, 0.04]} />
          {m(WOOD)}
        </mesh>
        {[-0.42, 0.42].map((x, i) => (
          <mesh key={i} position={[x, 0.14, 0]}>
            <boxGeometry args={[0.08, 0.28, 0.28]} />
            {m(WOOD_DK)}
          </mesh>
        ))}
      </group>

      {/* ===== WOODEN RAISED VEG BED (front-left) — timber planter, not a fence */}
      <group position={[-0.6, 0, 2.5]}>
        <RaisedBed />
      </group>

      {/* a few cultivated daisy clumps lining the path + bench (the wild
          meadow flowers are scattered by Island.tsx) */}
      {([
        [2.6, 0, 3.3, "#fff6ee"],
        [3.0, 0, 2.2, "#f4d35e"],
        [3.6, 0, -0.5, "#f0a6bd"],
        [2.3, 0, 1.0, "#e8607a"],
        [0.7, 0, 1.5, "#f4d35e"],
        [2.0, 0, 4.6, "#fff6ee"],
        [1.0, 0, 3.2, "#bfa3df"],
        [2.9, 0, 4.2, "#f0915b"],
      ] as const).map(([x, y, z, c], i) => (
        <Flower key={i} pos={[x, y, z]} petal={c} />
      ))}
    </group>
  );
}
