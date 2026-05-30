"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
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

function WebGLContextGuard() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      if (
        canvas.isConnected &&
        canvas.clientWidth > 0 &&
        canvas.clientHeight > 0
      ) {
        e.preventDefault();
      }
    };
    const onRestored = () => {
      const p = canvas.parentElement;
      if (p) {
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        gl.setSize(p.clientWidth, p.clientHeight, false);
      }
      window.dispatchEvent(new Event("resize"));
    };

    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
    };
  }, [gl]);

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
      dpr={[1, 1.25]}
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
      camera={camera}
      style={{ touchAction: "none" }}
    >
      <WebGLContextGuard />
      {/* low-poly cartoon lighting: a strong warm key sculpts the facets,
          a soft cool fill keeps shadows from going muddy, warm back rim. */}
      <hemisphereLight args={["#fff4e6", "#dfcbb0", 0.66]} />
      <ambientLight intensity={0.28} color="#fff3e4" />
      <directionalLight position={[7, 12, 8]} intensity={2.0} color="#fff1d8" />
      <directionalLight position={[-8, 6, -3]} intensity={0.5} color="#cdd8f2" />
      <directionalLight position={[1, 3, -9]} intensity={0.35} color="#ffd6c0" />

      <Suspense fallback={null}>{children}</Suspense>

      {orthographic && <ZoomApplier min={minZoom} max={maxZoom} />}

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
