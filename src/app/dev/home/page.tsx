"use client";

// TEMPORARY dev-only verification route for the toon materials + planet bend on
// the home diorama (the real home scene is behind login). Safe to delete.
import { useState } from "react";
import SceneCanvas from "@/components/scenes3d/SceneCanvas";
import HomeModel from "@/components/scenes3d/home/HomeModel";

export default function DevHome() {
  const [bend, setBend] = useState(0.15);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#f3ead9" }}>
      <SceneCanvas
        controls="orbit"
        orthographic
        sun
        cameraPosition={[9, 8.4, 9]}
        target={[-0.4, 2.4, -0.4]}
        zoom={45}
        enableZoom
        minZoom={30}
        maxZoom={95}
        minPolar={0.6}
        maxPolar={1.32}
        bendStrength={bend}
      >
        <HomeModel mode="home" />
      </SceneCanvas>
      <div style={{ position: "absolute", left: 12, bottom: 12, fontFamily: "monospace" }}>
        bend {bend.toFixed(2)}{" "}
        <input type="range" min={0} max={0.5} step={0.01} value={bend} onChange={(e) => setBend(+e.target.value)} />
      </div>
    </div>
  );
}
