import { planTrip } from "./planTrip";
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
import { randRange, uid } from "./util";

// Compressed timing: after packing, the "day" plays out over a short window,
// then resolves into one of the outcomes. Offline catch-up still resolves it.
export const TIMING = { departMin: 8_000, departMax: 28_000 };

export interface DepartureDecision {
  departAt: number;
  willGo: boolean;
}

/** When the prepared day starts to unfold. */
export function scheduleDeparture(now: number): DepartureDecision {
  return {
    departAt: now + randRange(TIMING.departMin, TIMING.departMax),
    willGo: true,
  };
}

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
 * ready -> (day unfolds) -> resolved into home/yard/travel. Loops so a long
 * offline gap resolves both the start and the result in one call.
 */
export function advanceLifecycle(
  input: LifecycleState,
  now: number,
): AdvanceOutcome {
  const { companion, capy } = input;
  let { companionState, packedBag, activeTrip, postcards } = input;
  let started = false;
  let outcome: DayOutcome | null = null;

  if (companion) {
    for (let i = 0; i < 4; i++) {
      if (companionState === "ready" && packedBag && now >= packedBag.departAt) {
        const plan = planTrip(packedBag.items, packedBag.message);
        const startedAt = packedBag.departAt;
        activeTrip = {
          id: uid("trip"),
          companionId: companion.id,
          items: packedBag.items,
          message: packedBag.message,
          gesture: packedBag.gesture,
          status: "traveling",
          destination: plan.destination,
          startedAt,
          durationMs: plan.durationMs,
          returnsAt: startedAt + plan.durationMs,
        };
        companionState = "traveling";
        packedBag = null;
        started = true;
        continue;
      }

      if (
        companionState === "traveling" &&
        activeTrip &&
        now >= activeTrip.returnsAt
      ) {
        outcome = resolveDay(companion, capy, activeTrip);
        if (outcome.postcard) postcards = [outcome.postcard, ...postcards];
        activeTrip = { ...activeTrip, status: "returned" };
        companionState = "idle_home";
        continue;
      }

      break;
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
