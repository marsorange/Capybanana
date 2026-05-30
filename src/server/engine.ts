// Server-side game engine. Reuses the exact same pure logic as the client
// (advanceLifecycle / resolveDay / applyOutcome) so the cloud pet behaves
// identically to a local one, and folds results into a CloudSave with a bumped
// rev + an activity-log entry.
import { advanceLifecycle, BATTLE, NO_AUTO_DEPART } from "@/game/clock";
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
  Companion,
  DayOutcome,
  DestinationTheme,
  Gesture,
  OutcomeKind,
  PackedItem,
  Trip,
  TripIntent,
} from "@/game/types";
import { randRange, uid } from "@/game/util";
import type { AgentEvent, CloudSave, DiaryEntry } from "./types";

const DESTINATION_THEMES = new Set<string>(DESTINATIONS.map((d) => d.theme));
const QUIET_MODES = new Set<string>(["home", "yard", "rest"]);

// At/above this injury the pet is "badly hurt" — it can't travel or battle, only
// stay home and recover (rest heals ~15/day, so a couple of quiet days fixes it).
export const HURT_THRESHOLD = 45;

/** The UTC calendar day a timestamp falls on (YYYY-MM-DD). */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Already spent today's one growth action (travel / battle / stay)? */
export function actedToday(save: CloudSave, now: number): boolean {
  return !!save.lastActionDay && save.lastActionDay === dayKey(now);
}

/** Too hurt to head out — must recover at home first. */
export function isHurt(save: CloudSave): boolean {
  return save.capyState.injury >= HURT_THRESHOLD;
}

/**
 * Why the agent can't start a new day right now (null = go ahead). Enforces the
 * core rhythm: at most one growth action per UTC day, and no heading out while
 * badly hurt.
 */
export function dayBlockedReason(
  save: CloudSave,
  now: number,
  action: "travel" | "battle" | "stay",
): string | null {
  if (save.companionState === "traveling")
    return "它已经出门了，等它回来再说";
  if (actedToday(save, now))
    return "今天它已经过完啦——一天陪它一次就好，明天再来吧";
  if ((action === "travel" || action === "battle") && isHurt(save))
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
    diary: [],
    lastActionDay: null,
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
 * — it waits in `ready` until the agent decides (travel / battle / stay), so
 * `departAt` is the never-fires sentinel.
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
      departAt: NO_AUTO_DEPART,
      willGo: false,
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

/** Agent decides: go on a journey. Resolves into a postcard when it returns. */
export function startTravel(
  save: CloudSave,
  opts: { destination?: string; note?: string },
  now: number,
): CloudSave {
  const companion = save.companion!;
  const { items, message, gesture } = bagSnapshot(save);
  const plan = planTrip(items, message);
  const destination: DestinationTheme =
    opts.destination && DESTINATION_THEMES.has(opts.destination)
      ? (opts.destination as DestinationTheme)
      : plan.destination;
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
    startedAt: now,
    durationMs: plan.durationMs,
    returnsAt: now + plan.durationMs,
  };
  return bump(
    {
      ...save,
      activeTrip: trip,
      companionState: "traveling",
      packedBag: null,
      pendingMessage: null,
      lastActionDay: dayKey(now),
    },
    now,
    { type: "departed", text: `${companion.name} 背上包裹，出门去远方了。` },
  );
}

/** Agent decides: go scrap with Claw. Resolves into win/lose/draw on return. */
export function startBattle(
  save: CloudSave,
  opts: { note?: string },
  now: number,
): CloudSave {
  const companion = save.companion!;
  const { items, message, gesture } = bagSnapshot(save);
  const durationMs = Math.round(randRange(BATTLE.awayMin, BATTLE.awayMax));
  const trip: Trip = {
    id: uid("trip"),
    companionId: companion.id,
    items,
    message,
    gesture,
    status: "traveling",
    destination: "town", // not surfaced for a battle
    intent: "claw",
    note: opts.note?.slice(0, 80),
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
      lastActionDay: dayKey(now),
    },
    now,
    { type: "departed", text: `${companion.name} 气鼓鼓地出门，去找 Claw 较量了。` },
  );
}

/** Agent decides: a low-key day at home/yard/rest. Resolves immediately. */
export function stayHome(
  save: CloudSave,
  opts: { mode?: string; note?: string },
  now: number,
): CloudSave {
  const companion = save.companion!;
  const { items, message, gesture } = bagSnapshot(save);
  const intent: TripIntent =
    opts.mode && QUIET_MODES.has(opts.mode) ? (opts.mode as OutcomeKind) : "quiet";
  const trip: Trip = {
    id: uid("trip"),
    companionId: companion.id,
    items,
    message,
    gesture,
    status: "returned",
    destination: "town", // unused for a stay-at-home day
    intent,
    note: opts.note?.slice(0, 80),
    startedAt: now,
    durationMs: 0,
    returnsAt: now,
  };
  const outcome = resolveDay(companion, save.capyState, trip);
  const next = foldOutcome(
    {
      ...save,
      packedBag: null,
      pendingMessage: null,
      companionState: "idle_home",
      lastActionDay: dayKey(now),
    },
    outcome,
    gesture === "pat",
    now,
  );
  return next;
}

