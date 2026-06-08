"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { flatMaterial } from "./materials";

// A small SUN + WEATHER system for the diorama. A directional "sun" arcs across
// the sky on a slow day cycle (warm at the horizons, brighter+whiter at noon),
// dragging the ambient/hemisphere fills with it; a drifting low-poly cloud layer
// sits on top. Deliberately self-contained: it OWNS the scene's lights when
// mounted, so SceneCanvas renders it instead of the static lights.
// Kept light on purpose — only sunshine ("clear") and overcast ("cloudy"); the
// sun does NOT cast real-time shadows (that was the home scene's biggest GPU
// cost + WebGL-context-loss trigger). Grounding comes from SceneCanvas's cheap
// ContactShadows instead.
export type Weather = "clear" | "cloudy";

const NOON = new THREE.Color("#fff4dc");
const HORIZON = new THREE.Color("#ff9b54");
const NIGHT = new THREE.Color("#5a6b9a");

// time-of-day t in [0,1): 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
function sunAt(t: number) {
  const dayPhase = (t - 0.25) / 0.5; // 0 at 6am → 1 at 6pm
  const inDay = dayPhase >= 0 && dayPhase <= 1;
  const elev = inDay ? Math.sin(dayPhase * Math.PI) : 0; // 0..1..0
  const az = (inDay ? dayPhase : 0.5) * Math.PI; // east → west
  const dir = new THREE.Vector3(
    Math.cos(az) * 12,
    elev * 12 + 2,
    5 + (1 - elev) * 3,
  );
  const warm = 1 - elev; // warmer toward the horizons
  const color = new THREE.Color().copy(NOON).lerp(HORIZON, warm * 0.35);
  if (!inDay) color.copy(NIGHT);
  // Soft high sun: enough direction for low-poly facets, but not so hot that
  // the cream walls and sky art wash out.
  const intensity = inDay ? 1.45 + elev * 0.42 : 0.62;
  return { dir, color, intensity, elev, inDay };
}

function Cloud({ scale }: { scale: number }) {
  const mat = flatMaterial("#fefdfa");
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 0.8],
    [0.7, 0.04, 0.1, 0.58],
    [-0.62, 0.02, -0.08, 0.54],
    [0.18, 0.24, -0.05, 0.5],
    [-0.2, 0.18, 0.12, 0.46],
  ];
  return (
    <group scale={scale}>
      {puffs.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={mat} scale={[1.3, 0.8, 1]}>
          <icosahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function Clouds({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const s = Math.sin(i * 53.7) * 1000;
        const r = (n: number) => {
          const v = Math.sin(i * 12.9 + n) * 4375.85;
          return v - Math.floor(v);
        };
        return {
          x: (r(1) - 0.5) * 26,
          y: 11.5 + r(2) * 3.5, // up in the sky, clear of the house
          z: -3 - r(3) * 10, // set back behind the diorama
          scale: 0.95 + r(4) * 1.05,
          speed: 0.15 + r(5) * 0.2,
          phase: s - Math.floor(s),
        };
      }),
    [count],
  );
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.position.x += data[i].speed * dt;
      if (c.position.x > 14) c.position.x = -14;
    });
  });
  return (
    <group ref={group}>
      {data.map((d, i) => (
        <group key={i} position={[d.x, d.y, d.z]}>
          <Cloud scale={d.scale} />
        </group>
      ))}
    </group>
  );
}

export default function SkyWeather({
  weather = "clear",
  speed = 0,
  start = 0.47,
}: {
  weather?: Weather;
  speed?: number; // day fraction per second. Home defaults to fixed noon.
  start?: number; // initial time-of-day (0.47 = soft late morning)
}) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const t = useRef(start);
  const wDim = weather === "clear" ? 1 : 0.8;
  const clouds = weather === "clear" ? 4 : 8;

  useFrame((_, dt) => {
    t.current = (t.current + dt * speed) % 1;
    const s = sunAt(t.current);
    if (sun.current) {
      sun.current.position.copy(s.dir);
      sun.current.color.copy(s.color);
      sun.current.intensity = s.intensity * wDim;
    }
    if (amb.current)
      amb.current.intensity = (0.34 + s.elev * 0.08) * (weather === "cloudy" ? 1.1 : 1);
    if (hemi.current) hemi.current.intensity = (0.46 + s.elev * 0.12) * wDim;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#fffdfa", "#eadbbd", 0.54]} />
      <ambientLight ref={amb} intensity={0.4} color="#fff7ee" />
      {/* day-cycle sun — lights only, no real-time shadow map (see file header) */}
      <directionalLight
        ref={sun}
        position={[8, 12, 5]}
        intensity={1.86}
        color="#fff1d2"
      />
      {/* cool sky bounce so shadowed faces still read */}
      <directionalLight position={[-7, 5, -3]} intensity={0.36} color="#d7e5f8" />
      <Clouds count={clouds} />
    </>
  );
}
