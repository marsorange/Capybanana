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
