// OpenRouter chat client — the backend's LLM for in-game judgments
// (battle verdicts, travel planning, and future decisions). OpenAI-compatible
// POST /chat/completions. The secret key lives only on the server (.env.local).
//
// Image understanding lives on GLM-4V-Flash (see glm.ts `understandImage`);
// this module is text / JSON only. Docs: https://openrouter.ai/docs/quickstart
//
//   OPENROUTER_API_KEY    = <bearer token>                     (required)
//   OPENROUTER_MODEL      = deepseek/deepseek-v4-flash         (default below)
//   OPENROUTER_CHAT_URL   = endpoint override                  (optional)
//   OPENROUTER_TIMEOUT_MS = per-call timeout, default 30000    (optional)
//   OPENROUTER_MAX_TOKENS = completion cap, default 1024       (optional)
//   OPENROUTER_REASONING  = "1" to let the model spend reasoning tokens
//                           (default OFF — short structured tasks; with it on,
//                           reasoning can eat the whole budget and leave content
//                           null, so also raise OPENROUTER_MAX_TOKENS)
//   OPENROUTER_SITE_URL / OPENROUTER_SITE_NAME = optional ranking headers

const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export interface ChatInput {
  system?: string;
  prompt: string;
}

/** Ask the chat model for a completion. Throws on missing key / API error. */
export async function chatComplete(
  input: ChatInput,
  opts: { signal?: AbortSignal } = {},
): Promise<{ text: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY 未配置");

  const url = process.env.OPENROUTER_CHAT_URL ?? DEFAULT_CHAT_URL;
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const messages: { role: string; content: string }[] = [];
  if (input.system) messages.push({ role: "system", content: input.system });
  messages.push({ role: "user", content: input.prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS) || 1024,
  };
  // deepseek-v4-flash is a reasoning model: with reasoning ON, the tokens can
  // consume the whole budget and leave message.content null. These judgments are
  // short and structured, so default reasoning OFF (opt back in via env).
  if (process.env.OPENROUTER_REASONING !== "1") {
    body.reasoning = { enabled: false };
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  };
  // Optional attribution headers used by OpenRouter for ranking; harmless if unset.
  const site = process.env.OPENROUTER_SITE_URL;
  const title = process.env.OPENROUTER_SITE_NAME;
  if (site) headers["HTTP-Referer"] = site;
  if (title) headers["X-Title"] = title;

  // Bound the call so a slow/unreachable endpoint falls back instead of hanging
  // the whole travel/battle request.
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal ?? ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `OpenRouter 调用失败（HTTP ${res.status}）`,
    );
  }

  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("OpenRouter 未返回文本");
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

/** True when the OpenRouter LLM is configured (callers skip to fallback if not). */
export function llmConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
