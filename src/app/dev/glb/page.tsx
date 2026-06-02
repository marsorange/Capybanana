"use client";

// TEMP diagnostic: render the raw GLB bind pose (no clone / no toon / no
// normalize / no animation) to see the asset's true rest state. Safe to delete.
import { useAnimations, useGLTF } from "@react-three/drei";
import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import SceneCanvas from "@/components/scenes3d/SceneCanvas";

function Raw({ play }: { play: boolean }) {
  const gltf = useGLTF("/models/Capybanana.glb", "/draco/");
  const { actions, names } = useAnimations(gltf.animations, gltf.scene);
  const ref = useRef<THREE.Group>(null);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (play) {
      const a = actions.idle ?? actions[names[0]];
      a?.reset().play();
    }
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    setInfo(
      `clips=[${names.join(",")}] bbox y=${size.y.toFixed(3)} min.y=${box.min.y.toFixed(3)} max.y=${box.max.y.toFixed(3)}`,
    );
  }, [actions, names, play, gltf.scene]);

  return (
    <group ref={ref}>
      <primitive object={gltf.scene} />
      <Html position={[0, -0.6, 0]} center style={{ font: "11px monospace", whiteSpace: "nowrap", color: "#333" }}>
        {info}
      </Html>
    </group>
  );
}

export default function DevGlb() {
  const [play, setPlay] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("play"),
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "#eaeaea" }}>
      <SceneCanvas controls="orbit" cameraPosition={[6, 3, 10]} target={[0, 1.85, 0]} enableZoom>
        <Raw play={play} />
        <gridHelper args={[12, 12]} />
        <axesHelper args={[2]} />
      </SceneCanvas>
      <button
        onClick={() => setPlay((p) => !p)}
        style={{ position: "absolute", left: 12, bottom: 12, padding: "8px 14px", fontFamily: "monospace" }}
      >
        {play ? "anim: ON (idle)" : "anim: OFF (bind pose)"}
      </button>
    </div>
  );
}
