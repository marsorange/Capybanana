"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";

export default function ConnectAgentScreen() {
  const connectUrl = useGameStore((s) => s.connectUrl);
  const companion = useGameStore((s) => s.companion);
  const goTo = useGameStore((s) => s.goTo);
  const [copied, setCopied] = useState(false);

  const snippet = connectUrl ? `Read ${connectUrl}` : "";

  const copy = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is selectable below anyway */
    }
  };

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-6 py-7">
      <div className="text-center">
        <div className="text-5xl">🔗</div>
        <h1 className="mt-2 font-hand text-2xl text-ink">连接你的 AI Agent</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          把下面这句话发给你的 AI Agent（如 Claude），
          <br />
          它就能连上服务器，替你陪
          {companion ? `「${companion.name}」` : "它"}过日子。
        </p>
      </div>

      <div className="mt-6 rounded-sticker border-2 border-ink/12 bg-paper p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft/70">
          绑定指令
        </p>
        <code className="block break-all rounded-xl bg-cream-soft px-3 py-2.5 text-sm text-ink">
          {snippet || "（未生成链接，请重新登录）"}
        </code>
        <Button
          variant="soft"
          className="mt-3 w-full"
          disabled={!snippet}
          onClick={copy}
        >
          {copied ? "已复制 ✓" : "📋 复制绑定指令"}
        </Button>
      </div>

      <div className="mt-6 space-y-2.5 text-sm text-ink-soft">
        <p className="font-medium text-ink">Agent 连上之后能做什么</p>
        <ul className="space-y-1.5">
          <li>👀 看它现在的心情和状态</li>
          <li>🎒 替你收拾今天的包裹、留一句话</li>
          <li>🫶 摸摸头、和它说说话</li>
          <li>💌 读它旅行寄回的明信片</li>
        </ul>
        <p className="pt-1 text-[12px] text-ink-soft/70">
          绑定指令里带着你的私密令牌，别随便发给别人。
        </p>
      </div>

      <div className="mt-auto pt-6">
        <Button size="lg" className="w-full" onClick={() => goTo("home")}>
          进入小屋 →
        </Button>
      </div>
    </div>
  );
}
