"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import type { Accessory, CompanionType } from "@/game/types";
import { pick, randRange } from "@/game/util";
import SpeechBubble from "../ui/SpeechBubble";
import CharacterModel from "./character/CharacterModel";
import { commandBus } from "./home/interaction/commandBus";
import { navBus } from "./home/interaction/navBus";
import { LOFT_PIVOT, LOFT_STEP, SPAWN, SPOTS, STAIR_BOTTOM, type Vec3 } from "./home/layout";

// The pet as a physics CHARACTER, not a scripted lerp. It's a kinematic-position
// rigid body whose movement runs through a Rapier KinematicCharacterController:
// each frame we ask for a desired step (horizontal toward the goal + gravity) and
// the controller resolves it against the HomeColliders — so the pet is grounded,
// climbs small steps, and slides along walls instead of clipping through them.
//
// No user steering: the goal comes from a floor tap (navBus), an in-scene marker
// (commandBus), or autonomous wander between ground-floor spots.
const GRAVITY = -14; // a touch snappier than 9.81 — reads better in a toy world
const SPEED = 1.6;
const ARRIVE = 0.14;

const START = SPAWN; // floor-0 centre-front spawn anchor
const LOFT_Y = 1.1; // y above which the pet counts as "on the loft"

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function vecOf(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], 0, v[2]);
}

// A walk path to (x,z) on floor `destFloor`, routed up/down the stairs when the
// pet is on a different floor — so it never walks straight through the loft slab.
function buildPath(
  x: number,
  z: number,
  destFloor: 0 | 1,
  fromFloor: 0 | 1,
): THREE.Vector3[] {
  const dest = new THREE.Vector3(x, 0, z);
  if (destFloor === fromFloor) return [dest];
  const bottom = vecOf(STAIR_BOTTOM);
  const step = vecOf(LOFT_STEP); // deep on the landing (past the stair-top edge)
  const pivot = vecOf(LOFT_PIVOT); // inner corner, clear of the edge curb
  // Climb up the ramp fully onto the landing (step), round the inner corner
  // (pivot), then to the destination — and the reverse to descend. Keeps the
  // chunky capsule on solid floor the whole way (never across the void).
  return destFloor === 1
    ? [bottom, step, pivot, dest] // climb
    : [pivot, step, bottom, dest]; // descend
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
  const { world } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  const inner = useRef<THREE.Group>(null);
  // Tie the controller's type to this exact world instance — there are two
  // copies of rapier3d-compat on disk (one nested under @react-three/rapier) and
  // a bare import would pick the wrong, structurally-incompatible one.
  const controller = useRef<ReturnType<
    typeof world.createCharacterController
  > | null>(null);

  const vy = useRef(0);
  const seenNav = useRef(navBus.version);
  const target = useRef(new THREE.Vector3(START.pos[0], 0, START.pos[2]));
  const queue = useRef<THREE.Vector3[]>([]);
  const dwell = useRef(randRange(2, 4));
  const face = useRef(0);
  const pendingArrive = useRef<(() => void) | null>(null);
  const pendingSay = useRef<string | null>(null);

  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);

  // One character controller for this pet, created against the live world.
  useEffect(() => {
    const c = world.createCharacterController(0.01);
    c.enableAutostep(0.45, 0.1, true); // clear the ramp/landing lip — safe now
    //   that the loft curbs are 0.8 tall (taller than this) so it can't ride them
    c.enableSnapToGround(0.45); // stick to the floor/ramp on descents
    // The straight stair is a ~34° ramp: allow climbing well past it, and don't
    // auto-slide on it, so the pet walks up/down instead of sliding back down.
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((55 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(true); // can nudge the toy when bumping it
    controller.current = c;
    return () => {
      try {
        world.removeCharacterController(c);
      } catch {
        /* world already torn down */
      }
      controller.current = null;
    };
  }, [world]);

  const sayText = (text: string) => {
    setSpeech(text);
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), 3500);
  };

  useFrame((_, delta) => {
    const b = body.current;
    const c = controller.current;
    if (!b || !c || b.numColliders() === 0) return;
    const dt = Math.min(delta, 1 / 30);
    const collider = b.collider(0);
    const p = b.translation();
    const fromFloor: 0 | 1 = p.y > LOFT_Y ? 1 : 0;

    // an in-scene marker tap (commandBus) takes priority and may carry a callback.
    // Markers live on the ground floor — route down the stairs first if upstairs.
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
      // a floor tap (navBus): walk to that point (descending first if upstairs)
      seenNav.current = navBus.version;
      if (navBus.target) {
        const path = buildPath(navBus.target[0], navBus.target[2], 0, fromFloor);
        target.current.copy(path[0]);
        queue.current = path.slice(1);
        pendingArrive.current = null;
        pendingSay.current = null;
        dwell.current = randRange(2.5, 4.5);
      }
    }

    const dx = target.current.x - p.x;
    const dz = target.current.z - p.z;
    const horiz = Math.hypot(dx, dz);
    const moving = horiz > ARRIVE;

    if (!moving) {
      // reached the current waypoint
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
    }

    // Move toward the current waypoint. The character controller resolves the
    // horizontal step + gravity against the colliders (including the staircase
    // ramp), so the pet climbs and descends the stairs as real physics — no
    // scripted glide. Floor changes are routed up/down the ramp by buildPath.
    let mx = 0;
    let mz = 0;
    if (moving) {
      const s = Math.min(horiz, SPEED * dt);
      mx = (dx / horiz) * s;
      mz = (dz / horiz) * s;
      face.current = Math.atan2(mx, mz);
    }
    // gravity, resolved by the controller (zeroed once grounded)
    vy.current += GRAVITY * dt;
    c.computeColliderMovement(collider, { x: mx, y: vy.current * dt, z: mz });
    if (c.computedGrounded()) vy.current = 0;
    const mv = c.computedMovement();
    b.setNextKinematicTranslation({ x: p.x + mv.x, y: p.y + mv.y, z: p.z + mv.z });

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

  const startPos: Vec3 = [START.pos[0], 0.2, START.pos[2]];

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={startPos}
    >
      {/* collision capsule (bottom at the feet, y=0) — render mesh ≠ collider.
          Slim (radius 0.3) on purpose: the VISUAL pet stays chunky (scale 1.28),
          but a slimmer collider clears the stair width, the ramp/landing junction
          and the loft's L corner instead of wedging on them. */}
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />
      <group ref={inner} scale={1.28}>
        <CharacterModel
          type={type}
          color={color}
          accessory={accessory}
          seed={seed}
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
    </RigidBody>
  );
}