/** A gentle head pat: small bond + mood. */
export function patHead(save: CloudSave, now: number): CloudSave {
  const capy = {
    ...save.capyState,
    bond: clamp(save.capyState.bond + 3),
    mood: clamp(save.capyState.mood + 2),
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

export const DIARY_MAX = 200;

/**
 * The agent writes today's diary in the pet's voice (<= 200 chars). At most one
 * entry per calendar day (UTC) — writing again the same day replaces it. A small
 * bond/mood bump rewards the daily ritual. Returns the unchanged save if empty.
 */
export function writeDiary(save: CloudSave, text: string, now: number): CloudSave {
  const clean = text.trim().slice(0, DIARY_MAX);
  if (!clean) return save;
  const day = new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const entry: DiaryEntry = {
    id: uid("diary"),
    day,
    text: clean,
    at: new Date(now).toISOString(),
    mood: save.capyState.mood,
  };
  const prior = save.diary ?? [];
  const existingIdx = prior.findIndex((d) => d.day === day);
  const updated = existingIdx >= 0;
  const diary = updated
    ? prior.map((d, i) => (i === existingIdx ? entry : d))
    : [entry, ...prior].slice(0, 90); // keep ~3 months of entries

  // The bond/mood bump rewards the *daily ritual*, so only the first entry of
  // the day earns it — rewriting the same day just replaces the text.
  const capy = updated
    ? save.capyState
    : {
        ...save.capyState,
        bond: clamp(save.capyState.bond + 3),
        mood: clamp(save.capyState.mood + 2),
      };
  const name = save.companion?.name ?? "它";
  return bump({ ...save, diary, capyState: capy }, now, {
    type: "diary",
    text: updated ? `${name} 改了改今天的日记。` : `${name} 写下了今天的日记。`,
  });
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
    curiosity: number;
    bravery: number;
    injury: number;
    bond: number;
  };
  traits: string[];
  recentMemories: string[];
  souvenirs: string[];
  bag: PetBag | null; // today's packed supplies (null if nothing packed)
  canDecide: boolean; // true when you can still start today's action (home/ready, not yet acted, not too hurt to do anything)
  choices: string[]; // the actions allowed right now ([] while traveling / already acted; ["stay"] only when badly hurt)
  actedToday: boolean; // already spent today's one growth action (travel/battle/stay)?
  hurt: boolean; // too injured to travel/battle — needs to rest at home first
  pendingPostcard: { id: string; title: string } | null;
  latestPostcard: {
    id: string;
    title: string;
    locationName: string;
    sentAt: string;
  } | null;
  latestDiary: { day: string; text: string; at: string } | null; // most recent diary
  wroteDiaryToday: boolean; // already journaled today (UTC)?
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
    return `${last}${name} 今天的事都忙完啦，明天再陪它出门——现在还能摸摸头、说说话、写写日记。`;
  }

  const decision = isHurt(save)
    ? `它伤得不轻，今天先让它 stay（rest）在家养伤吧。`
    : `等你替它拿主意：今天去旅行、去找 Claw 较量、还是在家待着？`;
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
  const canDecide = save.companionState !== "traveling" && !acted;
  const choices = canDecide
    ? hurt
      ? ["stay"] // badly hurt → can only recover at home
      : ["travel", "battle", "stay"]
    : [];
  const diary = save.diary ?? [];
  const latestDiary = diary[0]
    ? { day: diary[0].day, text: diary[0].text, at: diary[0].at }
    : null;
  const today = dayKey(now);
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
      curiosity: cap.curiosity,
      bravery: cap.bravery,
      injury: cap.injury,
      bond: cap.bond,
    },
    traits: cap.traits,
    recentMemories: cap.memories.slice(0, 5),
    souvenirs: save.souvenirs.slice(0, 5),
    bag: bagOf(save),
    canDecide,
    choices,
    actedToday: acted,
    hurt,
    pendingPostcard: pending ? { id: pending.id, title: pending.title } : null,
    latestPostcard: latest
      ? {
          id: latest.id,
          title: latest.title,
          locationName: latest.locationName,
          sentAt: latest.sentAt,
        }
      : null,
    latestDiary,
    wroteDiaryToday: latestDiary?.day === today,
    rev: save.rev,
  };
}
