// POST: the agent decides how today should go.
// Body:
//   { action: "travel", distance?: "near" | "far", note?: string }
//   { action: "battle", note?: string }
//   { action: "stay",   mode?: "home" | "yard" | "rest", note?: string }
// The agent only chooses near/far — the server picks the actual destination.
import { authed, commit, commitError, jsonError } from "@/server/api";
import {
  dayBlockedReason,
  decideDay,
  snapshotOf,
  startBattle,
  summarizePet,
  tickSave,
  type BattleOpponent,
  type DayDecision,
} from "@/server/engine";
import { makeNpcOpponent } from "@/server/llm/battleJudge";
import { findBattleOpponent, recordBattle, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action?: unknown;
  distance?: unknown;
  mode?: unknown;
  note?: unknown;
};

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: Body = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const action = typeof body.action === "string" ? body.action : undefined;
  if (action !== "travel" && action !== "stay" && action !== "battle") {
    return jsonError("action 必须是 travel、battle 或 stay", 400);
  }

  const now = Date.now();
  const save = await tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);

  const blocked = dayBlockedReason(save, now, action);
  if (blocked) return commitError(a.user.petId, save, blocked);

  const note = typeof body.note === "string" ? body.note : undefined;

  // Battle needs DB matchmaking + a battles/pool write, so it lives here rather
  // than in the pure decideDay().
  if (action === "battle") {
    const self = snapshotOf(save);
    const pooled = await findBattleOpponent(a.user.petId, a.user.id);
    const opponent: BattleOpponent = pooled
      ? { snapshot: pooled.snapshot, isNpc: false, defenderPetId: pooled.petId }
      : { snapshot: makeNpcOpponent(self), isNpc: true, defenderPetId: null };

    const out = await startBattle(save, { note }, now, opponent);
    await savePet(a.user.petId, out.save);
    await recordBattle(a.user.petId, a.user.id, {
      legacyId: out.record.id,
      day: out.record.day,
      attackerSnapshot: out.attackerSnapshot,
      defenderPetId: out.defenderPetId,
      defenderSnapshot: out.defenderSnapshot,
      isNpc: out.isNpc,
      result: out.record.result,
      attackerInjury: out.record.injury,
      attackerRatingDelta: out.ratingDelta,
      newRating: out.newRating,
      spoils: out.record.spoils,
      title: out.record.title,
      story: out.record.story,
    });
    return Response.json({
      ok: true,
      rev: out.save.rev,
      save: out.save,
      pet: summarizePet(out.save),
    });
  }

  const decision: DayDecision =
    action === "travel"
      ? {
          action,
          distance:
            typeof body.distance === "string" ? body.distance : undefined,
          note,
        }
      : {
          action,
          mode: typeof body.mode === "string" ? body.mode : undefined,
          note,
        };

  return commit(a.user.petId, await decideDay(save, decision, now));
}
