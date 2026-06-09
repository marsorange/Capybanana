"use client";

import type { ThreeEvent } from "@react-three/fiber";

import { setNavTarget } from "./interaction/navBus";
import { FLOOR_H, LOFT_LANDING, LOFT_MAIN, type Rect, stairRamp } from "./layout";

// The home's tap-to-move PICK surfaces — pure Three.js raycast (R3F onClick), no
// physics. Three invisible layers so you can walk the pet anywhere it can stand:
//   • the ground plane (y≈0),
//   • the loft floor (two planes at y=FLOOR_H over the L-shaped loft), and
//   • the staircase ramp (a tilted slab between them).
// Each tap hands the FULL hit point (including its height) to navBus, and
// RoamingCompanion infers the destination floor / ramp from that y. Nearest
// surface wins (stopPropagation), so a tap over the loft targets the loft, not
// the ground beneath it. The visible geometry is parts/*; these are only the
// (transparent) picking surfaces laid over it.

// Hand the raw 3D hit point to navBus; the walker reads its y to pick the floor.
function pick(e: ThreeEvent<MouseEvent>) {
  e.stopPropagation();
  setNavTarget([e.point.x, e.point.y, e.point.z]);
}

// A flat invisible pick plane covering a layout Rect at height y.
function FloorPatch({ rect, y }: { rect: Rect; y: number }) {
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[(rect.x0 + rect.x1) / 2, y, (rect.z0 + rect.z1) / 2]}
      onClick={pick}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function HomeFloor() {
  const ramp = stairRamp();
  return (
    <>
      {/* ground floor + yard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} onClick={pick}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* loft floor (L-shape = MAIN bar + LANDING strip), raised to FLOOR_H */}
      <FloorPatch rect={LOFT_MAIN} y={FLOOR_H + 0.02} />
      <FloorPatch rect={LOFT_LANDING} y={FLOOR_H + 0.02} />

      {/* the staircase — its top surface, so taps land a mid-climb target */}
      <mesh position={ramp.pos} rotation={[ramp.rotX, 0, 0]} onClick={pick}>
        <boxGeometry
          args={[ramp.halfWidth * 2, ramp.halfThick * 2, ramp.halfLen * 2]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
