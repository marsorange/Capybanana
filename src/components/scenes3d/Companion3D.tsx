"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { Accessory, CompanionType } from "@/game/types";
import { lightenColor } from "./materials";

interface Companion3DProps {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

const INK = "#3a2e2a";
const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} />
);

export default function Companion3D({
  type,
  color,
  accessory,
  onPointerDown,
}: Companion3DProps) {
  const entrance = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const nextBlink = useRef(2.5);
  const blinking = useRef(0);

  const belly = useMemo(() => lightenColor(color, 0.5), [color]);
  const bodyColor = type === "mushroom" ? "#f6ecdc" : color;

  useEffect(() => {
    nextBlink.current = 2 + Math.random() * 3;
    if (entrance.current) {
      gsap.fromTo(
        entrance.current.scale,
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.7)" },
      );
    }
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

  return (
    <group ref={entrance}>
      {/* soft grounding shadow that follows the companion */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#3a2e2a" transparent opacity={0.16} />
      </mesh>
      <group
        ref={root}
        onPointerDown={onPointerDown}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {/* feet */}
      <mesh position={[-0.22, 0.08, 0.34]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        {m(belly)}
      </mesh>
      <mesh position={[0.22, 0.08, 0.34]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        {m(belly)}
      </mesh>

      {/* body */}
      {type === "robot" ? (
        <RoundedBox args={[0.92, 0.96, 0.82]} radius={0.16} smoothness={2} position={[0, 0.62, 0]}>
          {m(bodyColor)}
        </RoundedBox>
      ) : (
        <mesh position={[0, 0.6, 0]} scale={type === "dumpling" ? [1.05, 0.86, 1.05] : [1, 1, 1]}>
          <sphereGeometry args={[0.58, 16, 12]} />
          {m(bodyColor)}
        </mesh>
      )}

      {/* belly patch */}
      <mesh position={[0, 0.5, 0.46]} scale={[0.8, 0.92, 0.4]}>
        <sphereGeometry args={[0.4, 14, 12]} />
        {m(belly)}
      </mesh>

      {/* eyes */}
      <mesh ref={leftEye} position={[-0.18, 0.74, 0.52]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        {m(INK)}
      </mesh>
      <mesh ref={rightEye} position={[0.18, 0.74, 0.52]}>
        <sphereGeometry args={[0.075, 10, 8]} />
        {m(INK)}
      </mesh>

      {/* cheeks */}
      <mesh position={[-0.3, 0.62, 0.46]} scale={[1, 0.7, 0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        {m("#f1a6ad")}
      </mesh>
      <mesh position={[0.3, 0.62, 0.46]} scale={[1, 0.7, 0.4]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        {m("#f1a6ad")}
      </mesh>

      {type === "animal" && (
        <>
          <mesh position={[-0.3, 1.12, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.18, 0.34, 12]} />
            {m(color)}
          </mesh>
          <mesh position={[0.3, 1.12, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.18, 0.34, 12]} />
            {m(color)}
          </mesh>
        </>
      )}

      {type === "mushroom" && (
        <>
          <mesh position={[0, 1.04, 0]} scale={[1, 0.62, 1]}>
            <sphereGeometry args={[0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m(color)}
          </mesh>
          {[
            [-0.26, 1.06, 0.18],
            [0.22, 1.12, -0.1],
            [0.04, 1.2, 0.3],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              {m("#fcf3e3")}
            </mesh>
          ))}
        </>
      )}

      {type === "sprite" && (
        <>
          <mesh position={[0, 1.32, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            {m("#f4d35e")}
          </mesh>
          <mesh position={[0, 1.14, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            {m(INK)}
          </mesh>
          <mesh position={[-0.6, 0.7, -0.1]} rotation={[0, 0.5, 0.4]}>
            <coneGeometry args={[0.16, 0.5, 4]} />
            {m(lightenColor(color, 0.4))}
          </mesh>
          <mesh position={[0.6, 0.7, -0.1]} rotation={[0, -0.5, -0.4]}>
            <coneGeometry args={[0.16, 0.5, 4]} />
            {m(lightenColor(color, 0.4))}
          </mesh>
        </>
      )}

      {type === "robot" && (
        <>
          <mesh position={[0, 1.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
            {m(INK)}
          </mesh>
          <mesh position={[0, 1.34, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            {m("#f4d35e")}
          </mesh>
        </>
      )}

      {type === "dumpling" && (
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.07, 8, 16]} />
          {m(lightenColor(color, 0.18))}
        </mesh>
      )}

      {accessory === "scarf" && (
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.1, 8, 18]} />
          {m("#d95f59")}
        </mesh>
      )}
      {accessory === "hat" && (
        <group position={[0, 1.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.04, 18]} />
            {m("#5b6b8a")}
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.3, 0.32, 0.34, 16]} />
            {m("#5b6b8a")}
          </mesh>
        </group>
      )}
      {accessory === "glasses" && (
        <group position={[0, 0.74, 0.5]}>
          <mesh position={[-0.18, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.022, 8, 16]} />
            {m(INK)}
          </mesh>
          <mesh position={[0.18, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.022, 8, 16]} />
            {m(INK)}
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 0.02, 0.02]} />
            {m(INK)}
          </mesh>
        </group>
      )}
      {accessory === "flower" && (
        <group position={[0.34, 1.0, 0.16]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                {m("#f1a6ad")}
              </mesh>
            );
          })}
          <mesh>
            <sphereGeometry args={[0.06, 8, 8]} />
            {m("#f4d35e")}
          </mesh>
        </group>
      )}
      {accessory === "bell" && (
        <>
          <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.05, 8, 18]} />
            {m("#caa25a")}
          </mesh>
          <mesh position={[0, 0.28, 0.48]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            {m("#f4d35e")}
          </mesh>
        </>
      )}
      </group>
    </group>
  );
}
