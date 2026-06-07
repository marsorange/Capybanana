// Web action: identify the main object in a captured photo via MiniMax 视觉理解
// (understand_image)。密钥只在服务端。用于 PackScreen 拍照后自动填物体名。
//   POST { photo: <data:image/...;base64,...> }
//   → { ok: true, name }            识别成功
//   → { ok: false, reason }         无 key / 请求不合法 / 识别失败（前端回退到取色启发式）
import { understandImage } from "@/lib/minimax";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROMPT =
  "这张照片里最主要的物体是什么？只用一个简短的中文名词短语回答，2 到 6 个字，" +
  "不要加任何标点、解释或多余的词。如果看不清就回答“一个小东西”。";

export async function POST(req: Request): Promise<Response> {
  if (!process.env.MINIMAX_API_KEY)
    return Response.json({ ok: false, reason: "no_key" });

  let photo: string | undefined;
  try {
    ({ photo } = (await req.json()) as { photo?: string });
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!photo || !photo.startsWith("data:image"))
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  // VL 一般几秒内返回；封顶避免卡死。
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const { text } = await understandImage(
      { prompt: PROMPT, imageUrl: photo },
      { signal: controller.signal },
    );
    const name = text.replace(/[\s。.,，、!！?？"'「」“”]/g, "").slice(0, 8);
    if (!name) return Response.json({ ok: false, reason: "empty" });
    return Response.json({ ok: true, name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "识别失败";
    console.error("[recognize]", message);
    return Response.json({ ok: false, reason: "error", error: message });
  } finally {
    clearTimeout(timeout);
  }
}
