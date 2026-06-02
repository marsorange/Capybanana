"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

import { setNavTarget } from "./interaction/navBus";

// The home's PHYSICAL layer — kept deliberately separate from the visual
// `HomeModel`. The scene draws ~400 decorative meshes; the physics world only
// needs this lean proxy of a few invisible boxes. This is the keystone of the
// migration: when the art gets redesigned, the visuals change but these
// colliders (or their layout-derived dimensions) stay the contract the pet and
// props collide against. Approximate on purpose — it is a collision hull, not a
// render mesh.
//
// All extents are HALF-extents (Rapier convention). The island top sits at y≈0.
export default function HomeColliders() {
  return (
    <>
      <RigidBody type="fixed" colliders={false} friction={1}>
        {/* ground slab — top surface at y=0 */}
        <CuboidCollider args={[6.4, 0.1, 6.4]} position={[0, -0.1, 0]} />

        {/* perimeter walls so the pet + props can't slide off the island */}
        <CuboidCollider args={[0.2, 1.6, 6.4]} position={[-6.4, 1.5, 0]} />
        <CuboidCollider args={[0.2, 1.6, 6.4]} position={[6.4, 1.5, 0]} />
        <CuboidCollider args={[6.4, 1.6, 0.2]} position={[0, 1.5, -6.4]} />
        <CuboidCollider args={[6.4, 1.6, 0.2]} position={[0, 1.5, 6.4]} />

        {/* the two solid house walls (back z + left x); +x/+z stay open (cutaway).
            Footprint from layout.ts: x[-4.6,0.4], z[-4.6,-0.2]. */}
        <CuboidCollider args={[0.15, 1.4, 2.2]} position={[-4.6, 1.4, -2.4]} />
        <CuboidCollider args={[2.5, 1.4, 0.15]} position={[-2.1, 1.4, -4.6]} />
      </RigidBody>

      {/* Invisible tap-to-move catcher (pure R3F raycast, no physics body).
          A tap anywhere on the floor sets the pet's navigation target. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        onClick={(e) => {
          e.stopPropagation();
          setNavTarget([e.point.x, 0, e.point.z]);
        }}
      >
        <planeGeometry args={[12.8, 12.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
