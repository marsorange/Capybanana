// POST: change the pet's look (type / color / accessory) — name & stats stay.
// Body: { random?: true } to roll a fresh capybara-cute look, and/or any of
//   { type, primaryColor, accessory } to force specific fields.
import { authed, commit, jsonError } from "@/server/api";
import { restyleCompanion, tickSave } from "@/server/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  let body: { random?: unknown; type?: unknown; primaryColor?: unknown; accessory?: unknown } =
    {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty body — treat as a random re-roll */
  }

  const now = Date.now();
  const save = tickSave(a.save, now);
  if (!save.companion) return jsonError("还没有宠物，请先调用 create", 409);

  // Empty body → behave like a random re-roll (the common "give me a new look").
  const random =
    body.random === true ||
    (body.type === undefined &&
      body.primaryColor === undefined &&
      body.accessory === undefined);

  return commit(
    a.user.petId,
    restyleCompanion(save, { appearance: body, random }, now),
  );
}
