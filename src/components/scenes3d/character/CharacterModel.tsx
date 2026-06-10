"use client";

import { RoundedBox, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { CHARACTER_BY_SPECIES, normalizeSpecies } from "@/game/characters";
import type { Accessory, CompanionType } from "@/game/types";
import {
  darkenColor,
  lightenColor,
  toonFromStandard,
  toonMaterial,
} from "../materials";
import {
  COMPANION_DRACO_PATH,
  COMPANION_MODELS,
  COMPANION_TARGET_HEIGHT,
  GLB_PIPELINE_ENABLED,
} from "./companionModels";

type CharacterMotion = "idle" | "walk" | "wave";

// The protagonist's single 3D model. It resolves `type` to one of the six
// roster characters and draws it. Today every species shares this one low-poly
// body (tinted/proportioned per the roster in characters.ts) until each
// character's own generated 3D asset replaces it — when that happens, swap the
// geometry here behind the same props and nothing else in the app changes.
//
// The body is modeled on the Capybanana reference art: a tall egg torso, a big
// blocky brown muzzle with a Y-shaped philtrum, faceted black gem eyes, small
// brown ears, stubby arms with brown paws, and — for the capybara specifically —
// a green acorn beret. Other species reuse the silhouette via color/earScale.
interface CharacterModelProps {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  // Stable seed for the per-pet random markings (pet id, or a draft hash).
  // Same seed → same freckles/cowlick/tail, so a pet always looks like itself.
  seed?: string;
  // Small built-in rig motions. Callers can keep omitting this; future home
  // actions can pass `walk`/`wave` without splitting the model into new files.
  motion?: CharacterMotion;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

const INK = "#3a2e2a";
// Signature avocado green of the beret + neckerchief in the reference art.
const GREEN = "#8fa03c";
const GREEN_DARK = "#6c7d2b";
const GREEN_LIGHT = "#a6b74f";
const GREEN_STEM = "#5f7327";
const BLUSH = "#f0a3ad";
const EYE_SCALE_Y = 1.12;

const m = (c: string) => (
  <primitive object={toonMaterial(c)} attach="material" />
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
    y: 0.78 + rnd() * 0.3,
    z: -0.12 - rnd() * 0.34,
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
    chonk: 0.98 + rnd() * 0.08,
  };
}

// The protagonist entry point. Picks the GLB path for any species that has a
// real asset (see companionModels.ts) and otherwise draws the procedural body.
// Same props either way — callers never learn which path ran, so dropping in a
// new asset is a one-line manifest edit with zero call-site churn.
export default function CharacterModel(props: CharacterModelProps) {
  const species = normalizeSpecies(props.type);
  const url = GLB_PIPELINE_ENABLED ? COMPANION_MODELS[species] : undefined;
  if (url) {
    return (
      <GltfCharacter
        url={url}
        color={props.color}
        accessory={props.accessory}
        seed={props.seed}
        motion={props.motion}
        onPointerDown={props.onPointerDown}
      />
    );
  }
  return <ProceduralCharacter {...props} />;
}

// Preload every listed asset (+ wire the Draco decoder path) so the first mount
// doesn't pop in. Safe to call at module scope — drei dedupes. No-op while the
// pipeline is disabled, so nothing is fetched.
if (GLB_PIPELINE_ENABLED) {
  for (const u of Object.values(COMPANION_MODELS)) {
    if (u) useGLTF.preload(u, COMPANION_DRACO_PATH);
  }
}

// Every pet shares the one authored GLB — these per-pet touches keep each one
// recognizably ITSELF (相似但不同): the fur drifts toward the owner-chosen color,
// the authored neckwear recolors to encode the accessory pick, and the seed sets
// a stable body size + animation pace. Material names follow the asset
// convention (capy_body / capy_brown / capy_green / capy_eye).
const BODY_TINT = 0.55; // 0 = authored fur, 1 = pure pet color
const SCARF_BY_ACCESSORY: Partial<Record<Accessory, string>> = {
  hat: "#5b6b8a",
  glasses: "#3a2e2a",
  flower: "#f1a6ad",
  bell: "#f4d35e",
  // none / scarf keep the authored avocado green
};

// Loads a species GLB and renders it the toon way: each authored material is
// converted to a toon material that KEEPS its own baseColor (so an 11-material
// rigged model stays multi-colored), the skeleton is cloned properly so skinning
// survives, the model's own idle/walk clips play, and the whole thing is
// normalized to a consistent height with feet on the ground. Two compensations
// stay in place for bare static exports (no rig / no authored color): an
// untextured material left at the default white gets tinted with the pet
// color, and a model with no clips gets a procedural idle/walk bob. The
// current rigged capybara needs neither — its clips and colors are authored.
function GltfCharacter({
  url,
  color,
  accessory,
  seed,
  motion = "idle",
  onPointerDown,
}: {
  url: string;
  color: string;
  accessory?: Accessory;
  seed?: string;
  motion?: CharacterMotion;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}) {
  const gltf = useGLTF(url, COMPANION_DRACO_PATH);
  const entrance = useRef<THREE.Group>(null);

  // Stable per-pet physique: a touch of chonk and an own walking/breathing
  // tempo. Same seed → same pet, every device, every visit.
  const look = useMemo(() => {
    const rnd = mulberry32(hashStr(seed ?? url));
    return { chonk: 0.95 + rnd() * 0.1, pace: 0.9 + rnd() * 0.2 };
  }, [seed, url]);

  // SkeletonUtils.clone (not scene.clone) so SkinnedMesh bones rebind to the
  // CLONED skeleton — a plain clone leaves them pointing at the shared original
  // and the animation warps. Convert each material once (cached) to toon.
  const model = useMemo(() => {
    const c = skeletonClone(gltf.scene);
    const toonCache = new Map<THREE.Material, THREE.Material>();
    const convert = (src: THREE.Material) => {
      let toon = toonCache.get(src);
      if (!toon) {
        const std = src as THREE.MeshStandardMaterial;
        toon = toonFromStandard(std);
        const out = toon as THREE.MeshStandardMaterial;
        if (std.name === "capy_body") {
          // the owner's color, blended over the authored fur
          out.color.lerp(new THREE.Color(color), BODY_TINT);
        } else if (std.name === "capy_green") {
          const scarf = SCARF_BY_ACCESSORY[accessory ?? "none"];
          if (scarf) out.color.set(scarf);
        } else if (!std.map && std.color?.getHex() === 0xffffff) {
          // An export with no texture and no authored baseColor (loader default
          // = pure white) carries no look of its own — give it the pet's color.
          out.color.set(color);
        }
        toonCache.set(src, toon);
      }
      return toon;
    };
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // A skinned mesh is culled by its static bind-pose bounds, which the
      // animated pose can leave — disable culling so it never blinks out.
      if ((mesh as unknown as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.frustumCulled = false;
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(convert)
        : convert(mesh.material);
    });
    // Asset convention: exports must face +z (the procedural body's and the
    // walker's forward). The current capybara GLB is authored that way, so no
    // corrective yaw — if a future export faces elsewhere, fix the asset.
    return c;
  }, [gltf.scene, color, accessory]);

  // Normalize scale + seat feet at y=0, centered — works for any unit-ish export.
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = (COMPANION_TARGET_HEIGHT / (size.y || 1)) * look.chonk;
    return {
      scale,
      position: [
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [model, look.chonk]);

  // Play the model's OWN clips (idle by default, walk when asked). The clip
  // animates the body, so we don't add a manual bob on top. Lookup is
  // case-insensitive — exporters disagree on casing ("Walk" vs "walk").
  const hasClips = gltf.animations.length > 0;
  const { actions } = useAnimations(gltf.animations, model);
  useEffect(() => {
    const pick = (...names: string[]) => {
      for (const want of names) {
        const key = Object.keys(actions).find(
          (k) => k.toLowerCase() === want,
        );
        if (key && actions[key]) return actions[key];
      }
      return null;
    };
    const action =
      (motion === "walk" && pick("walk")) ||
      (motion === "wave" && pick("wave", "jump")) ||
      pick("idle") ||
      Object.values(actions)[0];
    // capybara pacing: play the clips lazily — slow breathing at rest, an
    // unhurried amble matched to the walker's low SPEED — scaled by this pet's
    // own tempo so no two pets move in lockstep.
    const pace =
      (motion === "walk" ? 0.75 : motion === "wave" ? 0.9 : 0.65) * look.pace;
    action?.reset().setEffectiveTimeScale(pace).fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.3);
    };
  }, [actions, motion, look.pace]);

  // A static export (no clips) would freeze mid-walk — give it the procedural
  // body's life instead: a breathing bob at rest, a quicker waddle when walking.
  const bob = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (hasClips || !bob.current) return;
    const t = state.clock.elapsedTime;
    if (motion === "walk") {
      bob.current.position.y = Math.abs(Math.sin(t * 7)) * 0.05;
      bob.current.rotation.z = Math.sin(t * 7) * 0.05;
      bob.current.rotation.x = 0.05;
    } else {
      bob.current.position.y = Math.sin(t * 1.6) * 0.025;
      bob.current.rotation.z = Math.sin(t * 0.8) * 0.025;
      bob.current.rotation.x = 0;
    }
  });

  useEffect(() => {
    if (entrance.current) {
      gsap.fromTo(
        entrance.current.scale,
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.7)" },
      );
    }
  }, []);

  return (
    <group ref={entrance}>
      {/* same soft grounding shadow as the procedural body */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshBasicMaterial color="#3a2e2a" transparent opacity={0.16} />
      </mesh>
      <group
        onPointerDown={onPointerDown}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <group ref={bob}>
          <group scale={fit.scale} position={fit.position}>
            <primitive object={model} />
          </group>
        </group>
      </group>
    </group>
  );
}

