// Server-only helper for MiniMax (海螺) image generation.
// Docs: https://platform.minimaxi.com/docs/api-reference/image-generation-t2i
// The API key must never reach the client — only import this from route
// handlers / server code.

const DEFAULT_BASE = "https://api.minimaxi.com/v1";
const DEFAULT_MODEL = "image-01";

export class MinimaxError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus = 502) {
    super(message);
    this.name = "MinimaxError";
    this.httpStatus = httpStatus;
  }
}

export interface GenerateImageParams {
  prompt: string;
  aspectRatio?: string; // e.g. "3:4"; defaults to "3:4" (postcard portrait)
  /**
   * Optional character reference image (URL or base64 data URL). MiniMax's
   * `subject_reference` only supports a single human-face subject, so this is
   * an opt-in hook, not used by the default capybara postcard path.
   */
  subjectImage?: string;
}

export interface GenerateImageResult {
  image: string; // data URL, e.g. "data:image/png;base64,...."
}

// MiniMax returns raw base64 without a mime type; sniff it from the header
// bytes so the browser decodes it reliably.
function sniffMime(b64: string): string {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBOR")) return "image/png";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

export async function generatePostcardImage(
  params: GenerateImageParams,
  opts: { signal?: AbortSignal } = {},
): Promise<GenerateImageResult> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new MinimaxError(
      "MINIMAX_API_KEY 未配置（请在 .env.local 中设置）",
      500,
    );
  }

  const base = (process.env.MINIMAX_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  // Allow either a full endpoint override or just a base; default works with
  // only MINIMAX_API_KEY set.
  const endpoint =
    process.env.MINIMAX_IMAGE_URL || `${base}/image_generation`;
  const model = process.env.MINIMAX_IMAGE_MODEL || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    prompt: params.prompt.slice(0, 1500),
    aspect_ratio: params.aspectRatio || "3:4",
    response_format: "base64",
    n: 1,
    prompt_optimizer: true,
  };
  if (params.subjectImage) {
    body.subject_reference = [
      { type: "character", image_file: params.subjectImage },
    ];
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new MinimaxError(`无法连接 MiniMax：${reason}`, 502);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MinimaxError(
      `MiniMax 返回 HTTP ${res.status}：${text.slice(0, 300)}`,
      502,
    );
  }

  const json = (await res.json()) as {
    data?: { image_base64?: string[]; image_urls?: string[] };
    base_resp?: { status_code?: number; status_msg?: string };
  };

  const status = json.base_resp?.status_code;
  if (status != null && status !== 0) {
    throw new MinimaxError(
      `MiniMax 业务错误 ${status}：${json.base_resp?.status_msg ?? "unknown"}`,
      502,
    );
  }

  const b64 = json.data?.image_base64?.[0];
  if (!b64) {
    // Fall back to a returned URL if the account is forced to url mode.
    const url = json.data?.image_urls?.[0];
    if (url) return { image: url };
    throw new MinimaxError("MiniMax 未返回图片数据", 502);
  }

  return { image: `data:${sniffMime(b64)};base64,${b64}` };
}
