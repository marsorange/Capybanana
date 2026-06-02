// Shared geometry anchors for the diorama (house + yard on a grass island),
// used by the scene meshes and by RoamingCompanion so they stay in sync.

export type Vec3 = [number, number, number];

export const FLOOR_H = 2.2; // loft floor height

// House footprint: x[-4.6, 0.4], z[-4.6, -0.2]. Open (cutaway) toward +x / +z.
// Yard fills the +x / +z side on the grass island.

// Stair endpoints the pet uses to move between floors.
export const STAIR_LOW: Vec3 = [-0.95, 0, -1.7];
export const STAIR_HIGH: Vec3 = [-1.8, FLOOR_H, -3.1];

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

export const SPOTS: Spot[] = [
  // ground floor — house
  { id: "sofa", pos: [-3.6, 0, -1.2], face: 0.3, activity: "idle", emote: "🛋️", dwell: [5, 9], floor: 0 },
  { id: "living", pos: [-2.7, 0, -0.8], face: 0.2, activity: "idle", emote: "🎵", dwell: [3, 6], floor: 0 },
  { id: "kitchen", pos: [-1.15, 0, -3.8], face: Math.PI, activity: "clean", emote: "🍳", dwell: [5, 8], floor: 0 },
  { id: "dining", pos: [-2.5, 0, -3.1], face: -Math.PI / 2, activity: "read", emote: "🍵", dwell: [4, 7], floor: 0 },
  // ground floor — yard
  { id: "doorstep", pos: [0.95, 0, -0.3], face: 0.7, activity: "look", emote: "🌤️", dwell: [3, 5], floor: 0 },
  { id: "garden", pos: [2.6, 0, 1.2], face: 0.4, activity: "look", emote: "🌼", dwell: [4, 7], floor: 0 },
  { id: "farm", pos: [0.7, 0, 2.0], face: 0.6, activity: "clean", emote: "🌱", dwell: [5, 9], floor: 0 },
  { id: "tree", pos: [2.9, 0, 1.5], face: 1.0, activity: "idle", emote: "🌳", dwell: [4, 7], floor: 0 },
  // loft
  { id: "bed", pos: [-3.6, FLOOR_H, -3.5], face: 0.4, activity: "sleep", emote: "💤", dwell: [7, 11], floor: 1 },
  { id: "bath", pos: [-1.5, FLOOR_H, -3.8], face: 0.3, activity: "idle", emote: "♨️", dwell: [5, 8], floor: 1 },
];
