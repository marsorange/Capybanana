// Passwordless phone login (no code — phone is the identity, an MVP tradeoff).
// Finds or creates the account + its bind token, catches the pet's lifecycle
// up, and returns the save + the agent connect link.
import { coerceCompanionDraft } from "@/game/randomCompanion";
import { KV_PERSISTENT } from "@/lib/kv";
import { baseUrl, jsonError } from "@/server/api";
import { createPet, summarizePet, tickSave } from "@/server/engine";
import { loginByPhone, normalizePhone, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { phone?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const raw = typeof body.phone === "string" ? body.phone : "";
  const phone = normalizePhone(raw);
  if (!phone) return jsonError("手机号格式不正确", 400);

  // On Vercel (multi-instance serverless) without a hosted KV, accounts/tokens
  // live in per-instance memory and won't be found on the next request (→ 401
  // loop). Fail loudly with a clear, actionable message instead of handing back
  // a doomed session. Locally (single dev process) the in-memory store works
  // across requests, so cloud testing without KV is still allowed.
  if (!KV_PERSISTENT && process.env.VERCEL) {
    return jsonError(
      "服务器未配置数据库（KV），云存档不可用。请在 Vercel 添加 Storage → Upstash for Redis 后重试；现在可先用「本地玩」。",
      503,
    );
  }

  const { user, save } = await loginByPhone(phone);
  const now = Date.now();
  // The owner should be able to play immediately. If the account has no pet
  // yet (a brand-new account, or one left petless before auto-adoption), adopt
  // a random capybara on the server so login returns a ready-to-play save.
  // Attaching an AI agent later is optional.
  const seeded = save.companion
    ? save
    : createPet(save, coerceCompanionDraft(undefined), now);
  const ticked = tickSave(seeded, now);
  if (ticked.rev !== save.rev) await savePet(user.petId, ticked);

  const connectUrl = `${baseUrl(req)}/agent/skill.md?bind=${user.bindToken}`;
  return Response.json({
    ok: true,
    user: { id: user.id, phone: user.phone },
    bindToken: user.bindToken,
    connectUrl,
    save: ticked,
    pet: summarizePet(ticked),
  });
}
