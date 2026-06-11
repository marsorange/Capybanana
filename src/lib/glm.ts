// Image understanding (智谱 BigModel GLM-4V-Flash，OpenAI 风格 chat completions).
// The secret key lives only on the server (.env.local).
//   POST https://open.bigmodel.cn/api/paas/v4/chat/completions
//   GLM_API_KEY    = <bearer key>
//   GLM_VLM_MODEL  = model override (optional, default glm-4v-flash 免费档)
//   GLM_VLM_URL    = endpoint override (optional)
//
// 文本/JSON 判断走 OpenRouter（见 lib/openrouter.ts）；GLM 只管图片理解。

const DEFAULT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_MODEL = "glm-4v-flash";

export interface UnderstandInput {
  prompt: string;
  imageUrl: string; // http(s) URL 或 data: base64 URL
}

/** 问视觉模型“这张图里是什么”，返回模型的文本回答。失败抛错。 */
export async function understandImage(
  input: UnderstandInput,
  opts: { signal?: AbortSignal } = {},
): Promise<{ text: string }> {
  const key = process.env.GLM_API_KEY;
  if (!key) throw new Error("GLM_API_KEY 未配置");

  // GLM 的 image_url.url 接受 http(s) 链接或**纯 base64**（不带 data: 前缀）。
  const url = input.imageUrl.replace(/^data:image\/[a-z+.-]+;base64,/i, "");

  const res = await fetch(process.env.GLM_VLM_URL ?? DEFAULT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.GLM_VLM_MODEL ?? DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url } },
            { type: "text", text: input.prompt },
          ],
        },
      ],
    }),
    signal: opts.signal,
  });

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { code?: string; message?: string };
  };

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `GLM 图片理解失败（HTTP ${res.status}）`,
    );
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("GLM 未返回结果");
  return { text };
}
