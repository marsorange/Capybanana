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
  type Activity,
  FLOOR_H,
  LOFT_OBSTACLES,
  LOFT_PIVOT,
  LOFT_STEP,
  type Perch,
  SPAWN,
  SPOTS,
  STAIR_BOTTOM,
  STAIR_TOP,
  resolveObstacles,
  type Vec3,
} from "./home/layout";

// The pet as a lightweight KINEMATIC walker — pure Three.js, no physics engine.
// Each frame it lerps its group toward the current waypoint; the y comes from the
// waypoint's floor, and the bottom→top stair leg follows the exact ramp line, so
// the straight lerp reads as climbing flush with the steps. Collision is just a
// clamp of floor taps back onto the island — no rigid bodies or colliders.
//
// No user steering: the goal comes from a floor tap (navBus), an in-scene marker
// (commandBus), or autonomous wander between SPOTS. The `moving` flag drives the
// procedural body's walk/idle via the `motion` prop.
//
// "Collision" is two cheap 2D layers, both in layout.ts terms and picked by the
// walker's height: on the ground (y<GROUND_Y) positions/targets are pushed out
// of OBSTACLES (walls + furniture + yard props + pond); at loft height
// (y≈FLOOR_H) the same push-out runs against LOFT_OBSTACLES (walls + railings +
// bed + nightstand). The stairs route between the layers and check neither.
//
// ACTIVITIES: a walk command or wander SPOT may carry an activity payload —
// on final arrival the walker enters a small mount→hold→dismount machine: it
// optionally hops onto a furniture Perch (bed / garden bench / stool), holds a
// pose (sit/sleep via CharacterModel's motion) with a floating emote for the
// dwell, then hops back down and resumes roaming. Collision is skipped while
// perched (the perch IS inside the furniture footprint, by design).
//
// Capybara pacing: a slow amble, long unhurried pauses, gentle turns — the
// pet should read as 沉稳憨懒, mostly standing around, occasionally mooching
// to the next spot. SPEED + the dwell ranges below set that temperament.
const SPEED = 0.85;
const ARRIVE = 0.12;
const LOFT_Y = 1.1; // y above which the pet counts as "on the loft"
const LOFT_LEVEL = FLOOR_H - 0.05; // y above which the loft obstacle layer applies
const NAV_CLAMP_R = 5.0; // floor taps beyond this snap back onto the island grass
const GROUND_Y = 0.2; // below this the walker is "on the ground" → obstacles apply
const STUCK_AFTER = 0.5; // seconds of eaten steps before trying a side-step detour
const DETOUR_STEP = 0.9; // how far the side-step detour hops
const MAX_DETOURS = 3; // give up on the target after this many detours
const HOP_SPEED = 1.5; // m/s of the on/off-furniture hop
const HOP_ARC = 0.22; // height of the hop's little parabola

type Pose = "sit" | "sleep";

// How each activity is performed once arrived: sleep curls up, the quiet ones
// sit; clean/idle stay standing (the emote alone carries them).
const POSE_BY_ACTIVITY: Record<Activity, Pose | null> = {
  sleep: "sleep",
  read: "sit",
  look: "sit",
  idle: null,
  clean: null,
};

interface ActPayload {
  activity: Activity;
  emote?: string;
  hold: number; // seconds to stay in the pose
  perch?: Perch;
  face?: number; // facing to hold when there is no perch
}

interface ActState extends ActPayload {
  stage: "mount" | "hold" | "dismount";
  back: THREE.Vector3; // approach point to hop back down to
  from: THREE.Vector3; // hop start (mount/dismount lerp origin)
  t: number; // hop progress 0..1
}

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const floorY = (floor: 0 | 1) => (floor === 1 ? FLOOR_H : 0);
const wp = (v: Vec3, y: number) => new THREE.Vector3(v[0], y, v[2]);

// Pick the obstacle layer for a given height: ground list near y=0, loft list at
// loft height, nothing while climbing between them.
function resolveAt(x: number, z: number, y: number): [number, number] {
  if (y < GROUND_Y) return resolveObstacles(x, z);
  if (y > LOFT_LEVEL) return resolveObstacles(x, z, undefined, LOFT_OBSTACLES);
  return [x, z];
}

// A walk path to (x,z) on `destFloor`, routed up/down the stairs when the pet
// starts on a different floor — or MID-RAMP (retargeted while climbing): from
// the ramp it first walks to the stair end matching the destination, so it
// never lerps diagonally off the staircase through the air. Each waypoint
// carries the y of its floor; the bottom→top leg follows the exact stair line
// (lerping straight to the deeper LOFT_STEP used to undershoot the ramp and
// sink the pet into the treads near the top), then a flat leg onto the landing.
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
  const top = wp(STAIR_TOP, FLOOR_H);
  const step = wp(LOFT_STEP, FLOOR_H);
  const pivot = wp(LOFT_PIVOT, FLOOR_H);
  const dest = new THREE.Vector3(x, floorY(destFloor), z);
  if (onRampY(fromY)) {
    // mid-staircase: exit via the end on the destination's side
    return destFloor === 1 ? [top, step, pivot, dest] : [bottom, dest];
  }
  const fromFloor: 0 | 1 = fromY > LOFT_Y ? 1 : 0;
  if (destFloor === fromFloor) return [dest];
  return destFloor === 1
    ? [bottom, top, step, pivot, dest] // climb
    : [pivot, step, top, bottom, dest]; // descend
}

