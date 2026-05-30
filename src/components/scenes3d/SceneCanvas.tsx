"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense } from "react";
import * as THREE from "three";
import { zoomBus } from "./zoomBus";

interface SceneCanvasProps {
  children: ReactNode;
  controls?: "orbit" | "spin" | "none";
  orthographic?: boolean;
  cameraPosition?: [number, number, number];
  zoom?: number; // orthographic zoom
  target?: [number, number, number];
  enableZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  azimuth?: number; // +/- range; undefined = unlimited
  minPolar?: number;
  maxPolar?: number;
  className?: string;
}

function ZoomApplier({ min, max }: { min: number; max: number }) {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    if (zoomBus.factor !== 1) {
      const next = THREE.MathUtils.clamp(camera.zoom * zoomBus.factor, min, max);
      zoomBus.factor = 1;
      if (next !== camera.zoom) {
        camera.zoom = next;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

export default function SceneCanvas({
  children,
  controls = "none",
  orthographic = false,
  cameraPosition = [0, 1.7, 3.7],
  zoom = 42,
  target = [0, 0.7, 0],
  enableZoom = false,
  minZoom = 26,
  maxZoom = 130,
  azimuth,
  minPolar = 1.05,
  maxPolar = 1.5,
  className,
}: SceneCanvasProps) {
  const camera = orthographic
    ? { position: cameraPosition, zoom, near: 0.1, far: 200 }
    : { position: cameraPosition, fov: 38, near: 0.1, far: 200 };

  return (
    <Canvas
      className={className}
      orthographic={orthographic}
      shadows={false}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
      camera={camera}
      style={{ touchAction: "none" }}
      onCreated={({ gl }) => {
        // Allow the browser to restore a lost context instead of going blank.
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => e.preventDefault(),
          false,
        );
      }}
    >
      <hemisphereLight args={["#fff3da", "#d6c199", 1.05]} />
      <ambientLight intensity={0.35} color="#fff1da" />
      <directionalLight position={[7, 12, 6]} intensity={1.7} color="#fff2dd" />

      <Suspense fallback={null}>{children}</Suspense>

      {orthographic && (
        <>
          <ContactShadows
            position={[0, 0.04, 0]}
            scale={11}
            opacity={0.4}
            blur={2.8}
            far={4}
            resolution={256}
            frames={1}
            color="#5a4636"
          />
          <ZoomApplier min={minZoom} max={maxZoom} />
        </>
      )}

      {controls !== "none" && (
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          enableZoom={enableZoom}
          zoomSpeed={0.6}
          rotateSpeed={0.55}
          enableDamping
          dampingFactor={0.12}
          autoRotate={controls === "spin"}
          autoRotateSpeed={1.1}
          minPolarAngle={minPolar}
          maxPolarAngle={maxPolar}
          minAzimuthAngle={azimuth != null ? -azimuth : -Infinity}
          maxAzimuthAngle={azimuth != null ? azimuth : Infinity}
          minZoom={minZoom}
          maxZoom={maxZoom}
        />
      )}
    </Canvas>
  );
}
