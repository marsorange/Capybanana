"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "./villaLayout";

interface Props {
  pos: Vec3;
  label: string;
  color?: string;
  onClick?: () => void;
  /** lift the label higher (e.g. tall props like the tree) */
  labelY?: number;
}

// A labelled, tappable interaction point: a pulsing ground ring marks the spot
// and a floating text pill names the action. Tapping sends the pet here.
export default function InteractionMarker({
  pos,
  label,
  color = "#e8b85c",
  onClick,
  labelY = 0.95,
}: Props) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const k = (Math.sin(s.clock.elapsedTime * 2) + 1) / 2;
    if (ring.current) {
      const sc = 0.82 + k * 0.5;
      ring.current.scale.set(sc, sc, sc);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - k * 0.34;
    }
  });
  return (
    <group position={pos}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[0.3, 0.42, 28]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.46}
          depthWrite={false}
        />
      </mesh>
      <Html position={[0, labelY, 0]} center zIndexRange={[25, 0]}>
        <button
          onClick={onClick}
          className="pointer-events-auto flex items-center whitespace-nowrap rounded-full border-2 border-ink bg-paper/95 px-2.5 py-0.5 font-hand text-xs text-ink shadow-[0_2px_0_rgba(58,46,42,0.22)] transition-transform hover:-translate-y-0.5 active:translate-y-px"
        >
          {label}
        </button>
      </Html>
    </group>
  );
}
