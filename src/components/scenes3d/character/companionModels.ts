import type { CompanionType } from "@/game/types";

// Which species have a real 3D asset yet. Listed species load their GLB via the
// CharacterModel GLTF path; everything else falls back to the procedural body in
// CharacterModel.tsx. This is data, not a file-registry — adding a species here
// is the ONLY change needed to bring its asset online (props stay identical).
//
// Runtime GLBs MUST live in /public (Next serves it statically); src/asset/3D is
// the source-of-truth copy but is bundler-only and not fetchable at runtime.
// Master switch for the whole GLB pipeline. OFF for now — real 3D assets aren't
// ready (the Tripo rig export explodes), so the protagonist stays on the
// procedural body. While false, CharacterModel never imports/loads any GLB and
// the Draco decoder is never fetched. Flip to true (and list a species below)
// to bring the pipeline back online.
export const GLB_PIPELINE_ENABLED: boolean = false;

export const COMPANION_MODELS: Partial<Record<CompanionType, string>> = {
  // capybara is on the PROCEDURAL body for now — the current Tripo rig export
  // has an exploded bind pose (pieces float apart; idle/walk don't assemble
  // them). The whole GLB path stays wired and the asset stays in public/models/;
  // re-enable with one line once a fixed (assembled) export is dropped in:
  // capybara: "/models/Capybanana.glb",
};

// Vendored Draco decoder (public/draco). Harmless for uncompressed GLBs — the
// loader only fetches the decoder when a mesh actually uses KHR_draco; it lets
// future compressed Tripo exports load without a code change.
export const COMPANION_DRACO_PATH = "/draco/";

// Tripo exports are unit-normalized + origin-centered. We rescale each loaded
// model to this height and seat its feet on the ground so it matches the
// procedural body's framing regardless of the source's native scale.
export const COMPANION_TARGET_HEIGHT = 1.45;
