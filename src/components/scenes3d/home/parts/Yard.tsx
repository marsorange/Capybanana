"use client";

import { toonMaterial } from "../../materials";

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
);
const glow = (c: string, e: string, i = 0.85) => (
  <primitive object={toonMaterial(c, { emissive: e, emissiveIntensity: i })} attach="material" />
);

const WOOD = "#b9844f";
const WOOD_DK = "#8c5f35";
const LEAF = "#7fae5c";
const LEAF_LT = "#93c06c";
const RED = "#d95f59";
const PICKET = "#f7ecd6";
const RAIL = "#ead9ba";
const MAIL = "#e8625a";
const MAIL_DK = "#8f3b35";

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

// A simple white picket fence side (a row of pickets + two rails).
function FenceSide({
  pos,
  rot,
  len,
}: {
  pos: [number, number, number];
  rot: number;
  len: number;
}) {
  const n = Math.max(3, Math.round(len / 0.34));
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {Array.from({ length: n }).map((_, j) => {
        const off = (j - (n - 1) / 2) * (len / n);
        return (
          <group key={j} position={[off, 0, 0]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.1, 0.5, 0.05]} />
              {m(PICKET)}
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.07, 0.1, 4]} />
              {m(PICKET)}
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[len, 0.06, 0.03]} />
        {m(RAIL)}
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[len, 0.06, 0.03]} />
        {m(RAIL)}
      </mesh>
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
      {/* (the stone doorstep slab at the house frame was removed) */}
      {/* stepping-stone path — flat faceted stone slabs */}
      {stones.map(([x, z, s], i) => (
        <group key={i} position={[x, 0.05, z]} rotation={[0, i * 1.1, 0]} scale={[s, 1, s]}>
          <mesh scale={[1, 0.3, 0.84]}>
            <icosahedronGeometry args={[0.3, 0]} />
            {m("#c4baa6")}
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
        <mesh position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.44, 16, 1, false, 0, Math.PI]} />
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

      {/* ===== GARDEN LAMP POST (stone lantern, beside the path) ===== */}
      <group position={[1.8, 0, 2.6]}>
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
      <group position={[4.0, 0, 1.4]} rotation={[0, -Math.PI / 2.2, 0]}>
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

      {/* ===== FENCED VEG GARDEN (front-left, enlarged) ===== */}
      <group position={[-0.6, 0, 2.5]}>
        {/* tilled soil bed */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[2.5, 0.16, 2.1]} />
          {m("#7d553a")}
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[2.3, 0.02, 1.9]} />
          {m("#8a623f")}
        </mesh>
        {/* rows of carrots, cabbages + a tulip */}
        {[-0.8, -0.27, 0.27, 0.8].map((x, col) =>
          [-0.6, 0.0, 0.6].map((z, row) => {
            const carrot = (col + row) % 2 === 0;
            return (
              <group key={`${col}-${row}`} position={[x, 0.22, z]}>
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
        {/* a couple of bright tulips for a pop of color */}
        {([[-0.8, -0.05], [0.55, 0.65]] as const).map(([tx, tz], i) => (
          <group key={i} position={[tx, 0.22, tz]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.32, 5]} />
              {m("#6f9352")}
            </mesh>
            <mesh position={[0, 0.36, 0]}>
              <coneGeometry args={[0.07, 0.16, 6]} />
              {m(i ? "#f4c245" : "#e8607a")}
            </mesh>
          </group>
        ))}
        {/* white picket fence wrapping the bigger bed */}
        <FenceSide pos={[0, 0, 1.05]} rot={0} len={2.55} />
        <FenceSide pos={[0, 0, -1.05]} rot={0} len={2.55} />
        <FenceSide pos={[1.27, 0, 0]} rot={Math.PI / 2} len={2.15} />
        <FenceSide pos={[-1.27, 0, 0]} rot={Math.PI / 2} len={2.15} />
      </group>

      {/* a colorful spread of daisies scattered across the big lawn */}
      {([
        [-2.6, 0, 3.9, "#f4d35e"],
        [3.0, 0, 3.2, "#fff4f0"],
        [3.6, 0, -0.6, "#f1a6bd"],
        [-1.2, 0, 4.0, "#e8607a"],
        [0.2, 0, 4.0, "#f4d35e"],
        [-3.3, 0, -1.3, "#f0915b"],
        [1.8, 0, 3.5, "#fff4f0"],
        [-3.6, 0, 1.1, "#b89cd9"],
        [4.8, 0, 2.2, "#f4d35e"],
        [-4.8, 0, 2.0, "#fff4f0"],
        [1.0, 0, 4.9, "#e8607a"],
        [-2.0, 0, 4.7, "#f0915b"],
        [4.6, 0, -2.0, "#f1a6bd"],
        [-4.4, 0, -1.6, "#f4d35e"],
        [2.4, 0, 4.4, "#b89cd9"],
        [-0.6, 0, 5.0, "#fff4f0"],
      ] as const).map(([x, y, z, c], i) => (
        <Flower key={i} pos={[x, y, z]} petal={c} />
      ))}
    </group>
  );
}
