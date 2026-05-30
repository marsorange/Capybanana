import { generatePostcard } from "./generatePostcard";
import { planTrip } from "./planTrip";
import type {
  Companion,
  CompanionState,
  PackedBag,
  Postcard,
  Trip,
} from "./types";
import { randRange, uid } from "./util";

// Compressed timings (ms). Tuned so a session shows "it left on its own"
// within a minute, while offline catch-up still resolves long absences.
export const TIMING = {
  departMin: 10_000,
  departMax: 60_000,
  stayHomeProb: 0.15,
  reconsiderMin: 8_000,
  reconsiderMax: 20_000,
};

export interface DepartureDecision {
  departAt: number;
  willGo: boolean;
}

/** Roll when (and whether) the companion intends to leave after packing. */
export function scheduleDeparture(now: number): DepartureDecision {
  return {
    departAt: now + randRange(TIMING.departMin, TIMING.departMax),
    willGo: Math.random() > TIMING.stayHomeProb,
  };
}

function reconsider(from: number): DepartureDecision {
  return {
    departAt: from + randRange(TIMING.reconsiderMin, TIMING.reconsiderMax),
    willGo: Math.random() > TIMING.stayHomeProb,
  };
}

export interface LifecycleState {
  companion: Companion | null;
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
  departed: boolean;
  stayedHome: boolean;
  arrivedPostcardId: string | null;
}

/**
 * Pure reducer that advances the companion's life one "moment" at a time until
 * stable: ready -> (leaves | stays home & re-rolls) -> traveling -> returns with
 * a postcard. Loops a few times so a long offline gap can resolve both the
 * departure and the return in a single call.
 */
export function advanceLifecycle(
  input: LifecycleState,
  now: number,
): AdvanceOutcome {
  const { companion } = input;
  let { companionState, packedBag, activeTrip, postcards } = input;
  let departed = false;
  let stayedHome = false;
  let arrivedPostcardId: string | null = null;

  if (companion) {
    for (let i = 0; i < 8; i++) {
      if (companionState === "ready" && packedBag && now >= packedBag.departAt) {
        if (packedBag.willGo) {
          const plan = planTrip(packedBag.items, packedBag.message);
          const startedAt = packedBag.departAt;
          activeTrip = {
            id: uid("trip"),
            companionId: companion.id,
            items: packedBag.items,
            message: packedBag.message,
            status: "traveling",
            destination: plan.destination,
            startedAt,
            durationMs: plan.durationMs,
            returnsAt: startedAt + plan.durationMs,
          };
          companionState = "traveling";
          packedBag = null;
          departed = true;
          continue;
        }
        // Decided to stay home this time — re-roll a later attempt.
        const next = reconsider(packedBag.departAt);
        packedBag = {
          ...packedBag,
          packedAt: packedBag.departAt,
          departAt: next.departAt,
          willGo: next.willGo,
        };
        stayedHome = true;
        continue;
      }

      if (
        companionState === "traveling" &&
        activeTrip &&
        now >= activeTrip.returnsAt
      ) {
        const postcard = generatePostcard(companion, activeTrip);
        postcards = [postcard, ...postcards];
        activeTrip = { ...activeTrip, status: "returned" };
        companionState = "idle_home";
        arrivedPostcardId = postcard.id;
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
    departed,
    stayedHome,
    arrivedPostcardId,
  };
}

/** Travel progress 0..1 for the waiting screen. */
export function tripProgress(trip: Trip | null, now: number): number {
  if (!trip) return 0;
  const p = (now - trip.startedAt) / trip.durationMs;
  return Math.max(0, Math.min(1, p));
}
