"use client";

import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";

import { flatMaterial } from "../materials";

// Reference pattern for a physics prop: a dynamic <RigidBody> that falls, bounces
// and rolls on the HomeColliders, and that you can tap to toss. Future props
// (backpack items tumbling in, knock-over blocks) follow this same shape — wrap
// the visual mesh in a <RigidBody>, pick a collider, and drive it with impulses.
interface PhysicsToyProps {
  position?: [number, number, number];
  color?: string;
}

export default function PhysicsToy({
  position = [2.6, 2.2, 1.4],
  color = "#e8794f",
}: PhysicsToyProps) {
  const body = useRef<RapierRigidBody>(null);

  const toss = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const b = body.current;
    if (!b) return;
    // a cheerful upward pop with a little random spin
    b.applyImpulse(
      { x: (Math.random() - 0.5) * 1.6, y: 3.4, z: (Math.random() - 0.5) * 1.6 },
      true,
    );
    b.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * 0.08,
        y: (Math.random() - 0.5) * 0.08,
        z: (Math.random() - 0.5) * 0.08,
      },
      true,
    );
  };

  return (
    <RigidBody
      ref={body}
      colliders="ball"
      position={position}
      restitution={0.62}
      friction={0.7}
      linearDamping={0.15}
      angularDamping={0.2}
    >
      <mesh
        castShadow
        material={flatMaterial(color)}
        onPointerDown={toss}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[0.3, 16, 12]} />
      </mesh>
    </RigidBody>
  );
}
