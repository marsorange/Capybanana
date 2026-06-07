// Bind & register the pet (the agent's one-time "绑定" step). The owner logged
// in on the web (which minted the bind token); the agent calls this with that
// token to bring the pet into existence and name it.
// Body: { companion?: { name?, type?, primaryColor?, personality?, accessory? } }
// Any missing/invalid field is filled with a random pick. Rejects if a pet
// already exists.
import { coerceCompanionDraft } from "@/game/randomCompanion";
import { petAction } from "@/server/api";
import { createPet } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = petAction(
  (save, { body, now }) =>
    createPet(save, coerceCompanionDraft(body.companion), now),
  { requireCompanion: false, requireNoCompanion: true },
);
