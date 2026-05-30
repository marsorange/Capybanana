// Server-side persistence shapes (stored in KV).
import type {
  CapyState,
  Companion,
  CompanionState,
  DayOutcome,
  PackedBag,
  Postcard,
  Trip,
} from "@/game/types";

export interface User {
  id: string;
  phone: string;
  bindToken: string; // the agent's secret; also used by the owner's web client
  petId: string;
  createdAt: string;
}

export type AgentEventType =
  | "created"
  | "packed"
  | "departed"
  | "returned"
  | "postcard"
  | "pat"
  | "said"
  | "diary";

// A daily diary entry the agent writes in the pet's voice (<= 200 chars).
// At most one per calendar day — writing again the same day updates it.
export interface DiaryEntry {
  id: string;
  day: string; // YYYY-MM-DD (UTC) the entry covers
  text: string; // <= 200 chars
  at: string; // ISO timestamp it was written
  mood: number; // the pet's mood snapshot when written (flavor)
}

// One entry in the pet's activity log. `seq` (== the rev at which it was
// appended) is the cursor the agent's `feed?since=` polls against.
export interface AgentEvent {
  seq: number;
  at: string; // ISO
  type: AgentEventType;
  text: string;
  postcardId?: string;
}

// The authoritative cloud save. Mirrors the client's persisted game state
// (minus pure-UI fields) plus a version/cursor and an activity log.
export interface CloudSave {
  companion: Companion | null;
  capyState: CapyState;
  companionState: CompanionState;
  packedBag: PackedBag | null;
  activeTrip: Trip | null;
  postcards: Postcard[];
  souvenirs: string[];
  misunderstandings: string[];
  lastResult: DayOutcome | null;
  pendingPostcardId: string | null;
  pendingMessage: string | null; // a thing the agent "said"; seeds the next trip
  diary: DiaryEntry[]; // newest-first; the agent's daily journal in the pet's voice
  lastActionDay: string | null; // YYYY-MM-DD (UTC) the day's growth action (travel/battle/stay) was spent — caps the pet to one a day
  rev: number;
  updatedAt: string;
  events: AgentEvent[];
}
