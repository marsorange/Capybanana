import * as THREE from "three";

export const INK = "#3a2e2a";

// ---------------------------------------------------------------------------
// "Tiny-planet" bend — one shared uniform object referenced by EVERY material,
// so a single update curls the whole scene (Abeto's world-bending trick, scoped
// to taste). strength 0 = perfectly flat (portrait turntables); the home scene
// dials in a subtle curl. The vertex shader pulls each vertex's world Y down by
// the squared horizontal distance from `center`, so geometry near the island
// middle (where the pet walks) barely moves while the edges droop into a little
// planet. VISUAL-only displacement; the pet walks on the flat un-bent middle
// (plain Three.js math), so the look and the navigation never disagree.
export const sceneBend = {
  strength: { value: 0 },
  center: { value: new THREE.Vector3(0, 0, 0) },
  falloff: { value: 0.05 },
};

// ---------------------------------------------------------------------------
// SOFT "Abeto" material factory (was a hard 4-band cel toon — see git history).
//
// The cozy, premium-feeling low-poly look does NOT come from cel banding; it
// comes from SOFT, matte, environment-lit shading + ambient occlusion (added in
// PostFX) + a warm grade. So this mints a matte `MeshStandardMaterial`:
//   • roughness ≈ 0.92, metalness 0  → soft clay/felt diffuse falloff (no specular
//     glints), so a single directional + hemi/IBL reads as gentle gradient light
//     instead of a flat poster.
//   • flatShading kept (the chunky LEGO-block facets are the project's identity);
//     the SOFTNESS comes from the lighting model, not from smooth normals — which
//     the low geometry can't carry anyway.
//   • the Fresnel rim is OPT-IN (default 0): on flat-shaded geometry whole facets
//     catch it at grazing angles, which reads as a thick white border around the
//     island/house silhouette instead of a subtle edge glow. Pass `rim` explicitly
//     for the rare mesh that wants the toy pop.
//
// Built in TS (not as a JSX <meshStandardMaterial>) on purpose: R3F's generated
// props choke on `flatShading`, and minting one material per mesh would throw away
// program/material sharing. Reach for it via
// `<primitive object={toonMaterial(color)} attach="material" />` so N same-colored
// meshes share ONE compiled material.
interface ToonOpts {
  emissive?: string;
  emissiveIntensity?: number;
  // Rim light strength. Default 0 (off) — see the factory note above.
  rim?: number;
  // Opt OUT of the shared "tiny-planet" bend. Default true (curls with the
  // scene). The home cottage sets this false so its rigid structure stands
  // straight while the island ground domes around it.
  bend?: boolean;
  // Render side. Default FrontSide; the domed grass disc uses DoubleSide so its
  // hand-built ring geometry shows regardless of triangle winding.
  side?: THREE.Side;
  // Surface roughness. Default 0.92 (matte clay). Lower → a touch of sheen.
  roughness?: number;
  // Flat facets (default true). Pass false for organic forms you'd rather have
  // smoothly shaded.
  flat?: boolean;
}

const toonCache = new Map<string, THREE.MeshStandardMaterial>();

export function toonMaterial(hex: string, opts: ToonOpts = {}): THREE.MeshStandardMaterial {
  const rim = opts.rim ?? 0;
  const bend = opts.bend ?? true;
  const side = opts.side ?? THREE.FrontSide;
  const rough = opts.roughness ?? 0.92;
  const flat = opts.flat ?? true;
  const key = `${hex}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? 0}|${rim}|${bend}|${side}|${rough}|${flat}`;
  let mat = toonCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: rough,
      metalness: 0,
      side,
    });
    // three's TS types omit `flatShading` on the material constructor options even
    // though the renderer honors it; a narrow cast keeps the chunky faceted look.
    (mat as unknown as { flatShading: boolean }).flatShading = flat;
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    applySoftShaderPatch(mat, rim, bend);
    toonCache.set(key, mat);
  }
  return mat;
}

// The shared Fresnel rim + planet-bend injection. Applied to EVERY material
// (procedural meshes and converted GLB materials alike) so the edge glow and the
// home bend read consistently across the whole scene. Materials that want
// neither (rim 0 + bend false) stay completely stock — cheapest shader.
function applySoftShaderPatch(mat: THREE.MeshStandardMaterial, rim: number, bend = true) {
  if (rim <= 0 && !bend) return;
  mat.onBeforeCompile = (shader) => {
    // Vertex: curl world-space Y down by horizontal distance² from center. We
    // re-derive mvPosition/gl_Position here; the stock `vViewPosition = -
    // mvPosition.xyz;` line that follows still picks up our bent mvPosition.
    // `transformed` already includes skinning, so this works for SkinnedMesh too.
    // Skipped entirely for bend-exempt materials (the rigid cottage) so they
    // stand straight while the ground domes around them.
    if (bend) {
      shader.uniforms.uBendStrength = sceneBend.strength;
      shader.uniforms.uBendCenter = sceneBend.center;
      shader.uniforms.uBendFalloff = sceneBend.falloff;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uBendStrength;
           uniform vec3 uBendCenter;
           uniform float uBendFalloff;`,
        )
        .replace(
          "#include <project_vertex>",
          `vec4 worldPos = modelMatrix * vec4( transformed, 1.0 );
           vec2 bendDelta = worldPos.xz - uBendCenter.xz;
           worldPos.y -= dot( bendDelta, bendDelta ) * uBendFalloff * uBendStrength;
           vec4 mvPosition = viewMatrix * worldPos;
           gl_Position = projectionMatrix * mvPosition;`,
        );
    }

    // Fragment: add a soft Fresnel rim toward white at grazing angles (opt-in).
    if (rim > 0) {
      shader.uniforms.uRim = { value: rim };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n uniform float uRim;`)
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           float rimFres = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 3.0 );
           gl_FragColor.rgb += rimFres * uRim * 0.3;`,
        );
    }
  };
}

// Convert a GLTF-authored standard material into our soft look while KEEPING its
// authored baseColor / map / emissive. This is the key to a rigged multi-material
// model staying multi-colored instead of being flattened to a single tint. (The
// GLB pipeline is currently disabled; kept compatible for when it returns.)
export function toonFromStandard(
  src: THREE.MeshStandardMaterial,
  opts: { rim?: number; flat?: boolean } = {},
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: src.color,
    map: src.map ?? null,
    roughness: src.roughness ?? 0.92,
    metalness: 0,
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
  applySoftShaderPatch(mat, opts.rim ?? 0);
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
