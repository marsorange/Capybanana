// Shared, pure outcome → state merge.
import type { CapyState, DayOutcome } from "./types";

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function applyEffects(
  capy: CapyState,
  eff: DayOutcome["effects"],
): CapyState {
  return {
    ...capy,
    mood: clamp(capy.mood + (eff.mood ?? 0)),
    energy: clamp(capy.energy + (eff.energy ?? 0)),
    courage: clamp(capy.courage + (eff.courage ?? 0)),
    injury: clamp(capy.injury + (eff.injury ?? 0)),
  };
}

export interface OutcomeAccumulator {
  capy: CapyState;
  souvenirs: string[];
  misunderstandings: string[];
}

/**
 * Fold a resolved day into the running state: stat effects, an optional memory,
 * an optional picked-up trait, the head-pat bonus, and any souvenir /
 * misunderstanding the day produced. Returns fresh objects (no mutation).
 */
export function applyOutcome(
  prev: OutcomeAccumulator,
  outcome: DayOutcome,
  patted: boolean,
): OutcomeAccumulator {
  let capy = applyEffects(prev.capy, outcome.effects);

  if (outcome.memory)
    capy = { ...capy, memories: [outcome.memory, ...capy.memories].slice(0, 30) };

  if (outcome.trait && !capy.traits.includes(outcome.trait))
    capy = { ...capy, traits: [...capy.traits, outcome.trait] };

  if (patted)
    capy = {
      ...capy,
      mood: clamp(capy.mood + 3),
    };

  return {
    capy,
    souvenirs: outcome.souvenir
      ? [outcome.souvenir, ...prev.souvenirs]
      : prev.souvenirs,
    misunderstandings: outcome.misunderstanding
      ? [outcome.misunderstanding, ...prev.misunderstandings]
      : prev.misunderstandings,
  };
}
