"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CHARACTER_BY_SPECIES, normalizeSpecies } from "@/game/characters";
import type { Accessory, CompanionType } from "@/game/types";
import { darkenColor, lightenColor } from "../materials";

// The protagonist's single 3D model. It resolves `type` to one of the six
// roster characters and draws it. Today every species shares this one low-poly
// placeholder body (tinted/proportioned per the roster in characters.ts) until
// each character's own generated 3D asset replaces it — when that happens, swap
// the geometry here behind the same props and nothing else in the app changes.
interface CharacterModelProps {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  // Stable seed for the per-pet random markings (pet id, or a draft hash).
  // Same seed → same freckles/cowlick/tail, so a pet always looks like itself.
  seed?: string;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

const INK = "#3a2e2a";
const m = (c: string) => (
  <meshStandardMaterial color={c} roughness={1} metalness={0} flatShading />
);

// Tiny deterministic PRNG so the random features are stable per pet (no flicker
// across re-renders, identical on every device) yet varied between pets.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spot {
  x: number;
  y: number;
  z: number;
  s: number;
}
interface Features {
  spots: Spot[];
  cowlick: boolean;
  tail: boolean;
  brows: boolean;
  earSize: number;
  chonk: number;
  snoutPale: number;
}

function rollFeatures(
  seed: string | undefined,
  type: CompanionType,
  color: string,
  accessory: Accessory,
): Features {
  const rnd = mulberry32(hashStr(seed ?? `${type}|${color}|${accessory}`));
  const spotCount = Math.floor(rnd() * 5); // 0..4 fur freckles
  const spots: Spot[] = Array.from({ length: spotCount }, () => ({
    x: (rnd() - 0.5) * 0.62,
    y: 0.74 + rnd() * 0.3,
    z: -0.12 - rnd() * 0.32,
    s: 0.045 + rnd() * 0.035,
  }));
  // Ear proportion comes from the roster (e.g. the rabbit's tall ears); a small
  // per-pet jitter keeps siblings from looking identical.
  const baseEar = CHARACTER_BY_SPECIES[normalizeSpecies(type)]?.earScale ?? 1;
  const earSize = baseEar * (0.9 + rnd() * 0.3);
  return {
    spots,
    cowlick: rnd() < 0.55,
    tail: rnd() < 0.65,
    brows: rnd() < 0.4,
    earSize,
    chonk: 0.96 + rnd() * 0.16,
    snoutPale: 0.26 + rnd() * 0.16,
  };
}

