// Single source of truth for the home diorama's STRUCTURE. The visual house
// (parts/House.tsx), the roaming pet (RoamingCompanion.tsx) and the interaction
// markers (interaction/*) all derive their geometry from the constants here — so
// the building and the navigation can never drift apart by hand-editing files.

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
// Straight staircase — in the right bay, running along z at a constant x. The
// walker routes a bottom→top waypoint leg here and lerps its y across the rise,
// so it reads as climbing. Bottom sits at the front; top lands on the loft's back
// landing strip (z = STAIR_TOP.z = the landing's front edge → no overhang).
export const STAIR_X = -0.7;
export const STAIR_WIDTH = 0.95;
export const STAIR_LEFT = STAIR_X - STAIR_WIDTH / 2; // -1.175, the loft's right edge
// Bottom pulled back (shorter run) so the flight is STEEPER — matches the
// reference's tighter staircase.
export const STAIR_BOTTOM: Vec3 = [STAIR_X, 0, -1.15];
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
// Loft = an L-shape that fills the whole floor LEFT of the staircase, so there
// is REAL floor right beside the stairs (no empty stairwell passage):
//   • MAIN  — the deep bedroom + landing bar, butting straight up against the
//             stair's left edge (x = STAIR_LEFT). Floor runs the full depth so
//             the pet steps off the stair directly onto it, and the bed lives at
//             its back. The front edge stops short (z1) so the camera still sees
//             the ground floor + entrance below.
//   • LANDING — the short strip BEHIND the stair top (x right of STAIR_LEFT) that
//             the straight stair tops out onto.
// They share the x = STAIR_LEFT edge over the back band, so the route is
// stair → LANDING → (LOFT_PIVOT inner corner) → MAIN → bed. The landing sits
// entirely at z ≤ STAIR_TOP.z, so its slab never overhangs the climb.
export type Rect = { x0: number; x1: number; z0: number; z1: number };
export const LOFT_MAIN: Rect = { x0: XL, x1: STAIR_LEFT, z0: ZB, z1: -1.6 };
export const LOFT_LANDING: Rect = { x0: STAIR_LEFT, x1: -0.2, z0: ZB, z1: STAIR_TOP[2] };

// A deep landing point straight back from the stair top — the pet walks fully
// ONTO the landing here before turning, so its chunky capsule never straddles
// the stair-top edge (which IS the landing's front edge) and slips into the void.
export const LOFT_STEP: Vec3 = [STAIR_X, FLOOR_H, -4.1];

// The L's inner corner, on solid floor and well clear of the MAIN right-edge
// curb at x=STAIR_LEFT — the chunky pet (capsule r≈0.45) must not brush it.
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
export const PACK_BENCH: Vec3 = [-3.1, 0, -0.02]; // front threshold, nudged outward
export const POSTCARD_BOARD: Vec3 = [2.6, 0, -0.9];
export const BED: Vec3 = [-3.6, FLOOR_H, -3.7];

// Yard / island prop anchors — shared with parts/Yard.tsx + parts/Island.tsx so
// the visuals and the obstacle footprints below can never drift apart.
export const VEG_BED = { x: -0.7, z: 3.0, hx: 1.3, hz: 0.95 }; // log-fenced 苗圃
export const YARD_BENCH: Vec3 = [3.95, 0, 1.8];
export const YARD_LANTERN: Vec3 = [2.35, 0, 2.5];
export const YARD_MAILBOX: Vec3 = [3.7, 0, -0.45];
export const YARD_LOG_PILE: Vec3 = [-2.8, 0, 2.6];
export const YARD_WATER_CAN: Vec3 = [-2.3, 0, 1.75];
export const ISLAND_POND: [number, number] = [-4.1, 3.9];
export const ISLAND_BOULDERS: Vec3 = [-4.5, 0, 1.0];
export const HERO_TREE: Vec3 = [4.9, 0, -2.4];
export const MUSHROOM_PATCH: [number, number] = [4.2, -1.5];

// ---------------------------------------------------------------------------
// Ground-floor obstacle footprints — the home's whole "collision" system. The
// kinematic walker has no physics engine: each frame it pushes its xz out of
// these 2D footprints (inflated by PET_R), which reads as sliding around the
// furniture, and floor-tap targets are pushed out the same way so a tap ON a
// prop walks the pet to its edge. Footprints only apply on the ground floor
// (the loft/stairs route over them at y>0); keep every standing anchor + SPOT
// at least PET_R outside its nearest footprint or the walker jams against it.
export type Obstacle =
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "rect"; x0: number; x1: number; z0: number; z1: number };

export const PET_R = 0.32; // the walker's plan-view radius (visual scale 1.28)

