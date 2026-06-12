// SQL repository: users, agent tokens, and the per-pet CloudSaveDTO projection.
// The route layer still speaks the old CloudSave shape while storage is now split
// across the relational tables in supabase/migrations/0001_storage_refactor.sql.
import { createHash, randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";

import { DEFAULT_CAPY } from "@/game/defaults";
import type {
  BattleRecord,
  BattleResult,
  BattleSnapshot,
  Companion,
  CompanionState,
  DayOutcome,
  PackedBag,
  PackedItem,
  Postcard,
  Rarity,
  Trip,
} from "@/game/types";
import { ALL_CARD_IDS, cardId } from "@/game/gacha";
import { newToken, tokenHash } from "./bind";
import { sqlDb } from "./db";
import type { AgentEvent, AgentEventType, CloudSave, User } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEV_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

type Query = Sql | TransactionSql;

interface UserRow {
  id: string;
  supabase_user_id: string;
  email: string | null;
  pet_id: string | null;
  created_at: Date | string;
}

interface PetRow {
  id: string;
  legacy_companion_id: string | null;
  name: string;
  species: Companion["type"];
  primary_color: string;
  personality: Companion["personality"];
  accessory: Companion["accessory"];
  mood: number;
  energy: number;
  courage: number;
  curiosity: number;
  injury: number;
  traits: string[];
  memories: string[];
  souvenirs: string[];
  last_result: DayOutcome | null;
  state: CompanionState;
  last_action_day: Date | string | null;
  rest_until_day: Date | string | null;
  pending_message: string | null;
  pending_stress: string | null;
  pending_stress_note: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  companion_days: number;
  pulls_since_rare: number;
  active_trip_id: string | null;
  rev: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BattleRow {
  legacy_id: string | null;
  day: Date | string;
  defender_pet_id: string | null;
  is_npc: boolean;
  defender_snapshot: BattleSnapshot;
  result: BattleResult;
  attacker_injury: number;
  attacker_rating_delta: number;
  spoils: string | null;
  title: string;
  story: string;
  created_at: Date | string;
}

interface BagRow {
  items: PackedItem[];
  message: string;
  gesture: PackedBag["gesture"] | null;
  packed_at: Date | string;
}

interface TripRow {
  id: string;
  legacy_id: string | null;
  kind: "travel" | "stay";
  intent: Trip["intent"] | null;
  destination_theme: Trip["destination"] | null;
  status: "started" | "resolved" | "canceled";
  agent_note: string | null;
  message: string;
  gesture: Trip["gesture"] | null;
  items_snapshot: PackedItem[];
  started_at: Date | string;
  returns_at: Date | string | null;
  resolved_at: Date | string | null;
}

interface PostcardRow {
  legacy_id: string | null;
  trip_legacy_id: string | null;
  destination_theme: Postcard["destinationTheme"];
  location_name: string;
  rarity: Rarity | null;
  title: string;
  message: string;
  reason: string | null;
  image_key: string | null;
  collected: boolean;
  sent_at: Date | string;
}

interface ActivityRow {
  id: number;
  legacy_seq: number | null;
  kind: string;
  title: string;
  payload: {
    event_type?: AgentEventType;
    text?: string;
    postcardId?: string;
    stress?: string;
  } | null;
  created_at: Date | string;
}

export function emptySave(): CloudSave {
  return {
    companion: null,
    capyState: DEFAULT_CAPY,
    companionState: "idle_home",
    packedBag: null,
    activeTrip: null,
    postcards: [],
    souvenirs: [],
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
    companionDays: 0,
    pullsSinceRare: 0,
    cardDex: [],
    rev: 0,
    updatedAt: new Date().toISOString(),
    events: [],
  };
}

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function day(value: Date | string | null): string | null {
  if (!value) return null;
  return iso(value).slice(0, 10);
}

function dateFromMs(value: number | null | undefined): Date | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value) : null;
}

function ms(value: Date | string | null | undefined): number {
  return value ? new Date(value).getTime() : Date.now();
}

