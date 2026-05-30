// Postcard image generation via MiniMax (海螺) image-01.
// The secret key lives only on the server (.env.local). The caller falls back
// to procedural SVG art if this throws or the key is unset.
//
//   MINIMAX_API_KEY     = <bearer token>          (required to enable)
//   MINIMAX_IMAGE_URL   = full endpoint override  (optional)
//   MINIMAX_IMAGE_MODEL = image-01 | image-01-live (optional)

export interface GenerateInput {
  prompt: string;
  aspectRatio?: string; // e.g. "3:4"
  subjectImage?: string; // optional character reference (data/URL)
}

const DEFAULT_URL = "https://api.minimaxi.com/v1/image_generation";

/** Returns { image } as a data: URL (base64) or a hosted URL. Throws on failure. */
export async function generatePostcardImage(
  input: GenerateInput,
  opts: { signal?: AbortSignal } = {},
): Promise<{ image: string }> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY 未配置");

  const url = process.env.MINIMAX_IMAGE_URL ?? DEFAULT_URL;
  const model = process.env.MINIMAX_IMAGE_MODEL ?? "image-01";

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio ?? "3:4",
    response_format: "base64",
    n: 1,
    prompt_optimizer: true,
  };
  if (input.subjectImage)
    body.subject_reference = [
      { type: "character", image_file: input.subjectImage },
    ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  const data = (await res.json().catch(() => ({}))) as {
    data?: {
      image_base64?: string[];
      base64?: string[];
      image_urls?: string[];
    };
    base_resp?: { status_code?: number; status_msg?: string };
  };

  const code = data.base_resp?.status_code;
  if (!res.ok || (typeof code === "number" && code !== 0)) {
    throw new Error(
      data.base_resp?.status_msg || `MiniMax 生图失败（HTTP ${res.status}）`,
    );
  }

  const b64 = data.data?.image_base64?.[0] ?? data.data?.base64?.[0];
  if (b64) return { image: `data:image/jpeg;base64,${b64}` };

  const hosted = data.data?.image_urls?.[0];
  if (hosted) return { image: hosted };

  throw new Error("MiniMax 未返回图片");
}

// --- Image understanding (海螺 Token Plan 视觉端点，即 understand_image 的底层) ---
// 对应 Token Plan MCP 的 understand_image：POST /v1/coding_plan/vlm
//   { prompt, image_url } -> { content, base_resp }
//   MINIMAX_API_KEY   = <bearer token>            (复用同一把 key，需有 Token Plan 额度)
//   MINIMAX_VLM_URL   = full endpoint override    (optional)

const DEFAULT_VLM_URL = "https://api.minimaxi.com/v1/coding_plan/vlm";

export interface UnderstandInput {
  prompt: string;
  imageUrl: string; // http(s) URL 或 data: base64 URL
}

/** 问视觉模型“这张图里是什么”，返回模型的文本回答。失败抛错。 */
export async function understandImage(
  input: UnderstandInput,
  opts: { signal?: AbortSignal } = {},
): Promise<{ text: string }> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY 未配置");

  const url = process.env.MINIMAX_VLM_URL ?? DEFAULT_VLM_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      image_url: input.imageUrl,
    }),
    signal: opts.signal,
  });

  const data = (await res.json().catch(() => ({}))) as {
    content?: string;
    base_resp?: { status_code?: number; status_msg?: string };
  };

  const code = data.base_resp?.status_code;
  if (!res.ok || (typeof code === "number" && code !== 0)) {
    throw new Error(
      data.base_resp?.status_msg || `MiniMax 图片理解失败（HTTP ${res.status}）`,
    );
  }

  const text = data.content?.trim();
  if (!text) throw new Error("MiniMax 未返回结果");
  return { text };
}
