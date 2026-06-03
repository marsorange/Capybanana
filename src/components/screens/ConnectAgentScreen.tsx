"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";

export default function ConnectAgentScreen() {
  const connectUrl = useGameStore((s) => s.connectUrl);
  const companion = useGameStore((s) => s.companion);
  const cloudError = useGameStore((s) => s.cloudError);
  const goTo = useGameStore((s) => s.goTo);
  const [copied, setCopied] = useState<string | null>(null);

  const snippet = connectUrl ? `Read ${connectUrl}` : "";
  const hasPet = !!companion;

  const copy = async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
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
          {hasPet
            ? `让它连上并替你照顾「${companion!.name}」。`
            : "让它连上服务器，开始替你照顾卡皮巴拉。"}
        </p>
      </div>

      {/* live status */}
      <div
        className={
          "mt-5 rounded-sticker border-2 px-4 py-3 text-center text-sm " +
          (hasPet
            ? "border-accent/40 bg-accent/10 text-ink"
            : "border-ink/12 bg-cream-soft text-ink-soft")
        }
      >
        {hasPet ? (
          <>✅「{companion!.name}」已就位，把指令发给 Agent 即可接管</>
        ) : (
          <>⏳ 正在为你准备一只卡皮巴拉…（自动刷新）</>
        )}
      </div>

      {/* 1) the skill-doc command link */}
      <div className="mt-4 rounded-sticker border-2 border-ink/12 bg-paper p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft/70">
          绑定指令（发给 Agent）
        </p>
        <code className="block break-all rounded-xl bg-cream-soft px-3 py-2.5 text-sm text-ink">
          {snippet || "（未生成链接，请重新登录）"}
        </code>
        <Button
          variant="soft"
          className="mt-3 w-full"
          disabled={!snippet}
          onClick={() => copy("cmd", snippet)}
        >
          {copied === "cmd" ? "已复制 ✓" : "📋 复制绑定指令"}
        </Button>
        <p className="mt-2 text-[11px] text-ink-soft/70">
          这句话里已含你的私密绑定令牌，别随便发给别人。
        </p>
      </div>

      {cloudError && (
        <p className="mt-3 text-center text-sm text-accent">{cloudError}</p>
      )}

      <div className="mt-6 space-y-2.5 text-sm text-ink-soft">
        <p className="font-medium text-ink">连上之后，Agent 会替你</p>
        <ul className="space-y-1.5">
          <li>🎒 替你收拾今天的包裹、留一句话</li>
          <li>🧭 替它决定今天去旅行还是在家</li>
          <li>🫶 摸摸头、和它说说话</li>
          <li>💌 读它旅行寄回的明信片</li>
        </ul>
      </div>

      <div className="mt-auto pt-6">
        {hasPet ? (
          <Button size="lg" className="w-full" onClick={() => goTo("home")}>
            进入小屋 →
          </Button>
        ) : (
          <Button size="lg" variant="soft" className="w-full" disabled>
            等待宠物生成…
          </Button>
        )}
      </div>
    </div>
  );
}
