// Explicit "重新生成连接 / 换 Agent". The owner's web client (authed by its web
// session token) mints a brand-new Agent bind link; the previous link is revoked,
// so the old Agent's next call gets a terminal 401 and stops its daily loop.
// Returns the fresh connectUrl for the owner to hand to the new Agent.
import { authed, baseUrl, jsonError } from "@/server/api";
import { SQL_PERSISTENT } from "@/server/db";
import { regenerateAgentLink } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!SQL_PERSISTENT) {
    return jsonError(
      "服务器未配置 PostgreSQL（POSTGRES_URL），云存档不可用。",
      503,
    );
  }
  const a = await authed(req);
  if (a instanceof Response) return a;

  const token = await regenerateAgentLink(a.user.id);
  const connectUrl = `${baseUrl(req)}/agent/skill.md?bind=${token}`;
  return Response.json({ ok: true, connectUrl });
}
