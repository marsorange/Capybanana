import * as THREE from "three";

export const INK = "#3a2e2a";

// ---------------------------------------------------------------------------
// TOON material factory — the project's one shading model (2026-06-12 rework).
//
// History: hard 4-band cel → soft matte PBR ("Abeto 软风", MeshStandardMaterial
// + baked IBL + a post-fx chain). The post pipeline (TiltShift blur / SMAA /
// grade in an EffectComposer) kept bleeding scene RGB into zero-alpha pixels of
// the transparent canvas — the browser's premultiplied compositing reads that
// as a white halo hugging every silhouette (the recurring "白边" bug). So the
// whole PBR + post stack is gone; the look now comes from the material itself:
//
//   • `MeshToonMaterial` + a 3-step gradientMap → stepped light/shadow bands.
//   • `flatShading: true` → each low-poly facet lands whole in one band; the
//     chunky faceted look IS the project's identity.
//   • Lighting (SceneCanvas/SkyWeather): ONE strong directional key + weak
//     ambient fill, so the bands actually read.
//
// No onBeforeCompile patches anymore (the Fresnel rim and the tiny-planet bend
// are both gone — every caller had bend strength 0, and rim was a white-edge
// source of its own) — every material is a 100% stock toon shader, the
// cheapest lit program three ships. If the tiny-planet curl ever returns, do
// it with real hemisphere ground geometry, not a shader patch.
//
// Built in TS (not as a JSX <meshToonMaterial>) on purpose: R3F's generated
// props choke on `flatShading`, and minting one material per mesh would throw
// away program/material sharing. Reach for it via
// `<primitive object={toonMaterial(color)} attach="material" />` so N
// same-colored meshes share ONE compiled material.

// Shared "soft cel" ramp. A hard 3-band NearestFilter ramp collapsed every
// facet into one of three flat tones — graphic, but it read as FLAT (the
// "缺质感" feedback). This shaped 32px LinearFilter ramp keeps the toon
// identity at the terminator while giving the low-poly facets tonal richness:
//   • shadow zone (dotNL < ≈-0.15): near-flat plateau ≈ 0.42 — shadows stay
//     calm and posterized, the hemisphere light tints them warm.
//   • terminator (dotNL ≈ 0): a steep knee — the crisp light/shadow break that
//     says "cel", just antialiased instead of a razor texel edge.
//   • lit zone: a gentle 0.78 → 1.0 slope — with flatShading each facet holds
//     one constant tone, so this is what spreads the sun-side facets across
//     many close tones instead of one big flat field. That per-facet variety
//     IS the low-poly "质感"; it costs nothing (same one texture fetch).
const gradientMap = (() => {
  const W = 32;
  const data = new Uint8Array(W);
  for (let i = 0; i < W; i++) {
    const t = i / (W - 1); // 0..1 ≈ dotNL -1..+1 (three samples at dotNL*0.5+0.5)
    let v: number;
    if (t < 0.42) v = 105 + (t / 0.42) * 12;
    else if (t < 0.56) v = 117 + ((t - 0.42) / 0.14) * 82;
    else v = 199 + ((t - 0.56) / 0.44) * 56;
    data[i] = Math.round(v);
  }
  const tex = new THREE.DataTexture(data, W, 1, THREE.RedFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

interface ToonOpts {
  emissive?: string;
  emissiveIntensity?: number;
  // Render side. Default FrontSide; the domed grass disc uses DoubleSide so its
  // hand-built ring geometry shows regardless of triangle winding.
  side?: THREE.Side;
  // Flat facets (default true). Pass false for organic forms you'd rather have
  // smoothly shaded.
  flat?: boolean;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();

export function toonMaterial(hex: string, opts: ToonOpts = {}): THREE.MeshToonMaterial {
  const side = opts.side ?? THREE.FrontSide;
  const flat = opts.flat ?? true;
  const key = `${hex}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? 0}|${side}|${flat}`;
  let mat = toonCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color: hex, gradientMap, side });
    // three's TS types omit `flatShading` on the toon constructor options even
    // though the renderer honors it; a narrow cast keeps the faceted look.
    (mat as unknown as { flatShading: boolean }).flatShading = flat;
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    toonCache.set(key, mat);
  }
  return mat;
}

// Convert a GLTF-authored material into the toon look while KEEPING its
// authored baseColor / map / emissive. This is the key to a rigged
// multi-material model staying multi-colored instead of being flattened to a
// single tint. Used by GltfCharacter on every mesh of a loaded GLB.
export function toonFromStandard(
  src: THREE.MeshStandardMaterial,
  opts: { flat?: boolean } = {},
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: src.color,
    map: src.map ?? null,
    gradientMap,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
    side: src.side,
  });
  mat.name = src.name;
  if (src.emissive) {
    mat.emissive = src.emissive.clone();
    mat.emissiveMap = src.emissiveMap ?? null;
    mat.emissiveIntensity = src.emissiveIntensity;
  }
  // Flat shading by default keeps the chunky low-poly facets reading cleanly.
  (mat as unknown as { flatShading: boolean }).flatShading = opts.flat ?? true;
  return mat;
}

export function lightenColor(hex: string, amt: number): string {
  return new THREE.Color(hex)
    .lerp(new THREE.Color("#ffffff"), amt)
    .getStyle();
}

export function darkenColor(hex: string, amt: number): string {
  return new THREE.Color(hex)
    .lerp(new THREE.Color("#2a211d"), amt)
    .getStyle();
}