const circle = (x: number, z: number, r: number): Obstacle => ({ kind: "circle", x, z, r });
const rect = (x0: number, x1: number, z0: number, z1: number): Obstacle => ({
  kind: "rect", x0, x1, z0, z1,
});

export const OBSTACLES: Obstacle[] = [
  // the two solid walls + the open-corner post (the cutaway sides stay open)
  rect(XL - 0.15, XL + 0.15, ZB, ZF),
  rect(XL, XR, ZB - 0.15, ZB + 0.15),
  circle(XR, ZF, 0.18),
  // yard props (anchors above; sizes mirror the art in parts/Yard.tsx)
  rect(VEG_BED.x - VEG_BED.hx, VEG_BED.x + VEG_BED.hx, VEG_BED.z - VEG_BED.hz, VEG_BED.z + VEG_BED.hz),
  rect(-3.6, -2.6, -0.27, 0.27), // pack bench + backpack (art at PACK_BENCH)
  circle(POSTCARD_BOARD[0], POSTCARD_BOARD[2], 0.55),
  circle(YARD_BENCH[0], YARD_BENCH[2], 0.62),
  circle(YARD_LANTERN[0], YARD_LANTERN[2], 0.24),
  circle(YARD_MAILBOX[0], YARD_MAILBOX[2], 0.32),
  circle(YARD_LOG_PILE[0], YARD_LOG_PILE[2], 0.5),
  circle(YARD_WATER_CAN[0], YARD_WATER_CAN[2], 0.22),
  // island features inside the pet's reach (NAV_CLAMP_R ≈ 5)
  circle(ISLAND_POND[0], ISLAND_POND[1], 1.5),
  circle(ISLAND_BOULDERS[0], ISLAND_BOULDERS[2], 0.72),
  circle(HERO_TREE[0], HERO_TREE[2], 0.42),
  circle(MUSHROOM_PATCH[0], MUSHROOM_PATCH[1], 0.28),
];

// Push a ground point out of every obstacle footprint (inflated by `pad`).
// A few passes settle overlapping footprints; applied per-frame this reads as
// sliding along the obstacle instead of phasing through it.
export function resolveObstacles(x: number, z: number, pad = PET_R): [number, number] {
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const o of OBSTACLES) {
      if (o.kind === "circle") {
        const dx = x - o.x;
        const dz = z - o.z;
        const min = o.r + pad;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
          const d = Math.sqrt(d2);
          if (d > 1e-4) {
            x = o.x + (dx / d) * min;
            z = o.z + (dz / d) * min;
          } else {
            x = o.x + min;
          }
          pushed = true;
        }
      } else {
        const cx = Math.min(Math.max(x, o.x0), o.x1);
        const cz = Math.min(Math.max(z, o.z0), o.z1);
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (dx === 0 && dz === 0) {
          // inside the rect: exit through the nearest face
          const left = x - o.x0;
          const right = o.x1 - x;
          const front = z - o.z0;
          const back = o.z1 - z;
          const lx = Math.min(left, right);
          const lz = Math.min(front, back);
          if (lx < lz) x = left < right ? o.x0 - pad : o.x1 + pad;
          else z = front < back ? o.z0 - pad : o.z1 + pad;
          pushed = true;
        } else if (d2 < pad * pad) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * pad;
          z = cz + (dz / d) * pad;
          pushed = true;
        }
      }
    }
    if (!pushed) break;
  }
  return [x, z];
}

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
  // ground floor — yard (doorstep kept clear of the open-corner post footprint)
  { id: "doorstep", pos: [0.95, 0, -0.3], face: 0.7, activity: "look", emote: "🌤️", dwell: [3, 5], floor: 0 },
  { id: "garden", pos: [1.6, 0, 1.0], face: 0.4, activity: "look", emote: "🌼", dwell: [4, 7], floor: 0 },
  // stands in FRONT of the fenced veg bed (just outside its footprint)
  { id: "farm", pos: [-0.7, 0, 1.65], face: 0.4, activity: "clean", emote: "🌱", dwell: [5, 9], floor: 0 },
  // loft (left bay; keep x ≤ -1.7 to stay clear of the right-edge curb at STAIR_LEFT)
  { id: "bed", pos: [-3.4, FLOOR_H, -3.5], face: 0.4, activity: "sleep", emote: "💤", dwell: [7, 11], floor: 1 },
  { id: "loftwin", pos: [-3.3, FLOOR_H, -2.6], face: 0.3, activity: "idle", emote: "🌙", dwell: [5, 8], floor: 1 },
  { id: "loftrug", pos: [-2.0, FLOOR_H, -2.9], face: 0.6, activity: "idle", emote: "📖", dwell: [4, 7], floor: 1 },
];
