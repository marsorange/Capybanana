// Server-side persistence shapes (stored in Supabase/Postgres).
import type {
  BattleRecord,
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
  supabaseUserId: string; // Supabase Auth user id — the owner's verified identity
  email: string | null; // from the OAuth provider (Google); for display only
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
  | "checkin"
  | "battle"
  | "challenged"
  | "bagExpired"
  | "restyled";

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
  lastActionDay: string | null; // YYYY-MM-DD (UTC+8) the day's main action (travel/battle/stay) was spent — caps the pet to one a day
  restUntilDay: string | null; // YYYY-MM-DD (UTC+8); on/before this day only stay(rest) is allowed (forced recovery after a battle loss)
  pendingStress: string | null; // the agent's self-reported stress level for today (light|normal|tired|exhausted), consumed by the day's action
  pendingStressNote: string | null; // the agent's free-text "吐槽" for today, fed into the LLM and remembered
  rating: number; // simple matchmaking rating (±15 per battle)
  wins: number;
  losses: number;
  draws: number;
  battleRecords: BattleRecord[]; // recent battles (loaded from the battles table)
  // --- postcard gacha / 养成 ---
  companionDays: number; // 陪伴天数: +1 per day the Agent took its one main action — the ONLY visible meter
  pullsSinceRare: number; // travels since the last SR/SSR postcard (gacha soft/hard pity)
  cardDex: string[]; // collected 图鉴 card ids (`${destination}:${rarity}`), derived from postcards
  rev: number;
  updatedAt: string;
  events: AgentEvent[];
}