export default function CharacterModel({
  type,
  color,
  accessory,
  seed,
  onPointerDown,
}: CharacterModelProps) {
  // Resolve the stored value (incl. legacy types) to a valid roster species.
  const species = normalizeSpecies(type);
  const entrance = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const nextBlink = useRef(2.5);
  const blinking = useRef(0);

  const belly = useMemo(() => lightenColor(color, 0.5), [color]);
  const bodyColor = color;
  const feat = useMemo(
    () => rollFeatures(seed, species, color, accessory),
    [seed, species, color, accessory],
  );
  const snoutColor = useMemo(
    () => lightenColor(color, feat.snoutPale),
    [color, feat.snoutPale],
  );
  const earInner = useMemo(() => lightenColor(color, 0.45), [color]);
  const spotColor = useMemo(() => darkenColor(color, 0.22), [color]);
  // A cowlick would poke through a hat, so skip it there.
  const showCowlick = feat.cowlick && accessory !== "hat";

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
        <circleGeometry args={[0.58, 24]} />
        <meshBasicMaterial color="#3a2e2a" transparent opacity={0.16} />
      </mesh>
      <group
        ref={root}
        onPointerDown={onPointerDown}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {/* stubby capybara feet — two front paws + two little hind ones */}
        <mesh position={[-0.24, 0.08, 0.3]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          {m(belly)}
        </mesh>
        <mesh position={[0.24, 0.08, 0.3]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          {m(belly)}
        </mesh>
        <mesh position={[-0.26, 0.07, -0.26]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          {m(belly)}
        </mesh>
        <mesh position={[0.26, 0.07, -0.26]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          {m(belly)}
        </mesh>

        {/* body — a rounded loaf */}
        <mesh position={[0, 0.6, 0]} scale={[1.04 * feat.chonk, 0.92, 1.06]}>
          <sphereGeometry args={[0.58, 14, 10]} />
          {m(bodyColor)}
        </mesh>

        {/* lighter belly patch */}
        <mesh position={[0, 0.5, 0.46]} scale={[0.8, 0.92, 0.4]}>
          <sphereGeometry args={[0.4, 12, 9]} />
          {m(belly)}
        </mesh>

        {/* fur freckles scattered over the back */}
        {feat.spots.map((sp, i) => (
          <mesh key={i} position={[sp.x, sp.y, sp.z]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[sp.s, 6, 5]} />
            {m(spotColor)}
          </mesh>
        ))}

        {/* blunt rectangular muzzle */}
        <group position={[0, 0.6, 0.46]}>
          <RoundedBox args={[0.42, 0.36, 0.32]} radius={0.13} smoothness={2}>
            {m(snoutColor)}
          </RoundedBox>
          {/* nostrils */}
          <mesh position={[-0.09, 0.08, 0.17]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            {m(INK)}
          </mesh>
          <mesh position={[0.09, 0.08, 0.17]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            {m(INK)}
          </mesh>
          {/* soft mouth line + a hint of buck teeth */}
          <mesh position={[0, -0.09, 0.16]}>
            <boxGeometry args={[0.16, 0.022, 0.02]} />
            {m(INK)}
          </mesh>
          <mesh position={[0, -0.13, 0.15]}>
            <boxGeometry args={[0.075, 0.06, 0.03]} />
            {m("#fffdf4")}
          </mesh>
        </group>

        {/* small rounded ears, set high and wide */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.34, 0.96, -0.04]}>
            <mesh scale={[1, 1.15, 0.7]}>
              <sphereGeometry args={[0.12 * feat.earSize, 8, 6]} />
              {m(bodyColor)}
            </mesh>
            <mesh position={[0, -0.01, 0.05]} scale={[1, 1.05, 0.5]}>
              <sphereGeometry args={[0.07 * feat.earSize, 8, 6]} />
              {m(earInner)}
            </mesh>
          </group>
        ))}

        {/* eyes set high on the head, with a glossy alive highlight */}
        <mesh ref={leftEye} position={[-0.2, 0.82, 0.46]}>
          <sphereGeometry args={[0.1, 14, 12]} />
          {m(INK)}
          <mesh position={[0.032, 0.04, 0.058]}>
            <sphereGeometry args={[0.034, 8, 8]} />
            <meshBasicMaterial color="#fffdf8" />
          </mesh>
        </mesh>
        <mesh ref={rightEye} position={[0.2, 0.82, 0.46]}>
          <sphereGeometry args={[0.1, 14, 12]} />
          {m(INK)}
          <mesh position={[0.032, 0.04, 0.058]}>
            <sphereGeometry args={[0.034, 8, 8]} />
            <meshBasicMaterial color="#fffdf8" />
          </mesh>
        </mesh>

        {/* optional little eyebrow tufts */}
        {feat.brows &&
          [-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * 0.2, 0.95, 0.42]}
              rotation={[0, 0, s * -0.3]}
            >
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              {m(spotColor)}
            </mesh>
          ))}

        {/* round rosy blush cheeks */}
        <mesh position={[-0.34, 0.6, 0.37]} scale={[1, 0.82, 0.45]}>
          <sphereGeometry args={[0.088, 10, 8]} />
          {m("#f6a3b0")}
        </mesh>
        <mesh position={[0.34, 0.6, 0.37]} scale={[1, 0.82, 0.45]}>
          <sphereGeometry args={[0.088, 10, 8]} />
          {m("#f6a3b0")}
        </mesh>

        {/* a cowlick tuft of fur on the crown */}
        {showCowlick && (
          <mesh position={[0.05, 1.04, 0]} rotation={[0.2, 0, 0.35]}>
            <coneGeometry args={[0.06, 0.18, 6]} />
            {m(darkenColor(color, 0.1))}
          </mesh>
        )}

        {/* a stubby little tail at the back */}
        {feat.tail && (
          <mesh position={[0, 0.46, -0.56]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            {m(belly)}
          </mesh>
        )}

        {/* ---- accessories ---- */}
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
          <group position={[0, 0.82, 0.46]}>
            <mesh position={[-0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.12, 0.022, 8, 16]} />
              {m(INK)}
            </mesh>
            <mesh position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.12, 0.022, 8, 16]} />
              {m(INK)}
            </mesh>
            <mesh>
              <boxGeometry args={[0.16, 0.02, 0.02]} />
              {m(INK)}
            </mesh>
          </group>
        )}
        {accessory === "flower" && (
          <group position={[0.34, 1.0, 0.16]}>
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0]}
                >
                  <sphereGeometry args={[0.06, 8, 6]} />
                  {m("#f1a6ad")}
                </mesh>
              );
            })}
            <mesh>
              <sphereGeometry args={[0.06, 8, 6]} />
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
              <sphereGeometry args={[0.1, 8, 6]} />
              {m("#f4d35e")}
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
