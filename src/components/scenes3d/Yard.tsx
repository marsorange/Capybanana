"use client";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

export default function Yard() {
  const stones: [number, number][] = [
    [0.9, 0.2],
    [1.6, 0.9],
    [2.3, 1.7],
    [2.9, 2.6],
    [1.7, 3.1],
  ];
  const flowers: [number, number, string][] = [
    [2.0, -0.5, "#f4d35e"],
    [3.6, 0.6, "#e98aa8"],
    [4.0, 2.0, "#fff4f0"],
    [1.0, 1.8, "#f4d35e"],
    [3.4, 3.4, "#e98aa8"],
    [0.8, 3.6, "#fff4f0"],
  ];

  return (
    <group>
      {/* door steps */}
      <mesh position={[0.7, 0.16, -0.4]}>
        <boxGeometry args={[0.7, 0.16, 0.5]} />
        {m("#cfc7b6")}
      </mesh>
      <mesh position={[0.95, 0.06, -0.4]}>
        <boxGeometry args={[0.7, 0.16, 0.7]} />
        {m("#bdb4a2")}
      </mesh>

      {/* path */}
      {stones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]} rotation={[-Math.PI / 2, 0, i * 0.6]}>
          <cylinderGeometry args={[0.27, 0.27, 0.06, 8]} />
          {m("#d9cdb6")}
        </mesh>
      ))}

      {/* tree */}
      <group position={[3.7, 0, 2.5]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 1.0, 7]} />
          {m("#a9774b")}
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <icosahedronGeometry args={[0.78, 0]} />
          {m("#7fa75f")}
        </mesh>
        <mesh position={[0.35, 1.75, 0.1]}>
          <icosahedronGeometry args={[0.44, 0]} />
          {m("#8fb86c")}
        </mesh>
      </group>

      {/* farm plot */}
      <group position={[1.6, 0, 3.0]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[1.8, 0.12, 1.8]} />
          {m("#7d553a")}
        </mesh>
        {[
          [0, 0.95, 1.9, 0.16],
          [0, -0.95, 1.9, 0.16],
          [0.95, 0, 0.16, 1.9],
          [-0.95, 0, 0.16, 1.9],
        ].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0.13, z]}>
            <boxGeometry args={[w, 0.16, d]} />
            {m("#b6854f")}
          </mesh>
        ))}
        {[-0.4, 0.2].map((x, i) => (
          <mesh key={`s${i}`} position={[x, 0.24, (i - 0.5) * 0.6]}>
            <coneGeometry args={[0.07, 0.18, 6]} />
            {m("#8fb86c")}
          </mesh>
        ))}
      </group>

      {/* fence */}
      {[
        { x: 4.4, z: 0.9, rot: 0 },
        { x: 3.0, z: 4.4, rot: Math.PI / 2 },
      ].map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[0, f.rot, 0]}>
          {[-0.5, 0.5].map((p, j) => (
            <mesh key={j} position={[p, 0.35, 0]}>
              <boxGeometry args={[0.12, 0.7, 0.12]} />
              {m("#b6854f")}
            </mesh>
          ))}
          <mesh position={[0, 0.46, 0]}>
            <boxGeometry args={[1.1, 0.08, 0.06]} />
            {m("#caa274")}
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <boxGeometry args={[1.1, 0.08, 0.06]} />
            {m("#caa274")}
          </mesh>
        </group>
      ))}

      {/* bushes */}
      {[
        [4.2, 3.6],
        [0.7, 4.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]}>
          <icosahedronGeometry args={[0.36, 0]} />
          {m("#7fa75f")}
        </mesh>
      ))}

      {/* flowers */}
      {flowers.map(([x, z, c], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
            {m("#6f8f52")}
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            {m(c)}
          </mesh>
        </group>
      ))}
    </group>
  );
}
