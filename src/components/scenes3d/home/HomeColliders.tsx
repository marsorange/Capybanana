"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

import { setNavTarget } from "./interaction/navBus";
import {
  CX,
  CZ,
  D,
  EAVE,
  FLOOR_H,
  LOFT_LANDING,
  LOFT_MAIN,
  STAIR_TOP,
  WALL_T,
  W,
  XL,
  ZB,
  stairRamp,
  type Rect,
} from "./layout";

// The home's PHYSICAL layer — kept deliberately separate from the visual
// `HomeModel`. The scene draws hundreds of decorative meshes; the physics world
// only needs this lean proxy. Every extent here is DERIVED from layout.ts, so
// when the art changes the colliders stay the contract the pet + props collide
// against. Approximate on purpose — a collision hull, not a render mesh.
//
// All extents are HALF-extents (Rapier convention). The island top sits at y≈0.
const RIM_R = 4.7; // round wall radius — inside the (now compact) LAWN_R≈5.5 lawn
const RIM_SEGS = 12; //   so the pet is stopped before the edge (no fall-off / clip)

const SLAB_T = 0.11; // loft slab half-thickness
const CURB_H = 0.4; // loft-edge curb HALF-height (invisible; taller than the pet
//   capsule radius ≈0.45 so the chunky pet can't ride up over it. The VISIBLE
//   railing in House.tsx stays low (≈0.54) for the iso sightline.

// ---------------------------------------------------------------------------
// Yard / island OBSTACLES — invisible hulls mirroring the decorative props the
// scene draws (trees, boulders, the fenced veg bed, bench, lamp, mailbox, the
// postcard board). Positions track the visuals in parts/Island.tsx + parts/
// Yard.tsx; like the wall contract these are approximate collision hulls, not
// render meshes, so the pet + the physics toy stop at them instead of clipping
// through. (Half-extents; pos is the box center; rotY rotates about Y.)
type Obstacle = {
  pos: [number, number, number];
  half: [number, number, number];
  rotY?: number;
};
// Only the YARD props within the pet's reach (RIM_R) need hulls — the island
// trees/boulders now sit out at the rim, beyond where the pet can walk.
const OBSTACLES: Obstacle[] = [
  { pos: [-0.6, 0.36, 2.5], half: [1.28, 0.4, 1.08] }, // fenced veg garden (花圃, enlarged)
  { pos: [4.0, 0.32, 1.4], half: [0.5, 0.32, 0.2], rotY: -Math.PI / 2.2 }, // bench
  { pos: [1.8, 0.85, 2.6], half: [0.18, 0.85, 0.18] }, // garden lamp post
  { pos: [3.5, 0.5, -1.1], half: [0.26, 0.55, 0.28] }, // mailbox
  { pos: [2.6, 0.7, -0.9], half: [0.78, 0.62, 0.12], rotY: -0.6 }, // postcard board
];

// A floor slab collider covering a layout Rect at height y (top surface = y).
function slab(r: Rect, y: number) {
  return {
    args: [(r.x1 - r.x0) / 2, SLAB_T, (r.z1 - r.z0) / 2] as [number, number, number],
    pos: [(r.x0 + r.x1) / 2, y - SLAB_T, (r.z0 + r.z1) / 2] as [number, number, number],
  };
}

