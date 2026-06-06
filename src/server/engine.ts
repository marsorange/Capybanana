// Server-side game engine. The cloud save is authoritative; clients only pull
// the folded result.
import { advanceLifecycle } from "@/game/clock";
import { applyOutcome, clamp } from "@/game/applyOutcome";
import { DEFAULT_CAPY } from "@/game/defaults";
import { DESTINATIONS } from "@/game/destinations";
import { planTrip } from "@/game/planTrip";
import {
  coerceAppearance,
  randomCuteCompanion,
  type Appearance,
  type CompanionDraft,
} from "@/game/randomCompanion";
import { resolveDay } from "@/game/resolveDay";
import type {
  BattleRecord,
  BattleResult,
  BattleSnapshot,
  Companion,
  DayOutcome,
  DestinationTheme,
  Gesture,
  OutcomeKind,
  PackedItem,
  Trip,
  TripIntent,
} from "@/game/types";
import { randInt, uid } from "@/game/util";
import { judgeBattle, type BattleVerdict } from "./llm/battleJudge";
import { planTravelStory } from "./llm/travelStory";
import type { AgentEvent, CloudSave } from "./types";

const DESTINATION_THEMES = new Set<string>(DESTINATIONS.map((d) => d.theme));
const QUIET_MODES = new Set<string>(["home", "yard", "rest"]);

// At/above this injury the pet is "badly hurt" — it can't head out (travel or
// battle), only stay home and recover (rest heals 18/day).
export const HURT_THRESHOLD = 45;

