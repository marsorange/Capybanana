"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { Accessory, CompanionType } from "@/game/types";
import { getToonGradient, INK, lightenColor } from "./materials";

interface Companion3DProps {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

const OUTLINE = 0.035;

export default function Companion3D({
  type,
  color,
  accessory,
  onPointerDown,
}: Companion3DProps) {
  const root = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const nextBlink = useRef(2.5);
  const blinking = useRef(0);

  const grad = getToonGradient();
  const belly = useMemo(() => lightenColor(color, 0.5), [color]);
  const capColor = type === "mushroom" ? color : color;
  const bodyColor = type === "mushroom" ? "#f6ecdc" : color;

  useEffect(() => {
    nextBlink.current = 2 + Math.random() * 3;
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.6) * 0.03;
      root.current.rotation.z = Math.sin(t * 0.8) * 0.03;
      const s = 1 + Math.sin(t * 1.6) * 0.018;
      root.current.scale.set(s, s, s);
    }
    nextBlink.current -= dt;
    if (nextBlink.current <= 0 && blinking.current <= 0) {
      blinking.current = 0.13;
      nextBlink.current = 2.4 + Math.random() * 3.6;
    }
    let ey = 1;
    if (blinking.current > 0) {
      blinking.current -= dt;
      ey = 0.12;
    }
    if (leftEye.current) leftEye.current.scale.y = ey;
    if (rightEye.current) rightEye.current.scale.y = ey;
  });

  const toon = (c: string) => <meshToonMaterial color={c} gradientMap={grad} />;

  return (
    <group
      ref={root}
      onPointerDown={onPointerDown}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      {/* feet */}
      <mesh position={[-0.22, 0.08, 0.34]} castShadow>
        <sphereGeometry args={[0.13, 12, 12]} />
        {toon(belly)}
      </mesh>
      <mesh position={[0.22, 0.08, 0.34]} castShadow>
        <sphereGeometry args={[0.13, 12, 12]} />
        {toon(belly)}
      </mesh>

      {/* body */}
      {type === "robot" ? (
        <RoundedBox args={[0.92, 0.96, 0.82]} radius={0.16} smoothness={3} position={[0, 0.62, 0]} castShadow>
          {toon(bodyColor)}
          <Outlines thickness={OUTLINE} color={INK} />
        </RoundedBox>
      ) : (
        <mesh
          position={[0, 0.6, 0]}
          scale={type === "dumpling" ? [1.05, 0.86, 1.05] : [1, 1, 1]}
          castShadow
        >
          <sphereGeometry args={[0.58, 20, 18]} />
          {toon(bodyColor)}
          <Outlines thickness={OUTLINE} color={INK} />
        </mesh>
      )}

      {/* belly patch */}
      <mesh position={[0, 0.5, 0.46]} scale={[0.8, 0.92, 0.4]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        {toon(belly)}
      </mesh>

      {/* eyes */}
      <mesh ref={leftEye} position={[-0.18, 0.74, 0.52]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        {toon(INK)}
      </mesh>
      <mesh ref={rightEye} position={[0.18, 0.74, 0.52]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        {toon(INK)}
      </mesh>

      {/* cheeks */}
      <mesh position={[-0.3, 0.62, 0.46]} scale={[1, 0.7, 0.4]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        {toon("#f1a6ad")}
      </mesh>
      <mesh position={[0.3, 0.62, 0.46]} scale={[1, 0.7, 0.4]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        {toon("#f1a6ad")}
      </mesh>

      {/* type-specific extras */}
      {type === "animal" && (
        <>
          <mesh position={[-0.3, 1.12, 0]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.18, 0.34, 14]} />
            {toon(color)}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <mesh position={[0.3, 1.12, 0]} rotation={[0, 0, -0.3]} castShadow>
            <coneGeometry args={[0.18, 0.34, 14]} />
            {toon(color)}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
        </>
      )}

      {type === "mushroom" && (
        <>
          <mesh position={[0, 1.04, 0]} scale={[1, 0.62, 1]} castShadow>
            <sphereGeometry args={[0.62, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {toon(capColor)}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          {[
            [-0.26, 1.06, 0.18],
            [0.22, 1.12, -0.1],
            [0.04, 1.2, 0.3],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.07, 10, 10]} />
              {toon("#fcf3e3")}
            </mesh>
          ))}
        </>
      )}

      {type === "sprite" && (
        <>
          <mesh position={[0, 1.32, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            {toon("#f4d35e")}
          </mesh>
          <mesh position={[0, 1.14, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            {toon(INK)}
          </mesh>
          <mesh position={[-0.6, 0.7, -0.1]} rotation={[0, 0.5, 0.4]}>
            <coneGeometry args={[0.16, 0.5, 4]} />
            {toon(lightenColor(color, 0.4))}
          </mesh>
          <mesh position={[0.6, 0.7, -0.1]} rotation={[0, -0.5, -0.4]}>
            <coneGeometry args={[0.16, 0.5, 4]} />
            {toon(lightenColor(color, 0.4))}
          </mesh>
        </>
      )}

      {type === "robot" && (
        <>
          <mesh position={[0, 1.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
            {toon(INK)}
          </mesh>
          <mesh position={[0, 1.34, 0]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            {toon("#f4d35e")}
          </mesh>
        </>
      )}

      {type === "dumpling" && (
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.07, 8, 18]} />
          {toon(lightenColor(color, 0.18))}
          <Outlines thickness={OUTLINE} color={INK} />
        </mesh>
      )}

      {/* accessory */}
      {accessory === "scarf" && (
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.5, 0.1, 10, 22]} />
          {toon("#d95f59")}
          <Outlines thickness={OUTLINE} color={INK} />
        </mesh>
      )}
      {accessory === "hat" && (
        <group position={[0, 1.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.04, 20]} />
            {toon("#5b6b8a")}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.3, 0.32, 0.34, 18]} />
            {toon("#5b6b8a")}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
        </group>
      )}
      {accessory === "glasses" && (
        <group position={[0, 0.74, 0.5]}>
          <mesh position={[-0.18, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.022, 8, 18]} />
            {toon(INK)}
          </mesh>
          <mesh position={[0.18, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.022, 8, 18]} />
            {toon(INK)}
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.02, 0.02]} />
            {toon(INK)}
          </mesh>
        </group>
      )}
      {accessory === "flower" && (
        <group position={[0.34, 1.0, 0.16]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0]}>
                <sphereGeometry args={[0.06, 10, 10]} />
                {toon("#f1a6ad")}
              </mesh>
            );
          })}
          <mesh>
            <sphereGeometry args={[0.06, 10, 10]} />
            {toon("#f4d35e")}
          </mesh>
        </group>
      )}
      {accessory === "bell" && (
        <>
          <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.05, 10, 22]} />
            {toon("#caa25a")}
          </mesh>
          <mesh position={[0, 0.28, 0.48]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            {toon("#f4d35e")}
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
        </>
      )}
    </group>
  );
}
