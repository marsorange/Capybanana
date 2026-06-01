"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} flatShading />
);
const glow = (c: string, e: string, i = 0.85) => (
  <meshStandardMaterial color={c} emissive={e} emissiveIntensity={i} roughness={1} metalness={0} flatShading />
);

const WOOD = "#b9844f";
const WOOD_DK = "#8c5f35";
const LEAF = "#7fae5c";
const LEAF_LT = "#93c06c";
const RED = "#d95f59";

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
        const a = (i / 5) * Math.PI * 2;
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

// A round leafy bush, optionally dotted with berries.
function Bush({
  pos,
  scale = 1,
}: {
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.24, 0]}>
        <icosahedronGeometry args={[0.34, 0]} />
        {m(LEAF)}
      </mesh>
      <mesh position={[0.18, 0.34, 0.08]}>
        <icosahedronGeometry args={[0.22, 0]} />
        {m(LEAF_LT)}
      </mesh>
      {[
        [0.1, 0.4, 0.2],
        [-0.18, 0.28, 0.1],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          {m(i ? "#f1a6bd" : "#e6b85c")}
        </mesh>
      ))}
    </group>
  );
}

// A toadstool mushroom for storybook charm.
function Mushroom({
  pos,
  scale = 1,
}: {
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.24, 10]} />
        {m("#fbeede")}
      </mesh>
      <mesh position={[0, 0.26, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {m(RED)}
      </mesh>
      {[
        [0.06, 0.3, 0.04],
        [-0.07, 0.29, -0.03],
        [0.02, 0.33, -0.07],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          {m("#fff3df")}
        </mesh>
      ))}
    </group>
  );
}

