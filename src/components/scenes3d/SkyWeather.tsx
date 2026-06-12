"use client";

import * as THREE from "three";

// A small fixed SUN + WEATHER light rig for the diorama. It owns the scene's
// lights when mounted, so SceneCanvas renders it instead of the static lights.
// Kept light on purpose — only sunshine ("clear") and overcast ("cloudy").
//
// TOON TUNING (2026-06-12): the materials are MeshToonMaterial with a stepped
// gradient ramp, so the recipe is ONE strong directional key + weak ambient.
// The key:ambient ratio (~2.5:1) is what makes the light/shadow bands read as
// crisp low-poly facets; the old PBR-era stack (big hemi + big ambient + sun)
// flattened the ramp to a single washed band. Intensities are on three's
// physical-light scale (÷π ≈ the classic "sun 1.2 / ambient 0.45" numbers).
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
  return { dir, color, elev, inDay };
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
  // STRONG key: the toon ramp's lit band comes almost entirely from the sun, so
  // overcast softens it instead of dimming the whole scene.
  const sunIntensity = (s.inDay ? 2.6 + s.elev * 0.5 : 0.9) * (clear ? 1 : 0.62);
  // WEAK ambient: a sky/ground hemisphere (cool above, warm bounce below) keeps
  // the shadow band colorful instead of black, but stays low so the bands show.
  const hemiIntensity = clear ? 1.05 : 1.35;

  return (
    <>
      <hemisphereLight args={["#fdf3e0", "#d9c2a0", hemiIntensity]} />
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
      {/* faint cool sky bounce from the back-left so the dark band keeps a hint
          of form on the shaded side of the house/forest */}
      <directionalLight
        position={[-7, 5, -3]}
        intensity={clear ? 0.45 : 0.55}
        color="#d7e5f8"
      />
    </>
  );
}
