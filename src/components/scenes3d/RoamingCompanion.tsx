"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

import type { Accessory, CompanionType } from "@/game/types";
import { pick, randRange } from "@/game/util";
import SpeechBubble from "../ui/SpeechBubble";
import Character3D from "./character/Character3D";
import { commandBus } from "./commandBus";
import {
  SPOTS,
  STAIR_HIGH,
  STAIR_LOW,
  type Spot,
  type Vec3,
} from "./home/villaLayout";

const SPEED = 1.25;

function buildPath(fromFloor: 0 | 1, spot: Spot): Vec3[] {
  if (spot.floor === fromFloor) return [spot.pos];
  return fromFloor === 0
    ? [STAIR_LOW, STAIR_HIGH, spot.pos]
    : [STAIR_HIGH, STAIR_LOW, spot.pos];
}

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
  const mover = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const broom = useRef<THREE.Group>(null);

  const start = SPOTS[1];
  const pos = useRef(new THREE.Vector3(...start.pos));
  const floor = useRef<0 | 1>(0);
  const path = useRef<Vec3[]>([start.pos]);
  const nodeIdx = useRef(1); // already "arrived"
  const phase = useRef<"move" | "dwell">("dwell");
  const dwell = useRef(randRange(2, 4));
  const currentSpot = useRef<Spot>(start);
  const pendingSpot = useRef<Spot>(start);
  const faceTarget = useRef(start.face);
  const tmp = useRef(new THREE.Vector3());
  const command = useRef<(() => void) | null>(null);
  const commandSay = useRef<string | null>(null);

  const [, setEmote] = useState<string>(start.emote);
  const [speech, setSpeech] = useState<string | null>(null);
  const speechTimer = useRef<number | undefined>(undefined);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // pick up a tap-command: drop everything and walk to the target
    if (commandBus.pending && command.current === null) {
      const cmd = commandBus.pending;
      commandBus.pending = null;
      command.current = cmd.onArrive ?? null;
      commandSay.current = cmd.say ?? null;
      const cd = cmd.dwell ?? 0.2;
      const synthetic: Spot = {
        id: "__cmd",
        pos: cmd.target,
        floor: cmd.floor,
        face: 0,
        activity: cmd.activity ?? "idle",
        emote: "",
        dwell: [cd, cd],
      };
      pendingSpot.current = synthetic;
      path.current = buildPath(floor.current, synthetic);
      nodeIdx.current = 0;
      phase.current = "move";
      setEmote("");
    }

    if (phase.current === "dwell") {
      faceTarget.current = currentSpot.current.face;
      dwell.current -= dt;
      if (dwell.current <= 0) {
        let next = pick(SPOTS);
        for (let i = 0; i < 4 && next.id === currentSpot.current.id; i++) {
          next = pick(SPOTS);
        }
        pendingSpot.current = next;
        path.current = buildPath(floor.current, next);
        nodeIdx.current = 0;
        phase.current = "move";
        setEmote("");
      }
    } else {
      const target = path.current[nodeIdx.current];
      const d = tmp.current
        .set(target[0], target[1], target[2])
        .sub(pos.current);
      const dist = d.length();
      if (dist < 0.06) {
        pos.current.set(target[0], target[1], target[2]);
        nodeIdx.current += 1;
        if (nodeIdx.current >= path.current.length) {
          const spot = pendingSpot.current;
          currentSpot.current = spot;
          floor.current = spot.floor;
          phase.current = "dwell";
          dwell.current = randRange(spot.dwell[0], spot.dwell[1]);
          setEmote(spot.emote);
          if (spot.id === "__cmd") {
            if (commandSay.current) {
              sayText(commandSay.current);
              commandSay.current = null;
            }
            if (command.current) {
              const cb = command.current;
              command.current = null;
              cb();
            }
          }
        }
      } else {
        const step = Math.min(dist, SPEED * dt);
        d.multiplyScalar(step / dist);
        pos.current.add(d);
        if (Math.abs(d.x) + Math.abs(d.z) > 1e-4) {
          faceTarget.current = Math.atan2(d.x, d.z);
        }
      }
    }

    if (mover.current) {
      mover.current.position.copy(pos.current);
      const cur = mover.current.rotation.y;
      mover.current.rotation.y =
        cur + shortestAngle(cur, faceTarget.current) * Math.min(1, dt * 8);
    }

    const moving = phase.current === "move";
    const act = currentSpot.current.activity;
    if (inner.current) {
      inner.current.position.x =
        !moving && act === "clean" ? Math.sin(t * 4) * 0.12 : 0;
      const sleeping = !moving && act === "sleep";
      inner.current.position.y =
        (moving ? Math.abs(Math.sin(t * 9)) * 0.05 : 0) + (sleeping ? -0.12 : 0);
      inner.current.rotation.z = sleeping ? 0.5 : 0;
    }
    if (broom.current) {
      broom.current.visible = !moving && act === "clean";
    }
  });

  const sayText = (text: string) => {
    setSpeech(text);
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => setSpeech(null), 3400);
  };

  const speak = () => {
    setSpeech(pick(clickLines));
    setEmote("");
    window.clearTimeout(speechTimer.current);
    speechTimer.current = window.setTimeout(() => {
      setSpeech(null);
      setEmote(currentSpot.current.emote);
    }, 3600);
  };

  return (
    <group ref={mover} scale={1.28}>
      <group ref={inner}>
        <Character3D
          type={type}
          color={color}
          accessory={accessory}
          seed={seed}
          onPointerDown={(e) => {
            e.stopPropagation();
            speak();
          }}
        />
        {/* broom for cleaning */}
        <group ref={broom} position={[0.42, 0, 0.2]} rotation={[0, 0, -0.5]} visible={false}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
            <meshStandardMaterial color="#a9774b" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <coneGeometry args={[0.1, 0.18, 8]} />
            <meshStandardMaterial color="#e0b15e" roughness={1} metalness={0} />
          </mesh>
        </group>
      </group>

      {speech && (
        <Html position={[0, 1.7, 0]} center zIndexRange={[30, 0]}>
          <SpeechBubble className="w-max">{speech}</SpeechBubble>
        </Html>
      )}
    </group>
  );
}
