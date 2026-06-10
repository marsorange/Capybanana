"use client";

import * as THREE from "three";

// A small fixed SUN + WEATHER light rig for the diorama. It owns the scene's
// lights when mounted, so SceneCanvas renders it instead of the static lights.
// Kept light on purpose — only sunshine ("clear") and overcast ("cloudy").
//
// SHADOWS: off by default. When `castShadow` is on, the ONE sun casts a real
// shadow with a DISCIPLINED budget — a small 1024 map, a frustum tightened to
// just the island (so a small map still reads crisp), and PCF (not soft) on the
// Canvas. The 2026-06-08 context-loss spiral came from the opposite of all that
// (2048 map + soft filter + EVERY mesh flagged castShadow, stacked on Rapier);
// "reliable shadows" is a budget question, not a Three.js-version one. With the
// sun off, grounding still comes from SceneCanvas's cheap ContactShadows.
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
  start = 0.38,
  castShadow = false,
}: {
  weather?: Weather;
  speed?: number; // retained for API compatibility; the home light is fixed.
  start?: number; // initial time-of-day (0.38 = a 45°-elevation morning sun that
  //                  rakes in from the front-right and lights the cutaway interior)
  castShadow?: boolean; // let the ONE sun cast a real (disciplined) shadow
}) {
  const s = sunAt(start);
  const clear = weather === "clear";
  const wDim = clear ? 1 : 0.8;
  // Bright, high-key sunny fill: generous ambient + hemi so nothing (esp. the
  // big ground and the cutaway interior) crushes to a murky dark, while the 45°
  // directional SUN adds a warm raking highlight + a soft cast shadow on top.
  // (The scene was reading dim before — a cozy 治愈 cartoon wants bright +
  // saturated, not dark + contrasty, so the fill is dialed up here.)
  const ambientIntensity = (clear ? 0.62 : 0.7) + s.elev * 0.05;
  const hemiIntensity = (clear ? 0.68 : 0.74) * wDim;
  // Sun stays the key light, kept strong so the 45° rake reads, but balanced
  // against the brighter fill so the cream walls / grass don't blow to white.
  const sunIntensity = s.intensity * wDim * (clear ? 1.15 : 0.9);

  return (
    <>
      <hemisphereLight args={["#fffdfa", "#eadbbd", hemiIntensity]} />
      <ambientLight intensity={ambientIntensity} color="#fff7ee" />
      {/* fixed sun — the scene's key light, and (opt-in) the only shadow caster.
          Shadow budget kept tight on purpose: 1024 map + a frustum hugging the
          island so texel density stays high without a big map. PCF vs soft is
          chosen on the Canvas (SceneCanvas shadows="percentage"). */}
      <directionalLight
        position={[s.dir.x, s.dir.y, s.dir.z]}
        intensity={sunIntensity}
        color={s.color}
        castShadow={castShadow}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={46}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />
      {/* cool sky bounce so shadowed faces still read — lifted a touch so the
          back-lit walls + forest never go murky */}
      <directionalLight
        position={[-7, 5, -3]}
        intensity={clear ? 0.34 : 0.44}
        color="#d7e5f8"
      />
    </>
  );
}
