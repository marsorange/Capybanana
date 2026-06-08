"use client";

import * as THREE from "three";

// A small fixed SUN + WEATHER light rig for the diorama. It owns the scene's
// lights when mounted, so SceneCanvas renders it instead of the static lights.
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

export default function SkyWeather({
  weather = "clear",
  start = 0.47,
}: {
  weather?: Weather;
  speed?: number; // retained for API compatibility; the home light is fixed.
  start?: number; // initial time-of-day (0.47 = soft late morning)
}) {
  const s = sunAt(start);
  const wDim = weather === "clear" ? 1 : 0.8;
  const ambientIntensity = (0.34 + s.elev * 0.08) * (weather === "cloudy" ? 1.1 : 1);
  const hemiIntensity = (0.46 + s.elev * 0.12) * wDim;

  return (
    <>
      <hemisphereLight args={["#fffdfa", "#eadbbd", hemiIntensity]} />
      <ambientLight intensity={ambientIntensity} color="#fff7ee" />
      {/* fixed sun — lights only, no real-time shadow map (see file header) */}
      <directionalLight
        position={[s.dir.x, s.dir.y, s.dir.z]}
        intensity={s.intensity * wDim}
        color={s.color}
      />
      {/* cool sky bounce so shadowed faces still read */}
      <directionalLight position={[-7, 5, -3]} intensity={0.36} color="#d7e5f8" />
    </>
  );
}
