// Web action: tuck the waiting postcard into the album (clears the pending flag).
import { petAction } from "@/server/api";
import { collectPostcard } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = petAction((save, { now }) => collectPostcard(save, now), {
  requireCompanion: false,
});
