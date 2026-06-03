// POST: the agent decides how today should go.
// Body:
//   { action: "travel", destination?: DestinationTheme, note?: string }
//   { action: "stay", mode?: "home" | "yard" | "rest", note?: string }
import { authed, commit, commitError, jsonError } from "@/server/api";
import {
  dayBlockedReason,
  decideDay,
  tickSave,
  type DayDecision,
} from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action?: unknown;
  destination?: unknown;
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
  if (action === "battle") {
    return jsonError("对战玩法已后置；当前请使用 travel 或 stay。", 410);
  }
  if (action !== "travel" && action !== "stay") {
    return jsonError("action 必须是 travel 或 stay", 400);
  }

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);

  const blocked = dayBlockedReason(save, now, action);
  if (blocked) return commitError(a.user.petId, save, blocked);

  const note = typeof body.note === "string" ? body.note : undefined;
  const decision: DayDecision =
    action === "travel"
      ? {
          action,
          destination:
            typeof body.destination === "string" ? body.destination : undefined,
          note,
        }
      : {
          action,
          mode: typeof body.mode === "string" ? body.mode : undefined,
          note,
        };

  return commit(a.user.petId, decideDay(save, decision, now));
}
