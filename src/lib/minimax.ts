// Image understanding (海螺 Token Plan 视觉端点，即 understand_image 的底层).
// The secret key lives only on the server (.env.local).
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

// --- Text / chat (used for travel-story planning and battle judging) ---------
// Defaults to MiniMax's standard chat-completions endpoint; both URL and model
// are env-overridable so the exact Token Plan text endpoint can be slotted in.
const DEFAULT_CHAT_URL = "https://api.minimaxi.com/v1/text/chatcompletion_v2";
const DEFAULT_CHAT_MODEL = "MiniMax-Text-01";

export interface ChatInput {
  system?: string;
  prompt: string;
}

/** Ask the text model for a completion. Throws on missing key / API error. */
export async function chatComplete(
  input: ChatInput,
  opts: { signal?: AbortSignal } = {},
): Promise<{ text: string }> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY 未配置");

  const url = process.env.MINIMAX_CHAT_URL ?? DEFAULT_CHAT_URL;
  const model = process.env.MINIMAX_CHAT_MODEL ?? DEFAULT_CHAT_MODEL;

  const messages: { role: string; content: string }[] = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  // Bound the call so a slow/unreachable endpoint falls back instead of hanging
  // the whole travel/battle request.
  const timeoutMs = Number(process.env.MINIMAX_TIMEOUT_MS) || 12_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages }),
      signal: opts.signal ?? ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    content?: string; // coding_plan-style shape
    reply?: string;
    base_resp?: { status_code?: number; status_msg?: string };
  };

  const code = data.base_resp?.status_code;
  if (!res.ok || (typeof code === "number" && code !== 0)) {
    throw new Error(
      data.base_resp?.status_msg || `MiniMax 文本生成失败（HTTP ${res.status}）`,
    );
  }

  const text = (
    data.choices?.[0]?.message?.content ??
    data.content ??
    data.reply ??
    ""
  ).trim();
  if (!text) throw new Error("MiniMax 未返回文本");
  return { text };
}

/** Pull a JSON object out of a (possibly fenced) model reply. */
export function parseJsonLoose<T>(text: string): T {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

/** chatComplete + lenient JSON parse. Throws if the model returns no JSON. */
export async function jsonComplete<T>(
  input: ChatInput,
  opts: { signal?: AbortSignal } = {},
): Promise<T> {
  const { text } = await chatComplete(input, opts);
  return parseJsonLoose<T>(text);
}

/** True when a text LLM is configured (lets callers skip straight to fallback). */
export function llmConfigured(): boolean {
  return !!process.env.MINIMAX_API_KEY;
}
