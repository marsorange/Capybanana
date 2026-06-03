// Single source of truth for the home diorama's STRUCTURE. The visual house
// (parts/House.tsx), the physics proxy (HomeColliders.tsx), the roaming pet
// (RoamingCompanion.tsx) and the interaction markers (interaction/*) all derive
// their geometry from the constants here — so the building, its colliders and
// the navigation can never drift apart by hand-editing three files.

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// House footprint. A cutaway diorama: SOLID walls at -x (left) and -z (back);
// OPEN toward +x (right) and +z (front, the camera side). Everything else is
// derived from these four edges.
export const XL = -4.6; // left  (solid wall)
export const XR = 0.4; //  right (open / cutaway)
export const ZB = -4.6; // back  (solid wall)
export const ZF = -0.2; // front (open / cutaway)
export const W = XR - XL; // 5.0 width
export const D = ZF - ZB; // 4.4 depth
export const CX = (XL + XR) / 2; // -2.1
export const CZ = (ZB + ZF) / 2; // -2.4

export const FLOOR_H = 2.2; // loft floor TOP surface (ground→loft rise)
export const EAVE = 4.7; //    wall-top / eave height
export const WALL_T = 0.14; //  unified wall thickness

// ---------------------------------------------------------------------------
// Straight staircase — in the right bay, running along z at a constant x, so it
// is a single tilted ramp the pet climbs with the Rapier character controller
// (no scripted glide). Bottom sits at the front; top lands on the loft's back
// landing strip (z = STAIR_TOP.z = the landing's front edge → no overhang).
export const STAIR_X = -0.7;
export const STAIR_WIDTH = 0.95;
export const STAIR_BOTTOM: Vec3 = [STAIR_X, 0, -0.4];
export const STAIR_TOP: Vec3 = [STAIR_X, FLOOR_H, -3.6];
export const STAIR_RUN = Math.hypot(
  STAIR_TOP[0] - STAIR_BOTTOM[0],
  STAIR_TOP[2] - STAIR_BOTTOM[2],
); // 3.2
export const STAIR_RISE = STAIR_TOP[1] - STAIR_BOTTOM[1]; // 2.2
export const STAIR_SLOPE = Math.atan2(STAIR_RISE, STAIR_RUN); // ~34.5°, < 35° cap

// The flat ramp's transform, shared by the physics collider and any visual. A
// thin z-aligned slab tilted up about x by the slope angle; its +z end is the
// low (front) end, its -z end the high (back) end flush with the landing.
// Crucially the slab is SUNK by its half-thickness along the surface normal so
// its TOP (walking) surface passes exactly through STAIR_BOTTOM..STAIR_TOP — the
// pet ends the climb flush with the loft at y=FLOOR_H, not floating above it.
export function stairRamp(): {
  pos: Vec3;
  rotX: number;
  halfLen: number;
  halfWidth: number;
  halfThick: number;
} {
  const halfThick = 0.09;
  const ny = Math.cos(STAIR_SLOPE); // up-normal of the tilted surface = (0, ny, nz)
  const nz = Math.sin(STAIR_SLOPE);
  return {
    pos: [
      (STAIR_BOTTOM[0] + STAIR_TOP[0]) / 2,
      (STAIR_BOTTOM[1] + STAIR_TOP[1]) / 2 - ny * halfThick,
      (STAIR_BOTTOM[2] + STAIR_TOP[2]) / 2 - nz * halfThick,
    ],
    rotX: STAIR_SLOPE,
    halfLen: Math.hypot(STAIR_RUN, STAIR_RISE) / 2,
    halfWidth: STAIR_WIDTH / 2,
    halfThick,
  };
}

// ---------------------------------------------------------------------------
// Loft = an L-shape (deliberately SMALLER than the ground floor):
//   • MAIN  — the bedroom, a deep "vertical bar" on the LEFT (against both solid
//             walls). The bed lives at its back.
//   • LANDING — a shallow "horizontal bar" across the BACK-right that the stair
//             tops out onto and the pet walks along to reach MAIN.
// They share the x = -2.4 edge over the back band, so the route is
// stair → LANDING → (LOFT_PIVOT inner corner) → MAIN → bed. The landing sits
// entirely at z ≤ STAIR_TOP.z, so its slab never overhangs the climb.
export type Rect = { x0: number; x1: number; z0: number; z1: number };
export const LOFT_MAIN: Rect = { x0: XL, x1: -2.4, z0: ZB, z1: -1.6 };
export const LOFT_LANDING: Rect = { x0: -2.4, x1: -0.2, z0: ZB, z1: STAIR_TOP[2] };

