import type { Vec3 } from "../layout";

// Tap-to-move target for the pet. The ground catcher writes here on tap; the
// physics pet reads it each frame and steers its character controller toward it.
// Module-level (like commandBus / zoomBus) so a DOM/three pointer event can hand
// off to the render loop without threading callbacks through the scene graph.
export const navBus: { target: Vec3 | null; version: number } = {
  target: null,
  version: 0,
};

export function setNavTarget(p: Vec3): void {
  navBus.target = p;
  navBus.version += 1;
}
