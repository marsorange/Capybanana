"use client";

// TEMPORARY dev-only verification route for the home diorama (the real home
// scene is behind login). Mirrors HomeScreen's SceneCanvas so the floor catcher
// and the roaming pet can be checked here. Safe to delete.
import SceneCanvas from "@/components/scenes3d/SceneCanvas";
import HomeModel from "@/components/scenes3d/home/HomeModel";
import HomeFloor from "@/components/scenes3d/home/HomeFloor";
import InteractionLayer from "@/components/scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "@/components/scenes3d/RoamingCompanion";

export default function DevHome() {
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
        <HomeModel mode="home" />
        <HomeFloor />
        <RoamingCompanion
          type="capybara"
          color="#a87b4f"
          accessory="scarf"
          seed="dev"
          clickLines={["（开发预览）"]}
        />
        <InteractionLayer />
      </SceneCanvas>
    </div>
  );
}
