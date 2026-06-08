import * as THREE from "three";

export const INK = "#3a2e2a";

// Shared 4-step ramp that gives MeshToonMaterial its crisp cel shading.
let gradient: THREE.DataTexture | null = null;

export function getToonGradient(): THREE.DataTexture {
  if (!gradient) {
    const steps = 4;
    const data = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) {
      data[i] = Math.round((i / (steps - 1)) * 255);
    }
    const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    gradient = tex;
  }
  return gradient;
}

// ---------------------------------------------------------------------------
// "Tiny-planet" bend — one shared uniform object referenced by EVERY toon
// material, so a single update curls the whole scene (Abeto's world-bending
// trick, scoped to taste). strength 0 = perfectly flat (portrait turntables);
// the home scene dials in a subtle curl. The vertex shader pulls each vertex's
// world Y down by the squared horizontal distance from `center`, so geometry
// near the island middle (where the pet actually walks) barely moves while the
// edges droop into a little planet. This is a VISUAL-only displacement; the pet
// walks on the flat un-bent middle (its world position is plain Three.js math),
// so the look and the navigation never disagree where it matters.
export const sceneBend = {
  strength: { value: 0 },
  center: { value: new THREE.Vector3(0, 0, 0) },
  falloff: { value: 0.05 },
};

// ---------------------------------------------------------------------------
// Cached toon material factory. Crisp cel ramp + flat shading for the chunky
// low-poly look + a soft Fresnel rim that lifts silhouettes off the background
// (the "toy" pop) + the shared planet bend. Constructed in TS — NOT as a
// <meshToonMaterial> JSX element — on purpose: R3F's generated props for
// meshToonMaterial choke on `flatShading`, and minting one material per mesh
// would throw away program/material sharing. Reach for this via
// `<primitive object={toonMaterial(color)} attach="material" />` so N
// same-colored meshes share ONE compiled material (cheap to build, leaves GPU
// headroom for the physics step).
interface ToonOpts {
  emissive?: string;
  emissiveIntensity?: number;
  // Rim light strength (0 = off). Default gives a gentle edge glow.
  rim?: number;
  // Opt OUT of the shared "tiny-planet" bend. Default true (curls with the
  // scene). The home cottage sets this false so its rigid structure stands
  // straight while the island ground domes around it.
  bend?: boolean;
  // Render side. Default FrontSide; the domed grass disc uses DoubleSide so its
  // hand-built ring geometry shows regardless of triangle winding.
  side?: THREE.Side;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();

export function toonMaterial(hex: string, opts: ToonOpts = {}): THREE.MeshToonMaterial {
  const rim = opts.rim ?? 0.45;
  const bend = opts.bend ?? true;
  const side = opts.side ?? THREE.FrontSide;
  const key = `${hex}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? 0}|${rim}|${bend}|${side}`;
  let mat = toonCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color: hex, gradientMap: getToonGradient(), side });
    // three's TS types omit `flatShading` on MeshToonMaterial even though the
    // renderer honors it; a narrow cast keeps the chunky faceted low-poly look.
    (mat as unknown as { flatShading: boolean }).flatShading = true;
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
    }
    applyToonShaderPatch(mat, rim, bend);
    toonCache.set(key, mat);
  }
  return mat;
}

// The shared cel rim + planet-bend injection. Applied to EVERY toon material
// (procedural meshes and converted GLB materials alike) so the edge glow and the
// home bend read consistently across the whole scene.
function applyToonShaderPatch(mat: THREE.MeshToonMaterial, rim: number, bend = true) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: rim };

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

    // Fragment: add a soft Fresnel rim toward white at grazing angles.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n uniform float uRim;`)
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         float rimFres = pow( 1.0 - clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 ), 3.0 );
         gl_FragColor.rgb += rimFres * uRim * 0.32;`,
      );
  };
}

// Convert a GLTF-authored standard material into our toon look while KEEPING its
// authored baseColor / map / emissive. This is the key to a rigged multi-material
// model staying multi-colored instead of being flattened to a single tint.
export function toonFromStandard(
  src: THREE.MeshStandardMaterial,
  opts: { rim?: number; flat?: boolean } = {},
): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: src.color,
    map: src.map ?? null,
    gradientMap: getToonGradient(),
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
  // Flat shading by default keeps the chunky low-poly facets reading as cel.
  if (opts.flat ?? true) {
    (mat as unknown as { flatShading: boolean }).flatShading = true;
  }
  applyToonShaderPatch(mat, opts.rim ?? 0.45);
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
