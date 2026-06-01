"use client";

import { RoundedBox } from "@react-three/drei";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} flatShading />
);

const GRASS = "#9ec56f";
const GRASS_LO = "#8bb35d";
const SOIL_1 = "#cba271";
const SOIL_2 = "#b3824f";
const SOIL_3 = "#9a6e41";
const SOIL_4 = "#86603a";
const PINE_DK = "#6f9d57";
const PINE_LT = "#7cab60";
const TRUNK = "#8c5f35";

const N = 12; // polygon sides — clean faceted low-poly silhouette, wide & airy

// ---- scattered ground dressing (kept off the house footprint + walking lanes)
// house footprint: x[-4.6, 0.4], z[-4.6, -0.2]. Everything below stays clear of it.
const CLOVERS: [number, number][] = [
  [2.9, -1.4],
  [4.2, 1.1],
  [4.5, 3.0],
  [0.1, 4.7],
  [-1.7, 4.4],
  [3.1, 4.6],
  [-5.2, 3.6],
  [5.7, 1.4],
  [-3.4, 4.9],
  [4.9, -1.2],
  [2.0, -4.6],
  [-5.7, 1.5],
];
const ROCKS: [number, number, number][] = [
  [-1.2, 4.9, 0.34],
  [4.9, -0.2, 0.4],
  [3.0, 5.0, 0.28],
  [-5.0, 2.0, 0.34],
  [5.4, 3.0, 0.3],
  [5.9, -0.8, 0.38],
];
const TUFTS: [number, number][] = [
  [-5.5, 2.4],
  [-4.9, 4.2],
  [-2.4, 5.3],
  [0.4, 5.7],
  [2.6, 5.3],
  [5.8, 2.4],
  [6.1, 0.0],
  [5.5, -2.2],
  [3.8, -4.2],
  [-1.6, -5.2],
  [-5.6, -1.0],
];
const PEBBLES: [number, number][] = [
  [-4.6, 3.2],
  [5.0, 1.8],
  [3.2, -3.2],
];
const FLOWERS: [number, number, string][] = [
  [-5.0, 3.0, "#f1a6bd"],
  [-4.4, 4.6, "#f4d35e"],
  [5.5, -1.1, "#fff4f0"],
  [4.6, -2.9, "#f1a6bd"],
  [6.0, 1.0, "#f4d35e"],
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

// A little huddle of faceted boulders.
function Boulders({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]} scale={[1.35, 0.88, 1]}>
        <icosahedronGeometry args={[0.52, 0]} />
        {m("#c2bbab")}
      </mesh>
      <mesh position={[0.55, 0.2, 0.25]}>
        <icosahedronGeometry args={[0.3, 0]} />
        {m("#b4ad9d")}
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

// A solid floating island: a wide faceted n-gon lawn over a chunky base built
// from stacked, stepped earth blocks — a toy-brick stack rather than a smooth
// bowl. Pure three.js low-poly; the facets and the steps are the whole look.
export default function Island() {
  // stacked earth blocks: chunky square bricks shrinking, twisting AND shifting
  // sideways as they go down, so each one juts out unevenly like a hand-stacked
  // pile of toy blocks (not a smooth centered cone).
  const blocks: {
    x: number;
    z: number;
    size: number;
    h: number;
    y: number;
    rot: number;
    color: string;
  }[] = [
    { x: 0.0, z: 0.0, size: 9.4, h: 0.9, y: -0.82, rot: 0.0, color: SOIL_1 },
    { x: 0.7, z: -0.5, size: 6.7, h: 1.0, y: -1.78, rot: 0.42, color: SOIL_2 },
    { x: -0.6, z: 0.6, size: 4.3, h: 0.98, y: -2.72, rot: -0.32, color: SOIL_3 },
    { x: 0.3, z: 0.1, size: 2.2, h: 0.9, y: -3.5, rot: 0.5, color: SOIL_4 },
  ];

  return (
    <group>
      {/* grass top (wide faceted n-gon disc) */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[7.0, 6.82, 0.42, N]} />
        {m(GRASS)}
      </mesh>
      {/* bright rim lip */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[7.05, 7.05, 0.09, N]} />
        {m(GRASS_LO)}
      </mesh>

      {/* ---- stacked earth blocks (the "lego" base) ---- */}
      {blocks.map((b, i) => (
        <RoundedBox
          key={i}
          args={[b.size, b.h, b.size]}
          radius={0.16}
          smoothness={2}
          position={[b.x, b.y, b.z]}
          rotation={[0, b.rot, 0]}
        >
          {m(b.color)}
        </RoundedBox>
      ))}
      {/* a couple of extra bricks jutting from the stack for that toy-block look */}
      <mesh position={[3.4, -1.7, 1.2]} rotation={[0, 0.5, 0.05]}>
        <boxGeometry args={[1.0, 0.7, 1.0]} />
        {m(SOIL_2)}
      </mesh>
      <mesh position={[-3.0, -2.3, -1.0]} rotation={[0, -0.4, -0.05]}>
        <boxGeometry args={[0.9, 0.62, 0.9]} />
        {m(SOIL_3)}
      </mesh>

      {/* grey rocks dotted on the lawn */}
      {ROCKS.map(([x, z, r], i) => (
        <mesh key={`r${i}`} position={[x, 0.06 + r * 0.4, z]} scale={[1, 0.78, 1]}>
          <icosahedronGeometry args={[r, 0]} />
          {m(i % 2 ? "#bfb8a8" : "#cbc4b4")}
        </mesh>
      ))}

      {/* clover tufts */}
      {CLOVERS.map(([x, z], i) => (
        <group key={`c${i}`} position={[x, 0.08, z]}>
          {[0, 1, 2].map((j) => {
            const a = (j / 3) * Math.PI * 2;
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
      <Pine pos={[-5.3, 0, 1.7]} scale={1.05} />
      <Pine pos={[-4.5, 0, 4.4]} scale={0.78} />
      <Boulders pos={[-5.5, 0, 3.5]} />
      {/* right side */}
      <Pine pos={[5.2, 0, -1.9]} scale={1.0} />
      <Pine pos={[4.3, 0, -3.6]} scale={0.76} />
      <Boulders pos={[5.7, 0, 0.7]} />
      {/* front edge */}
      <Boulders pos={[2.9, 0, 5.4]} />
    </group>
  );
}
