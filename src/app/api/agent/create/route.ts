// Bind & register the pet (the agent's one-time "绑定" step). The owner logged
// in on the web (which minted the bind token); the agent calls this with that
// token to bring the pet into existence and name it.
// Body: { companion?: { name?, type?, primaryColor?, personality?, accessory? } }
// Any missing/invalid field is filled with a random pick. Rejects if a pet
// already exists.
import { coerceCompanionDraft } from "@/game/randomCompanion";
import { commit, petAction } from "@/server/api";
import { createPet } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = petAction(
  (save, { body, now, user }) => {
    const next = createPet(save, coerceCompanionDraft(body.companion), now);
    // Explicit 接入成功 feedback: the agent needs a sentence it can confidently
    // relay to its owner (plus what to do next), not just a raw save blob.
    return commit(user.petId, next, {
      connected: true,
      message: `接入成功！${next.companion!.name} 已经在岛上住下，主人的网页这会儿会自动进岛。接着把接入文档的第 2-4 步走完（重读文档 → 替它过完今天 → 建好每日例程），最后用一两句话向主人汇报。`,
    });
  },
  { requireCompanion: false, requireNoCompanion: true },
);
