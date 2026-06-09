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
const SPEED = 1.6;
const ARRIVE = 0.12;
const LOFT_Y = 1.1; // y above which the pet counts as "on the loft"
const NAV_CLAMP_R = 5.0; // floor taps beyond this snap back onto the island grass

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const floorY = (floor: 0 | 1) => (floor === 1 ? FLOOR_H : 0);
const wp = (v: Vec3, y: number) => new THREE.Vector3(v[0], y, v[2]);

// A walk path to (x,z) on `destFloor`, routed up/down the stairs when the pet is
// on a different floor (so it never cuts across the loft void). Each waypoint
// carries the y of its floor; the bottom→step leg spans the stair rise. Used by
// markers + wander, which know their floor up front.
function buildPath(
  x: number,
  z: number,
  destFloor: 0 | 1,
  fromFloor: 0 | 1,
): THREE.Vector3[] {
  const bottom = wp(STAIR_BOTTOM, 0);
  const step = wp(LOFT_STEP, FLOOR_H);
  const pivot = wp(LOFT_PIVOT, FLOOR_H);
  const dest = new THREE.Vector3(x, floorY(destFloor), z);
  if (destFloor === fromFloor) return [dest];
  return destFloor === 1
    ? [bottom, step, pivot, dest] // climb
    : [pivot, step, bottom, dest]; // descend
}

// A walk path to a tapped 3D point (floor taps carry their real height): the
// destination floor / "on the ramp" is read from the point's y, so a tap on the
// loft routes up the stairs and a tap on the staircase stops the pet mid-climb.
const ON_RAMP_LO = 0.25;
const ON_RAMP_HI = FLOOR_H - 0.25;
function buildPathToPoint(dest: THREE.Vector3, fromFloor: 0 | 1): THREE.Vector3[] {
  if (dest.y > ON_RAMP_LO && dest.y < ON_RAMP_HI) {
    // on the staircase: reach it from the end matching the current floor
    return fromFloor === 1 ? [wp(LOFT_STEP, FLOOR_H), dest] : [wp(STAIR_BOTTOM, 0), dest];
  }
  const destFloor: 0 | 1 = dest.y > LOFT_Y ? 1 : 0;
  if (destFloor === fromFloor) return [dest];
  const bottom = wp(STAIR_BOTTOM, 0);
  const step = wp(LOFT_STEP, FLOOR_H);
  const pivot = wp(LOFT_PIVOT, FLOOR_H);
  return destFloor === 1
    ? [bottom, step, pivot, dest]
    : [pivot, step, bottom, dest];
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
    const fromFloor: 0 | 1 = p.y > LOFT_Y ? 1 : 0;

    // an in-scene marker tap (commandBus) takes priority + may carry a callback.
    if (commandBus.pending) {
      const cmd = commandBus.pending;
      commandBus.pending = null;
      const path = buildPath(cmd.target[0], cmd.target[2], cmd.floor, fromFloor);
      target.current.copy(path[0]);
      queue.current = path.slice(1);
      pendingArrive.current = cmd.onArrive ?? null;
      pendingSay.current = cmd.say ?? null;
      dwell.current = randRange(2.5, 4.5);
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
        const path = buildPathToPoint(new THREE.Vector3(tx, ty, tz), fromFloor);
        target.current.copy(path[0]);
        queue.current = path.slice(1);
        pendingArrive.current = null;
        pendingSay.current = null;
        dwell.current = randRange(2.5, 4.5);
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
        dwell.current -= dt;
        if (dwell.current <= 0) {
          const next = pick(SPOTS);
          const path = buildPath(next.pos[0], next.pos[2], next.floor, fromFloor);
          target.current.copy(path[0]);
          queue.current = path.slice(1);
          dwell.current = randRange(2.5, 4.5);
        }
      }
    } else {
      // step toward the waypoint in 3D, so the stair leg climbs as it advances
      const stepLen = Math.min(dist, SPEED * dt);
      p.addScaledVector(toTarget.normalize(), stepLen);
      face.current = Math.atan2(toTarget.x, toTarget.z);
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
    <group ref={root} position={startPos}>
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
