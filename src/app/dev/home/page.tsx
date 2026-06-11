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
// (drive a floor-tap by world coords) so Playwright traces can assert navigation
// numerically — used to verify the obstacle footprints + stair routing.
import { useFrame, useThree } from "@react-three/fiber";
import { setNavTarget } from "@/components/scenes3d/home/interaction/navBus";

function DevProbe() {
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const pet = scene.getObjectByName("pet-root");
    const w = window as unknown as Record<string, unknown>;
    if (pet) w.__petPos = pet.position.toArray();
    w.__navTo = setNavTarget;
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
        minZoom={24}
        maxZoom={110}
        minPolar={0.7}
        maxPolar={1.3}
        bendStrength={0}
        postfx
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
