"use client";

import { setNavTarget } from "./interaction/navBus";

// The home's floor — a single invisible plane that serves as the tap-to-move
// pick target. Pure Three.js raycast (R3F's onClick), no physics: a tap anywhere
// on the ground sets the pet's navigation target via navBus, and RoamingCompanion
// clamps it back onto the island. The visible ground is parts/Island.tsx; this is
// only the (transparent) picking surface laid over it.
export default function HomeFloor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.04, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setNavTarget([e.point.x, 0, e.point.z]);
      }}
    >
      <planeGeometry args={[14, 14]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
