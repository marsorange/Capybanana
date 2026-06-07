// Web action: clear the prepared bag. The web client calls this when it finds
// the "今日包裹" has gone stale on home entry (older than a day) — the staleness
// decision lives on the client; the server just performs the clear here.
// Idempotent: returns ok even when nothing is packed.
import { petAction } from "@/server/api";
import { clearBag } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = petAction((save, { now }) => clearBag(save, now), {
  requireCompanion: false,
});
