import type { Activity, Vec3 } from "../layout";

// Lets an in-scene tap send the companion walking to a spot, then either fire an
// action (open a screen) and/or perform an activity (farm/sleep/clean…) there.
// One home scene is active at a time.
export interface WalkCommand {
  target: Vec3;
  floor: 0 | 1;
  onArrive?: () => void;
  activity?: Activity; // played on arrival
  say?: string; // speech bubble shown on arrival
  dwell?: number; // seconds to perform the activity before resuming roaming
}

export const commandBus: { pending: WalkCommand | null } = { pending: null };

// Backward compatible: existing callers use commandWalk(target, floor, onArrive).
export function commandWalk(
  target: Vec3,
  floor: 0 | 1,
  onArrive?: () => void,
  opts?: { activity?: Activity; say?: string; dwell?: number },
) {
  commandBus.pending = { target, floor, onArrive, ...opts };
}
