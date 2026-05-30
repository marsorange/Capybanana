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
