import type { Vec3 } from "../layout";

// Tap-to-move target for the pet, as a full [x,y,z] hit point — the y lets the
// walker tell which floor (ground / loft / staircase) was tapped. HomeFloor's
// pick surfaces write here on tap; RoamingCompanion reads it each frame and lerps
// toward it. Module-level (like commandBus / zoomBus) so a DOM/three pointer
// event can hand off to the render loop without threading callbacks through the
// scene graph.
export const navBus: { target: Vec3 | null; version: number } = {
  target: null,
  version: 0,
};

export function setNavTarget(p: Vec3): void {
  navBus.target = p;
  navBus.version += 1;
}
