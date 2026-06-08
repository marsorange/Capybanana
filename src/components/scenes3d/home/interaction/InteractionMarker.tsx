"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../layout";
import Icon, { type IconName } from "../../../ui/Icon";

const ICON_BY_LABEL: Record<string, IconName> = {
  休息: "sleep",
  打包: "package",
  明信片: "postmail",
};

interface Props {
  pos: Vec3;
  label: string;
  color?: string;
  onClick?: () => void;
  /** lift the label higher (e.g. tall props like the tree) */
  labelY?: number;
  labelX?: number;
}

// A labelled, tappable interaction point: a pulsing ground ring marks the spot
// and a floating text pill names the action. Tapping sends the pet here.
export default function InteractionMarker({
  pos,
  label,
  color = "#e8b85c",
  onClick,
  labelY = 0.95,
  labelX = 0,
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
      <Html position={[labelX, labelY, 0]} center zIndexRange={[25, 0]}>
        <button
          onClick={onClick}
          className="ui-action-pill pointer-events-auto relative h-[40px] whitespace-nowrap rounded-full py-0 pl-[46px] pr-3.5 font-hand text-[16px] font-bold leading-[40px] text-[#6b4f2e] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          <span className="ui-action-badge absolute left-[-5px] top-1/2 grid h-[49px] w-[49px] -translate-y-1/2 place-items-center rounded-full">
            <Icon
              name={ICON_BY_LABEL[label] ?? "home"}
              className="h-[34px] w-[34px] drop-shadow-[0_3px_2px_rgba(126,83,38,0.16)]"
            />
          </span>
          <span>{label}</span>
        </button>
      </Html>
    </group>
  );
}
