"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PrimaryButton } from "../ui/kit";
import SkyWeather, { type Weather } from "./SkyWeather";
import { zoomBus } from "./zoomBus";

// The render pipeline is deliberately PLAIN (2026-06-12 rework): toon materials
// (materials.ts) + a strong directional key + weak ambient fill, MSAA on the
// canvas, renderer-native ACES tone mapping (R3F's default), and NO
// EffectComposer. The old post-fx chain (N8AO/SMAA/TiltShift/grade) blurred
// scene RGB into zero-alpha pixels of this transparent canvas — premultiplied
// compositing then drew it as a white halo on every silhouette (the "白边"
// bug). One forward pass also makes this the cheapest the scene has ever been.

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
  // Device-pixel-ratio cap for the renderer's framebuffer. Memory scales with
  // dpr², so heavy scenes (the home diorama) pass [1, 1] to halve framebuffer
  // pressure on retina phones — a key lever against WebGL context loss.
  dpr?: number | [number, number];
  // Frame-rate ceiling. A cozy idle diorama doesn't need the display's native
  // refresh — on a 120Hz phone/laptop an uncapped loop burns 4× the CPU/GPU for
  // zero perceptible gain (the "CPU 发热" bug). 0 = uncapped.
  fpsCap?: number;
  className?: string;
}

// Caps rendering at `fps` by running the Canvas in frameloop="demand" and
// invalidating on our own rAF cadence. Delta-based animation (walker, mixers,
// orbit damping) advances by clock delta, so motion speed is unaffected. Bonus:
// rAF stops in background tabs, so a hidden island costs ~nothing.
function FpsLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last >= interval - 1) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
}

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
  dpr = [1, 1.25],
  fpsCap = 30,
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
        <div className="w-44">
          <PrimaryButton
            size="sm"
            onClick={() => {
              setDead(false);
              setInstanceKey((k) => k + 1);
            }}
          >
            重新载入
          </PrimaryButton>
        </div>
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
      // plain forward pipeline → the canvas's own MSAA is the AA.
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
      camera={camera}
      frameloop={fpsCap > 0 ? "demand" : "always"}
      style={{ touchAction: "none" }}
    >
      {fpsCap > 0 && <FpsLimiter fps={fpsCap} />}
      <WebGLContextGuard onLoss={handleContextLoss} />
      {sun && <ShadowEnabler />}
      {sky ? (
        <>
          {/* one strong sun + weak fills (toon-tuned, see SkyWeather); casts a
              real (disciplined) shadow when the scene opts into `sun` */}
          <SkyWeather weather={weather} castShadow={sun} />
          {/* soft contact shadows (小阴影) under the ground-level objects — adds
              grounding/depth without darkening the bright scene. far is low so it
              only catches the pet + furniture + yard props, not the whole house.
              ONLY when the real sun shadow is off: ContactShadows re-renders the
              whole scene from above EVERY frame, and with the sun grounding
              everything already, that pass was pure heat. */}
          {!sun && (
            <ContactShadows
              position={[-0.6, 0.07, -1.0]}
              scale={17}
              resolution={256}
              blur={2.6}
              far={1.7}
              opacity={0.32}
              color="#8a6a48"
            />
          )}
        </>
      ) : (
        <>
          {/* static turntable light, same recipe as the diorama: ONE strong warm
              key from high front-right so the toon bands read, a weak sky/ground
              hemisphere as ambient, and a faint cool fill so the dark band keeps
              a hint of form. (three's physical-light scale: ÷π ≈ the classic
              "key 1.2 / ambient 0.4" toon numbers.) */}
          <hemisphereLight args={["#fff6e4", "#d9c4a3", 1.15]} />
          <directionalLight
            position={[8, 12, 5]}
            intensity={2.6}
            color="#fff1d4"
            castShadow={sun}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={48}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-bias={-0.0011}
            shadow-normalBias={0.025}
          />
          <directionalLight position={[-7, 5, -3]} intensity={0.5} color="#cdddf2" />
        </>
      )}

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
