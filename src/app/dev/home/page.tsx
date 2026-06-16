"use client";

// TEMPORARY dev-only verification route for the home diorama (the real home
// scene is behind login). Mirrors HomeScreen's SceneCanvas so the floor catcher
// and the roaming pet can be checked here. Safe to delete.
import SceneCanvas from "@/components/scenes3d/SceneCanvas";
import HomeModel from "@/components/scenes3d/home/HomeModel";
import HomeFloor from "@/components/scenes3d/home/HomeFloor";
import InteractionLayer from "@/components/scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "@/components/scenes3d/RoamingCompanion";
// Dev nav probe: exposes `window.__petPos` (live pet position) + `window.__navTo`
// (drive a floor-tap by world coords) + `window.__cmd` (drive a marker-style walk
// command, incl. activity/perch payloads) so Playwright traces can assert
// navigation numerically — used to verify obstacle footprints, stair routing and
// the furniture perch interactions.
import { useFrame, useThree } from "@react-three/fiber";
import { commandWalk } from "@/components/scenes3d/home/interaction/commandBus";
import { setNavTarget } from "@/components/scenes3d/home/interaction/navBus";

function DevProbe() {
  const scene = useThree((s) => s.scene);
  useFrame((state) => {
    const pet = scene.getObjectByName("pet-root");
    const w = window as unknown as Record<string, unknown>;
    if (pet) {
      w.__petPos = pet.position.toArray();
      // CSS-pixel screen position of the pet, for screenshot clipping
      const v = pet.position.clone().project(state.camera);
      w.__petScreen = [
        ((v.x + 1) / 2) * state.size.width,
        ((1 - v.y) / 2) * state.size.height,
      ];
    }
    w.__navTo = setNavTarget;
    w.__cmd = commandWalk;
  });
  return null;
}

export default function DevHome() {
  // ?away=1 mirrors the travelling state: pet gone, pack off the bench,
  // pet-bound markers greyed out.
  const away =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("away") === "1";
  return (
    <div style={{ position: "fixed", inset: 0, background: "#f6ecd8" }}>
      <SceneCanvas
        controls="orbit"
        orthographic
        sun
        sky
        cameraPosition={[6, 7, 12]}
        target={[-0.6, 0.4, -0.8]}
        zoom={38}
        enableZoom
        minZoom={34}
        maxZoom={84}
        minPolar={0.58}
        maxPolar={1.38}
      >
        <HomeModel mode={away ? "away" : "home"} />
        <HomeFloor />
        {!away && (
          <RoamingCompanion
            type="capybara"
            color="#a87b4f"
            accessory="scarf"
            seed="dev"
            clickLines={["（开发预览）"]}
          />
        )}
        <InteractionLayer away={away} />
        <DevProbe />
      </SceneCanvas>
    </div>
  );
}
