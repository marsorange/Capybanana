"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

import type { Accessory, CompanionType } from "@/game/types";
import { pick, randRange } from "@/game/util";
import SpeechBubble from "../ui/SpeechBubble";
import CharacterModel from "./character/CharacterModel";
import { commandBus } from "./home/interaction/commandBus";
import { navBus } from "./home/interaction/navBus";
import {
  FLOOR_H,
  LOFT_PIVOT,
  LOFT_STEP,
  SPAWN,
  SPOTS,
  STAIR_BOTTOM,
  resolveObstacles,
  type Vec3,
} from "./home/layout";

// The pet as a lightweight KINEMATIC walker — pure Three.js, no physics engine.
// Each frame it lerps its group toward the current waypoint; the y comes from the
// waypoint's floor, and the bottom→step leg spans the stair rise, so the straight
// lerp between those two reads as walking up the ramp. Collision is just a clamp
// of floor taps back onto the island — there are no rigid bodies or colliders.
//
// No user steering: the goal comes from a floor tap (navBus), an in-scene marker
// (commandBus), or autonomous wander between SPOTS. The `moving` flag drives the
// procedural body's walk/idle via the `motion` prop.
//
// "Collision" is two cheap layers, both in layout.ts terms: floor taps clamp
// back onto the island (NAV_CLAMP_R), and ground-level positions/targets are
// pushed out of the OBSTACLES footprints (walls + yard props + pond) via
// resolveObstacles — per-frame push-out reads as sliding around the prop.
const SPEED = 1.6;
const ARRIVE = 0.12;
const LOFT_Y = 1.1; // y above which the pet counts as "on the loft"
const NAV_CLAMP_R = 5.0; // floor taps beyond this snap back onto the island grass
const GROUND_Y = 0.2; // below this the walker is "on the ground" → obstacles apply
const STUCK_AFTER = 0.5; // seconds of eaten steps before trying a side-step detour
const DETOUR_STEP = 0.9; // how far the side-step detour hops
const MAX_DETOURS = 3; // give up on the target after this many detours

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const floorY = (floor: 0 | 1) => (floor === 1 ? FLOOR_H : 0);
const wp = (v: Vec3, y: number) => new THREE.Vector3(v[0], y, v[2]);

// A walk path to (x,z) on `destFloor`, routed up/down the stairs when the pet
// starts on a different floor — or MID-RAMP (retargeted while climbing): from
// the ramp it first walks to the stair end matching the destination, so it
// never lerps diagonally off the staircase through the air. Each waypoint
// carries the y of its floor; the bottom→step leg spans the stair rise.
const ON_RAMP_LO = 0.25;
const ON_RAMP_HI = FLOOR_H - 0.25;
const onRampY = (y: number) => y > ON_RAMP_LO && y < ON_RAMP_HI;

function buildPath(
  x: number,
  z: number,
  destFloor: 0 | 1,
  fromY: number,
): THREE.Vector3[] {
  const bottom = wp(STAIR_BOTTOM, 0);
  const step = wp(LOFT_STEP, FLOOR_H);
  const pivot = wp(LOFT_PIVOT, FLOOR_H);
  const dest = new THREE.Vector3(x, floorY(destFloor), z);
  if (onRampY(fromY)) {
    // mid-staircase: exit via the end on the destination's side
    return destFloor === 1 ? [step, pivot, dest] : [bottom, dest];
  }
  const fromFloor: 0 | 1 = fromY > LOFT_Y ? 1 : 0;
  if (destFloor === fromFloor) return [dest];
  return destFloor === 1
    ? [bottom, step, pivot, dest] // climb
    : [pivot, step, bottom, dest]; // descend
}

// A walk path to a tapped 3D point (floor taps carry their real height): the
// destination floor / "on the ramp" is read from the point's y, so a tap on the
// loft routes up the stairs and a tap on the staircase stops the pet mid-climb.
function buildPathToPoint(dest: THREE.Vector3, fromY: number): THREE.Vector3[] {
  if (onRampY(dest.y)) {
    if (onRampY(fromY)) return [dest]; // already on the staircase
    // reach the staircase from the end matching the current floor
    return fromY > LOFT_Y ? [wp(LOFT_STEP, FLOOR_H), dest] : [wp(STAIR_BOTTOM, 0), dest];
  }
  return buildPath(dest.x, dest.z, dest.y > LOFT_Y ? 1 : 0, fromY);
}

interface Props {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  seed?: string;
  clickLines: string[];
}

