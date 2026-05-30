"use client";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

// A gently domed (hemispherical) ground on a rounded floating base.
export default function Island() {
  return (
    <group>
      {/* gentle grass dome: a shallow sphere cap (curved ground) */}
      <mesh position={[0, -59.78, 0]} receiveShadow>
        <sphereGeometry args={[60, 64, 8, 0, Math.PI * 2, 0, 0.1]} />
        {m("#9cc07e")}
      </mesh>

      {/* rounded dirt underside */}
      <mesh position={[0, -0.05, 0]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[6.1, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {m("#b88a5d")}
      </mesh>
      <mesh position={[0, -1.7, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[4.6, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {m("#9a7350")}
      </mesh>
      <mesh position={[0, -3.0, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[2.8, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {m("#855f3f")}
      </mesh>
    </group>
  );
}
