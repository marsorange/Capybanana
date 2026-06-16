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

// The loft routing pivot, on solid MAIN floor and clear of BOTH the right-edge
// railing at x=STAIR_LEFT and the bed's footprint (it used to sit at [-3.0,-3.9],
// INSIDE the bed — every trip to the loft phased through the mattress).
// Floor-change paths route through here so the pet never cuts the void diagonally.
export const LOFT_PIVOT: Vec3 = [-2.2, FLOOR_H, -2.9];

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
// bedside standing point — just outside the bed footprint (its front edge + PET_R)
export const REST: Anchor = { pos: [-3.0, FLOOR_H, -2.6], face: -Math.PI / 2, floor: 1 };
export const STAIR_BOTTOM_ANCHOR: Anchor = { pos: STAIR_BOTTOM, face: Math.PI, floor: 0 };
export const STAIR_TOP_ANCHOR: Anchor = { pos: STAIR_TOP, face: -Math.PI / 2, floor: 1 };

// Art placement (just beyond the standing anchors), shared so House.tsx and the
// markers agree on where the bench / board / bed actually are.
export const PACK_BENCH: Vec3 = [-3.1, 0, -0.02]; // front threshold, nudged outward
export const POSTCARD_BOARD: Vec3 = [2.6, 0, -0.9];
export const BED: Vec3 = [-3.6, FLOOR_H, -3.7];

// Ground-floor furniture anchors — House.tsx places the art at these and the
// OBSTACLES below derive their footprints from them, so visuals and collision
// can never drift apart. (Sizes mirror the meshes in parts/House.tsx.)
export const KITCHEN_RUN = { x: -4.18, z: -1.05, hx: 0.29, hz: 0.78 }; // counter run along the -x wall
export const DINING_TABLE: Vec3 = [-1.7, 0, -0.6]; // round table, r≈0.4
export const DINING_STOOL: Vec3 = [-1.7, 0, 0.18]; // little stool, r≈0.16
// bookshelf (nudged left of its old -1.45 so STAIR_BOTTOM keeps PET_R clearance)
export const BOOKSHELF = { x: -1.55, z: -1.35, hx: 0.49, hz: 0.23 };
export const LOFT_NIGHTSTAND: Vec3 = [-4.3, 0, -3.0]; // loft-local (y from loft group)

// Yard / island prop anchors — shared with parts/Yard.tsx + parts/Island.tsx so
// the visuals and the obstacle footprints below can never drift apart.
export const VEG_BED = { x: -0.7, z: 3.0, hx: 1.3, hz: 0.95 }; // log-fenced 苗圃
export const YARD_BENCH: Vec3 = [3.95, 0, 1.8];
export const YARD_TABLE: Vec3 = [3.25, 0, 2.4]; // log side-table by the bench
export const YARD_LANTERN: Vec3 = [2.35, 0, 2.5];
// the mailbox stands right off the postcard board's right post (one ensemble,
// both rotated -0.6): board right post ≈ [3.24,-0.46], box just beyond it
export const YARD_MAILBOX: Vec3 = [3.55, 0, -0.25];
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
  // indoor furniture (anchors above; sizes mirror the art in parts/House.tsx)
  rect(KITCHEN_RUN.x - KITCHEN_RUN.hx, KITCHEN_RUN.x + KITCHEN_RUN.hx, KITCHEN_RUN.z - KITCHEN_RUN.hz, KITCHEN_RUN.z + KITCHEN_RUN.hz),
  circle(DINING_TABLE[0], DINING_TABLE[2], 0.42),
  circle(DINING_STOOL[0], DINING_STOOL[2], 0.18),
  rect(BOOKSHELF.x - BOOKSHELF.hx, BOOKSHELF.x + BOOKSHELF.hx, BOOKSHELF.z - BOOKSHELF.hz, BOOKSHELF.z + BOOKSHELF.hz),
  // yard props (anchors above; sizes mirror the art in parts/Yard.tsx)
  rect(VEG_BED.x - VEG_BED.hx, VEG_BED.x + VEG_BED.hx, VEG_BED.z - VEG_BED.hz, VEG_BED.z + VEG_BED.hz),
  rect(-3.6, -2.6, -0.27, 0.27), // pack bench + backpack (art at PACK_BENCH)
  circle(POSTCARD_BOARD[0], POSTCARD_BOARD[2], 0.55),
  circle(YARD_BENCH[0], YARD_BENCH[2], 0.5),
  circle(YARD_TABLE[0], YARD_TABLE[2], 0.24),
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

// Loft-level obstacle footprints, applied once the walker is at loft height
// (y ≈ FLOOR_H — the stairs route between the layers and check neither list).
// The three railing strips mirror House.tsx's <Railing> runs exactly, so the
// open loft edges are physically blocked where the art shows a railing and stay
// open only at the stair mouth; the bed + nightstand stop the bedroom 穿模.
export const LOFT_OBSTACLES: Obstacle[] = [
  // the same two solid walls
  rect(XL - 0.15, XL + 0.15, ZB, ZF),
  rect(XL, XR, ZB - 0.15, ZB + 0.15),
  // railings: MAIN front edge, MAIN right edge (stairwell), LANDING right edge
  rect(LOFT_MAIN.x0, LOFT_MAIN.x1, LOFT_MAIN.z1 - 0.06, LOFT_MAIN.z1 + 0.06),
  rect(STAIR_LEFT - 0.06, STAIR_LEFT + 0.06, STAIR_TOP[2], LOFT_MAIN.z1),
  rect(LOFT_LANDING.x1 - 0.06, LOFT_LANDING.x1 + 0.06, LOFT_LANDING.z0, STAIR_TOP[2]),
  // bedroom furniture (bed base 1.7×1.3 at BED; nightstand at LOFT_NIGHTSTAND)
  rect(BED[0] - 0.85, BED[0] + 0.85, BED[2] - 0.65, BED[2] + 0.65),
  circle(LOFT_NIGHTSTAND[0], LOFT_NIGHTSTAND[2], 0.3),
];

