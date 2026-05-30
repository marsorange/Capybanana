"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

// A soft puffy cloud built from overlapping rounded blobs.
function Cloud({
  scale = 1,
  tint = "#fffaf2",
}: {
  scale?: number;
  tint?: string;
}) {
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 0.6],
    [0.55, -0.05, 0.05, 0.45],
    [-0.55, -0.04, -0.05, 0.42],
    [0.22, 0.18, 0, 0.4],
    [-0.2, 0.14, 0.04, 0.36],
  ];
  return (
    <group scale={scale}>
      {puffs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          {m(tint)}
        </mesh>
      ))}
    </group>
  );
}

// Slowly drifting clouds + a few twinkly motes that give the diorama depth and
// a dreamy, abeto-style cozy sky. Purely decorative.
export default function Sky() {
  const drift = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (drift.current) {
      drift.current.children.forEach((c, i) => {
        c.position.x += Math.sin(t * 0.05 + i) * 0.0006;
        c.position.y = c.userData.baseY + Math.sin(t * 0.4 + i * 1.7) * 0.12;
      });
    }
  });

  const clouds: {
    pos: [number, number, number];
    scale: number;
    tint: string;
  }[] = [
    { pos: [-7.8, 5.2, -3.5], scale: 1.6, tint: "#fffaf3" },
    { pos: [7.4, 6.3, -4.5], scale: 2.0, tint: "#fdeede" },
    { pos: [7.0, -1.8, 3.2], scale: 1.4, tint: "#fef3ea" },
    { pos: [-7.4, -2.4, 2.4], scale: 1.2, tint: "#f7e6ef" },
    { pos: [0.5, 8.4, -7], scale: 2.3, tint: "#fff7ee" },
    { pos: [-9.0, 2.4, 0.5], scale: 1.0, tint: "#f9ebf0" },
  ];

  return (
    <group>
      <group ref={drift}>
        {clouds.map((c, i) => (
          <group
            key={i}
            position={c.pos}
            userData={{ baseY: c.pos[1] }}
          >
            <Cloud scale={c.scale} tint={c.tint} />
          </group>
        ))}
      </group>
    </group>
  );
}
