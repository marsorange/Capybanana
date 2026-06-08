"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { sceneBend } from "./materials";
import SkyWeather, { type Weather } from "./SkyWeather";
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
  // Opt into the dynamic SUN + WEATHER light system. Replaces the static lights;
  // the home diorama uses it.
  sky?: boolean;
  weather?: Weather;
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
  // Device-pixel-ratio cap for the renderer's framebuffer. Memory scales with
  // dpr², so heavy scenes (the home diorama) pass [1, 1] to halve framebuffer
  // pressure on retina phones — a key lever against WebGL context loss.
  dpr?: number | [number, number];
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

// Flag meshes for shadowing (for the first ~1s, to catch async/Suspense-mounted
// meshes) so sunlight reads without hand-flagging every mesh. The discipline
// that keeps this cheap: EVERY mesh casts (a low-poly prop's depth pass is
// trivial), but only BIG meshes RECEIVE — receiving means per-fragment shadow
// sampling in the main pass, so letting hundreds of tiny flowers/pebbles sample
// the map is pure waste. The island, floors, walls and house roof (the surfaces
// you actually see a shadow fall on) clear the size gate; confetti props don't.
const RECEIVE_MIN_RADIUS = 1.2;
function ShadowEnabler() {
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current > 60) return;
    frames.current += 1;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const geo = mesh.geometry;
      if (geo && !geo.boundingSphere) geo.computeBoundingSphere();
      mesh.receiveShadow = (geo?.boundingSphere?.radius ?? 0) >= RECEIVE_MIN_RADIUS;
    });
  });
  return null;
}

function WebGLContextGuard({ onLoss }: { onLoss?: () => void }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      if (
        canvas.isConnected &&
        canvas.clientWidth > 0 &&
        canvas.clientHeight > 0
      ) {
        // Allow R3F to rebuild the renderer for a transient loss…
        e.preventDefault();
        // …but report it so SceneCanvas can break a recover→lose→recover spiral
        // (a too-heavy scene that re-exhausts the GPU the instant it restores).
        onLoss?.();
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
  }, [gl, onLoss]);

  return null;
}

// If the GPU drops the context this many times within the window, stop trying to
// auto-recover (which just burns battery in a render→lose→render loop) and show
// a tap-to-reload card instead.
const LOSS_LIMIT = 4;
const LOSS_WINDOW_MS = 12000;

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
  sky = false,
  weather = "clear",
  physics = false,
  gravity = [0, -9.81, 0],
  debugPhysics = false,
  bendStrength = 0,
  bendCenter = FLAT_CENTER,
  bendFalloff = 0.05,
  dpr = [1, 1.25],
  className,
}: SceneCanvasProps) {
  // Context-loss spiral breaker: count recover-attempted losses; once they pile
  // up in a short window, give up auto-recovery and show a reload card. Remount
  // (key bump) gives a fully fresh context when the user taps reload.
  const [instanceKey, setInstanceKey] = useState(0);
  const [dead, setDead] = useState(false);
  const lossTimes = useRef<number[]>([]);

  const handleContextLoss = useCallback(() => {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    lossTimes.current = lossTimes.current.filter((t) => now - t < LOSS_WINDOW_MS);
    lossTimes.current.push(now);
    if (lossTimes.current.length >= LOSS_LIMIT) {
      lossTimes.current = [];
      setDead(true);
    }
  }, []);

  if (dead) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center ${className ?? ""}`}
      >
        <div className="text-5xl">🪫</div>
        <p className="font-hand text-xl text-ink">小岛歇了一会儿</p>
        <p className="text-sm text-ink-soft">画面有点忙不过来，点一下让它重新载入。</p>
        <button
          onClick={() => {
            setDead(false);
            setInstanceKey((k) => k + 1);
          }}
          className="sticker rounded-sticker bg-accent px-6 py-3 text-paper"
        >
          重新载入
        </button>
      </div>
    );
  }

  const camera = orthographic
    ? { position: cameraPosition, zoom, near: 0.1, far: 200 }
    : { position: cameraPosition, fov: 38, near: 0.1, far: 200 };

  return (
    <Canvas
      key={instanceKey}
      className={className}
      orthographic={orthographic}
      // PCF (not soft/PCFSoft) — crisp enough for low-poly, far cheaper. The
      // sun's own shadow params (1024 map + tight frustum) live in SkyWeather /
      // the static directional below.
      shadows={sun ? "percentage" : false}
      dpr={dpr}
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
      camera={camera}
      style={{ touchAction: "none" }}
    >
      <WebGLContextGuard onLoss={handleContextLoss} />
      <BendApplier strength={bendStrength} center={bendCenter} falloff={bendFalloff} />
      {sun && <ShadowEnabler />}
      {sky ? (
        <>
          {/* fixed sun + fill lights; casts a real (disciplined) shadow when the
              scene opts into `sun` */}
          <SkyWeather weather={weather} castShadow={sun} />
          {/* soft contact shadows (小阴影) under the ground-level objects — adds
              grounding/depth without darkening the bright scene. far is low so it
              only catches the pet + furniture + yard props, not the whole house.
              When the real sun shadow is on, this drops to a faint AO so the two
              don't stack into a muddy blob. */}
          <ContactShadows
            position={[-0.6, 0.07, -1.0]}
            scale={17}
            resolution={256}
            blur={2.6}
            far={1.7}
            opacity={sun ? 0.16 : 0.32}
            color="#8a6a48"
          />
        </>
      ) : (
        <>
          {/* static warm "日系" low-poly light (the portrait turntables) */}
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
        </>
      )}

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
