"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import Button from "../ui/Button";

export default function ConnectAgentScreen() {
  const connectUrl = useGameStore((s) => s.connectUrl);
  const bindToken = useGameStore((s) => s.cloud?.bindToken ?? null);
  const companion = useGameStore((s) => s.companion);
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
            ? `它已经连上并为你生成了「${companion!.name}」。`
            : "让它连上服务器，为你生成一只专属卡皮巴拉。"}
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
          <>✅ Agent 已生成「{companion!.name}」</>
        ) : (
          <>⏳ 等待 Agent 读取链接并生成宠物…（自动刷新）</>
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
      </div>

      {/* 2) the raw bind code */}
      <div className="mt-3 rounded-sticker border-2 border-ink/12 bg-paper p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-soft/70">
          绑定码（私密令牌）
        </p>
        <code className="block break-all rounded-xl bg-cream-soft px-3 py-2.5 text-xs text-ink">
          {bindToken ?? "—"}
        </code>
        <Button
          variant="soft"
          className="mt-3 w-full"
          disabled={!bindToken}
          onClick={() => copy("code", bindToken ?? "")}
        >
          {copied === "code" ? "已复制 ✓" : "📋 复制绑定码"}
        </Button>
      </div>

      <div className="mt-6 space-y-2.5 text-sm text-ink-soft">
        <p className="font-medium text-ink">连上之后，Agent 会替你</p>
        <ul className="space-y-1.5">
          <li>🐾 生成并领养一只专属卡皮巴拉</li>
          <li>🎒 替你收拾今天的包裹、留一句话</li>
          <li>🫶 摸摸头、和它说说话</li>
          <li>💌 读它旅行寄回的明信片</li>
        </ul>
        <p className="pt-1 text-[12px] text-ink-soft/70">
          绑定码是你的私密令牌，别随便发给别人。
        </p>
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
