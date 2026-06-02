// SQL repository: users, agent tokens, and the per-pet CloudSaveDTO projection.
// The route layer still speaks the old CloudSave shape while storage is now split
// across the relational tables in supabase/migrations/0001_storage_refactor.sql.
import { createHash, randomUUID } from "node:crypto";

import { NO_AUTO_DEPART } from "@/game/clock";
import { DEFAULT_CAPY } from "@/game/defaults";
import type {
  BattleRecord,
  Companion,
  CompanionState,
  DayOutcome,
  PackedBag,
  PackedItem,
  Postcard,
  Trip,
} from "@/game/types";
import { newToken, tokenHash } from "./bind";
import { sqlDb } from "./db";
import type { AgentEvent, AgentEventType, CloudSave, User } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEV_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

type Sql = ReturnType<typeof sqlDb>;
// postgres.js exposes a transaction-specific tagged-template type that is
// awkward to extract from overloads. These helpers only need the query shape.
type Query = any;

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
  curiosity: number;
  bravery: number;
  injury: number;
  bond: number;
  traits: string[];
  memories: string[];
  souvenirs: string[];
  misunderstandings: string[];
  last_result: DayOutcome | null;
  state: CompanionState;
  last_action_day: Date | string | null;
  pending_message: string | null;
  active_trip_id: string | null;
  rev: number;
  created_at: Date | string;
  updated_at: Date | string;
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
  kind: "travel" | "battle" | "stay";
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
  landmark: string | null;
  title: string;
  message: string;
  reason: string | null;
  image_key: string | null;
  image_prompt: string | null;
  image_status: Postcard["imageStatus"] | null;
  image_path: string | null;
  collected: boolean;
  sent_at: Date | string;
}

interface BattleRow {
  legacy_id: string | null;
  result: BattleRecord["result"];
  title: string;
  story: string;
  spoils: string | null;
  attacker_injury: number;
  created_at: Date | string;
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
    misunderstandings: [],
    battles: [],
    lastResult: null,
    pendingPostcardId: null,
    pendingMessage: null,
    lastActionDay: null,
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
  const { photo: _photo, ...rest } = item;
  return rest as PackedItem;
}

function stripStoredItems(items: PackedItem[] | undefined): PackedItem[] {
  return (items ?? []).slice(0, 3).map(stripStoredItem);
}

function tripKind(trip: Trip): "travel" | "battle" | "stay" {
  if (trip.intent === "claw") return "battle";
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
    case "said":
      return "say";
    case "restyled":
      return "restyle";
    case "pat":
      return "pat";
    case "departed":
    case "returned":
    case "postcard":
      return "travel";
  }
}

async function rotateToken(tx: Query, userId: string): Promise<string> {
  const token = newToken();
  await tx`
    update agent_tokens
    set revoked_at = now()
    where user_id = ${userId}::uuid and revoked_at is null
  `;
  await tx`
    insert into agent_tokens (user_id, token_hash)
    values (${userId}::uuid, ${tokenHash(token)})
  `;
  return token;
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

  const battleRows = await tx<BattleRow[]>`
    select *
    from battles
    where attacker_pet_id = ${petId}::uuid
    order by created_at desc
    limit 60
  `;

  const activityRows = await tx<ActivityRow[]>`
    select id, legacy_seq, kind, title, payload, created_at
    from activities
    where pet_id = ${petId}::uuid and legacy_seq is not null
    order by legacy_seq asc
    limit 50
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
      curiosity: pet.curiosity,
      bravery: pet.bravery,
      injury: pet.injury,
      bond: pet.bond,
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
          departAt: NO_AUTO_DEPART,
          willGo: false,
        }
      : null,
    activeTrip,
    postcards,
    souvenirs: pet.souvenirs ?? [],
    misunderstandings: pet.misunderstandings ?? [],
    battles: battleRows.map(battleFromRow),
    lastResult: pet.last_result,
    pendingPostcardId: pending ? (pending.legacy_id ?? "") : null,
    pendingMessage: pet.pending_message,
    lastActionDay: day(pet.last_action_day),
    rev: Number(pet.rev),
    updatedAt: iso(pet.updated_at),
    events: activityRows
      .map(eventFromRow)
      .filter((e: AgentEvent | null): e is AgentEvent => !!e),
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

function postcardFromRow(row: PostcardRow): Postcard {
  return {
    id: row.legacy_id ?? "",
    tripId: row.trip_legacy_id ?? "",
    companionId: "",
    locationName: row.location_name,
    destinationTheme: row.destination_theme,
    title: row.title,
    message: row.message,
    reason: row.reason ?? "",
    imageKey: row.image_key ?? row.destination_theme,
    sentAt: iso(row.sent_at),
    landmark: row.landmark ?? undefined,
    imagePrompt: row.image_prompt ?? undefined,
    imageStatus: row.image_status ?? undefined,
    imageUrl: row.image_path ?? undefined,
  };
}

function battleFromRow(row: BattleRow): BattleRecord {
  return {
    id: row.legacy_id ?? "",
    result: row.result,
    title: row.title,
    story: row.story,
    spoils: row.spoils ?? undefined,
    injury: row.attacker_injury,
    at: iso(row.created_at),
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
        legacy_id, pet_id, trip_id, destination_theme, location_name, landmark,
        title, message, reason, image_key, image_prompt, image_status, image_path,
        collected, sent_at
      )
      values (
        ${card.id},
        ${petId}::uuid,
        ${tripId ? tx`${tripId}::uuid` : null},
        ${card.destinationTheme},
        ${card.locationName},
        ${card.landmark ?? null},
        ${card.title},
        ${card.message},
        ${card.reason},
        ${card.imageKey},
        ${card.imagePrompt ?? null},
        ${card.imageStatus ?? "pending"},
        ${card.imageUrl ?? null},
        ${card.id !== pendingPostcardId},
        ${new Date(card.sentAt)}
      )
      on conflict (legacy_id) do update set
        trip_id = excluded.trip_id,
        destination_theme = excluded.destination_theme,
        location_name = excluded.location_name,
        landmark = excluded.landmark,
        title = excluded.title,
        message = excluded.message,
        reason = excluded.reason,
        image_key = excluded.image_key,
        image_prompt = excluded.image_prompt,
        image_status = excluded.image_status,
        image_path = excluded.image_path,
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

async function syncBattles(
  tx: Query,
  petId: string,
  save: CloudSave,
): Promise<void> {
  for (const battle of save.battles ?? []) {
    await tx`
      insert into battles (
        legacy_id, day, attacker_pet_id, defender_pet_id, is_npc,
        attacker_snapshot, defender_snapshot, result, attacker_injury, spoils,
        title, story, created_at
      )
      values (
        ${battle.id},
        ${battle.at.slice(0, 10)}::date,
        ${petId}::uuid,
        null,
        true,
        ${tx.json({
          name: save.companion?.name,
          species: save.companion?.type,
          color: save.companion?.primaryColor,
          bravery: save.capyState.bravery,
          energy: save.capyState.energy,
          bond: save.capyState.bond,
        } as never)},
        ${tx.json({ name: "Claw", isNpc: true } as never)},
        ${battle.result},
        ${battle.injury},
        ${battle.spoils ?? null},
        ${battle.title},
        ${battle.story},
        ${new Date(battle.at)}
      )
      on conflict (legacy_id) do update set
        result = excluded.result,
        attacker_injury = excluded.attacker_injury,
        spoils = excluded.spoils,
        title = excluded.title,
        story = excluded.story,
        created_at = excluded.created_at
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

async function loginByIdentity(
  kind: "supabase" | "dev",
  identity: string,
  email: string | null,
): Promise<{ user: User; save: CloudSave; isNew: boolean }> {
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

    const token = await rotateToken(tx, row.id);
    const user = userFromRow(row, token);
    const save = row.pet_id ? await loadSave(tx, row.pet_id) : emptySave();
    return { user, save, isNew };
  });
}

