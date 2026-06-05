"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";

function SmallTile({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <Panel sketch={false} className="px-3 py-3">
      <p className="text-2xl leading-none">{icon}</p>
      <p className="mt-1 font-hand text-base leading-tight text-ink">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{text}</p>
    </Panel>
  );
}

export default function ConnectAgentScreen() {
  const connectUrl = useGameStore((s) => s.connectUrl);
  const companion = useGameStore((s) => s.companion);
  const cloudError = useGameStore((s) => s.cloudError);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const goTo = useGameStore((s) => s.goTo);
  const [copied, setCopied] = useState<string | null>(null);

  const snippet = connectUrl ? `Read ${connectUrl}` : "";
  const hasPet = !!companion;

  // First-time onboarding: the connect screen is the only gate before the
  // island, so there's no back button — the one way forward is "进入小岛".
  const enterIsland = () => {
    if (!hasOnboarded) completeOnboarding();
    else goTo("home");
  };

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
    <div className="screen-bg relative flex h-full flex-col">
      <ScreenHeader
        onBack={hasOnboarded ? () => goTo("home") : undefined}
        eyebrow="把小岛信箱交给 Agent"
        title="今日照看口令"
      />

      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-5">
        {/* live status */}
        <Panel className="px-4 py-3.5">
          {hasPet ? (
            <>
              <p className="font-hand text-lg leading-none text-ink">{companion!.name} 正在岛上等消息</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                复制下面这句话发给你的 Agent。它会读取今天的包裹、状态和留言，再决定出门、散步，还是在岛上休息。
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">正在整理小岛，请稍等一下。</p>
          )}
        </Panel>

        {/* the skill-doc command link */}
        <Panel className="p-4">
          <p className="mb-2 text-[11px] font-medium text-accent">发给 Agent 的小岛口令</p>
          <code className="block break-all rounded-xl border border-[#bd8a52]/25 bg-cream-soft px-3 py-2.5 text-sm text-ink">
            {snippet || "口令还没准备好，请回到小岛后再试。"}
          </code>
          <button
            disabled={!snippet}
            onClick={() => copy("cmd", snippet)}
            className="sketch mt-3 w-full rounded-[16px] border-2 border-[#bd8a52]/55 bg-cream-soft px-5 py-2.5 font-hand text-[15px] text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.16)] transition active:translate-y-0.5 disabled:opacity-45"
          >
            {copied === "cmd" ? "已复制 ✓" : "复制口令"}
          </button>
          <p className="mt-2 text-[11px] text-ink-soft/70">
            这句话可以打开你的小岛信箱，只发给你信任的 Agent。
          </p>
        </Panel>

        {cloudError && <p className="text-center text-sm text-accent">{cloudError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <SmallTile icon="🎒" label="看包裹" text="读取你今天放进背包的真实线索和心愿。" />
          <SmallTile icon="🧭" label="看天气" text="根据体力、心情和伤痛判断今天走多远。" />
          <SmallTile icon="🏝️" label="照看小岛" text="太累时让它留在岛上，别硬把它推出门。" />
          <SmallTile icon="💌" label="寄来信" text="旅行回来后，把远方变成一张明信片。" />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-5 pt-3">
        {hasPet ? (
          <PrimaryButton onClick={enterIsland}>
            {hasOnboarded ? "回小屋" : "进入小岛"}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled>小岛准备中</PrimaryButton>
        )}
        {!hasOnboarded && hasPet && (
          <p className="mt-2 text-center text-[11px] text-ink-soft/70">
            稍后也能从小岛上的「接入 Agent」再来复制口令。
          </p>
        )}
      </div>
    </div>
  );
}
