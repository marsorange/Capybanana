// Bind & register the pet — the agent's "绑定" step. Note the server now also
// *auto-binds* a pet the moment the agent first reads its skill link (so the
// owner's waiting screen unblocks even if the agent never calls this), see
// /agent/skill.md. This endpoint therefore does one of two things:
//   - no pet yet (auto-bind didn't run): create it now.
//   - pet exists but is still "unshaped" (auto-bound, hasn't acted today): let
//     the agent finalize the name/look it picked.
//   - pet already established (has lived a day): idempotent 409.
// Body: { companion?: { name?, type?, primaryColor?, personality?, accessory? } }
import { coerceCompanionDraft } from "@/game/randomCompanion";
import { commit, jsonError, petAction } from "@/server/api";
import { createPet, isUnshapedPet, shapeCompanion } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = petAction(
  (save, { body, now, user }) => {
    const draft = coerceCompanionDraft(body.companion);

    // Pet already exists (almost always: the server auto-bound it on first read).
    if (save.companion) {
      // Still unshaped → treat create as "finalize the name/look you chose".
      if (isUnshapedPet(save)) {
        const next = shapeCompanion(save, draft, now);
        return commit(user.petId, next, {
          connected: true,
          message: `好的，我把它定名为「${next.companion!.name}」了，形象也按你挑的来。主人的网页已经进岛。接着把今天过完（checkin → day）、建好每日例程，再用一两句话向主人汇报。`,
        });
      }
      // Established (已行动过) → appearance is locked; nothing to do.
      return jsonError(
        "已经接入过了——宠物早已在岛上安顿好，名字和形象也定下了，无需再 create。重读接入文档（skill.md）按《每日照看指南》照看它即可。",
        409,
      );
    }

    // Fallback: auto-bind somehow didn't run — create from scratch here.
    const next = createPet(save, draft, now);
    return commit(user.petId, next, {
      connected: true,
      message: `接入成功！${next.companion!.name} 已经在岛上住下，主人的网页这会儿会自动进岛。接着把接入文档的第 2-4 步走完（重读文档 → 替它过完今天 → 建好每日例程），最后用一两句话向主人汇报。`,
    });
  },
  // We handle the companion gate ourselves above (create / finalize / reject).
  { requireCompanion: false },
);
