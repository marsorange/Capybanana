// Server-side game engine. Reuses the exact same pure logic as the client
// (advanceLifecycle / resolveDay / applyOutcome) so the cloud pet behaves
// identically to a local one, and folds results into a CloudSave with a bumped
// rev + an activity-log entry.
import { advanceLifecycle, scheduleDeparture } from "@/game/clock";
import { applyOutcome, clamp } from "@/game/applyOutcome";
import { DEFAULT_CAPY } from "@/game/defaults";
import type { CompanionDraft } from "@/game/randomCompanion";
import type { Companion, Gesture, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import type { AgentEvent, CloudSave } from "./types";

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
    const o = out.outcome;
    const patted = out.activeTrip?.gesture === "pat";
    const merged = applyOutcome(
      {
        capy: next.capyState,
        souvenirs: next.souvenirs,
        misunderstandings: next.misunderstandings,
      },
      o,
      patted,
    );
    next = {
      ...next,
      capyState: merged.capy,
      souvenirs: merged.souvenirs,
      misunderstandings: merged.misunderstandings,
      lastResult: o,
    };
    if (o.postcard) {
      next.pendingPostcardId = o.postcard.id;
      next = bump(next, now, {
        type: "postcard",
        text: `${name} 寄回了一张明信片：「${o.postcard.title}」。`,
        postcardId: o.postcard.id,
      });
    } else {
      next = bump(next, now, {
        type: "returned",
        text: `${name} 回来了：${o.title}。${o.story}`,
      });
    }
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
  };
  return bump(base, now, {
    type: "created",
    text: `${companion.name} 住进了小屋。`,
  });
}

/** Pack today's bag and schedule the companion's own departure. */
export function packBag(
  save: CloudSave,
  items: PackedItem[],
  message: string,
  gesture: Gesture | undefined,
  now: number,
): CloudSave {
  const finalMessage = (message || save.pendingMessage || "").trim();
  const decision = scheduleDeparture(now);
  const base: CloudSave = {
    ...save,
    packedBag: {
      items,
      message: finalMessage,
      gesture,
      packedAt: now,
      departAt: decision.departAt,
      willGo: decision.willGo,
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

// ---- Agent-facing projection -------------------------------------------------

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
  pendingPostcard: { id: string; title: string } | null;
  latestPostcard: {
    id: string;
    title: string;
    locationName: string;
    sentAt: string;
  } | null;
  rev: number;
}

function describeToday(save: CloudSave): string {
  const name = save.companion?.name ?? "它";
  if (save.companionState === "traveling") return `${name} 正在外面旅行。`;
  if (save.companionState === "ready") return `${name} 的今日包裹已备好，随时可能出发。`;
  if (save.pendingPostcardId) return `${name} 旅行回来了，还有一张明信片没拆。`;
  if (save.lastResult) return `${name} 在家：${save.lastResult.title}。`;
  return `${name} 待在小屋里，等你来陪它。`;
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
  return {
    name: c.name,
    type: c.type,
    personality: c.personality,
    accessory: c.accessory,
    color: c.primaryColor,
    state: save.companionState,
    today: describeToday(save),
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
    pendingPostcard: pending ? { id: pending.id, title: pending.title } : null,
    latestPostcard: latest
      ? {
          id: latest.id,
          title: latest.title,
          locationName: latest.locationName,
          sentAt: latest.sentAt,
        }
      : null,
    rev: save.rev,
  };
}
