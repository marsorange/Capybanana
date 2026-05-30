"use client";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} flatShading />
);

const GRASS = "#9ec56f";
const GRASS_LO = "#8bb35d";
const SOIL_1 = "#cba271";
const SOIL_2 = "#b3824f";
const SOIL_3 = "#9a6e41";

const N = 11; // polygon sides — gives the clean faceted low-poly silhouette

// Scattered clover tufts (kept off the house side and walking lanes).
const CLOVERS: [number, number][] = [
  [2.9, -1.4],
  [4.2, 1.1],
  [4.5, 3.0],
  [0.1, 4.7],
  [-1.7, 4.4],
  [3.1, 4.6],
];
const ROCKS: [number, number, number][] = [
  [-1.2, 4.9, 0.34],
  [4.9, -0.2, 0.4],
  [3.0, 5.0, 0.28],
];

// A solid faceted floating island: a flat-shaded n-gon lawn on a chamfered
// soil base. Pure three.js low-poly — the facets are the whole look.
export default function Island() {
  return (
    <group>
      {/* grass top (faceted n-gon disc) */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[5.8, 5.65, 0.36, N]} />
        {m(GRASS)}
      </mesh>
      {/* bright rim lip */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[5.85, 5.85, 0.08, N]} />
        {m(GRASS_LO)}
      </mesh>

      {/* shallow chamfered soil body, tapering to a soft point */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[5.65, 4.4, 1.0, N]} />
        {m(SOIL_1)}
      </mesh>
      <mesh position={[0, -1.55, 0]}>
        <cylinderGeometry args={[4.4, 3.2, 0.6, N]} />
        {m(SOIL_2)}
      </mesh>
      <mesh position={[0, -2.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[3.2, 0.9, N]} />
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
    </group>
  );
}
