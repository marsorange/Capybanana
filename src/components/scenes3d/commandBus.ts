import type { Vec3 } from "./villaLayout";

// Lets an in-scene tap (backpack/postcards) send the companion walking to a
// spot, then fire an action when it arrives. One home scene is active at a time.
export interface WalkCommand {
  target: Vec3;
  floor: 0 | 1;
  onArrive: () => void;
}

export const commandBus: { pending: WalkCommand | null } = { pending: null };

export function commandWalk(
  target: Vec3,
  floor: 0 | 1,
  onArrive: () => void,
) {
  commandBus.pending = { target, floor, onArrive };
}
