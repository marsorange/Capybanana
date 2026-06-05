// Image understanding (海螺 Token Plan 视觉端点，即 understand_image 的底层).
// The secret key lives only on the server (.env.local).
// 对应 Token Plan MCP 的 understand_image：POST /v1/coding_plan/vlm
//   { prompt, image_url } -> { content, base_resp }
//   MINIMAX_API_KEY   = <bearer token>            (需有 Token Plan 额度)
//   MINIMAX_VLM_URL   = full endpoint override    (optional)
//
// 文本/JSON 判断已迁到 OpenRouter（见 lib/openrouter.ts）；MiniMax 现在只管图片理解。

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
