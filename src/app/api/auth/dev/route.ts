// Local development auth bridge. Lets developers run the cloud-save flow
// without Supabase by providing a stable local identity string.
import { randomCuteCompanion } from "@/game/randomCompanion";
import { baseUrl, jsonError } from "@/server/api";
import { SQL_PERSISTENT } from "@/server/db";
import { createPet, summarizePet, tickSave } from "@/server/engine";
import { loginByDevIdentity, savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_AUTH_ENABLED =
  process.env.CAPY_DEV_LOCAL_AUTH === "1" && process.env.NODE_ENV !== "production";

function normalizeIdentity(raw: unknown): string {
  const input = typeof raw === "string" ? raw.trim() : "";
  const fallback = "local-dev";
  const picked = input || fallback;
  return picked.slice(0, 48).replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(req: Request): Promise<Response> {
  if (!DEV_AUTH_ENABLED) {
    return jsonError("本地调试登录未开启（设置 CAPY_DEV_LOCAL_AUTH=1）", 404);
  }
  if (!SQL_PERSISTENT) {
    return jsonError("本地调试登录需要 POSTGRES_URL，并先运行 supabase/migrations。", 503);
  }

  let body: { identity?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body */
  }

  const identity = normalizeIdentity(body.identity);
  const email = `${identity}@local.dev`;
  const { user, save } = await loginByDevIdentity(identity, email);

  const now = Date.now();
  const seeded = save.companion ? save : createPet(save, randomCuteCompanion(), now);
  const ticked = tickSave(seeded, now);
  if (ticked.rev !== save.rev) await savePet(user.petId, ticked);

  const connectUrl = `${baseUrl(req)}/agent/skill.md?bind=${user.bindToken}`;
  return Response.json({
    ok: true,
    user: { id: user.id, email: user.email },
    bindToken: user.bindToken,
    connectUrl,
    save: ticked,
    pet: summarizePet(ticked),
  });
}
