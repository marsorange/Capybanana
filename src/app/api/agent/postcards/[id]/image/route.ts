// GET the AI-generated art for a postcard (combines the pet's look + a famous
// landmark). Generated on demand via MiniMax, then cached in its own KV key so
// it's produced once and shared by web + agent + other devices.
//   { ok, status: "ready" | "fallback" | "error", url: string | null }
// status "fallback"/null → the client should render the procedural SVG art.
import { kv } from "@/lib/kv";
import { generatePostcardImage } from "@/lib/minimax";
import { authed, jsonError } from "@/server/api";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const cached = await kv.getJSON<string>(`img:${id}`);
  if (cached) return Response.json({ ok: true, status: "ready", url: cached });

  // No prompt or no API key → let the client fall back to SVG art.
  if (!card.imagePrompt || !process.env.MINIMAX_API_KEY)
    return Response.json({ ok: true, status: "fallback", url: null });

  // image-01 can take 10–60s; cap it so a stuck request fails cleanly.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const { image } = await generatePostcardImage(
      { prompt: card.imagePrompt, aspectRatio: "3:4" },
      { signal: controller.signal },
    );
    await kv.setJSON(`img:${id}`, image);
    // Flag the card ready in the authoritative save (image bytes live separately).
    await savePet(a.user.petId, {
      ...a.save,
      postcards: a.save.postcards.map((p) =>
        p.id === id ? { ...p, imageStatus: "ready" as const } : p,
      ),
    });
    return Response.json({ ok: true, status: "ready", url: image });
  } catch (err) {
    const message = err instanceof Error ? err.message : "生图失败";
    console.error("[postcard-image]", message);
    return Response.json({ ok: true, status: "error", url: null, error: message });
  } finally {
    clearTimeout(timeout);
  }
}
