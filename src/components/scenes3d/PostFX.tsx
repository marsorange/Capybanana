"use client";

// Mobile-tuned post-processing — the "Abeto" polish layer.
//
// The single biggest quality lever for low-poly is AMBIENT OCCLUSION: soft, warm
// darkening in every crevice/contact, which makes a chunky toy scene read as rich
// and grounded instead of flat. On top we add ACES tone-mapping (a warm, cohesive
// filmic grade), a small saturation lift, a gentle bloom on the emissive
// lamps/glowing windows, and cheap SMAA edge AA (the EffectComposer bypasses the
// canvas MSAA).
//
// Deliberately NO vignette: the canvas is transparent over a cream page, so a
// vignette would darken the cream corners rather than the scene.
//
// Tuned for mobile-first + the project's WebGL context-loss budget: HALF-RES AO,
// low sample preset, no normal pass, no multisampling. SceneCanvas drops this whole
// pass on the first context loss (graceful degrade) before it ever shows the
// reload card — so the heavy path can never spiral the GPU.
//
// `tiltShift`: the miniature-toy blur, for the home diorama. Portrait turntables
// (a single centered character) pass false — AO + grade only, no blur.
import type { ReactElement } from "react";
import {
  Bloom,
  EffectComposer,
  HueSaturation,
  N8AO,
  SMAA,
  TiltShift2,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

export default function PostFX({ tiltShift = true }: { tiltShift?: boolean }) {
  const effects: (ReactElement | false)[] = [
    // ambient occlusion — the star: soft warm darkening where forms meet.
    // half-res + low preset keeps it phone-friendly; depth-aware upsampling
    // keeps the half-res result from looking blocky.
    <N8AO
      key="ao"
      halfRes
      quality="low"
      aoRadius={1.1}
      distanceFalloff={1.0}
      intensity={2.4}
      depthAwareUpsampling
      color="#2a2018"
    />,
    // gentle glow on the brightest bits only (emissive lamps / lit windows).
    // Threshold must clear the SUNLIT near-white cottage walls/roofline — at
    // 0.85 the whole wall-top bloomed into a white halo around the house.
    <Bloom
      key="bloom"
      mipmapBlur
      intensity={0.25}
      luminanceThreshold={1.0}
      luminanceSmoothing={0.15}
      radius={0.6}
    />,
    // warm filmic grade + a small saturation lift for cozy, richer color
    <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
    <HueSaturation key="sat" saturation={0.12} />,
    // tilt-shift "miniature toy" blur — a wide sharp band across the middle
    // (house + pet + veg bed stay crisp), blur only creeps onto the far island
    // rim and the very front edge. Screen-space + low samples = phone-cheap.
    // Kept LIGHT (0.07): at 0.16 the top/bottom of the diorama read as smeared.
    tiltShift && (
      <TiltShift2 key="tilt" blur={0.07} taper={0.7} samples={6} start={[0.0, 0.56]} end={[1.0, 0.56]} />
    ),
    // cheap edge AA, last
    <SMAA key="smaa" />,
  ];

  return (
    <EffectComposer
      multisampling={0} // composer bypasses canvas MSAA; SMAA does the AA cheaply
      enableNormalPass={false} // N8AO derives normals from depth — no extra pass
      stencilBuffer={false}
    >
      {effects.filter(Boolean) as ReactElement[]}
    </EffectComposer>
  );
}
