// Shared geometry anchors for the villa, used by both Villa.tsx (the building)
// and RoamingCompanion.tsx (the wandering pet) so they stay in sync.

export type Vec3 = [number, number, number];

export const FLOOR_H = 2.0; // loft floor height

// Stair endpoints the pet uses to move between floors.
export const STAIR_LOW: Vec3 = [0.55, 0, -1.2];
export const STAIR_HIGH: Vec3 = [-0.25, FLOOR_H, -1.2];

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
  { id: "desk", pos: [1.45, 0, -0.6], face: Math.PI, activity: "read", emote: "📖", dwell: [5, 9], floor: 0 },
  { id: "rug", pos: [1.05, 0, 0.5], face: 0.2, activity: "idle", emote: "🎵", dwell: [4, 7], floor: 0 },
  { id: "door", pos: [2.05, 0, 0.5], face: 0.6, activity: "look", emote: "🌤️", dwell: [3, 6], floor: 0 },
  { id: "storage", pos: [-1.75, 0, 0.25], face: -0.2, activity: "clean", emote: "🧹", dwell: [5, 8], floor: 0 },
  { id: "bed", pos: [-1.6, FLOOR_H, -0.55], face: 0.5, activity: "sleep", emote: "💤", dwell: [7, 11], floor: 1 },
  { id: "loftwin", pos: [-0.7, FLOOR_H, -1.1], face: Math.PI, activity: "look", emote: "☁️", dwell: [4, 7], floor: 1 },
];
