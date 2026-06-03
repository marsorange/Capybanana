import { resolveDay } from "./resolveDay";
import type {
  CapyState,
  Companion,
  CompanionState,
  DayOutcome,
  PackedBag,
  Postcard,
  Trip,
} from "./types";

// Sentinel departAt for an agent-driven (cloud) pet: it never auto-departs on
// its own — it waits for the agent to decide the day.
export const NO_AUTO_DEPART = Number.MAX_SAFE_INTEGER;

export interface LifecycleState {
  companion: Companion | null;
  capy: CapyState;
  companionState: CompanionState;
  packedBag: PackedBag | null;
  activeTrip: Trip | null;
  postcards: Postcard[];
}

export interface AdvanceOutcome {
  companionState: CompanionState;
  packedBag: PackedBag | null;
  activeTrip: Trip | null;
  postcards: Postcard[];
  started: boolean; // the day began unfolding
  outcome: DayOutcome | null; // the resolved day, when it finishes
}

/**
 * Cloud pets only advance server-authored trips. `ready` never auto-departs:
 * the agent must explicitly choose the day's action.
 */
export function advanceLifecycle(
  input: LifecycleState,
  now: number,
): AdvanceOutcome {
  const { companion, capy } = input;
  const { packedBag } = input;
  let { companionState, activeTrip, postcards } = input;
  const started = false;
  let outcome: DayOutcome | null = null;

  if (companion) {
    if (
      companionState === "traveling" &&
      activeTrip &&
      now >= activeTrip.returnsAt
    ) {
      outcome = resolveDay(companion, capy, activeTrip);
      if (outcome.postcard) postcards = [outcome.postcard, ...postcards];
      activeTrip = { ...activeTrip, status: "returned" };
      companionState = "idle_home";
    }
  }

  return {
    companionState,
    packedBag,
    activeTrip,
    postcards,
    started,
    outcome,
  };
}

/** Day-unfolding progress 0..1 for the waiting screen. */
export function tripProgress(trip: Trip | null, now: number): number {
  if (!trip) return 0;
  const p = (now - trip.startedAt) / trip.durationMs;
  return Math.max(0, Math.min(1, p));
}
