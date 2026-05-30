// Repository over KV: users, bind tokens, and the per-pet cloud save.
//
// Key layout:
//   phone:<phone>   -> userId          (login lookup)
//   user:<userId>   -> User
//   bind:<token>    -> userId          (auth resolution)
//   pet:<petId>     -> CloudSave        (the authoritative game state)
import { DEFAULT_CAPY } from "@/game/defaults";
import { uid } from "@/game/util";
import { kv } from "@/lib/kv";
import { newToken } from "./bind";
import type { CloudSave, User } from "./types";

export function normalizePhone(raw: string): string | null {
  const p = raw.replace(/[\s-]/g, "");
  return /^\+?\d{5,20}$/.test(p) ? p : null;
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
    diary: [],
    lastActionDay: null,
    rev: 0,
    updatedAt: new Date().toISOString(),
    events: [],
  };
}

/** Find or create the account for a phone number (no verification by design). */
export async function loginByPhone(
  phone: string,
): Promise<{ user: User; save: CloudSave; isNew: boolean }> {
  const existingId = await kv.getJSON<string>(`phone:${phone}`);
  if (existingId) {
    const user = await kv.getJSON<User>(`user:${existingId}`);
    if (user) {
      const save =
        (await kv.getJSON<CloudSave>(`pet:${user.petId}`)) ?? emptySave();
      return { user, save, isNew: false };
    }
  }

  const user: User = {
    id: uid("usr"),
    phone,
    bindToken: newToken(),
    petId: uid("pet"),
    createdAt: new Date().toISOString(),
  };
  const save = emptySave();
  await kv.setJSON(`pet:${user.petId}`, save);
  await kv.setJSON(`user:${user.id}`, user);
  await kv.setJSON(`phone:${phone}`, user.id);
  await kv.setJSON(`bind:${user.bindToken}`, user.id);
  return { user, save, isNew: true };
}

/** Resolve a bind token to its owner + current pet save. */
export async function resolveBind(
  token: string,
): Promise<{ user: User; save: CloudSave } | null> {
  const userId = await kv.getJSON<string>(`bind:${token}`);
  if (!userId) return null;
  const user = await kv.getJSON<User>(`user:${userId}`);
  if (!user) return null;
  const save = (await kv.getJSON<CloudSave>(`pet:${user.petId}`)) ?? emptySave();
  return { user, save };
}

export async function savePet(petId: string, save: CloudSave): Promise<void> {
  await kv.setJSON(`pet:${petId}`, save);
}

/** Load a pet's save by id (used by background postcard-image generation). */
export async function loadPet(petId: string): Promise<CloudSave | null> {
  return await kv.getJSON<CloudSave>(`pet:${petId}`);
}