function ProceduralCharacter({
  type,
  color,
  accessory,
  seed,
  motion = "idle",
  onPointerDown,
}: CharacterModelProps) {
  // Resolve the stored value (incl. legacy types) to a valid roster species.
  const species = normalizeSpecies(type);
  const entrance = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftFoot = useRef<THREE.Group>(null);
  const rightFoot = useRef<THREE.Group>(null);
  const leftEye = useRef<THREE.Mesh>(null);
  const rightEye = useRef<THREE.Mesh>(null);
  const nextBlink = useRef(2.5);
  const blinking = useRef(0);

  const bodyColor = color;
  const feat = useMemo(
    () => rollFeatures(seed, species, color, accessory),
    [seed, species, color, accessory],
  );
  // The reference muzzle / ears / paws are a distinctly *darker* brown than the
  // orange body — derive them by darkening so any species color stays coherent.
  const belly = useMemo(() => lightenColor(color, 0.24), [color]);
  const muzzleColor = useMemo(() => darkenColor(color, 0.25), [color]);
  const earColor = useMemo(() => darkenColor(color, 0.36), [color]);
  const earInner = useMemo(() => darkenColor(color, 0.52), [color]);
  const pawColor = useMemo(() => darkenColor(color, 0.38), [color]);
  const spotColor = useMemo(() => darkenColor(color, 0.22), [color]);

  // Capybara wears its signature acorn beret; it sits where a top hat would, so
  // suppress it (and the cowlick) when an actual hat accessory is requested.
  const showBeret = species === "capybara" && accessory !== "hat";
  const showCowlick = feat.cowlick && accessory !== "hat" && !showBeret;
  const showSpots = species !== "capybara";
  const showTail = feat.tail && species !== "capybara";

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
    if (head.current) {
      head.current.rotation.x = Math.sin(t * 0.85) * 0.025;
      head.current.rotation.z = Math.sin(t * 0.65) * 0.018;
    }
    const limb = Math.sin(t * (motion === "walk" ? 5.8 : 1.7));
    if (leftArm.current) {
      leftArm.current.rotation.z =
        motion === "walk" ? 0.18 + limb * 0.18 : 0.2 + limb * 0.07;
    }
    if (rightArm.current) {
      if (motion === "wave") {
        rightArm.current.rotation.z = -0.82 + Math.sin(t * 5) * 0.16;
      } else {
        rightArm.current.rotation.z =
          motion === "walk" ? -0.18 - limb * 0.18 : -0.2 - limb * 0.07;
      }
    }
    if (leftFoot.current) {
      leftFoot.current.rotation.x = Math.max(0, limb) * (motion === "walk" ? 0.28 : 0.08);
    }
    if (rightFoot.current) {
      rightFoot.current.rotation.x = Math.max(0, -limb) * (motion === "walk" ? 0.28 : 0.08);
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
    if (leftEye.current) leftEye.current.scale.y = EYE_SCALE_Y * ey;
    if (rightEye.current) rightEye.current.scale.y = EYE_SCALE_Y * ey;
  });

  return (
    <group ref={entrance}>
      {/* soft grounding shadow that follows the companion */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 24]} />
        <meshBasicMaterial color="#3a2e2a" transparent opacity={0.16} />
      </mesh>
      <group
        ref={root}
        onPointerDown={onPointerDown}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        {/* ---- feet: separate pivots, ready for simple walk/tap actions ---- */}
        {[-1, 1].map((s) => (
          <group
            key={`f${s}`}
            ref={s < 0 ? leftFoot : rightFoot}
            position={[s * 0.22, 0.08, 0.31]}
          >
            <mesh scale={[1.16, 0.58, 1.08]}>
              <dodecahedronGeometry args={[0.145, 0]} />
              {m(pawColor)}
            </mesh>
            {[-0.045, 0.045].map((x) => (
              <mesh key={x} position={[x, 0.004, 0.095]}>
                <boxGeometry args={[0.014, 0.05, 0.055]} />
                {m(INK)}
              </mesh>
            ))}
          </group>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`h${s}`} position={[s * 0.28, 0.07, -0.2]} scale={[1, 0.62, 0.88]}>
            <dodecahedronGeometry args={[0.095, 0]} />
            {m(pawColor)}
          </mesh>
        ))}

        {/* ---- body: compact low-poly dumpling under the scarf ---- */}
        <mesh position={[0, 0.42, -0.02]} scale={[0.84 * feat.chonk, 0.7, 0.7]}>
          <icosahedronGeometry args={[0.6, 2]} />
          {m(bodyColor)}
        </mesh>

        {/* subtle low-poly belly plane, kept close to body color like the art */}
        <mesh position={[0, 0.34, 0.4]} scale={[0.48, 0.46, 0.13]}>
          <icosahedronGeometry args={[0.42, 2]} />
          {m(belly)}
        </mesh>

        {/* a stubby little tail at the back */}
        {showTail && (
          <mesh position={[0, 0.43, -0.45]}>
            <dodecahedronGeometry args={[0.065, 0]} />
            {m(belly)}
          </mesh>
        )}

        {/* ---- arms: shoulder pivots for future wave/pat actions ---- */}
        {[-1, 1].map((s) => (
          <group
            key={`arm${s}`}
            ref={s < 0 ? leftArm : rightArm}
            position={[s * 0.4, 0.55, 0.02]}
          >
            <mesh
              position={[s * 0.035, -0.16, 0.025]}
              rotation={[0, 0, s * 0.12]}
              scale={[0.58, 0.98, 0.58]}
            >
              <dodecahedronGeometry args={[0.15, 0]} />
              {m(bodyColor)}
            </mesh>
            <mesh position={[s * 0.05, -0.32, 0.13]} scale={[1.05, 0.86, 0.95]}>
              <dodecahedronGeometry args={[0.11, 0]} />
              {m(pawColor)}
            </mesh>
          </group>
        ))}

        {/* ---- head rig: face, ears and headwear share one pivot ---- */}
        <group ref={head} position={[0, 0.62, 0]}>
          <mesh position={[0, 0.28, 0.01]} scale={[0.93 * feat.chonk, 0.8, 0.75]}>
            <icosahedronGeometry args={[0.58, 2]} />
            {m(bodyColor)}
          </mesh>

          {/* fur freckles scattered over the back for non-capybara variants */}
          {showSpots &&
            feat.spots.map((sp, i) => (
              <mesh
                key={i}
                position={[sp.x, sp.y - 0.62, sp.z]}
                scale={[1, 1, 0.4]}
              >
                <dodecahedronGeometry args={[sp.s, 0]} />
                {m(spotColor)}
              </mesh>
            ))}

          {/* soft short muzzle: cute from both front and side angles */}
          <group position={[0, 0.24, 0.39]}>
            <RoundedBox args={[0.42, 0.3, 0.2]} radius={0.11} smoothness={2}>
              {m(muzzleColor)}
            </RoundedBox>
            <mesh position={[0, 0.06, 0.12]} scale={[0.76, 0.38, 0.16]}>
              <icosahedronGeometry args={[0.2, 1]} />
              {m(lightenColor(muzzleColor, 0.14))}
            </mesh>
            {[-1, 1].map((s) => (
              <mesh
                key={s}
                position={[s * 0.067, 0.06, 0.145]}
                rotation={[0, 0, s * 0.55]}
              >
                <boxGeometry args={[0.026, 0.052, 0.022]} />
                {m(INK)}
              </mesh>
            ))}
            <mesh position={[0, -0.05, 0.145]}>
              <boxGeometry args={[0.016, 0.13, 0.02]} />
              {m(INK)}
            </mesh>
            {[-1, 1].map((s) => (
              <mesh
                key={`y${s}`}
                position={[s * 0.036, -0.15, 0.145]}
                rotation={[0, 0, s * 0.6]}
              >
                <boxGeometry args={[0.016, 0.08, 0.02]} />
                {m(INK)}
              </mesh>
            ))}
          </group>

          {/* soft round ears, tucked into the head instead of hard rings */}
          {[-1, 1].map((s) => (
            <group
              key={`ear${s}`}
              position={[s * 0.38, 0.61, 0.01]}
              rotation={[0, s * -0.18, s * 0.35]}
              scale={[feat.earSize, feat.earSize, feat.earSize]}
            >
              <mesh scale={[1, 1.08, 0.55]}>
                <dodecahedronGeometry args={[0.13, 0]} />
                {m(earColor)}
              </mesh>
              <mesh position={[0, -0.004, 0.045]} scale={[0.62, 0.7, 0.28]}>
                <dodecahedronGeometry args={[0.105, 0]} />
                {m(earInner)}
              </mesh>
            </group>
          ))}

          {/* faceted black gem eyes, set at the top corners of the muzzle */}
          <mesh
            ref={leftEye}
            position={[-0.25, 0.4, 0.43]}
            rotation={[0, -0.06, 0.04]}
            scale={[0.78, EYE_SCALE_Y, 0.48]}
          >
            <icosahedronGeometry args={[0.115, 1]} />
            {m(INK)}
            <mesh position={[0.033, 0.045, 0.078]}>
              <sphereGeometry args={[0.024, 8, 8]} />
              <meshBasicMaterial color="#fffdf8" />
            </mesh>
          </mesh>
          <mesh
            ref={rightEye}
            position={[0.25, 0.4, 0.43]}
            rotation={[0, 0.06, -0.04]}
            scale={[0.78, EYE_SCALE_Y, 0.48]}
          >
            <icosahedronGeometry args={[0.115, 1]} />
            {m(INK)}
            <mesh position={[0.033, 0.045, 0.078]}>
              <sphereGeometry args={[0.024, 8, 8]} />
              <meshBasicMaterial color="#fffdf8" />
            </mesh>
          </mesh>

          {feat.brows &&
            [-1, 1].map((s) => (
              <mesh
                key={s}
                position={[s * 0.24, 0.52, 0.39]}
                rotation={[0, 0, s * -0.3]}
              >
                <boxGeometry args={[0.09, 0.018, 0.018]} />
                {m(spotColor)}
              </mesh>
            ))}

          {[-1, 1].map((s) => (
            <mesh
              key={`c${s}`}
              position={[s * 0.32, 0.24, 0.38]}
              scale={[1, 0.78, 0.32]}
            >
              <icosahedronGeometry args={[0.072, 1]} />
              {m(BLUSH)}
            </mesh>
          ))}

          {showCowlick && (
            <mesh position={[0.05, 0.72, 0.02]} rotation={[0.2, 0, 0.35]}>
              <coneGeometry args={[0.06, 0.18, 6]} />
              {m(darkenColor(color, 0.1))}
            </mesh>
          )}

          {showBeret && (
            <group position={[0.03, 0.72, 0.01]} rotation={[0.08, 0.2, -0.12]}>
              <mesh scale={[1.18, 0.32, 1.06]}>
                <icosahedronGeometry args={[0.31, 2]} />
                {m(GREEN)}
              </mesh>
              <mesh position={[0, -0.045, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.34, 0.37, 0.055, 12]} />
                {m(GREEN_DARK)}
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[0, 0.035, 0]}
                  rotation={[0, (i * Math.PI) / 3, 0]}
                >
                  <boxGeometry args={[0.025, 0.014, 0.48]} />
                  {m(GREEN_LIGHT)}
                </mesh>
              ))}
              <mesh position={[0.02, 0.14, 0.01]} rotation={[0.28, 0, -0.18]}>
                <coneGeometry args={[0.038, 0.13, 6]} />
                {m(GREEN_STEM)}
              </mesh>
              <mesh position={[0.04, 0.21, 0.02]}>
                <dodecahedronGeometry args={[0.028, 0]} />
                {m(GREEN_STEM)}
              </mesh>
            </group>
          )}

          {accessory === "hat" && (
            <group position={[0, 0.74, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.38, 0.4, 0.04, 14]} />
                {m("#5b6b8a")}
              </mesh>
              <mesh position={[0, 0.14, 0]}>
                <cylinderGeometry args={[0.24, 0.27, 0.28, 14]} />
                {m("#5b6b8a")}
              </mesh>
            </group>
          )}
          {accessory === "glasses" && (
            <group position={[0, 0.4, 0.46]}>
              {[-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[s * 0.25, 0, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[0.105, 0.018, 8, 14]} />
                  {m(INK)}
                </mesh>
              ))}
              <mesh>
                <boxGeometry args={[0.26, 0.018, 0.018]} />
                {m(INK)}
              </mesh>
            </group>
          )}
          {accessory === "flower" && (
            <group position={[0.28, 0.58, 0.14]}>
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2;
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0]}
                  >
                    <dodecahedronGeometry args={[0.055, 0]} />
                    {m("#f1a6ad")}
                  </mesh>
                );
              })}
              <mesh>
                <dodecahedronGeometry args={[0.055, 0]} />
                {m("#f4d35e")}
              </mesh>
            </group>
          )}
        </group>

        {/* ---- accessories ---- */}
        {accessory === "scarf" && (
          <group>
            {/* neckerchief band hugging the neck */}
            <mesh position={[0, 0.58, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.43, 0.075, 6, 16]} />
              {m(GREEN)}
            </mesh>
            <mesh position={[-0.2, 0.58, 0.34]} rotation={[0.05, 0.15, -0.16]}>
              <boxGeometry args={[0.3, 0.105, 0.1]} />
              {m(GREEN_DARK)}
            </mesh>
            <mesh position={[0.19, 0.58, 0.34]} rotation={[0.05, -0.15, 0.16]}>
              <boxGeometry args={[0.3, 0.105, 0.1]} />
              {m(GREEN)}
            </mesh>
            {/* knot at the front */}
            <mesh position={[0.02, 0.53, 0.42]}>
              <RoundedBox args={[0.145, 0.14, 0.11]} radius={0.045} smoothness={2}>
                {m(GREEN_DARK)}
              </RoundedBox>
            </mesh>
            {/* two pointed tails hanging from the knot */}
            {[-1, 1].map((s) => (
              <mesh
                key={s}
                position={[0.02 + s * 0.065, 0.37, 0.41]}
                rotation={[0.3, 0, s * 0.34]}
                scale={[1, s === 1 ? 1.12 : 0.98, 1]}
              >
                <coneGeometry args={[0.06, 0.22, 4]} />
                {m(s === 1 ? GREEN : GREEN_LIGHT)}
              </mesh>
            ))}
          </group>
        )}
        {accessory === "bell" && (
          <>
            <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.42, 0.04, 8, 16]} />
              {m("#caa25a")}
            </mesh>
            <mesh position={[0, 0.41, 0.4]}>
              <dodecahedronGeometry args={[0.085, 0]} />
              {m("#f4d35e")}
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