// A deep landing point straight back from the stair top — the pet walks fully
// ONTO the landing here before turning, so its chunky capsule never straddles
// the stair-top edge (which IS the landing's front edge) and slips into the void.
export const LOFT_STEP: Vec3 = [STAIR_X, FLOOR_H, -4.1];

// The L's inner corner, on solid floor and well clear (x ≤ -3.0) of the MAIN
// right-edge curb at x=-2.4 — the chunky pet (capsule r≈0.45) must not brush it.
// Floor-change paths route through here so the pet never cuts the void diagonally.
export const LOFT_PIVOT: Vec3 = [-3.0, FLOOR_H, -3.9];

const inRect = (r: Rect, x: number, z: number) =>
  x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

export function onLoft(x: number, z: number): boolean {
  return inRect(LOFT_MAIN, x, z) || inRect(LOFT_LANDING, x, z);
}

// ---------------------------------------------------------------------------
// Named interaction/navigation anchors. Each is the spot the pet stands ON to
// use a feature (its art may sit a little beyond). The walking targets in
// InteractionLayer + the spawn in RoamingCompanion read straight from here.
export interface Anchor {
  pos: Vec3;
  face: number;
  floor: 0 | 1;
}
export const SPAWN: Anchor = { pos: [-2.6, 0, -1.2], face: 0.3, floor: 0 }; // floor1 center-front
export const PACK: Anchor = { pos: [-3.0, 0, -0.8], face: -Math.PI / 2, floor: 0 };
export const POSTCARD: Anchor = { pos: [1.5, 0, -0.6], face: 0.9, floor: 0 };
export const REST: Anchor = { pos: [-3.0, FLOOR_H, -2.9], face: -Math.PI / 2, floor: 1 };
export const STAIR_BOTTOM_ANCHOR: Anchor = { pos: STAIR_BOTTOM, face: Math.PI, floor: 0 };
export const STAIR_TOP_ANCHOR: Anchor = { pos: STAIR_TOP, face: -Math.PI / 2, floor: 1 };

// Art placement (just beyond the standing anchors), shared so House.tsx and the
// markers agree on where the bench / board / bed actually are.
export const PACK_BENCH: Vec3 = [-3.7, 0, -0.7];
export const POSTCARD_BOARD: Vec3 = [2.6, 0, -0.9];
export const BED: Vec3 = [-3.6, FLOOR_H, -3.7];

// ---------------------------------------------------------------------------
export type Activity = "read" | "sleep" | "clean" | "look" | "idle";

export interface Spot {
  id: string;
  pos: Vec3;
  face: number; // target rotation.y
  activity: Activity;
  emote: string;
  dwell: [number, number]; // seconds range
  floor: 0 | 1;
}

// Autonomous wander targets — all inside the new floor-0 region (left bay + yard)
// and the loft's MAIN bar; never the stairwell void, the stair bay, or off-loft.
export const SPOTS: Spot[] = [
  // ground floor — house (left bay, x ≤ -2.4)
  { id: "living", pos: [-3.2, 0, -0.9], face: 0.2, activity: "idle", emote: "🛋️", dwell: [5, 9], floor: 0 },
  { id: "center", pos: [-2.7, 0, -1.3], face: 0.4, activity: "idle", emote: "🎵", dwell: [3, 6], floor: 0 },
  { id: "kitchen", pos: [-3.9, 0, -2.6], face: -Math.PI / 2, activity: "clean", emote: "🍳", dwell: [5, 8], floor: 0 },
  { id: "dining", pos: [-2.9, 0, -2.3], face: Math.PI, activity: "read", emote: "🍵", dwell: [4, 7], floor: 0 },
  // ground floor — yard
  { id: "doorstep", pos: [0.6, 0, -0.4], face: 0.7, activity: "look", emote: "🌤️", dwell: [3, 5], floor: 0 },
  { id: "garden", pos: [1.6, 0, 1.0], face: 0.4, activity: "look", emote: "🌼", dwell: [4, 7], floor: 0 },
  { id: "farm", pos: [1.3, 0, 2.2], face: 0.6, activity: "clean", emote: "🌱", dwell: [5, 9], floor: 0 },
  // loft (left bay, x ≤ -3.3 to stay clear of the MAIN right-edge curb at x=-2.4)
  { id: "bed", pos: [-3.4, FLOOR_H, -3.5], face: 0.4, activity: "sleep", emote: "💤", dwell: [7, 11], floor: 1 },
  { id: "loftwin", pos: [-3.3, FLOOR_H, -2.6], face: 0.3, activity: "idle", emote: "🌙", dwell: [5, 8], floor: 1 },
];
