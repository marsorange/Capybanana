"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

const GRASS = "#a8d182";
const GRASS_LO = "#90bd6a";
const SOIL_1 = "#cda06b";
const SOIL_2 = "#b5824f";
const SOIL_3 = "#9a6a40";

// Little clover tufts + pebbles scattered on the lawn (kept off the house side
// and the pet's walking lanes) for a hand-decorated, cozy feel.
const CLOVERS: [number, number][] = [
  [2.9, -1.4],
  [4.1, 1.1],
  [4.4, 3.0],
  [0.2, 4.6],
  [-1.6, 4.5],
  [3.0, 4.5],
];
const PEBBLES: [number, number, string][] = [
  [4.7, -0.4, "#d8cdbb"],
  [-0.4, 5.0, "#cfc4b0"],
  [4.9, 2.0, "#ded3c1"],
];

// A gently domed grass island that floats on a chunky rounded boulder, with a
// couple of tiny rocks drifting underneath for a storybook "sky island" feel.
export default function Island() {
  const floaters = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (floaters.current) {
      floaters.current.children.forEach((c, i) => {
        c.position.y = c.userData.baseY + Math.sin(t * 0.7 + i * 2) * 0.18;
        c.rotation.y = t * 0.15 + i;
      });
    }
  });

  return (
    <group>
      {/* gentle grass dome: a shallow sphere cap (curved ground) */}
      <mesh position={[0, -59.78, 0]}>
        <sphereGeometry args={[60, 64, 8, 0, Math.PI * 2, 0, 0.1]} />
        {m(GRASS)}
      </mesh>

      {/* soft darker grass rim around the edge */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.55, 6.05, 64]} />
        <meshStandardMaterial color={GRASS_LO} roughness={1} metalness={0} />
      </mesh>

      {/* rounded soil underside (chunky floating rock) */}
      <mesh position={[0, -0.05, 0]} scale={[1, 0.66, 1]}>
        <sphereGeometry
          args={[6.05, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        {m(SOIL_1)}
      </mesh>
      <mesh position={[0, -1.65, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry
          args={[4.7, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        {m(SOIL_2)}
      </mesh>
      <mesh position={[0, -3.05, 0]} scale={[1, 0.66, 1]}>
        <sphereGeometry
          args={[2.9, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        {m(SOIL_3)}
      </mesh>
      {/* dangling roots / drip at the very bottom */}
      <mesh position={[0, -4.2, 0]}>
        <coneGeometry args={[0.6, 1.3, 8]} />
        {m(SOIL_3)}
      </mesh>

      {/* tiny rocks drifting beneath the island */}
      <group ref={floaters}>
        {([
          [3.0, -2.6, 1.4, 0.5],
          [-2.8, -3.4, -1.0, 0.36],
          [1.2, -4.0, -2.4, 0.28],
        ] as const).map(([x, y, z, r], i) => (
          <group key={i} position={[x, y, z]} userData={{ baseY: y }}>
            <mesh>
              <icosahedronGeometry args={[r, 0]} />
              {m(SOIL_2)}
            </mesh>
            <mesh position={[0, r * 0.55, 0]} scale={[1, 0.5, 1]}>
              <icosahedronGeometry args={[r * 0.92, 0]} />
              {m(GRASS)}
            </mesh>
          </group>
        ))}
      </group>

      {/* clover tufts on the lawn */}
      {CLOVERS.map(([x, z], i) => (
        <group key={`c${i}`} position={[x, 0.17, z]}>
          {[0, 1, 2].map((j) => {
            const a = (j / 3) * Math.PI * 2;
            return (
              <mesh
                key={j}
                position={[Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07]}
              >
                <sphereGeometry args={[0.06, 8, 6]} />
                {m(j % 2 ? "#9ec872" : "#86b35f")}
              </mesh>
            );
          })}
        </group>
      ))}

      {/* small pebbles */}
      {PEBBLES.map(([x, z, c], i) => (
        <mesh key={`p${i}`} position={[x, 0.12, z]} scale={[1, 0.6, 1]}>
          <icosahedronGeometry args={[0.16, 0]} />
          {m(c)}
        </mesh>
      ))}
    </group>
  );
}
