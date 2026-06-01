import type { CompanionType } from "@/game/types";
import CreatureModel from "./CreatureModel";

// Per-species 3D model registry. Until each roster character's own 3D asset is
// generated (from the reference art in src/asset/Character/*.png), every entry
// points at the shared low-poly placeholder. To slot in a real model, drop the
// new component file in this folder and replace that species' entry here — the
// rest of the app keeps rendering through <Character3D>, so nothing else changes.
export type CharacterModelComponent = typeof CreatureModel;

export const SPECIES_MODELS: Record<CompanionType, CharacterModelComponent> = {
  capybara: CreatureModel,
  rabbit: CreatureModel,
  duck: CreatureModel,
  raccoon: CreatureModel,
  shiba: CreatureModel,
  sheep: CreatureModel,
};
