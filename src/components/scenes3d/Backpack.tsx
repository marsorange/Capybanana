"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

export default function Backpack({
  onClick,
}: {
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <RoundedBox args={[0.5, 0.56, 0.34]} radius={0.1} smoothness={2} position={[0, 0.3, 0]}>
        {m("#d98a4f")}
      </RoundedBox>
      <RoundedBox args={[0.34, 0.26, 0.12]} radius={0.06} smoothness={2} position={[0, 0.2, 0.2]}>
        {m("#e7a766")}
      </RoundedBox>
      <RoundedBox args={[0.52, 0.18, 0.36]} radius={0.07} smoothness={2} position={[0, 0.5, 0.02]}>
        {m("#c2773f")}
      </RoundedBox>
    </group>
  );
}
