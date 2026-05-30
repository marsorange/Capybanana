"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { getToonGradient, INK } from "./materials";

const OUTLINE = 0.03;

export default function Backpack({
  onClick,
}: {
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const grad = getToonGradient();
  const toon = (c: string) => (
    <meshToonMaterial color={c} gradientMap={grad} />
  );

  return (
    <group
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {/* body */}
      <RoundedBox args={[0.5, 0.56, 0.34]} radius={0.1} smoothness={3} position={[0, 0.3, 0]} castShadow>
        {toon("#d98a4f")}
        <Outlines thickness={OUTLINE} color={INK} />
      </RoundedBox>
      {/* front pocket */}
      <RoundedBox args={[0.34, 0.26, 0.12]} radius={0.06} smoothness={3} position={[0, 0.2, 0.2]}>
        {toon("#e7a766")}
        <Outlines thickness={OUTLINE} color={INK} />
      </RoundedBox>
      {/* flap */}
      <RoundedBox args={[0.52, 0.18, 0.36]} radius={0.07} smoothness={3} position={[0, 0.5, 0.02]}>
        {toon("#c2773f")}
        <Outlines thickness={OUTLINE} color={INK} />
      </RoundedBox>
      {/* top handle */}
      <mesh position={[0, 0.62, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.022, 8, 16, Math.PI]} />
        {toon("#c2773f")}
      </mesh>
    </group>
  );
}
