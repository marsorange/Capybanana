// Postcard image generation via MiniMax (海螺) image-01.
// The secret key lives only on the server (.env.local). If unset or the call
// fails, returns { url: null } so the client falls back to the built-in SVG art.
//
//   MINIMAX_API_KEY     = <bearer token>          (required to enable)
//   MINIMAX_IMAGE_URL   = full endpoint override  (optional)
//   MINIMAX_IMAGE_MODEL = image-01 | image-01-live (optional)
import { generatePostcardImage } from "@/lib/minimax";

// Hits a third-party API with a secret key — never prerender or cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { prompt?: unknown; aspectRatio?: unknown; subjectImage?: unknown } =
    {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* tolerate empty/invalid body — handled below */
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ url: null, error: "缺少 prompt" }, { status: 400 });
  }

  // Not configured yet → quietly fall back to SVG art (no scary errors).
  if (!process.env.MINIMAX_API_KEY) {
    return Response.json({ url: null });
  }

  const aspectRatio =
    typeof body.aspectRatio === "string" ? body.aspectRatio : "3:4";
  const subjectImage =
    typeof body.subjectImage === "string" ? body.subjectImage : undefined;

  // MiniMax image gen can take 10–60s; cap it so a stuck request fails cleanly.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const { image } = await generatePostcardImage(
      { prompt, aspectRatio, subjectImage },
      { signal: controller.signal },
    );
    // Their client reads `url` (a data: URL works fine in <img src>).
    return Response.json({ url: image });
  } catch (err) {
    const message = err instanceof Error ? err.message : "明信片生图失败";
    console.error("[postcard-image]", message);
    // 200 + null so the card degrades to SVG art instead of looking broken;
    // `error` is included for debugging in the network tab / logs.
    return Response.json({ url: null, error: message });
  } finally {
    clearTimeout(timeout);
  }
}
