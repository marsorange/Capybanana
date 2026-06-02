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

// Shared, cached flat-shaded material. Lambert (matte diffuse) gives the chunky
// low-poly toon look for cheaper than MeshStandardMaterial's PBR, and caching by
// color means N same-colored meshes share ONE material instance (fewer shader
// programs, less memory, faster scene build) — useful headroom now that the
// scene also runs a physics step each frame. New 3D should reach for this via
// `<mesh material={flatMaterial(color)}>` instead of minting a material per mesh.
const flatMaterialCache = new Map<string, THREE.MeshLambertMaterial>();

export function flatMaterial(hex: string): THREE.MeshLambertMaterial {
  let mat = flatMaterialCache.get(hex);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
    flatMaterialCache.set(hex, mat);
  }
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