function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`;
}

function uuidV5(name: string): string {
  const hash = createHash("sha1")
    .update(uuidBytes(DEV_UUID_NAMESPACE))
    .update(name)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return formatUuid(hash.subarray(0, 16));
}

function stableAuthUuid(kind: "supabase" | "dev", identity: string): string {
  if (kind === "supabase" && UUID_RE.test(identity)) return identity;
  return uuidV5(`${kind}:${identity}`);
}

function userFromRow(row: UserRow, bindToken: string): User {
  return {
    id: row.id,
    supabaseUserId: row.supabase_user_id,
    email: row.email,
    bindToken,
    petId: row.pet_id ?? randomUUID(),
    createdAt: iso(row.created_at),
  };
}

function stripStoredItem(item: PackedItem): PackedItem {
  const rest = { ...item };
  delete rest.photo;
  return rest;
}

function stripStoredItems(items: PackedItem[] | undefined): PackedItem[] {
  return (items ?? []).slice(0, 3).map(stripStoredItem);
}

function tripKind(trip: Trip): "travel" | "stay" {
  if (
    trip.intent === "home" ||
    trip.intent === "yard" ||
    trip.intent === "rest" ||
    trip.intent === "quiet"
  )
    return "stay";
  return "travel";
}

function eventKind(type: AgentEventType): string {
  switch (type) {
    case "created":
      return "adopt";
    case "packed":
      return "pack";
    case "bagExpired":
      return "pack"; // activities.kind has no 'bagExpired'; payload keeps the real type
    case "said":
      return "say";
    case "checkin":
      return "say"; // activities.kind has no 'checkin'; payload keeps the real type
    case "pat":
      return "pat";
    case "battle":
      return "battle";
    case "challenged":
      return "challenged";
    case "departed":
    case "returned":
    case "postcard":
      return "travel";
    default:
      return "say"; // legacy/unknown event types (e.g. old "restyled") log as a generic note
  }
}

// Bind tokens are split into two isolated scopes (see 0006_token_scopes.sql):
//   'web'   — browser session credential. MANY can be active at once: each login
//             mints one and never revokes its siblings, so the owner can be
//             signed in on several devices/tabs simultaneously (a web session is
//             an account thing, unrelated to the Agent).
//   'agent' — the single bind link the Agent holds. Rotated (revoke-then-mint)
//             only on explicit "换 Agent / 重新生成连接", so swapping Agents
//             drops exactly the old Agent and nothing else.
type TokenScope = "web" | "agent";

/** Mint a fresh token of a scope WITHOUT touching any existing token. */
async function mintToken(
  tx: Query,
  userId: string,
  scope: TokenScope,
): Promise<string> {
  const token = newToken();
  await tx`
    insert into agent_tokens (user_id, token_hash, name)
    values (${userId}::uuid, ${tokenHash(token)}, ${scope})
  `;
  return token;
}

/** Revoke the active token(s) of a scope, then mint a fresh one. */
async function rotateToken(
  tx: Query,
  userId: string,
  scope: TokenScope,
): Promise<string> {
  await tx`
    update agent_tokens
    set revoked_at = now()
    where user_id = ${userId}::uuid and name = ${scope} and revoked_at is null
  `;
  return mintToken(tx, userId, scope);
}

async function hasActiveToken(
  tx: Query,
  userId: string,
  scope: TokenScope,
): Promise<boolean> {
  const rows = await tx<{ one: number }[]>`
    select 1 as one
    from agent_tokens
    where user_id = ${userId}::uuid and name = ${scope} and revoked_at is null
    limit 1
  `;
  return rows.length > 0;
}

async function loadSave(tx: Query, petId: string): Promise<CloudSave> {
  const petRows = await tx<PetRow[]>`
    select *
    from pets
    where id = ${petId}::uuid
    limit 1
  `;
  const pet = petRows[0];
  if (!pet) return emptySave();

  const bagRows = await tx<BagRow[]>`
    select items, message, gesture, packed_at
    from bags
    where pet_id = ${petId}::uuid and status = 'ready'
    order by packed_at desc
    limit 1
  `;
  const bag = bagRows[0];

  const tripRows = pet.active_trip_id
    ? await tx<TripRow[]>`
        select *
        from trips
        where id = ${pet.active_trip_id}::uuid
        limit 1
      `
    : [];
  const activeTrip = tripRows[0] ? tripFromRow(tripRows[0], pet) : null;

  const postcardRows = await tx<PostcardRow[]>`
    select
      p.*,
      t.legacy_id as trip_legacy_id
    from postcards p
    left join trips t on t.id = p.trip_id
    where p.pet_id = ${petId}::uuid
    order by p.sent_at desc
  `;

  const activityRows = await tx<ActivityRow[]>`
    select id, legacy_seq, kind, title, payload, created_at
    from activities
    where pet_id = ${petId}::uuid and legacy_seq is not null
    order by legacy_seq asc
    limit 50
  `;

  const battleRows = await tx<BattleRow[]>`
    select
      legacy_id, day, defender_pet_id, is_npc, defender_snapshot, result,
      attacker_injury, attacker_rating_delta, spoils, title, story, created_at
    from battles
    where attacker_pet_id = ${petId}::uuid
    order by created_at desc
    limit 20
  `;

  const postcards = postcardRows.map(postcardFromRow);
  const pending = postcardRows.find((p: PostcardRow) => !p.collected);

  return {
    companion: {
      id: pet.legacy_companion_id ?? pet.id,
      name: pet.name,
      type: pet.species,
      primaryColor: pet.primary_color,
      personality: pet.personality,
      accessory: pet.accessory,
      createdAt: iso(pet.created_at),
    },
    capyState: {
      mood: pet.mood,
      energy: pet.energy,
      courage: pet.courage,
      curiosity: pet.curiosity ?? 50,
      injury: pet.injury,
      traits: pet.traits ?? [],
      memories: pet.memories ?? [],
    },
    companionState: pet.state,
    packedBag: bag
      ? {
          items: bag.items ?? [],
          message: bag.message,
          gesture: bag.gesture ?? undefined,
          packedAt: ms(bag.packed_at),
        }
      : null,
    activeTrip,
    postcards,
    souvenirs: pet.souvenirs ?? [],
    lastResult: pet.last_result,
    pendingPostcardId: pending ? (pending.legacy_id ?? "") : null,
    pendingMessage: pet.pending_message,
    lastActionDay: day(pet.last_action_day),
    restUntilDay: day(pet.rest_until_day),
    pendingStress: pet.pending_stress,
    pendingStressNote: pet.pending_stress_note,
    rating: Number(pet.rating ?? 1000),
    wins: Number(pet.wins ?? 0),
    losses: Number(pet.losses ?? 0),
    draws: Number(pet.draws ?? 0),
    battleRecords: battleRows.map(battleFromRow),
    companionDays: Number(pet.companion_days ?? 0),
    pullsSinceRare: Number(pet.pulls_since_rare ?? 0),
    // The 图鉴 is derived from the stored postcards: one unique slot per
    // (destination × rarity) collected. Filtered to the current 24-card set so
    // legacy postcards on retired themes/rarities don't count.
    cardDex: Array.from(
      new Set(
        postcardRows.map((p) => cardId(p.destination_theme, coerceRarity(p.rarity))),
      ),
    ).filter((id) => ALL_CARD_IDS.has(id)),
    rev: Number(pet.rev),
    updatedAt: iso(pet.updated_at),
    events: activityRows
      .map(eventFromRow)
      .filter((e: AgentEvent | null): e is AgentEvent => !!e),
  };
}

function battleFromRow(row: BattleRow): BattleRecord {
  const snap = row.defender_snapshot;
  return {
    id: row.legacy_id ?? "",
    day: day(row.day) ?? iso(row.created_at).slice(0, 10),
    opponentName: snap?.name ?? "神秘对手",
    opponentSpecies: snap?.species ?? "capybara",
    opponentPersonality: snap?.personality,
    opponentAccessory: snap?.accessory,
    opponentColor: snap?.color,
    isNpc: row.is_npc,
    result: row.result,
    title: row.title,
    story: row.story,
    injury: row.attacker_injury,
    spoils: row.spoils ?? undefined,
    ratingDelta: row.attacker_rating_delta,
    createdAt: iso(row.created_at),
  };
}

function tripFromRow(row: TripRow, pet: PetRow): Trip {
  return {
    id: row.legacy_id ?? row.id,
    companionId: pet.legacy_companion_id ?? pet.id,
    items: row.items_snapshot ?? [],
    message: row.message,
    gesture: row.gesture ?? undefined,
    status: row.status === "started" ? "traveling" : "returned",
    destination: row.destination_theme ?? "town",
    intent: row.intent ?? undefined,
    note: row.agent_note ?? undefined,
    startedAt: ms(row.started_at),
    durationMs:
      row.returns_at && row.started_at
        ? Math.max(0, ms(row.returns_at) - ms(row.started_at))
        : 0,
    returnsAt: ms(row.returns_at ?? row.started_at),
  };
}

// Map any stored rarity onto the current 3-tier set (legacy 传说 SSR → 史诗 SR,
// unknown → N) so the UI never indexes a missing RARITY_META entry, even before
// migration 0004 has run.
function coerceRarity(r: string | null | undefined): Rarity {
  if (r === "R" || r === "SR") return r;
  if (r === "SSR") return "SR";
  return "N";
}

function postcardFromRow(row: PostcardRow): Postcard {
  return {
    id: row.legacy_id ?? "",
    tripId: row.trip_legacy_id ?? "",
    companionId: "",
    locationName: row.location_name,
    destinationTheme: row.destination_theme,
    rarity: coerceRarity(row.rarity),
    title: row.title,
    message: row.message,
    reason: row.reason ?? "",
    imageKey: row.image_key ?? row.destination_theme,
    sentAt: iso(row.sent_at),
  };
}

function eventFromRow(row: ActivityRow): AgentEvent | null {
  const type = row.payload?.event_type;
  if (!type) return null;
  return {
    seq: row.legacy_seq ?? row.id,
    at: iso(row.created_at),
    type,
    text: row.payload?.text ?? row.title,
    postcardId: row.payload?.postcardId,
    stress: row.payload?.stress,
  };
}

async function syncReadyBag(tx: Query, petId: string, bag: PackedBag | null): Promise<void> {
  if (!bag) {
    await tx`
      update bags
      set status = 'consumed', consumed_at = coalesce(consumed_at, now())
      where pet_id = ${petId}::uuid and status = 'ready'
    `;
    return;
  }

  await tx`
    insert into bags (legacy_id, pet_id, message, gesture, items, status, packed_at)
    values (
      ${`ready:${petId}`},
      ${petId}::uuid,
      ${bag.message},
      ${bag.gesture ?? null},
      ${tx.json(stripStoredItems(bag.items) as never)},
      'ready',
      ${dateFromMs(bag.packedAt)}
    )
    on conflict (legacy_id) do update set
      message = excluded.message,
      gesture = excluded.gesture,
      items = excluded.items,
      status = 'ready',
      packed_at = excluded.packed_at,
      consumed_at = null
  `;
}

async function upsertTrip(tx: Query, petId: string, trip: Trip): Promise<string> {
  const rows = await tx<{ id: string }[]>`
    insert into trips (
      legacy_id, pet_id, kind, intent, destination_theme, status, agent_note,
      message, gesture, items_snapshot, started_at, returns_at, resolved_at
    )
    values (
      ${trip.id},
      ${petId}::uuid,
      ${tripKind(trip)},
      ${trip.intent ?? null},
      ${trip.destination},
      ${trip.status === "traveling" ? "started" : "resolved"},
      ${trip.note ?? null},
      ${trip.message},
      ${trip.gesture ?? null},
      ${tx.json(stripStoredItems(trip.items) as never)},
      ${dateFromMs(trip.startedAt)},
      ${dateFromMs(trip.returnsAt)},
      ${trip.status === "returned" ? dateFromMs(trip.returnsAt) : null}
    )
    on conflict (legacy_id) do update set
      kind = excluded.kind,
      intent = excluded.intent,
      destination_theme = excluded.destination_theme,
      status = excluded.status,
      agent_note = excluded.agent_note,
      message = excluded.message,
      gesture = excluded.gesture,
      items_snapshot = excluded.items_snapshot,
      started_at = excluded.started_at,
      returns_at = excluded.returns_at,
      resolved_at = excluded.resolved_at
    returning id
  `;
  return rows[0].id;
}

async function tripUuidForLegacy(
  tx: Query,
  petId: string,
  legacyId: string | null | undefined,
): Promise<string | null> {
  if (!legacyId) return null;
  const rows = await tx<{ id: string }[]>`
    select id
    from trips
    where pet_id = ${petId}::uuid and legacy_id = ${legacyId}
    limit 1
  `;
  return rows[0]?.id ?? null;
}

async function syncPostcards(
  tx: Query,
  petId: string,
  cards: Postcard[],
  pendingPostcardId: string | null,
): Promise<void> {
  for (const card of cards) {
    const tripId = await tripUuidForLegacy(tx, petId, card.tripId);
    await tx`
      insert into postcards (
        legacy_id, pet_id, trip_id, destination_theme, location_name, rarity,
        title, message, reason, image_key, collected, sent_at
      )
      values (
        ${card.id},
        ${petId}::uuid,
        ${tripId ? tx`${tripId}::uuid` : null},
        ${card.destinationTheme},
        ${card.locationName},
        ${card.rarity},
        ${card.title},
        ${card.message},
        ${card.reason},
        ${card.imageKey},
        ${card.id !== pendingPostcardId},
        ${new Date(card.sentAt)}
      )
      on conflict (legacy_id) do update set
        trip_id = excluded.trip_id,
        destination_theme = excluded.destination_theme,
        location_name = excluded.location_name,
        rarity = excluded.rarity,
        title = excluded.title,
        message = excluded.message,
        reason = excluded.reason,
        image_key = excluded.image_key,
        collected = excluded.collected,
        sent_at = excluded.sent_at
    `;
  }

  if (!pendingPostcardId) {
    await tx`
      update postcards
      set collected = true
      where pet_id = ${petId}::uuid
    `;
  }
}

async function syncEvents(
  tx: Query,
  petId: string,
  events: AgentEvent[],
): Promise<void> {
  for (const event of events ?? []) {
    await tx`
      insert into activities (
        legacy_seq, pet_id, actor, kind, day, title, payload, postcard_id, created_at
      )
      values (
        ${event.seq},
        ${petId}::uuid,
        ${event.type === "created" ? "pet" : "agent"},
        ${eventKind(event.type)},
        ${event.at.slice(0, 10)}::date,
        ${event.text},
        ${tx.json({
          event_type: event.type,
          text: event.text,
          postcardId: event.postcardId,
          stress: event.stress,
        } as never)},
        null,
        ${new Date(event.at)}
      )
      on conflict (pet_id, legacy_seq) where legacy_seq is not null do update set
        actor = excluded.actor,
        kind = excluded.kind,
        day = excluded.day,
        title = excluded.title,
        payload = excluded.payload,
        created_at = excluded.created_at
    `;
  }
}

export interface LoginOutcome {
  user: User; // user.bindToken is a fresh WEB session token (multi-device safe)
  save: CloudSave;
  isNew: boolean;
  // The Agent's bind-link token (plaintext, for building connectUrl). Set ONLY
  // when the account has no active 'agent' token yet (first time on this
  // account); otherwise null, because the token is stored hashed and we won't
  // re-mint an existing link (that would disconnect the live Agent). The web
  // then reuses its persisted connectUrl, or the owner regenerates explicitly.
  connectToken: string | null;
}

async function loginByIdentity(
  kind: "supabase" | "dev",
  identity: string,
  email: string | null,
): Promise<LoginOutcome> {
  const sql = sqlDb();
  const authUuid = stableAuthUuid(kind, identity);

  return await sql.begin(async (tx) => {
    const rows = await tx<UserRow[]>`
      select *
      from users
      where supabase_user_id = ${authUuid}::uuid
      limit 1
    `;

    let row = rows[0];
    let isNew = false;
    if (!row) {
      const created = await tx<UserRow[]>`
        insert into users (supabase_user_id, email, pet_id, last_seen_at)
        values (${authUuid}::uuid, ${email}, ${randomUUID()}::uuid, now())
        returning *
      `;
      row = created[0];
      isNew = true;
    } else {
      const petId = row.pet_id ?? randomUUID();
      const updated = await tx<UserRow[]>`
        update users
        set
          email = coalesce(${email}, email),
          pet_id = ${petId}::uuid,
          last_seen_at = now()
        where id = ${row.id}::uuid
        returning *
      `;
      row = updated[0];
    }

    // Hand the browser its own fresh web-session token (cloud.bindToken). We
    // never revoke sibling web tokens, so the owner stays signed in across
    // devices/tabs; this never touches the Agent's 'agent' token.
    const webToken = await mintToken(tx, row.id, "web");
    const save = row.pet_id ? await loadSave(tx, row.pet_id) : emptySave();

    // Mint the Agent bind link only if the account has none yet (first time on
    // this account). If one already exists we leave it alone — re-minting would
    // disconnect the live Agent, and a second device that just wants to view the
    // link can regenerate it explicitly. (Tokens are hashed, so we can only hand
    // back plaintext at mint time → connectToken is null whenever we don't mint.)
    const connectToken = (await hasActiveToken(tx, row.id, "agent"))
      ? null
      : await mintToken(tx, row.id, "agent");

    const user = userFromRow(row, webToken);
    return { user, save, isNew, connectToken };
  });
}

/**
 * Find or create the account for a verified Supabase Auth user. The Supabase
 * user id is the stable identity; email is stored for display and kept fresh.
 */
export async function loginBySupabase(
  supabaseUserId: string,
  email: string | null,
): Promise<LoginOutcome> {
  return loginByIdentity("supabase", supabaseUserId, email);
}

/**
 * Local debug login without a third-party auth provider. This is only meant for
 * local development where the identity is supplied by the developer.
 */
export async function loginByDevIdentity(
  identity: string,
  email: string | null,
): Promise<LoginOutcome> {
  return loginByIdentity("dev", identity, email);
}

/**
 * The owner's deliberate "重新生成连接 / 换 Agent": mint a fresh 'agent' bind
 * link, revoking the previous one. The displaced Agent's next call then resolves
 * as `revoked` (a terminal 401), so it stops its daily loop instead of polling
 * forever. Returns the new token's plaintext (only available at mint time).
 */
export async function regenerateAgentLink(userId: string): Promise<string> {
  const sql = sqlDb();
  return sql.begin((tx) => rotateToken(tx, userId, "agent"));
}

/**
 * When the active 'agent' bind token was last presented to any endpoint.
 * resolveBind stamps last_used_at on every use and only the Agent holds this
 * token, so this reads as "the Agent's last visit" — non-null means it has at
 * least read skill.md. null = token never used yet (or no active agent token).
 * The connect gate polls this to show 接入 progress before the pet exists.
 */
export async function agentSeenAt(userId: string): Promise<string | null> {
  const sql = sqlDb();
  const rows = await sql<{ last_used_at: Date | string | null }[]>`
    select last_used_at
    from agent_tokens
    where user_id = ${userId}::uuid and name = 'agent' and revoked_at is null
    order by created_at desc
    limit 1
  `;
  const at = rows[0]?.last_used_at;
  return at ? iso(at) : null;
}

// Outcome of resolving a bind token. `revoked` vs `unknown` is the signal the
// route layer turns into a *terminal* 401 (vs a transient 5xx): a revoked token
// means the owner regenerated the link / swapped Agents, so the caller should
// stop, not retry. (Both web and agent scopes resolve the same way — scope only
// governs rotation, not access.)
export type BindResolution =
  | { status: "ok"; user: User; save: CloudSave }
  | { status: "revoked" }
  | { status: "unknown" };

/** Resolve a bind token (web or agent scope) to its owner + current pet save. */
export async function resolveBind(token: string): Promise<BindResolution> {
  const sql = sqlDb();
  const hash = tokenHash(token);
  // token_hash is unique, so this is at most one row whether or not it's revoked.
  const rows = await sql<(UserRow & { tok_revoked_at: Date | string | null })[]>`
    select u.*, t.revoked_at as tok_revoked_at
    from agent_tokens t
    join users u on u.id = t.user_id
    where t.token_hash = ${hash}
    limit 1
  `;
  const row = rows[0];
  if (!row) return { status: "unknown" };
  // Hash matched a token that was rotated out — the connection was replaced.
  if (row.tok_revoked_at) return { status: "revoked" };
  // pet_id is set for every account at login; missing it means a malformed row.
  if (!row.pet_id) return { status: "unknown" };

  await sql`
    update agent_tokens
    set last_used_at = now()
    where token_hash = ${hash}
  `;

  return {
    status: "ok",
    user: userFromRow(row, token),
    save: await loadSave(sql, row.pet_id),
  };
}

/**
 * Atomically claim today as the pet's one main-action day (travel/battle/stay).
 * The app-level `actedToday` check reads a snapshot, so two near-simultaneous
 * /api/agent/day calls could both pass it and the later savePet would overwrite
 * the first decision (the upsert is last-write-wins). This conditional UPDATE
 * is the tiebreaker: exactly one caller flips last_action_day to `day`; the
 * loser gets `false` and must refuse WITHOUT saving its stale snapshot.
 */
export async function claimActionDay(
  petId: string,
  day: string,
): Promise<boolean> {
  const sql = sqlDb();
  const rows = await sql<{ id: string }[]>`
    update pets
    set last_action_day = ${day}::date
    where id = ${petId}::uuid
      and (last_action_day is null or last_action_day < ${day}::date)
    returning id
  `;
  return rows.length > 0;
}

export async function savePet(petId: string, save: CloudSave): Promise<void> {
  if (!save.companion) return;

  const sql = sqlDb();
  await sql.begin(async (tx) => {
    const owners = await tx<{ id: string }[]>`
      select id
      from users
      where pet_id = ${petId}::uuid
      limit 1
    `;
    const owner = owners[0];
    if (!owner) throw new Error(`No owner found for pet ${petId}`);

    const c = save.companion!;
    const cap = save.capyState;

    await tx`
      insert into pets (
        id, legacy_companion_id, owner_id, name, species, primary_color,
        personality, accessory, mood, energy, courage, curiosity, injury,
        traits, memories, souvenirs, last_result, state,
        last_action_day, rest_until_day, pending_message, pending_stress,
        pending_stress_note, rating, wins, losses, draws,
        companion_days, pulls_since_rare, rev,
        created_at, updated_at
      )
      values (
        ${petId}::uuid,
        ${c.id},
        ${owner.id}::uuid,
        ${c.name},
        ${c.type},
        ${c.primaryColor},
        ${c.personality},
        ${c.accessory},
        ${cap.mood},
        ${cap.energy},
        ${cap.courage},
        ${cap.curiosity},
        ${cap.injury},
        ${cap.traits}::text[],
        ${cap.memories}::text[],
        ${save.souvenirs ?? []}::text[],
        ${save.lastResult ? tx.json(save.lastResult as never) : null},
        ${save.companionState},
        ${save.lastActionDay ? tx`${save.lastActionDay}::date` : null},
        ${save.restUntilDay ? tx`${save.restUntilDay}::date` : null},
        ${save.pendingMessage},
        ${save.pendingStress},
        ${save.pendingStressNote},
        ${save.rating},
        ${save.wins},
        ${save.losses},
        ${save.draws},
        ${save.companionDays},
        ${save.pullsSinceRare},
        ${save.rev},
        ${new Date(c.createdAt)},
        ${new Date(save.updatedAt)}
      )
      on conflict (id) do update set
        legacy_companion_id = excluded.legacy_companion_id,
        name = excluded.name,
        species = excluded.species,
        primary_color = excluded.primary_color,
        personality = excluded.personality,
        accessory = excluded.accessory,
        mood = excluded.mood,
        energy = excluded.energy,
        courage = excluded.courage,
        curiosity = excluded.curiosity,
        injury = excluded.injury,
        traits = excluded.traits,
        memories = excluded.memories,
        souvenirs = excluded.souvenirs,
        last_result = excluded.last_result,
        state = excluded.state,
        last_action_day = excluded.last_action_day,
        rest_until_day = excluded.rest_until_day,
        pending_message = excluded.pending_message,
        pending_stress = excluded.pending_stress,
        pending_stress_note = excluded.pending_stress_note,
        rating = excluded.rating,
        wins = excluded.wins,
        losses = excluded.losses,
        draws = excluded.draws,
        companion_days = excluded.companion_days,
        pulls_since_rare = excluded.pulls_since_rare,
        rev = excluded.rev,
        updated_at = excluded.updated_at
    `;

    await syncReadyBag(tx, petId, save.packedBag);

    const activeTripId = save.activeTrip
      ? await upsertTrip(tx, petId, save.activeTrip)
      : null;

    await syncPostcards(tx, petId, save.postcards ?? [], save.pendingPostcardId);
    await syncEvents(tx, petId, save.events ?? []);

    await tx`
      update pets
      set active_trip_id = ${activeTripId ? tx`${activeTripId}::uuid` : null}
      where id = ${petId}::uuid
    `;
  });
}

/** Load a pet's save by id (used by background postcard-image generation). */
export async function loadPet(petId: string): Promise<CloudSave | null> {
  const save = await loadSave(sqlDb(), petId);
  return save.companion ? save : null;
}

// --- Battle: matchmaking pool + records --------------------------------------

export interface PoolOpponent {
  petId: string;
  snapshot: BattleSnapshot;
}

/** Draw a recent battle-pool opponent from a DIFFERENT owner (null → use NPC). */
export async function findBattleOpponent(
  petId: string,
  ownerId: string,
): Promise<PoolOpponent | null> {
  const sql = sqlDb();
  const rows = await sql<{ pet_id: string; snapshot: BattleSnapshot }[]>`
    select pet_id, snapshot
    from battle_pool
    where owner_id <> ${ownerId}::uuid
      and pet_id <> ${petId}::uuid
      and updated_at > now() - interval '7 days'
    order by random()
    limit 1
  `;
  const row = rows[0];
  return row ? { petId: row.pet_id, snapshot: row.snapshot } : null;
}

export interface BattleWrite {
  legacyId: string;
  day: string; // YYYY-MM-DD
  attackerSnapshot: BattleSnapshot;
  defenderPetId: string | null;
  defenderSnapshot: BattleSnapshot;
  isNpc: boolean;
  result: BattleResult;
  attackerInjury: number;
  attackerRatingDelta: number;
  newRating: number;
  spoils?: string;
  title: string;
  story: string;
}

/** Persist a battle row and refresh the attacker's matchmaking-pool snapshot. */
export async function recordBattle(
  petId: string,
  ownerId: string,
  b: BattleWrite,
): Promise<void> {
  const sql = sqlDb();
  await sql.begin(async (tx) => {
    await tx`
      insert into battles (
        legacy_id, day, attacker_pet_id, defender_pet_id, is_npc,
        attacker_snapshot, defender_snapshot, result,
        attacker_rating_delta, defender_rating_delta, attacker_injury,
        spoils, title, story
      )
      values (
        ${b.legacyId},
        ${b.day}::date,
        ${petId}::uuid,
        ${b.defenderPetId ? tx`${b.defenderPetId}::uuid` : null},
        ${b.isNpc},
        ${tx.json(b.attackerSnapshot as never)},
        ${tx.json(b.defenderSnapshot as never)},
        ${b.result},
        ${b.attackerRatingDelta},
        ${0},
        ${b.attackerInjury},
        ${b.spoils ?? null},
        ${b.title},
        ${b.story}
      )
      on conflict (legacy_id) do nothing
    `;

    await tx`
      insert into battle_pool (pet_id, owner_id, snapshot, rating, updated_at)
      values (
        ${petId}::uuid,
        ${ownerId}::uuid,
        ${tx.json(b.attackerSnapshot as never)},
        ${b.newRating},
        now()
      )
      on conflict (pet_id) do update set
        owner_id = excluded.owner_id,
        snapshot = excluded.snapshot,
        rating = excluded.rating,
        updated_at = now()
    `;
  });
}
