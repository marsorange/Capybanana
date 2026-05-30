// GET the AI-generated art for a postcard (the pet's look + a famous landmark).
// Art is pre-generated in the background on write (see server/postcardImages),
// so this route never blocks on the model: it returns the cached image if ready,
// otherwise kicks generation (for non-polling clients/agents) and reports the
// status so the caller can poll.
//   { ok, status: "ready" | "pending" | "fallback", url: string | null }
// "fallback"/null → render the procedural SVG art instead.
import { authed, jsonError } from "@/server/api";
import { hasPostcardImage, kickPostcardImage } from "@/server/postcardImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // give the background generation room to finish

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;

  const { id } = await params;
  const card = a.save.postcards.find((p) => p.id === id);
  if (!card) return jsonError("没有这张明信片", 404);

  // Already generated → serve the cached image.
  const cached = await hasPostcardImage(id);
  if (cached) return Response.json({ ok: true, status: "ready", url: cached });

  // No prompt or no API key → let the client fall back to SVG art.
  if (!card.imagePrompt || !process.env.MINIMAX_API_KEY)
    return Response.json({ ok: true, status: "fallback", url: null });

  // Not ready yet → kick background generation and tell the client to poll.
  kickPostcardImage(a.user.petId, card);
  return Response.json({ ok: true, status: "pending", url: null });
}
