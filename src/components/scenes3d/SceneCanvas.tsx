"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import type { ReactNode } from "react";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneBend } from "./materials";
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
  sun?: boolean; // enable a real shadow-casting sun
  // Opt into a Rapier (Rust→WASM) physics world wrapping the scene content.
  // Only scenes with rigid bodies / colliders (the home scene) need this; the
  // portrait turntables stay non-physics.
  physics?: boolean;
  gravity?: [number, number, number];
  debugPhysics?: boolean; // draw collider wireframes while tuning
  // "Tiny-planet" curl of the shared toon materials. 0 = flat (the turntables);
  // the home diorama dials in a subtle curl so the island edges droop like a
  // little planet. See sceneBend in materials.ts.
  bendStrength?: number;
  bendCenter?: [number, number, number];
  bendFalloff?: number;
  className?: string;
}

// Drives the module-level bend uniforms from props and, crucially, resets the
// curl to flat on unmount — the toon materials are a shared cache, so without
// this a turntable mounted after the home scene would inherit its bend.
function BendApplier({
  strength,
  center,
  falloff,
}: {
  strength: number;
  center: [number, number, number];
  falloff: number;
}) {
  useEffect(() => {
    sceneBend.strength.value = strength;
    sceneBend.center.value.set(center[0], center[1], center[2]);
    sceneBend.falloff.value = falloff;
    return () => {
      sceneBend.strength.value = 0;
    };
  }, [strength, center, falloff]);
  return null;
}

// Stable default so SceneCanvas re-renders don't churn the BendApplier effect.
const FLAT_CENTER: [number, number, number] = [0, 0, 0];

function ZoomApplier({ min, max }: { min: number; max: number }) {
  // Read the camera from the per-frame state (not a hook return) so applying the
  // pinch-zoom from the bus stays a legitimate r3f imperative mutation.
  useFrame((state) => {
    if (zoomBus.factor === 1) return;
    const camera = state.camera;
    const next = THREE.MathUtils.clamp(camera.zoom * zoomBus.factor, min, max);
    zoomBus.factor = 1;
    if (next !== camera.zoom) {
      camera.zoom = next;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

// Flip every mesh in the scene to cast + receive shadows (for the first ~1.5s,
// to catch async/Suspense-mounted meshes) so sunlight reads without hand-
// flagging hundreds of meshes.
function ShadowEnabler() {
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 90) return;
    frames.current += 1;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
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
  sun = false,
  physics = false,
  gravity = [0, -9.81, 0],
  debugPhysics = false,
  bendStrength = 0,
  bendCenter = FLAT_CENTER,
  bendFalloff = 0.05,
  className,
}: SceneCanvasProps) {
  const camera = orthographic
    ? { position: cameraPosition, zoom, near: 0.1, far: 200 }
    : { position: cameraPosition, fov: 38, near: 0.1, far: 200 };

  return (
    <Canvas
      className={className}
      orthographic={orthographic}
      shadows={sun ? "soft" : false}
      dpr={[1, 1.25]}
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
      camera={camera}
      style={{ touchAction: "none" }}
    >
      <WebGLContextGuard />
      <BendApplier strength={bendStrength} center={bendCenter} falloff={bendFalloff} />
      {sun && <ShadowEnabler />}
      {/* warm "日系" low-poly light with real form: a softer sky fill + lower
          ambient so the directional SUN key actually sculpts the facets and lays
          down soft contact shadows (the depth the scene was missing). */}
      <hemisphereLight args={["#fffdf6", "#e7d8be", 0.72]} />
      <ambientLight intensity={0.32} color="#fff4e6" />
      <directionalLight
        position={[8, 12, 5]}
        intensity={sun ? 2.9 : 2.2}
        color="#ffeec6"
        castShadow={sun}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={48}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0011}
        shadow-normalBias={0.025}
      />
      {/* cool sky bounce + a warm back rim so shadowed faces still read */}
      <directionalLight position={[-7, 5, -3]} intensity={0.5} color="#cdddf2" />
      <directionalLight position={[-2, 3, -9]} intensity={0.32} color="#ffd9bc" />

      <Suspense fallback={null}>
        {physics ? (
          <Physics gravity={gravity} debug={debugPhysics}>
            {children}
          </Physics>
        ) : (
          children
        )}
      </Suspense>

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
