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
import { SPOTS, type Vec3 } from "./home/layout";

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

// Loft/stairs are deferred until the home art is redesigned with real ramps;
// for now the pet roams the ground floor.
const GROUND_SPOTS = SPOTS.filter((s) => s.floor === 0);

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
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
  const target = useRef(
    new THREE.Vector3(GROUND_SPOTS[0].pos[0], 0, GROUND_SPOTS[0].pos[2]),
  );
  const dwell = useRef(randRange(2, 4));
  const face = useRef(0);
  const pendingArrive = useRef<(() => void) | null>(null);
  const pendingSay = useRef<string | null>(null);

  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);

  // One character controller for this pet, created against the live world.
  useEffect(() => {
    const c = world.createCharacterController(0.01);
    c.enableAutostep(0.5, 0.2, true); // hop small ledges
    c.enableSnapToGround(0.5); // stick to the floor on descents
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

    // an in-scene marker tap (commandBus) takes priority and may carry a callback
    if (commandBus.pending) {
      const cmd = commandBus.pending;
      commandBus.pending = null;
      target.current.set(cmd.target[0], 0, cmd.target[2]);
      pendingArrive.current = cmd.onArrive ?? null;
      pendingSay.current = cmd.say ?? null;
      dwell.current = randRange(2.5, 4.5);
    } else if (navBus.version !== seenNav.current) {
      // a floor tap (navBus): walk to that point
      seenNav.current = navBus.version;
      if (navBus.target) {
        target.current.set(navBus.target[0], 0, navBus.target[2]);
        pendingArrive.current = null;
        pendingSay.current = null;
        dwell.current = randRange(2.5, 4.5);
      }
    }

    const dx = target.current.x - p.x;
    const dz = target.current.z - p.z;
    const horiz = Math.hypot(dx, dz);
    const moving = horiz > ARRIVE;

    let mx = 0;
    let mz = 0;
    if (moving) {
      const s = Math.min(horiz, SPEED * dt);
      mx = (dx / horiz) * s;
      mz = (dz / horiz) * s;
      face.current = Math.atan2(mx, mz);
    } else {
      // arrived: fire any pending marker callback once, then idle + wander
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
        const next = pick(GROUND_SPOTS);
        target.current.set(next.pos[0], 0, next.pos[2]);
        dwell.current = randRange(2.5, 4.5);
      }
    }

    // gravity, resolved by the controller (zeroed once grounded)
    vy.current += GRAVITY * dt;
    c.computeColliderMovement(collider, { x: mx, y: vy.current * dt, z: mz });
    if (c.computedGrounded()) vy.current = 0;
    const mv = c.computedMovement();
    b.setNextKinematicTranslation({
      x: p.x + mv.x,
      y: p.y + mv.y,
      z: p.z + mv.z,
    });

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

  const startPos: Vec3 = [GROUND_SPOTS[0].pos[0], 0.2, GROUND_SPOTS[0].pos[2]];

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={startPos}
    >
      {/* collision capsule (bottom at the feet, y=0) — render mesh ≠ collider */}
      <CapsuleCollider args={[0.3, 0.45]} position={[0, 0.75, 0]} />
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
