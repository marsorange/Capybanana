"use client";

import { normalizeSpecies } from "@/game/characters";
import type { Accessory, CompanionType } from "@/game/types";
import { SPECIES_MODELS } from "./models";

// Public entry point for rendering the protagonist. It resolves the species to
// its registered 3D model and renders it — every call site (home roaming,
// profile, create, result) goes through here, so swapping a species' real 3D
// asset in `models.ts` instantly updates the whole app.
export interface Character3DProps {
  type: CompanionType;
  color: string;
  accessory: Accessory;
  seed?: string;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
}

export default function Character3D({ type, ...rest }: Character3DProps) {
  const species = normalizeSpecies(type);
  const Model = SPECIES_MODELS[species];
  return <Model type={species} {...rest} />;
}
