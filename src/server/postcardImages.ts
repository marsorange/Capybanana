// Backend pre-generation of postcard art. Instead of generating lazily when a
// client opens the postcard, we kick generation as soon as a pending postcard
// is observed on a write (via `after`, so it never blocks the response). The
// image bytes land in KV under `img:<postcardId>`; the postcard's imageStatus
// is flagged so later ticks skip already-done cards.
//
// Dedupe is via a KV lock (`img:lock:<id>` = startedAt ms) with a staleness
// window, so the web client's 5s poll storm — and multiple serverless
// instances — don't all generate the same image. The lock self-heals if a
// background run is killed (e.g. function timeout) before it can release.
import { after } from "next/server";

import type { Postcard } from "@/game/types";
import { kv } from "@/lib/kv";
import { generatePostcardImage } from "@/lib/minimax";
import { loadPet, savePet } from "./store";
import type { CloudSave } from "./types";

const LOCK_TTL_MS = 100_000; // a stale lock past this is reclaimed
const GEN_TIMEOUT_MS = 90_000; // image-01 can take 10–60s

function imgKey(id: string): string {
  return `img:${id}`;
}
function lockKey(id: string): string {
  return `img:lock:${id}`;
}

/** Persist the postcard's imageStatus (no rev bump — art isn't gameplay state). */
async function flagStatus(
  petId: string,
  id: string,
  status: "ready" | "error",
): Promise<void> {
  const save = await loadPet(petId);
  if (!save) return;
  const card = save.postcards.find((p) => p.id === id);
  if (!card || card.imageStatus === status) return;
  await savePet(petId, {
    ...save,
    postcards: save.postcards.map((p) =>
      p.id === id ? { ...p, imageStatus: status } : p,
    ),
  });
}

/** Generate one postcard's art into KV, unless it already exists or is in flight. */
async function generateOne(
  petId: string,
  id: string,
  prompt: string,
): Promise<void> {
  if (await kv.getJSON<string>(imgKey(id))) {
    await flagStatus(petId, id, "ready");
    return;
  }
  const lock = await kv.getJSON<number>(lockKey(id));
  if (typeof lock === "number" && Date.now() - lock < LOCK_TTL_MS) return;
  await kv.setJSON(lockKey(id), Date.now());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
  try {
    const { image } = await generatePostcardImage(
      { prompt, aspectRatio: "3:4" },
      { signal: controller.signal },
    );
    await kv.setJSON(imgKey(id), image);
    await flagStatus(petId, id, "ready");
  } catch (err) {
    console.error(
      "[postcard-image]",
      err instanceof Error ? err.message : err,
    );
    await flagStatus(petId, id, "error");
  } finally {
    clearTimeout(timeout);
    await kv.del(lockKey(id));
  }
}

/** Has this postcard's art already been generated and cached? */
export async function hasPostcardImage(id: string): Promise<string | null> {
  return await kv.getJSON<string>(imgKey(id));
}

/** Schedule background generation for a single postcard (returns immediately). */
export function kickPostcardImage(
  petId: string,
  card: Pick<Postcard, "id" | "imagePrompt">,
): void {
  if (!process.env.MINIMAX_API_KEY || !card.imagePrompt) return;
  const prompt = card.imagePrompt;
  after(() => generateOne(petId, card.id, prompt));
}

/**
 * After any write, schedule background art generation for every postcard that
 * hasn't been attempted yet. Cheap + idempotent: skips when no key, and
 * `generateOne` dedupes against KV + the lock, so calling this on each poll is
 * safe. Errored cards are NOT auto-retried here (to avoid a persistently bad
 * prompt burning quota every poll) — retry happens when a user opens the card
 * (the image route re-kicks on a cache miss, throttled by the lock).
 */
export function schedulePendingImages(petId: string, save: CloudSave): void {
  if (!process.env.MINIMAX_API_KEY) return;
  const pending = save.postcards.filter(
    (p) => p.imagePrompt && p.imageStatus !== "ready" && p.imageStatus !== "error",
  );
  if (pending.length === 0) return;
  after(async () => {
    for (const card of pending) {
      await generateOne(petId, card.id, card.imagePrompt!);
    }
  });
}