/**
 * Find or create the account for a verified Supabase Auth user. The Supabase
 * user id is the stable identity; email is stored for display and kept fresh.
 */
export async function loginBySupabase(
  supabaseUserId: string,
  email: string | null,
): Promise<{ user: User; save: CloudSave; isNew: boolean }> {
  return loginByIdentity("supabase", supabaseUserId, email);
}

/**
 * Local debug login without a third-party auth provider. This is only meant for
 * local development where the identity is supplied by the developer.
 */
export async function loginByDevIdentity(
  identity: string,
  email: string | null,
): Promise<{ user: User; save: CloudSave; isNew: boolean }> {
  return loginByIdentity("dev", identity, email);
}

/** Resolve a bind token to its owner + current pet save. */
export async function resolveBind(
  token: string,
): Promise<{ user: User; save: CloudSave } | null> {
  const sql = sqlDb();
  const hash = tokenHash(token);
  const rows = await sql<UserRow[]>`
    select u.*
    from agent_tokens t
    join users u on u.id = t.user_id
    where t.token_hash = ${hash} and t.revoked_at is null
    limit 1
  `;
  const row = rows[0];
  if (!row || !row.pet_id) return null;

  await sql`
    update agent_tokens
    set last_used_at = now()
    where token_hash = ${hash}
  `;

  return {
    user: userFromRow(row, token),
    save: await loadSave(sql, row.pet_id),
  };
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
        personality, accessory, mood, energy, curiosity, bravery, injury, bond,
        traits, memories, souvenirs, misunderstandings, last_result, state,
        rating, wins, losses, draws, last_action_day, pending_message, rev,
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
        ${cap.curiosity},
        ${cap.bravery},
        ${cap.injury},
        ${cap.bond},
        ${cap.traits}::text[],
        ${cap.memories}::text[],
        ${save.souvenirs ?? []}::text[],
        ${save.misunderstandings ?? []}::text[],
        ${save.lastResult ? tx.json(save.lastResult as never) : null},
        ${save.companionState},
        1000,
        0,
        0,
        0,
        ${save.lastActionDay ? tx`${save.lastActionDay}::date` : null},
        ${save.pendingMessage},
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
        curiosity = excluded.curiosity,
        bravery = excluded.bravery,
        injury = excluded.injury,
        bond = excluded.bond,
        traits = excluded.traits,
        memories = excluded.memories,
        souvenirs = excluded.souvenirs,
        misunderstandings = excluded.misunderstandings,
        last_result = excluded.last_result,
        state = excluded.state,
        last_action_day = excluded.last_action_day,
        pending_message = excluded.pending_message,
        rev = excluded.rev,
        updated_at = excluded.updated_at
    `;

    await syncReadyBag(tx, petId, save.packedBag);

    const activeTripId = save.activeTrip
      ? await upsertTrip(tx, petId, save.activeTrip)
      : null;

    await syncPostcards(tx, petId, save.postcards ?? [], save.pendingPostcardId);
    await syncBattles(tx, petId, save);
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