export default function Yard() {
  const pond = useRef<THREE.Group>(null);
  const flutter = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pond.current) {
      // a leaf-boat bobbing on the pond
      const boat = pond.current.children[pond.current.children.length - 1];
      if (boat) {
        boat.position.y = 0.09 + Math.sin(t * 1.4) * 0.015;
        boat.rotation.y = Math.sin(t * 0.6) * 0.3;
      }
    }
    if (flutter.current) {
      flutter.current.children.forEach((c, i) => {
        c.position.y = c.userData.baseY + Math.sin(t * 2 + i * 2) * 0.18;
        c.position.x = c.userData.baseX + Math.cos(t * 1.3 + i) * 0.22;
        c.rotation.y = t * 1.5 + i;
      });
    }
  });

  const stones: [number, number][] = [
    [1.0, 0.2],
    [1.7, 0.8],
    [2.3, 1.6],
    [2.9, 2.5],
  ];

  return (
    <group>
      {/* door steps */}
      <mesh position={[0.7, 0.16, -0.4]}>
        <boxGeometry args={[0.7, 0.16, 0.6]} />
        {m("#d6cdba")}
      </mesh>
      <mesh position={[0.98, 0.06, -0.4]}>
        <boxGeometry args={[0.7, 0.16, 0.8]} />
        {m("#c4bba8")}
      </mesh>
      {/* welcome mat */}
      <mesh position={[1.0, 0.13, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.34]} />
        {m(RED)}
      </mesh>

      {/* stepping-stone path */}
      {stones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, i * 0.6]}>
          <cylinderGeometry args={[0.28, 0.28, 0.07, 8]} />
          {m("#ddd1ba")}
        </mesh>
      ))}

      {/* ===== MAILBOX (the "letters from afar" motif) ===== */}
      <group position={[1.55, 0, 0.05]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.9, 8]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.96, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.42, 14, 1, false, 0, Math.PI]} />
          {m(RED)}
        </mesh>
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[0.42, 0.2, 0.32]} />
          {m("#c8534d")}
        </mesh>
        <mesh position={[0.22, 0.86, 0]}>
          <boxGeometry args={[0.02, 0.16, 0.28]} />
          {m("#fff3df")}
        </mesh>
        {/* raised flag */}
        <mesh position={[-0.2, 1.04, 0.1]}>
          <boxGeometry args={[0.03, 0.18, 0.02]} />
          {m("#e8b85c")}
        </mesh>
        <mesh position={[-0.2, 1.12, 0.18]}>
          <boxGeometry args={[0.02, 0.1, 0.14]} />
          {m("#f7d06b")}
        </mesh>
      </group>

      {/* wooden welcome sign */}
      <group position={[0.55, 0, 0.55]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.46, 0.22, 0.04]} />
          {m(WOOD)}
        </mesh>
        <mesh position={[0, 0.5, 0.03]}>
          <boxGeometry args={[0.36, 0.04, 0.02]} />
          {m("#7fae5c")}
        </mesh>
      </group>

      {/* ===== GARDEN LAMP POST ===== */}
      <group position={[3.5, 0, -0.4]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.1, 12]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 1.4, 8]} />
          {m("#5d4a40")}
        </mesh>
        <mesh position={[0, 1.46, 0]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          {m("#5d4a40")}
        </mesh>
        <mesh position={[0, 1.46, 0]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          {glow("#ffe9a8", "#ffce63", 1.0)}
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <coneGeometry args={[0.16, 0.16, 4]} />
          {m(WOOD_DK)}
        </mesh>
      </group>

      {/* ===== BENCH ===== */}
      <group position={[4.4, 0, 1.7]} rotation={[0, -Math.PI / 2.2, 0]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.3]} />
          {m(WOOD)}
        </mesh>
        <mesh position={[0, 0.46, -0.12]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.26]} />
          {m(WOOD)}
        </mesh>
        {[-0.42, 0.42].map((x, i) => (
          <mesh key={i} position={[x, 0.14, 0]}>
            <boxGeometry args={[0.08, 0.28, 0.28]} />
            {m(WOOD_DK)}
          </mesh>
        ))}
      </group>

      {/* ===== POND with lily pads + a leaf boat ===== */}
      <group ref={pond} position={[4.0, 0, 3.7]}>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.85, 28]} />
          {m("#7ec7cf")}
        </mesh>
        <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 0.98, 28]} />
          {m("#caa274")}
        </mesh>
        {([
          [0.3, 0.2],
          [-0.35, -0.1],
          [0.1, -0.4],
        ] as const).map(([x, z], i) => (
          <group key={i} position={[x, 0.1, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.17, 12]} />
              {m(LEAF_LT)}
            </mesh>
            {i === 0 && (
              <mesh position={[0, 0.04, 0]}>
                <sphereGeometry args={[0.06, 8, 6]} />
                {m("#f1a6bd")}
              </mesh>
            )}
          </group>
        ))}
        {/* leaf boat (animated bob) */}
        <mesh position={[-0.2, 0.09, 0.3]} rotation={[-Math.PI / 2, 0.2, 0]}>
          <circleGeometry args={[0.14, 3]} />
          {m("#86b35f")}
        </mesh>
      </group>

      {/* ===== big cartoon TREE in the corner (+ hanging birdhouse) ===== */}
      <group position={[4.1, 0, 2.9]}>
        {/* root flare + trunk */}
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.34, 0.42, 0.2, 8]} />
          {m(WOOD_DK)}
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.22, 0.3, 1.5, 8]} />
          {m(WOOD)}
        </mesh>
        {/* fluffy faceted canopy clusters */}
        <mesh position={[0, 2.2, 0]}>
          <icosahedronGeometry args={[1.28, 0]} />
          {m(LEAF)}
        </mesh>
        <mesh position={[0.66, 2.56, 0.22]}>
          <icosahedronGeometry args={[0.8, 0]} />
          {m(LEAF_LT)}
        </mesh>
        <mesh position={[-0.58, 2.46, -0.16]}>
          <icosahedronGeometry args={[0.68, 0]} />
          {m(LEAF)}
        </mesh>
        <mesh position={[0.12, 2.96, -0.1]}>
          <icosahedronGeometry args={[0.56, 0]} />
          {m(LEAF_LT)}
        </mesh>
        {/* a few fruit tucked in the leaves */}
        {([
          [0.74, 1.98, 0.52],
          [-0.5, 1.86, 0.42],
          [0.2, 1.78, 0.66],
        ] as const).map((p, i) => (
          <mesh key={i} position={p}>
            <icosahedronGeometry args={[0.12, 0]} />
            {m("#e88a3c")}
          </mesh>
        ))}
        {/* hanging birdhouse */}
        <group position={[0.7, 1.28, 0.55]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.4, 6]} />
            {m(WOOD_DK)}
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.18, 0.2, 0.18]} />
            {m("#e8b85c")}
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.16, 0.12, 4]} />
            {m(RED)}
          </mesh>
          <mesh position={[0, -0.02, 0.1]}>
            <cylinderGeometry args={[0.035, 0.035, 0.04, 10]} />
            {m(WOOD_DK)}
          </mesh>
        </group>
      </group>

      {/* ===== FARM plot with a watering can ===== */}
      <group position={[1.6, 0, 3.0]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[1.8, 0.14, 1.8]} />
          {m("#7d553a")}
        </mesh>
        {[
          [0, 0.95, 1.9, 0.16],
          [0, -0.95, 1.9, 0.16],
          [0.95, 0, 0.16, 1.9],
          [-0.95, 0, 0.16, 1.9],
        ].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0.15, z]}>
            <boxGeometry args={[w, 0.18, d]} />
            {m("#b6854f")}
          </mesh>
        ))}
        {/* rows of carrots + cabbages */}
        {[-0.55, 0.0, 0.55].map((x, col) =>
          [-0.45, 0.25].map((z, row) => {
            const carrot = (col + row) % 2 === 0;
            return (
              <group key={`${col}-${row}`} position={[x, 0.24, z]}>
                {carrot ? (
                  <>
                    <mesh position={[0, 0.04, 0]}>
                      <coneGeometry args={[0.08, 0.18, 7]} />
                      {m("#e88a3c")}
                    </mesh>
                    {[0, 1, 2].map((k) => {
                      const a = (k / 3) * Math.PI * 2;
                      return (
                        <mesh
                          key={k}
                          position={[Math.cos(a) * 0.05, 0.18, Math.sin(a) * 0.05]}
                          rotation={[Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]}
                        >
                          <coneGeometry args={[0.025, 0.18, 4]} />
                          {m(LEAF_LT)}
                        </mesh>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <mesh position={[0, 0.06, 0]}>
                      <icosahedronGeometry args={[0.14, 0]} />
                      {m(LEAF)}
                    </mesh>
                    <mesh position={[0, 0.11, 0]}>
                      <icosahedronGeometry args={[0.09, 0]} />
                      {m(LEAF_LT)}
                    </mesh>
                  </>
                )}
              </group>
            );
          }),
        )}
        {/* watering can */}
        <group position={[0.55, 0, -0.55]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.26, 14]} />
            {m("#7fae9b")}
          </mesh>
          <mesh position={[0.18, 0.22, 0]} rotation={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.025, 0.04, 0.32, 8]} />
            {m("#6f9d8a")}
          </mesh>
          <mesh position={[-0.02, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.08, 0.018, 6, 12]} />
            {m("#6f9d8a")}
          </mesh>
        </group>
      </group>

      {/* ===== PICKET FENCE + GATE along the island edge ===== */}
      {([
        { x: 4.9, z: 0.4, rot: 0, n: 3 },
        { x: 2.8, z: 4.7, rot: Math.PI / 2, n: 3 },
      ] as const).map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[0, f.rot, 0]}>
          {Array.from({ length: f.n }).map((_, j) => {
            const off = (j - (f.n - 1) / 2) * 0.4;
            return (
              <group key={j} position={[off, 0, 0]}>
                <mesh position={[0, 0.34, 0]}>
                  <boxGeometry args={[0.12, 0.68, 0.06]} />
                  {m("#f3e6cb")}
                </mesh>
                <mesh position={[0, 0.56, 0]}>
                  <coneGeometry args={[0.085, 0.12, 4]} />
                  {m("#f3e6cb")}
                </mesh>
              </group>
            );
          })}
          <mesh position={[0, 0.44, 0]}>
            <boxGeometry args={[f.n * 0.4, 0.07, 0.04]} />
            {m("#e6d6b6")}
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[f.n * 0.4, 0.07, 0.04]} />
            {m("#e6d6b6")}
          </mesh>
        </group>
      ))}

      {/* crate of oranges by the garden */}
      <group position={[2.6, 0, 3.7]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.42, 0.3, 0.42]} />
          {m("#bd8a52")}
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.45, 0.06, 0.45]} />
          {m("#a9774b")}
        </mesh>
        {([
          [-0.1, -0.08],
          [0.1, 0.0],
          [-0.02, 0.12],
          [0.12, -0.12],
        ] as const).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.38, z]}>
            <icosahedronGeometry args={[0.09, 0]} />
            {m("#e88a3c")}
          </mesh>
        ))}
      </group>

      {/* covered porch awning over the entrance + lantern */}
      <group position={[1.05, 0, -0.4]}>
        {[-0.5, 0.5].map((z, i) => (
          <mesh key={i} position={[0.0, 0.6, z]}>
            <cylinderGeometry args={[0.05, 0.06, 1.2, 7]} />
            {m(WOOD_DK)}
          </mesh>
        ))}
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * 0.2, 1.4, 0]} rotation={[0, 0, side * -0.62]}>
            <boxGeometry args={[0.46, 0.1, 1.3]} />
            {m("#eeba4e")}
          </mesh>
        ))}
        <mesh position={[0, 1.58, 0]}>
          <boxGeometry args={[0.12, 0.1, 1.32]} />
          {m("#9a6a32")}
        </mesh>
        <mesh position={[0, 1.02, 0.52]}>
          <boxGeometry args={[0.12, 0.18, 0.12]} />
          {glow("#ffe9a8", "#ffce63", 0.95)}
        </mesh>
      </group>

      {/* arched garden gate at the island edge */}
      <group position={[1.3, 0, 4.9]}>
        {[-0.5, 0.5].map((x, i) => (
          <mesh key={i} position={[x, 0.45, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.9, 7]} />
            {m(WOOD)}
          </mesh>
        ))}
        <mesh position={[0, 0.9, 0]}>
          <torusGeometry args={[0.5, 0.06, 6, 14, Math.PI]} />
          {m(WOOD)}
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[0.84, 0.06, 0.04]} />
          {m("#e6d6b6")}
        </mesh>
      </group>

      {/* bushes */}
      <Bush pos={[4.6, 0, 3.0]} scale={1.1} />
      <Bush pos={[0.6, 0, 4.4]} scale={0.95} />
      <Bush pos={[5.0, 0, 1.8]} scale={0.8} />
      <Bush pos={[2.0, 0, -0.6]} scale={0.7} />

      {/* chunky toadstools */}
      <Mushroom pos={[3.0, 0, 3.4]} scale={1.5} />
      <Mushroom pos={[2.5, 0, 3.7]} scale={1.0} />
      <Mushroom pos={[5.0, 0, 1.4]} scale={1.2} />

      {/* flower beds */}
      {([
        [2.1, -0.5, "#f4d35e"],
        [3.0, 0.7, "#f1a6bd"],
        [3.9, 1.0, "#fff4f0"],
        [1.2, 1.7, "#f4d35e"],
        [2.5, 1.9, "#f1a6bd"],
        [0.8, 3.7, "#fff4f0"],
        [4.5, 0.6, "#f1a6bd"],
        [1.0, 2.4, "#f4d35e"],
        [3.4, 4.2, "#fff4f0"],
        [4.7, 4.1, "#f1a6bd"],
      ] as const).map(([x, z, c], i) => (
        <Flower key={i} pos={[x, 0, z]} petal={c} />
      ))}

      {/* butterflies fluttering over the garden */}
      <group ref={flutter}>
        {([
          [2.6, 0.9, 0.8, "#f1a6bd"],
          [3.4, 1.4, 1.9, "#f7d06b"],
        ] as const).map(([x, z, y, c], i) => (
          <group key={i} position={[x, y, z]} userData={{ baseX: x, baseY: y }}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.06, 0, 0]} rotation={[0, 0, s * 0.5]}>
                <circleGeometry args={[0.06, 8]} />
                <meshStandardMaterial color={c} roughness={1} side={2} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