// A walk path to a tapped 3D point (floor taps carry their real height): the
// destination floor / "on the ramp" is read from the point's y, so a tap on the
// loft routes up the stairs and a tap on the staircase stops the pet mid-climb.
function buildPathToPoint(dest: THREE.Vector3, fromY: number): THREE.Vector3[] {
  if (onRampY(dest.y)) {
    if (onRampY(fromY)) return [dest]; // already on the staircase
    // reach the staircase from the end matching the current floor (a point ON
    // the ramp lies on the bottom→top line, so that leg hugs the surface)
    return fromY > LOFT_Y
      ? [wp(LOFT_STEP, FLOOR_H), wp(STAIR_TOP, FLOOR_H), dest]
      : [wp(STAIR_BOTTOM, 0), dest];
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
  const pendingAct = useRef<ActPayload | null>(null); // started on final arrival
  const act = useRef<ActState | null>(null); // the running activity
  const wasMoving = useRef(false);
  const stuckFor = useRef(0); // seconds the walker has been jammed on an obstacle
  const detours = useRef(0); // side-step detours taken for the current goal
  const tmp = useRef(new THREE.Vector3()); // scratch, reused each frame

  const [gait, setGait] = useState<"idle" | "walk">("idle");
  const [pose, setPose] = useState<Pose | null>(null);
  const [emote, setEmote] = useState<string | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);

  const sayText = (text: string) => {
    setSpeech(text);
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), 3500);
  };

  // A new goal preempts a running activity: hop straight back to the approach
  // point (perched heights would confuse the path builder) and stand up.
  const cancelAct = (p: THREE.Vector3) => {
    const a = act.current;
    if (!a) return;
    if (a.stage !== "dismount") p.copy(a.back);
    act.current = null;
    setPose(null);
    setEmote(null);
  };

  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const p = g.position;
    let moving = false;

    // an in-scene marker tap (commandBus) takes priority + may carry a callback.
    if (commandBus.pending) {
      const cmd = commandBus.pending;
      commandBus.pending = null;
      cancelAct(p);
      const path = buildPath(cmd.target[0], cmd.target[2], cmd.floor, p.y);
      target.current.copy(path[0]);
      queue.current = path.slice(1);
      pendingArrive.current = cmd.onArrive ?? null;
      pendingSay.current = cmd.say ?? null;
      pendingAct.current = cmd.activity
        ? {
            activity: cmd.activity,
            emote: cmd.emote,
            hold: cmd.dwell ?? randRange(5, 9),
            perch: cmd.perch,
          }
        : null;
      dwell.current = randRange(5, 9);
      detours.current = 0;
    } else if (navBus.version !== seenNav.current) {
      // a floor tap (navBus): the hit point carries its height, so a tap on the
      // ground / loft / staircase routes to the right floor. xz is clamped back
      // onto the island; the tapped height is kept.
      seenNav.current = navBus.version;
      if (navBus.target) {
        cancelAct(p);
        let tx = navBus.target[0];
        const ty = navBus.target[1];
        let tz = navBus.target[2];
        const r = Math.hypot(tx, tz);
        if (r > NAV_CLAMP_R) {
          tx = (tx / r) * NAV_CLAMP_R;
          tz = (tz / r) * NAV_CLAMP_R;
        }
        // a tap ON a prop walks the pet to the prop's edge, not into it —
        // resolved against the obstacle layer of the tapped height
        [tx, tz] = resolveAt(tx, tz, ty);
        const path = buildPathToPoint(new THREE.Vector3(tx, ty, tz), p.y);
        target.current.copy(path[0]);
        queue.current = path.slice(1);
        pendingArrive.current = null;
        pendingSay.current = null;
        pendingAct.current = null;
        dwell.current = randRange(5, 9);
        detours.current = 0;
      }
    }

    if (act.current) {
      // ---- activity machine: hop up, hold the pose, hop back down ----
      const a = act.current;
      if (a.stage === "hold") {
        if (a.perch) face.current = a.perch.face;
        else if (a.face !== undefined) face.current = a.face;
        a.hold -= dt;
        if (a.hold <= 0) {
          setPose(null);
          setEmote(null);
          if (a.perch) {
            a.stage = "dismount";
            a.from.copy(p);
            a.t = 0;
          } else {
            act.current = null;
            dwell.current = randRange(2, 5);
          }
        }
      } else {
        // mount / dismount: a little arced hop between approach and perch
        const to =
          a.stage === "mount" ? wp(a.perch!.pos, a.perch!.pos[1]) : a.back;
        const total = Math.max(a.from.distanceTo(to), 1e-4);
        a.t = Math.min(1, a.t + (dt * HOP_SPEED) / total);
        p.lerpVectors(a.from, to, a.t);
        p.y += Math.sin(a.t * Math.PI) * HOP_ARC;
        face.current = a.perch!.face;
        moving = true;
        if (a.t >= 1) {
          if (a.stage === "mount") {
            a.stage = "hold";
            setPose(POSE_BY_ACTIVITY[a.activity]);
            if (a.emote) setEmote(a.emote);
          } else {
            act.current = null;
            setPose(null);
            dwell.current = randRange(2, 5);
          }
        }
      }
    } else {
      const toTarget = tmp.current.subVectors(target.current, p);
      const dist = toTarget.length();
      moving = dist > ARRIVE;

      if (!moving) {
        if (queue.current.length > 0) {
          // advance to the next leg (don't fire callbacks yet)
          target.current.copy(queue.current.shift()!);
        } else {
          // final arrival: fire any pending marker callback once, start any
          // pending activity, then idle + wander
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
          if (pendingAct.current) {
            const pa = pendingAct.current;
            pendingAct.current = null;
            act.current = {
              ...pa,
              stage: pa.perch ? "mount" : "hold",
              back: p.clone(),
              from: p.clone(),
              t: 0,
            };
            if (!pa.perch) {
              // already standing at the spot: pose + emote right away
              setPose(POSE_BY_ACTIVITY[pa.activity]);
              if (pa.emote) setEmote(pa.emote);
            }
          } else {
            dwell.current -= dt;
            if (dwell.current <= 0) {
              // capybara energy: often can't be bothered — just linger a while
              // longer instead of mooching off to a new spot
              if (Math.random() < 0.4) {
                dwell.current = randRange(5, 10);
              } else {
                const next = pick(SPOTS);
                const path = buildPath(next.pos[0], next.pos[2], next.floor, p.y);
                target.current.copy(path[0]);
                queue.current = path.slice(1);
                // perform the spot's activity on arrival (the lazy spots —
                // bed, bench — hold the pose noticeably longer)
                pendingAct.current = {
                  activity: next.activity,
                  emote: next.emote,
                  hold: randRange(next.dwell[0], next.dwell[1]),
                  perch: next.perch,
                  face: next.face,
                };
              }
            }
          }
        }
      } else {
        // step toward the waypoint in 3D, so the stair leg climbs as it advances
        const stepLen = Math.min(dist, SPEED * dt);
        const bx = p.x;
        const by = p.y;
        const bz = p.z;
        p.addScaledVector(toTarget.normalize(), stepLen);
        // push the walker out of its layer's obstacle footprints — the
        // per-frame push-out reads as sliding around furniture, never through it
        const [ox, oz] = resolveAt(p.x, p.z, p.y);
        p.x = ox;
        p.z = oz;
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
                const [rx, rz] = resolveAt(cx, cz, p.y);
                return Math.hypot(rx - cx, rz - cz); // 0 = already free
              };
              const side =
                clearance(p.x + px * DETOUR_STEP, p.z + pz * DETOUR_STEP) <=
                clearance(p.x - px * DETOUR_STEP, p.z - pz * DETOUR_STEP)
                  ? 1
                  : -1;
              const [dx, dz] = resolveAt(
                p.x + px * side * DETOUR_STEP,
                p.z + pz * side * DETOUR_STEP,
                p.y,
              );
              queue.current.unshift(target.current.clone());
              target.current.set(dx, p.y, dz);
            }
          }
        } else {
          stuckFor.current = 0;
        }
      }
    }

    // animation state: flip only on idle↔walk transitions (cheap setState)
    if (moving !== wasMoving.current) {
      wasMoving.current = moving;
      setGait(moving ? "walk" : "idle");
    }

    // turn smoothly (and unhurriedly) to face the direction of travel
    if (inner.current) {
      const cur = inner.current.rotation.y;
      inner.current.rotation.y =
        cur + shortestAngle(cur, face.current) * Math.min(1, dt * 4.5);
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
          motion={pose ?? gait}
          onPointerDown={(e) => {
            e.stopPropagation();
            speak();
          }}
        />
      </group>

      {speech && (
        // below the HUD (z-10) and floating notes (z-20) so the bubble never
        // covers screen chrome
        <Html position={[0, 1.9, 0]} center zIndexRange={[9, 0]}>
          <SpeechBubble className="w-max">{speech}</SpeechBubble>
        </Html>
      )}
      {!speech && emote && (
        // the activity's little mood emoji, floating where the bubble would be
        <Html position={[0, 1.6, 0]} center zIndexRange={[9, 0]}>
          <span className="select-none text-2xl drop-shadow-sm">{emote}</span>
        </Html>
      )}
    </group>
  );
}