// Push a point out of every obstacle footprint in `list` (inflated by `pad`).
// A few passes settle overlapping footprints; applied per-frame this reads as
// sliding along the obstacle instead of phasing through it.
export function resolveObstacles(
  x: number,
  z: number,
  pad = PET_R,
  list: Obstacle[] = OBSTACLES,
): [number, number] {
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const o of list) {
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

// A furniture seat the walker can hop onto: the ON-furniture position (with its
// real height) + the facing to hold while perched. The walker arrives at a
// ground/floor approach point first, then hops up — collision is skipped while
// perched, so the perch pos is the only place the pet may overlap furniture.
export interface Perch {
  pos: Vec3;
  face: number;
}

// rotate a furniture-local offset by the prop's yard yaw → world point
const yardSpot = (anchor: Vec3, yaw: number, lx: number, ly: number, lz: number): Vec3 => [
  anchor[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw),
  anchor[1] + ly,
  anchor[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw),
];

// 长椅: approach out at the bench's front-right — the side table's footprint
// overlaps the bench's on the house side, so the only walkable way in is from
// the stepping-stone path. From there the pet hops onto the seat (slat top ≈
// y 0.375), facing outward.
const BENCH_YAW = -0.55; // matches <GardenBench rot> in Yard.tsx
export const BENCH_SIT: { approach: Vec3; perch: Perch } = {
  approach: yardSpot(YARD_BENCH, BENCH_YAW, 0.6, 0, 0.9),
  perch: { pos: yardSpot(YARD_BENCH, BENCH_YAW, 0, 0.38, 0.04), face: BENCH_YAW },
};

// 床: approach at the bedside (REST anchor), hop onto the mattress (top ≈ +0.6)
// and curl up facing the camera.
export const BED_SLEEP: { approach: Vec3; perch: Perch } = {
  approach: [-3.0, FLOOR_H, -2.6],
  perch: { pos: [-3.3, FLOOR_H + 0.6, -3.6], face: 0.45 },
};

// 小凳: approach in front of the stool, hop on (seat top ≈ 0.34) facing the table.
export const STOOL_SIT: { approach: Vec3; perch: Perch } = {
  approach: [DINING_STOOL[0], 0, DINING_STOOL[2] + 0.68],
  perch: { pos: [DINING_STOOL[0], 0.34, DINING_STOOL[2]], face: Math.PI },
};

export interface Spot {
  id: string;
  pos: Vec3;
  face: number; // target rotation.y
  activity: Activity;
  emote: string;
  dwell: [number, number]; // seconds range
  floor: 0 | 1;
  perch?: Perch; // hop onto furniture on arrival (bed / bench / stool)
}

// Autonomous wander targets — all inside the new floor-0 region (left bay + yard)
// and the loft's MAIN bar; never the stairwell void, the stair bay, or off-loft.
// Every standing pos stays ≥ PET_R outside its floor's obstacle footprints.
export const SPOTS: Spot[] = [
  // ground floor — house (left bay, x ≤ -2.4)
  { id: "living", pos: [-3.2, 0, -0.9], face: 0.2, activity: "idle", emote: "🛋️", dwell: [5, 9], floor: 0 },
  { id: "center", pos: [-2.7, 0, -1.3], face: 0.4, activity: "idle", emote: "🎵", dwell: [3, 6], floor: 0 },
  { id: "kitchen", pos: [-3.9, 0, -2.6], face: -Math.PI / 2, activity: "clean", emote: "🍳", dwell: [5, 8], floor: 0 },
  // hops onto the little stool for tea at the round table
  { id: "dining", pos: STOOL_SIT.approach, face: Math.PI, activity: "read", emote: "🍵", dwell: [6, 9], floor: 0, perch: STOOL_SIT.perch },
  // ground floor — yard (doorstep kept clear of the open-corner post footprint)
  { id: "doorstep", pos: [0.95, 0, -0.3], face: 0.7, activity: "look", emote: "🌤️", dwell: [3, 5], floor: 0 },
  { id: "garden", pos: [1.6, 0, 1.0], face: 0.4, activity: "look", emote: "🌼", dwell: [4, 7], floor: 0 },
  // stands in FRONT of the fenced veg bed (just outside its footprint)
  { id: "farm", pos: [-0.7, 0, 1.65], face: 0.4, activity: "clean", emote: "🌱", dwell: [5, 9], floor: 0 },
  // hops onto the garden bench for a sit in the sun
  { id: "bench", pos: BENCH_SIT.approach, face: BENCH_YAW, activity: "look", emote: "🍃", dwell: [8, 13], floor: 0, perch: BENCH_SIT.perch },
  // loft (left bay; keep x ≤ -1.7 to stay clear of the right-edge curb at STAIR_LEFT)
  // climbs onto the mattress for a proper nap (approach = bedside REST anchor)
  { id: "bed", pos: BED_SLEEP.approach, face: 0.4, activity: "sleep", emote: "💤", dwell: [10, 16], floor: 1, perch: BED_SLEEP.perch },
  { id: "loftwin", pos: [-3.3, FLOOR_H, -2.6], face: 0.3, activity: "idle", emote: "🌙", dwell: [5, 8], floor: 1 },
  { id: "loftrug", pos: [-2.0, FLOOR_H, -2.9], face: 0.6, activity: "read", emote: "📖", dwell: [4, 7], floor: 1 },
];