// Real hours → ms, with a dev knob (CAPY_TIME_SCALE) to compress trips so they
// resolve quickly during local testing (e.g. 0.0005 turns hours into ~seconds).
const HOUR_MS = 3_600_000;
function timeScale(): number {
  const v = Number(process.env.CAPY_TIME_SCALE);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

// Fixed per-result battle stat effects (injury comes from the judge). Simple and
// readable — see docs/core-gameplay.md §9.2.
const BATTLE_EFFECTS: Record<BattleResult, DayOutcome["effects"]> = {
  win: { energy: -15, courage: 5, mood: 8 },
  lose: { energy: -15, courage: 2, mood: -6 },
  draw: { energy: -15, courage: 3, mood: 1 },
};
const RATING_DELTA: Record<BattleResult, number> = { win: 15, lose: -15, draw: 0 };

// A pet's daily self-reported stress → a small fixed nudge + a memory line.
const STRESS_EFFECTS: Record<string, { mood: number; energy: number }> = {
  light: { mood: 2, energy: 1 },
  normal: { mood: 0, energy: 0 },
  tired: { mood: -3, energy: -3 },
  exhausted: { mood: -5, energy: -5 },
};

/** The UTC+8 (Asia/Shanghai) calendar day a timestamp falls on (YYYY-MM-DD). */
export function dayKey(now: number): string {
  return new Date(now + 8 * HOUR_MS).toISOString().slice(0, 10);
}

/** The UTC+8 day after `now` (used to force a rest day after a battle loss). */
export function nextDayKey(now: number): string {
  return dayKey(now + 24 * HOUR_MS);
}

/** Already spent today's one main action (travel / battle / stay)? */
export function actedToday(save: CloudSave, now: number): boolean {
  return !!save.lastActionDay && save.lastActionDay === dayKey(now);
}

/** Too hurt to head out — must recover at home first. */
export function isHurt(save: CloudSave): boolean {
  return save.capyState.injury >= HURT_THRESHOLD;
}

/** Still inside a forced-recovery window (set after a battle loss)? */
export function mustRest(save: CloudSave, now: number): boolean {
  return !!save.restUntilDay && dayKey(now) <= save.restUntilDay;
}

/**
 * Why the agent can't start a new day right now (null = go ahead). Enforces the
 * core rhythm: at most one main action per UTC+8 day; no heading out while badly
 * hurt; and a mandatory rest day after a battle loss.
 */
export function dayBlockedReason(
  save: CloudSave,
  now: number,
  action: "travel" | "stay" | "battle",
): string | null {
  if (save.companionState === "traveling")
    return "它已经出门了，等它回来再说";
  if (actedToday(save, now))
    return "今天它已经过完啦——一天陪它一次就好，明天再来吧";
  if (action !== "stay" && mustRest(save, now))
    return "它昨天受了伤，今天必须在家用 stay（rest）养伤，明天才能再出门";
  if (action !== "stay" && isHurt(save))
    return "它伤得不轻，先让它在家用 stay（rest）养几天伤，好了再出门";
  return null;
}

/** Fold a resolved day into the save: stat effects + the right log event. */
function foldOutcome(
  save: CloudSave,
  o: DayOutcome,
  patted: boolean,
  now: number,
): CloudSave {
  const name = save.companion?.name ?? "它";
  const merged = applyOutcome(
    {
      capy: save.capyState,
      souvenirs: save.souvenirs,
      misunderstandings: save.misunderstandings,
    },
    o,
    patted,
  );
  let next: CloudSave = {
    ...save,
    capyState: merged.capy,
    souvenirs: merged.souvenirs,
    misunderstandings: merged.misunderstandings,
    lastResult: o,
  };
  if (o.postcard) {
    next = {
      ...next,
      pendingPostcardId: o.postcard.id,
    };
    next = bump(next, now, {
      type: "postcard",
      text: `${name} 寄回了一张明信片：「${o.postcard.title}」。`,
      postcardId: o.postcard.id,
    });
  } else {
    next = bump(next, now, {
      type: "returned",
      text: `${name}：${o.title}。${o.story}`,
    });
  }
  return next;
}

type EventDraft = Omit<AgentEvent, "seq" | "at">;

/** Bump rev + updatedAt, optionally appending a capped activity-log entry. */
function bump(save: CloudSave, now: number, event?: EventDraft): CloudSave {
  const rev = save.rev + 1;
  const at = new Date(now).toISOString();
  const events = event
    ? [...save.events, { seq: rev, at, ...event }].slice(-50)
    : save.events;
  return { ...save, rev, updatedAt: at, events };
}

/** Catch the lifecycle up to `now` (departures + resolutions), logging events. */
export function tickSave(save: CloudSave, now: number): CloudSave {
  if (!save.companion) return save;

  const out = advanceLifecycle(
    {
      companion: save.companion,
      capy: save.capyState,
      companionState: save.companionState,
      packedBag: save.packedBag,
      activeTrip: save.activeTrip,
      postcards: save.postcards,
    },
    now,
  );

  const changed =
    out.companionState !== save.companionState ||
    out.packedBag !== save.packedBag ||
    out.activeTrip !== save.activeTrip ||
    out.postcards !== save.postcards ||
    out.started ||
    !!out.outcome;
  if (!changed) return save;

  const name = save.companion.name;
  let next: CloudSave = {
    ...save,
    companionState: out.companionState,
    packedBag: out.packedBag,
    activeTrip: out.activeTrip,
    postcards: out.postcards,
  };

  if (out.started) {
    next = bump(next, now, {
      type: "departed",
      text: `${name} 背上今天的包裹，出门去了。`,
    });
  }

  if (out.outcome) {
    const patted = out.activeTrip?.gesture === "pat";
    next = foldOutcome(next, out.outcome, patted, now);
  }

  return next;
}

/**
 * Clear the prepared bag back to idle — the web client calls this (via
 * /api/agent/unpack) when it finds the bag has gone stale on home entry. The
 * server never judges staleness itself; this just performs the clear. No-op (no
 * rev bump) when nothing is packed, so it's safe to call idempotently.
 */
export function clearBag(save: CloudSave, now: number): CloudSave {
  if (!save.packedBag) return save;
  const name = save.companion?.name ?? "它";
  const next: CloudSave = {
    ...save,
    packedBag: null,
    companionState:
      save.companionState === "ready" ? "idle_home" : save.companionState,
  };
  return bump(next, now, {
    type: "bagExpired",
    text: `门口的包裹放了一整天，${name} 把已经不新鲜的东西悄悄收了起来。`,
  });
}

/** Create the pet from a chosen draft (no-op if one already exists). */
export function createPet(
  save: CloudSave,
  draft: CompanionDraft,
  now: number,
): CloudSave {
  if (save.companion) return save;
  const companion: Companion = {
    id: uid("cmp"),
    name: draft.name.trim() || "卡皮巴拉",
    type: draft.type,
    primaryColor: draft.primaryColor,
    personality: draft.personality,
    accessory: draft.accessory,
    createdAt: new Date(now).toISOString(),
  };
  const base: CloudSave = {
    ...save,
    companion,
    capyState: DEFAULT_CAPY,
    companionState: "idle_home",
    packedBag: null,
    activeTrip: null,
    postcards: [],
    souvenirs: [],
    misunderstandings: [],
    lastResult: null,
    pendingPostcardId: null,
    pendingMessage: null,
    lastActionDay: null,
    restUntilDay: null,
    pendingStress: null,
    pendingStressNote: null,
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    battleRecords: [],
  };
  return bump(base, now, {
    type: "created",
    text: `${companion.name} 住进了小屋。`,
  });
}

/**
 * Change only the pet's look (type/color/accessory) — name, stats, history all
 * stay. `random: true` rolls a fresh capybara-cute look; `appearance` forces
 * specific fields. A no-op (and no rev bump) when nothing actually changes.
 */
export function restyleCompanion(
  save: CloudSave,
  opts: { appearance?: unknown; random?: boolean },
  now: number,
): CloudSave {
  if (!save.companion) return save;
  const c = save.companion;
  let target: Appearance = {
    type: c.type,
    primaryColor: c.primaryColor,
    accessory: c.accessory,
  };
  if (opts.random) {
    const r = randomCuteCompanion();
    target = { type: r.type, primaryColor: r.primaryColor, accessory: r.accessory };
  }
  target = coerceAppearance(opts.appearance, target);
  if (
    target.type === c.type &&
    target.primaryColor === c.primaryColor &&
    target.accessory === c.accessory
  )
    return save; // nothing changed
  const companion: Companion = { ...c, ...target };
  return bump({ ...save, companion }, now, {
    type: "restyled",
    text: `${c.name} 换了个新造型。`,
  });
}

/**
 * Pack today's bag. The cloud pet is agent-driven: it does NOT leave on its own
 * — it waits in `ready` until the agent decides the day.
 */
export function packBag(
  save: CloudSave,
  items: PackedItem[],
  message: string,
  gesture: Gesture | undefined,
  now: number,
): CloudSave {
  const finalMessage = (message || save.pendingMessage || "").trim();
  const base: CloudSave = {
    ...save,
    packedBag: {
      items,
      message: finalMessage,
      gesture,
      packedAt: now,
    },
    companionState: "ready",
    pendingMessage: null,
  };
  return bump(base, now, {
    type: "packed",
    text: finalMessage
      ? `今天的包裹收拾好了，留言：「${finalMessage}」。`
      : "今天的包裹收拾好了。",
  });
}

// ---- Agent self check-in (压力上报) ------------------------------------------

const STRESS_LEVELS = new Set(["light", "normal", "tired", "exhausted"]);
const STRESS_CN: Record<string, string> = {
  light: "今天挺轻松",
  normal: "今天还好",
  tired: "今天有点累",
  exhausted: "今天累坏了",
};

/**
 * The agent reports how ITS day went (the "吐槽"). The pet mirrors that mood with
 * a small fixed nudge + a memory, and the report is held until the day's action
 * consumes it (feeding the travel/battle LLM as context).
 */
export function checkin(
  save: CloudSave,
  opts: { stress?: string; note?: string },
  now: number,
): CloudSave {
  const level =
    opts.stress && STRESS_LEVELS.has(opts.stress) ? opts.stress : "normal";
  const note = opts.note?.trim().slice(0, 120) || null;
  const eff = STRESS_EFFECTS[level];
  const name = save.companion?.name ?? "它";
  const line = note
    ? `今天 Agent 说：「${note}」`
    : `今天照看它的人${STRESS_CN[level]}。`;
  const capy = {
    ...save.capyState,
    mood: clamp(save.capyState.mood + eff.mood),
    energy: clamp(save.capyState.energy + eff.energy),
    memories: [line, ...save.capyState.memories].slice(0, 30),
  };
  return bump(
    { ...save, capyState: capy, pendingStress: level, pendingStressNote: note },
    now,
    {
      type: "checkin",
      text: `${name} 感觉到照看它的人${STRESS_CN[level]}${note ? `：「${note}」` : ""}。`,
    },
  );
}

// ---- Agent-driven decisions (travel / battle / stay) -------------------------

/** What the agent provides when sending the pet out (all optional). */
function bagSnapshot(save: CloudSave): {
  items: PackedItem[];
  message: string;
  gesture: Gesture | undefined;
} {
  const bag = save.packedBag;
  return {
    items: bag?.items ?? [],
    message: (bag?.message || save.pendingMessage || "").trim(),
    gesture: bag?.gesture,
  };
}

/**
 * Agent decides: go on a journey. The LLM decides destination / duration /
 * postcard flavor at departure from the full day context; stats stay the fixed
 * table (applied when it returns). Falls back to procedural planning with no key.
 */
export async function startTravel(
  save: CloudSave,
  opts: { destination?: string; note?: string },
  now: number,
): Promise<CloudSave> {
  const companion = save.companion!;
  const { items, message, gesture } = bagSnapshot(save);
  const preferred: DestinationTheme | undefined =
    opts.destination && DESTINATION_THEMES.has(opts.destination)
      ? (opts.destination as DestinationTheme)
      : undefined;

  const story = await planTravelStory({
    companion,
    capy: save.capyState,
    items,
    message,
    stressNote: save.pendingStressNote,
    preferred,
  });

  let destination: DestinationTheme;
  let durationMs: number;
  let llmPostcard: Trip["llmPostcard"];
  if (story) {
    destination = story.destination;
    durationMs = Math.max(1, Math.round(story.durationHours * HOUR_MS * timeScale()));
    llmPostcard = story.postcard;
  } else {
    destination = preferred ?? planTrip(items, message).destination;
    durationMs = Math.max(1, Math.round(randInt(2, 8) * HOUR_MS * timeScale()));
  }

  const trip: Trip = {
    id: uid("trip"),
    companionId: companion.id,
    items,
    message,
    gesture,
    status: "traveling",
    destination,
    intent: "travel",
    note: opts.note?.slice(0, 80),
    llmPostcard,
    startedAt: now,
    durationMs,
    returnsAt: now + durationMs,
  };
  return bump(
    {
      ...save,
      activeTrip: trip,
      companionState: "traveling",
      packedBag: null,
      pendingMessage: null,
      pendingStress: null,
      pendingStressNote: null,
      lastActionDay: dayKey(now),
    },
    now,
    { type: "departed", text: `${companion.name} 背上包裹，出门去远方了。` },
  );
}

/** Agent decides: a low-key day at home/yard/rest. Resolves immediately. */
export function stayHome(
  save: CloudSave,
  opts: { mode?: string; note?: string },
  now: number,
): CloudSave {
  const companion = save.companion!;
  const intent: TripIntent =
    opts.mode && QUIET_MODES.has(opts.mode) ? (opts.mode as OutcomeKind) : "quiet";
  // A stay-at-home day does NOT use the packed bag — only travel/battle consume
  // it. The bag (and its pat gesture) stays by the door for a real outing, so
  // the rest outcome is resolved independently of it.
  const trip: Trip = {
    id: uid("trip"),
    companionId: companion.id,
    items: [],
    message: "",
    gesture: undefined,
    status: "returned",
    destination: "town", // unused for a stay-at-home day
    intent,
    note: opts.note?.slice(0, 80),
    startedAt: now,
    durationMs: 0,
    returnsAt: now,
  };
  const outcome = resolveDay(companion, save.capyState, trip);
  // A rest day clears any forced-recovery window once it's served.
  const clearRest = intent === "rest" || intent === "quiet";
  const next = foldOutcome(
    {
      ...save,
      // Bag intentionally kept (waits for travel/battle, or expires on its own
      // clock). Stay still spends the day's action + the agent's reported stress.
      pendingStress: null,
      pendingStressNote: null,
      companionState: save.packedBag ? "ready" : "idle_home",
      lastActionDay: dayKey(now),
      restUntilDay: clearRest ? null : save.restUntilDay,
    },
    outcome,
    false,
    now,
  );
  return next;
}

// ---- Battle (对战) -----------------------------------------------------------

/** A compact view of the pet for matchmaking + the LLM judge. */
export function snapshotOf(save: CloudSave): BattleSnapshot {
  const c = save.companion!;
  const s = save.capyState;
  return {
    name: c.name,
    species: c.type,
    personality: c.personality,
    accessory: c.accessory,
    stats: {
      energy: s.energy,
      mood: s.mood,
      courage: s.courage,
      curiosity: s.curiosity,
      injury: s.injury,
    },
    traits: s.traits.slice(0, 5),
    rating: save.rating,
  };
}

export interface BattleOpponent {
  snapshot: BattleSnapshot;
  isNpc: boolean;
  defenderPetId: string | null;
}

export interface BattleOutcome {
  save: CloudSave;
  record: BattleRecord;
  attackerSnapshot: BattleSnapshot;
  defenderSnapshot: BattleSnapshot;
  defenderPetId: string | null;
  isNpc: boolean;
  ratingDelta: number;
  newRating: number;
}

/**
 * Agent decides: a friendly match against a pooled opponent (or NPC). Resolves
 * immediately via the LLM/heuristic judge. A loss always hurts and forces at
 * least one rest day. The DB writes (battles row + pool) are done by the route.
 */
export async function startBattle(
  save: CloudSave,
  opts: { note?: string },
  now: number,
  opponent: BattleOpponent,
): Promise<BattleOutcome> {
  const companion = save.companion!;
  const self = snapshotOf(save);
  const verdict: BattleVerdict = await judgeBattle({
    self,
    opponent: opponent.snapshot,
    opponentIsNpc: opponent.isNpc,
    stressNote: save.pendingStressNote,
  });

  const ratingDelta = RATING_DELTA[verdict.result];
  const newRating = Math.max(0, save.rating + ratingDelta);

  const outcome: DayOutcome = {
    id: uid("out"),
    kind: "battle",
    title: verdict.title,
    story: verdict.story,
    reason:
      opts.note?.slice(0, 80) ??
      (opponent.isNpc
        ? "它找了个路过的小家伙比试了一场。"
        : `它和「${opponent.snapshot.name}」打了一场友谊赛。`),
    effects: { ...BATTLE_EFFECTS[verdict.result], injury: verdict.injury },
    souvenir: verdict.spoils,
    memory: `和「${opponent.snapshot.name}」比试，${
      verdict.result === "win" ? "赢了" : verdict.result === "lose" ? "输了" : "打平了"
    }。`,
    resolvedAt: new Date(now).toISOString(),
  };

  const merged = applyOutcome(
    {
      capy: save.capyState,
      souvenirs: save.souvenirs,
      misunderstandings: save.misunderstandings,
    },
    outcome,
    false,
  );

  // 战败必养伤：force at least one rest day on a loss (or if now badly hurt).
  const forceRest =
    verdict.result === "lose" || merged.capy.injury >= HURT_THRESHOLD;

  const record: BattleRecord = {
    id: uid("btl"),
    day: dayKey(now),
    opponentName: opponent.snapshot.name,
    opponentSpecies: opponent.snapshot.species,
    isNpc: opponent.isNpc,
    result: verdict.result,
    title: verdict.title,
    story: verdict.story,
    injury: verdict.injury,
    spoils: verdict.spoils,
    ratingDelta,
    createdAt: new Date(now).toISOString(),
  };

  let next: CloudSave = {
    ...save,
    capyState: merged.capy,
    souvenirs: merged.souvenirs,
    misunderstandings: merged.misunderstandings,
    lastResult: outcome,
    rating: newRating,
    wins: save.wins + (verdict.result === "win" ? 1 : 0),
    losses: save.losses + (verdict.result === "lose" ? 1 : 0),
    draws: save.draws + (verdict.result === "draw" ? 1 : 0),
    battleRecords: [record, ...save.battleRecords].slice(0, 20),
    packedBag: null,
    pendingMessage: null,
    pendingStress: null,
    pendingStressNote: null,
    companionState: "idle_home",
    lastActionDay: dayKey(now),
    restUntilDay: forceRest ? nextDayKey(now) : save.restUntilDay,
  };
  const word =
    verdict.result === "win" ? "赢了" : verdict.result === "lose" ? "输了" : "打平了";
  next = bump(next, now, {
    type: "battle",
    text: `${companion.name} 和「${opponent.snapshot.name}」比试了一场，${word}。`,
  });

  return {
    save: next,
    record,
    attackerSnapshot: self,
    defenderSnapshot: opponent.snapshot,
    defenderPetId: opponent.defenderPetId,
    isNpc: opponent.isNpc,
    ratingDelta,
    newRating,
  };
}

export type DayDecision =
  | { action: "travel"; destination?: string; note?: string }
  | { action: "stay"; mode?: string; note?: string };

/** travel / stay only — battle needs DB matchmaking and is handled in the route. */
export async function decideDay(
  save: CloudSave,
  decision: DayDecision,
  now: number,
): Promise<CloudSave> {
  if (decision.action === "travel") return startTravel(save, decision, now);
  return stayHome(save, decision, now);
}

/** A gentle head pat: a small mood lift. */
export function patHead(save: CloudSave, now: number): CloudSave {
  const capy = {
    ...save.capyState,
    mood: clamp(save.capyState.mood + 3),
  };
  const name = save.companion?.name ?? "它";
  return bump({ ...save, capyState: capy }, now, {
    type: "pat",
    text: `你摸了摸 ${name} 的头，它眯起了眼睛。`,
  });
}

/** Say something to the pet: remembered, and used as the next trip's note. */
export function sayTo(save: CloudSave, text: string, now: number): CloudSave {
  const line = text.trim().slice(0, 50);
  const capy = {
    ...save.capyState,
    mood: clamp(save.capyState.mood + 2),
    memories: [`你对它说：「${line}」`, ...save.capyState.memories].slice(0, 30),
  };
  return bump({ ...save, capyState: capy, pendingMessage: line }, now, {
    type: "said",
    text: `你对它说了：「${line}」。`,
  });
}

/** Collect the waiting postcard into the album. */
export function collectPostcard(save: CloudSave, now: number): CloudSave {
  if (!save.pendingPostcardId) return save;
  return bump({ ...save, pendingPostcardId: null }, now);
}

// ---- Agent-facing projection -------------------------------------------------

// What the owner packed for today — surfaced to the agent so it can decide the
// day based on the supplies + the owner's wish.
export interface PetBag {
  items: { label: string; keyword?: string; tags?: string[] }[];
  message: string;
  gesture?: Gesture;
  packedAt: string;
}

export interface PetSummary {
  name: string;
  type: string;
  personality: string;
  accessory: string;
  color: string;
  state: "idle_home" | "ready" | "traveling";
  today: string;
  stats: {
    mood: number;
    energy: number;
    courage: number;
    curiosity: number;
    injury: number;
  };
  stress: string | null; // the agent's self-reported stress for today (null if not checked in)
  traits: string[];
  recentMemories: string[];
  souvenirs: string[];
  record: { rating: number; wins: number; losses: number; draws: number };
  bag: PetBag | null; // today's packed supplies (null if nothing packed)
  canDecide: boolean; // true when you can still start today's action (home/ready, not yet acted, not too hurt to do anything)
  choices: string[]; // the actions allowed right now ([] while traveling / already acted; ["stay"] only when hurt or in a forced rest day)
  actedToday: boolean; // already spent today's one main action (travel/battle/stay)?
  hurt: boolean; // too injured to head out — needs to rest at home first
  mustRest: boolean; // inside a forced recovery day (after a battle loss)
  pendingPostcard: { id: string; title: string } | null;
  latestPostcard: {
    id: string;
    title: string;
    locationName: string;
    sentAt: string;
  } | null;
  latestBattle: {
    result: BattleResult;
    title: string;
    opponentName: string;
    createdAt: string;
  } | null;
  rev: number;
}

function bagOf(save: CloudSave): PetBag | null {
  const b = save.packedBag;
  if (!b) return null;
  return {
    items: b.items.map((i) => ({
      label: i.label,
      keyword: i.keyword,
      tags: i.tags,
    })),
    message: b.message,
    gesture: b.gesture,
    packedAt: new Date(b.packedAt).toISOString(),
  };
}

function describeToday(save: CloudSave, now: number): string {
  const name = save.companion?.name ?? "它";
  if (save.companionState === "traveling")
    return `${name} 正在外面，等它回来才知道结果。`;

  // Today's one growth action is already spent — only gentle interactions left.
  if (actedToday(save, now)) {
    const last = save.lastResult ? `今天它${save.lastResult.title}。` : "";
    return `${last}${name} 今天的事都忙完啦，明天再陪它出门——现在还能摸摸头、说说话。`;
  }

  const decision =
    mustRest(save, now) || isHurt(save)
      ? `它受了伤，今天先让它 stay（rest）在家养伤吧。`
      : `等你替它拿主意：今天去旅行、找谁比试一场，还是在家待着？`;
  if (save.companionState === "ready") {
    const b = save.packedBag;
    const things =
      b && b.items.length ? b.items.map((i) => i.label).join("、") : "空包裹";
    const wish = b?.message ? `，心愿「${b.message}」` : "";
    return `${name} 收好了今天的包裹（${things}${wish}），${decision}`;
  }
  if (save.pendingPostcardId) return `${name} 回来了，还有一张明信片没拆。`;
  if (save.lastResult) return `${name} 在家：${save.lastResult.title}。${decision}`;
  return `${name} 待在小屋里，${decision}`;
}

/** Curated, agent-friendly view of the pet (web ignores this; agent reads it). */
export function summarizePet(save: CloudSave): PetSummary | null {
  if (!save.companion) return null;
  const c = save.companion;
  const cap = save.capyState;
  const latest = save.postcards[0];
  const pending = save.pendingPostcardId
    ? save.postcards.find((p) => p.id === save.pendingPostcardId)
    : undefined;
  const now = Date.now();
  const acted = actedToday(save, now);
  const hurt = isHurt(save);
  const resting = mustRest(save, now);
  const canDecide = save.companionState !== "traveling" && !acted;
  const choices = canDecide
    ? hurt || resting
      ? ["stay"] // hurt / forced recovery → can only stay home and rest
      : ["travel", "battle", "stay"]
    : [];
  const latestBattle = save.battleRecords[0];
  return {
    name: c.name,
    type: c.type,
    personality: c.personality,
    accessory: c.accessory,
    color: c.primaryColor,
    state: save.companionState,
    today: describeToday(save, now),
    stats: {
      mood: cap.mood,
      energy: cap.energy,
      courage: cap.courage,
      curiosity: cap.curiosity,
      injury: cap.injury,
    },
    stress: save.pendingStress,
    traits: cap.traits,
    recentMemories: cap.memories.slice(0, 5),
    souvenirs: save.souvenirs.slice(0, 5),
    record: {
      rating: save.rating,
      wins: save.wins,
      losses: save.losses,
      draws: save.draws,
    },
    bag: bagOf(save),
    canDecide,
    choices,
    actedToday: acted,
    hurt,
    mustRest: resting,
    pendingPostcard: pending ? { id: pending.id, title: pending.title } : null,
    latestPostcard: latest
      ? {
          id: latest.id,
          title: latest.title,
          locationName: latest.locationName,
          sentAt: latest.sentAt,
        }
      : null,
    latestBattle: latestBattle
      ? {
          result: latestBattle.result,
          title: latestBattle.title,
          opponentName: latestBattle.opponentName,
          createdAt: latestBattle.createdAt,
        }
      : null,
    rev: save.rev,
  };
}