export default function HomeColliders() {
  // round perimeter wall: a ring of cuboid segments matching the round lawn, so
  // the pet/props are blocked smoothly at the edge instead of slipping past the
  // corners of a square box and clipping off the island.
  const rim = Array.from({ length: RIM_SEGS }).map((_, i) => {
    const a = (i / RIM_SEGS) * Math.PI * 2;
    const segW = 2 * RIM_R * Math.tan(Math.PI / RIM_SEGS);
    return {
      pos: [Math.cos(a) * RIM_R, 1.1, Math.sin(a) * RIM_R] as [
        number,
        number,
        number,
      ],
      rotY: -a,
      half: [segW / 2 + 0.1, 1.1, 0.25] as [number, number, number],
    };
  });

  const loftMain = slab(LOFT_MAIN, FLOOR_H);
  const loftLanding = slab(LOFT_LANDING, FLOOR_H);
  const ramp = stairRamp();

  return (
    <>
      <RigidBody type="fixed" colliders={false} friction={1}>
        {/* ground slab — top surface at y=0 */}
        <CuboidCollider args={[6.8, 0.1, 6.8]} position={[0, -0.1, 0]} />

        {/* round perimeter wall ring */}
        {rim.map((r, i) => (
          <CuboidCollider
            key={`rim${i}`}
            args={r.half}
            position={r.pos}
            rotation={[0, r.rotY, 0]}
          />
        ))}

        {/* the two SOLID house walls (back -z + left -x), full eave height; the
            +x/+z faces stay open (cutaway). Sized from layout WALL_T/EAVE. */}
        <CuboidCollider args={[WALL_T / 2, EAVE / 2, D / 2]} position={[XL, EAVE / 2, CZ]} />
        <CuboidCollider args={[W / 2, EAVE / 2, WALL_T / 2]} position={[CX, EAVE / 2, ZB]} />

        {/* L-shaped loft floor: the MAIN bedroom platform + the LANDING lobe the
            straight stair tops out onto, so the pet can stand upstairs. */}
        <CuboidCollider args={loftMain.args} position={loftMain.pos} />
        <CuboidCollider args={loftLanding.args} position={loftLanding.pos} />

        {/* low loft-edge curbs so the pet doesn't wander off the open edges —
            with a GAP at the landing front (z=STAIR_TOP.z) where the stair
            arrives, so it can step ramp → loft. */}
        {/* MAIN front edge (z=-1.6) */}
        <CuboidCollider
          args={[(LOFT_MAIN.x1 - LOFT_MAIN.x0) / 2, CURB_H, 0.08]}
          position={[(LOFT_MAIN.x0 + LOFT_MAIN.x1) / 2, FLOOR_H + CURB_H, LOFT_MAIN.z1]}
        />
        {/* MAIN right edge facing the stairwell void (x=-1.2, z[-1.6,STAIR_TOP.z]) */}
        <CuboidCollider
          args={[0.08, CURB_H, (LOFT_MAIN.z1 - STAIR_TOP[2]) / 2]}
          position={[LOFT_MAIN.x1, FLOOR_H + CURB_H, (LOFT_MAIN.z1 + STAIR_TOP[2]) / 2]}
        />
        {/* (No LANDING front-edge curb needed any more: the floor left of the
            stair is now part of LOFT_MAIN, guarded by its right-edge curb above;
            the stair itself fills the rest of the landing front.) */}
        {/* LANDING right edge facing the open right bay (x=-0.2) */}
        <CuboidCollider
          args={[0.08, CURB_H, (LOFT_LANDING.z1 - LOFT_LANDING.z0) / 2]}
          position={[LOFT_LANDING.x1, FLOOR_H + CURB_H, (LOFT_LANDING.z0 + LOFT_LANDING.z1) / 2]}
        />

        {/* the straight staircase as ONE invisible tilted ramp (~34°). The
            KinematicCharacterController in RoamingCompanion climbs it directly —
            no scripted glide, no per-step colliders. */}
        <CuboidCollider
          args={[ramp.halfWidth, ramp.halfThick, ramp.halfLen]}
          position={ramp.pos}
          rotation={[ramp.rotX, 0, 0]}
        />

        {/* yard / island obstacle hulls (trees, boulders, veg bed, bench, lamp,
            mailbox, board) so the pet + the physics toy collide with them */}
        {OBSTACLES.map((o, i) => (
          <CuboidCollider
            key={`obs${i}`}
            args={o.half}
            position={o.pos}
            rotation={[0, o.rotY ?? 0, 0]}
          />
        ))}
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
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}
