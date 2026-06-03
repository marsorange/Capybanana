"use client";

// TEMPORARY dev-only verification route for the home diorama (the real home
// scene is behind login). Mirrors HomeScreen's SceneCanvas so colliders, the
// roaming pet and the stairs can be checked here. Safe to delete.
import { useState } from "react";
import SceneCanvas from "@/components/scenes3d/SceneCanvas";
import HomeModel from "@/components/scenes3d/home/HomeModel";
import HomeColliders from "@/components/scenes3d/home/HomeColliders";
import InteractionLayer from "@/components/scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "@/components/scenes3d/RoamingCompanion";

export default function DevHome() {
  const [debug, setDebug] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#f6ecd8" }}>
      <SceneCanvas
        controls="orbit"
        orthographic
        sun
        physics
        debugPhysics={debug}
        cameraPosition={[5, 6.5, 11]}
        target={[-1.6, 2.0, -2.0]}
        zoom={60}
        enableZoom
        minZoom={34}
        maxZoom={120}
        minPolar={0.7}
        maxPolar={1.3}
        bendStrength={0}
      >
        <HomeModel mode="home" />
        <HomeColliders />
        <RoamingCompanion
          type="capybara"
          color="#a87b4f"
          accessory="scarf"
          seed="dev"
          clickLines={["（开发预览）"]}
        />
        <InteractionLayer />
      </SceneCanvas>
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={debug}
            onChange={(e) => setDebug(e.target.checked)}
          />{" "}
          debug colliders
        </label>
      </div>
    </div>
  );
}
