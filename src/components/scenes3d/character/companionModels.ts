import type { CompanionType } from "@/game/types";

// Which species have a real 3D asset yet. Listed species load their GLB via the
// CharacterModel GLTF path; everything else falls back to the procedural body in
// CharacterModel.tsx. This is data, not a file-registry — adding a species here
// is the ONLY change needed to bring its asset online (props stay identical).
//
// Runtime GLBs MUST live in /public (Next serves it statically); src/asset/3D is
// the source-of-truth copy but is bundler-only and not fetchable at runtime.
// Master switch for the whole GLB pipeline. While false, CharacterModel never
// imports/loads any GLB and the Draco decoder is never fetched.
export const GLB_PIPELINE_ENABLED: boolean = true;

export const COMPANION_MODELS: Partial<Record<CompanionType, string>> = {
  // Rigged low-poly capybara (Blender export): 11-bone CapybaraRig, three clips
  // (Idle / Walk / Jump, in-place — no root motion), four authored baseColor
  // materials (body/brown/green/eye, no textures), faces +z = project forward.
  // GltfCharacter keeps the authored colors and plays the model's own clips.
  // Source copy: src/asset/3D/low-poly bear 3d model2.glb.
  capybara: "/models/Capybara.glb",
  // The old Capybanana.glb stays parked in public/models/ — its Tripo rig
  // export has an exploded bind pose (pieces float apart).
};

// Vendored Draco decoder (public/draco). Harmless for uncompressed GLBs — the
// loader only fetches the decoder when a mesh actually uses KHR_draco; it lets
// future compressed Tripo exports load without a code change.
export const COMPANION_DRACO_PATH = "/draco/";

// Tripo exports are unit-normalized + origin-centered. We rescale each loaded
// model to this height and seat its feet on the ground so it matches the
// procedural body's framing regardless of the source's native scale.
export const COMPANION_TARGET_HEIGHT = 1.45;
