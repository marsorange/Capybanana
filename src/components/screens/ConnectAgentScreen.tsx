"use client";

import { useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

// The daily ritual in the pet's own voice — simple, few words (旅行青蛙 vibe):
// you pack a little bag, the Agent listens for it, and it sends the day back.
const DAILY_STEPS = [
  { icon: "🎒", label: "给我备个小包裹" },
  { icon: "🌤️", label: "让 Agent 听听我的小心思" },
  { icon: "💌", label: "等我把远方寄回来" },
];

function StepList() {
  return (
    <Panel className="p-4">
      <p className="mb-3 text-[11px] font-medium text-accent">以后，你每天来看看我——</p>
      <ul className="space-y-3">
        {DAILY_STEPS.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-lg leading-none">
              {s.icon}
            </span>
            <p className="font-hand text-[15px] leading-snug text-ink">{s.label}</p>
          </li>
        ))}
      </ul>
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
  const [copied, setCopied] = useState(false);

  const snippet = connectUrl ? `Read ${connectUrl}` : "";
  const hasPet = !!companion;

  // Three states this screen serves:
  //   gate    — no pet yet: the Agent hasn't registered one. The hard gate.
  //   ready   — pet exists, first time through:登记成功, enter the island.
  //   revisit — onboarded already, reopened from home to re-copy the口令.
  const mode: "gate" | "ready" | "revisit" = !hasPet
    ? "gate"
    : hasOnboarded
      ? "revisit"
      : "ready";

  const enterIsland = () => {
    if (!hasOnboarded) completeOnboarding();
    else goTo("home");
  };

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

  const header =
    mode === "gate"
      ? { eyebrow: "岛上有谁醒了", title: "把我交给你的 Agent" }
      : mode === "ready"
        ? { eyebrow: "我探出了头", title: `我叫${companion!.name}啦` }
        : { eyebrow: "小岛口令", title: "接入 Agent" };

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-agent-ref.png"
        overlay="panel"
        imageClassName="object-[50%_50%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/85 via-cream-soft/42 to-transparent" />

      <ScreenHeader
        onBack={mode === "revisit" ? () => goTo("home") : undefined}
        eyebrow={header.eyebrow}
        title={header.title}
      />

      <div className="no-scrollbar relative z-10 min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-5">
        {/* hero: what's happening / why this gate exists */}
        <Panel className="px-4 py-3.5">
          {mode === "gate" && (
            <>
              <p className="font-hand text-lg leading-tight text-ink">我刚到这座岛，还没有名字。</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                把下面这句话交给你的 Agent。它会替我取个名字，也会听见我每天的小心思。
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                等我安顿好，你就能上岛找我啦。
              </p>
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-accent">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                我在岛上，等你的 Agent…
              </p>
            </>
          )}
          {mode === "ready" && (
            <>
              <p className="font-hand text-lg leading-tight text-ink">
                你的 Agent 给我取名「{companion!.name}」
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                我在这座岛上住下啦。往后每天，来看看我就好。
              </p>
            </>
          )}
          {mode === "revisit" && (
            <>
              <p className="font-hand text-lg leading-tight text-ink">
                我是{companion!.name}，还在岛上。
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                想换个照看我的 Agent，或者再发一次口令，把下面这句给它。
              </p>
            </>
          )}
        </Panel>

        {/* the skill-doc command link */}
        <Panel className="p-4">
          <p className="mb-2 text-[11px] font-medium text-accent">交给 Agent 的一句话</p>
          <code className="block break-all rounded-xl border border-[#bd8a52]/25 bg-cream-soft px-3 py-2.5 text-sm text-ink">
            {snippet || "口令还没准备好，等我回到小岛再试。"}
          </code>
          <button
            disabled={!snippet}
            onClick={copy}
            className="sketch mt-3 w-full rounded-[16px] border-2 border-[#bd8a52]/55 bg-cream-soft px-5 py-2.5 font-hand text-[15px] text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.16)] transition active:translate-y-0.5 disabled:opacity-45"
          >
            {copied ? "已复制，悄悄带走吧" : "复制口令"}
          </button>
          <p className="mt-2 text-[11px] text-ink-soft/70">
            这句话能推开小岛的门，只给你信任的 Agent 看。
          </p>
        </Panel>

        {cloudError && <p className="text-center text-sm text-accent">{cloudError}</p>}

        {/* the daily loop, for first-timers (gate / ready); returning owners know it */}
        {mode !== "revisit" && <StepList />}
      </div>

      <div className="relative z-10 shrink-0 px-5 pb-5 pt-3">
        {mode === "gate" ? (
          <>
            <PrimaryButton disabled>等我安顿好…</PrimaryButton>
            <p className="mt-2 text-center text-[11px] text-ink-soft/70">
              等我有了名字，这扇门就开了。
            </p>
          </>
        ) : (
          <PrimaryButton onClick={enterIsland}>
            {mode === "ready" ? "进岛找我" : "回小屋"}
          </PrimaryButton>
        )}
        {mode === "ready" && (
          <p className="mt-2 text-center text-[11px] text-ink-soft/70">
            以后想换 Agent 或再发口令，从岛上的「接入 Agent」来。
          </p>
        )}
      </div>
    </div>
  );
}
