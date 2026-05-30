// Passwordless phone login (no code — phone is the identity, an MVP tradeoff).
// Finds or creates the account + its bind token, catches the pet's lifecycle
// up, and returns the save + the agent connect link.
import { baseUrl, jsonError } from "@/server/api";
import { summarizePet, tickSave } from "@/server/engine";
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

  const { user, save } = await loginByPhone(phone);
  const ticked = tickSave(save, Date.now());
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