export default function RoamingCompanion({
  type,
  color,
  accessory,
  seed,
  clickLines,
}: Props) {
  const root = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);

  const seenNav = useRef(navBus.version);
  const target = useRef(new THREE.Vector3(SPAWN.pos[0], 0, SPAWN.pos[2]));
  const queue = useRef<THREE.Vector3[]>([]);
  const dwell = useRef(randRange(2, 4));
  const face = useRef(0);
  const pendingArrive = useRef<(() => void) | null>(null);
  const pendingSay = useRef<string | null>(null);
  const wasMoving = useRef(false);
  const stuckFor = useRef(0); // seconds the walker has been jammed on an obstacle
  const detours = useRef(0); // side-step detours taken for the current goal
  const tmp = useRef(new THREE.Vector3()); // scratch, reused each frame

  const [gait, setGait] = useState<"idle" | "walk">("idle");
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);

  const sayText = (text: string) => {
    setSpeech(text);
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), 3500);
  };

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const p = g.position;

    // an in-scene marker tap (commandBus) takes priority + may carry a callback.
    if (commandBus.pending) {
      const cmd = commandBus.pending;
      commandBus.pending = null;
      const path = buildPath(cmd.target[0], cmd.target[2], cmd.floor, p.y);
      target.current.copy(path[0]);
      queue.current = path.slice(1);
      pendingArrive.current = cmd.onArrive ?? null;
      pendingSay.current = cmd.say ?? null;
      dwell.current = randRange(2.5, 4.5);
      detours.current = 0;
    } else if (navBus.version !== seenNav.current) {
      // a floor tap (navBus): the hit point carries its height, so a tap on the
      // ground / loft / staircase routes to the right floor. xz is clamped back
      // onto the island; the tapped height is kept.
      seenNav.current = navBus.version;
      if (navBus.target) {
        let tx = navBus.target[0];
        const ty = navBus.target[1];
        let tz = navBus.target[2];
        const r = Math.hypot(tx, tz);
        if (r > NAV_CLAMP_R) {
          tx = (tx / r) * NAV_CLAMP_R;
          tz = (tz / r) * NAV_CLAMP_R;
        }
        // a tap ON a prop walks the pet to the prop's edge, not into it
        if (ty < GROUND_Y) {
          const [ox, oz] = resolveObstacles(tx, tz);
          tx = ox;
          tz = oz;
        }
        const path = buildPathToPoint(new THREE.Vector3(tx, ty, tz), p.y);
        target.current.copy(path[0]);
        queue.current = path.slice(1);
        pendingArrive.current = null;
        pendingSay.current = null;
        dwell.current = randRange(2.5, 4.5);
        detours.current = 0;
      }
    }

    const toTarget = tmp.current.subVectors(target.current, p);
    const dist = toTarget.length();
    const moving = dist > ARRIVE;

    if (!moving) {
      if (queue.current.length > 0) {
        // advance to the next leg (don't fire callbacks yet)
        target.current.copy(queue.current.shift()!);
      } else {
        // final arrival: fire any pending marker callback once, then idle + wander
        if (pendingSay.current) {
          sayText(pendingSay.current);
          pendingSay.current = null;
        }
        if (pendingArrive.current) {
          const cb = pendingArrive.current;
          pendingArrive.current = null;
          cb();
        }
        detours.current = 0;
        dwell.current -= dt;
        if (dwell.current <= 0) {
          const next = pick(SPOTS);
          const path = buildPath(next.pos[0], next.pos[2], next.floor, p.y);
          target.current.copy(path[0]);
          queue.current = path.slice(1);
          dwell.current = randRange(2.5, 4.5);
        }
      }
    } else {
      // step toward the waypoint in 3D, so the stair leg climbs as it advances
      const stepLen = Math.min(dist, SPEED * dt);
      const bx = p.x;
      const by = p.y;
      const bz = p.z;
      p.addScaledVector(toTarget.normalize(), stepLen);
      // on the ground, push the walker out of the obstacle footprints — the
      // per-frame push-out reads as sliding around furniture, never through it
      if (p.y < GROUND_Y) {
        const [ox, oz] = resolveObstacles(p.x, p.z);
        p.x = ox;
        p.z = oz;
      }
      face.current = Math.atan2(toTarget.x, toTarget.z);
      // anti-jam: a head-on push-out eats the whole step (tangential slide ≈ 0),
      // so after a beat of no progress SIDE-STEP around the obstacle and resume
      // the original waypoint; only give up after a few failed detours (target
      // truly unreachable, e.g. behind a wall).
      const moved = Math.hypot(p.x - bx, p.y - by, p.z - bz);
      if (moved < stepLen * 0.25) {
        stuckFor.current += dt;
        if (stuckFor.current > STUCK_AFTER) {
          stuckFor.current = 0;
          detours.current += 1;
          if (detours.current > MAX_DETOURS) {
            detours.current = 0;
            queue.current = [];
            target.current.copy(p);
          } else {
            // hop perpendicular to the travel direction, toward the freer side
            const px = -toTarget.z; // toTarget is normalized by now
            const pz = toTarget.x;
            const clearance = (cx: number, cz: number) => {
              const [rx, rz] = resolveObstacles(cx, cz);
              return Math.hypot(rx - cx, rz - cz); // 0 = already free
            };
            const side =
              clearance(p.x + px * DETOUR_STEP, p.z + pz * DETOUR_STEP) <=
              clearance(p.x - px * DETOUR_STEP, p.z - pz * DETOUR_STEP)
                ? 1
                : -1;
            const [dx, dz] = resolveObstacles(
              p.x + px * side * DETOUR_STEP,
              p.z + pz * side * DETOUR_STEP,
            );
            queue.current.unshift(target.current.clone());
            target.current.set(dx, p.y, dz);
          }
        }
      } else {
        stuckFor.current = 0;
      }
    }

    // animation state: flip only on idle↔walk transitions (cheap setState)
    if (moving !== wasMoving.current) {
      wasMoving.current = moving;
      setGait(moving ? "walk" : "idle");
    }

    // turn smoothly to face the direction of travel
    if (inner.current) {
      const cur = inner.current.rotation.y;
      inner.current.rotation.y =
        cur + shortestAngle(cur, face.current) * Math.min(1, dt * 8);
    }
  });

  const speak = () => {
    setSpeech(pick(clickLines));
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), 3600);
  };

  const startPos: Vec3 = [SPAWN.pos[0], 0, SPAWN.pos[2]];

  return (
    <group ref={root} name="pet-root" position={startPos}>
      <group ref={inner} scale={1.28}>
        <CharacterModel
          type={type}
          color={color}
          accessory={accessory}
          seed={seed}
          motion={gait}
          onPointerDown={(e) => {
            e.stopPropagation();
            speak();
          }}
        />
      </group>

      {speech && (
        <Html position={[0, 1.9, 0]} center zIndexRange={[30, 0]}>
          <SpeechBubble className="w-max">{speech}</SpeechBubble>
        </Html>
      )}
    </group>
  );
}
