"use client";

import { useEffect, useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { Panel, PrimaryButton, ScreenHeader, SecondaryButton } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

// The daily ritual in the pet's own voice — simple, few words (旅行青蛙 vibe):
// you pack a little bag, the Agent listens for it, and it sends the day back.
const DAILY_STEPS = [
  { icon: "🎒", label: "给我备个小包裹" },
  { icon: "🌤️", label: "让 Agent 听听我的小心思" },
  { icon: "💌", label: "等我把远方寄回来" },
];

function StepList({ className }: { className?: string }) {
  return (
    <Panel className={`p-4 ${className ?? ""}`}>
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
  const agentSeenAt = useGameStore((s) => s.agentSeenAt);
  const cloudError = useGameStore((s) => s.cloudError);
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const regenerateConnectLink = useGameStore((s) => s.regenerateConnectLink);
  const goTo = useGameStore((s) => s.goTo);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

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

  // The gate flips to "ready" live (GameRoot polls every 5s until the Agent
  // registers a pet). Hold the name reveal for a beat, then walk the owner
  // onto the island without a tap — the button stays for the impatient.
  useEffect(() => {
    if (mode !== "ready") return;
    const id = setTimeout(() => completeOnboarding(), 3200);
    return () => clearTimeout(id);
  }, [mode, completeOnboarding]);

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

  const regenerate = async () => {
    await regenerateConnectLink();
    setConfirmingReset(false);
    setCopied(false);
  };

  const header =
    mode === "gate"
      ? // short enough to never truncate on a 320px-wide screen
        { eyebrow: "岛上有谁醒了", title: "把我交给 Agent" }
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
              {/* Two-step liveness: the Agent reading skill.md stamps its bind
                  token server-side, so the owner sees progress (它来过了) before
                  the pet exists — not just a silent wait until create lands. */}
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-accent">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                {agentSeenAt
                  ? "你的 Agent 来过啦，正在给我取名字…"
                  : "我在岛上，等你的 Agent…"}
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
          <SecondaryButton
            disabled={!snippet}
            onClick={copy}
            size="sm"
            className="mt-3"
          >
            {copied ? "已复制，悄悄带走吧" : "复制口令"}
          </SecondaryButton>
          <p className="mt-2 text-[11px] text-ink-soft/70">
            这句话能推开小岛的门，只给你信任的 Agent 看。
          </p>

          {/* (Re)generate the bind link. In the gate (no Agent connected yet)
              it's harmless — generate/refresh with no confirm. Once an Agent is
              bound (revisit), regenerating revokes the old link and disconnects
              that Agent, so confirm first. */}
          {(mode === "gate" || mode === "revisit") && (
            <div className="mt-3 border-t border-[#bd8a52]/20 pt-3">
              {!hasPet ? (
                <button
                  onClick={regenerate}
                  disabled={cloudBusy}
                  className="w-full text-[12px] text-ink-soft/75 underline decoration-dotted underline-offset-2 disabled:opacity-45"
                >
                  {cloudBusy ? "生成中…" : snippet ? "换一句口令" : "生成一句口令"}
                </button>
              ) : confirmingReset ? (
                <div className="rounded-xl border border-accent/35 bg-accent/5 p-3">
                  <p className="text-[12px] leading-snug text-ink">
                    重新生成后，<b>现在照看我的 Agent 会立刻失效</b>，要把新口令发给接手的 Agent 才行。确定吗？
                  </p>
                  {/* flex-basis (not width overrides) sizes this pair: the kit
                      buttons are w-full and cn() has no tailwind-merge, so a
                      w-auto className can lose the CSS-order fight — flex-1 on
                      a flex child makes the width moot instead. nowrap keeps
                      the labels on one line at 320px. */}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={regenerate}
                      disabled={cloudBusy}
                      className="sketch flex-[1.5] whitespace-nowrap rounded-[16px] border-2 border-[#b8504a] bg-gradient-to-b from-[#f28c70] to-[#df614f] px-3 py-2.5 font-hand text-[14px] font-bold text-cream-soft shadow-[inset_0_1.5px_0_rgba(255,255,255,0.34),0_4px_0_rgba(150,70,58,0.42)] transition active:translate-y-0.5 active:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.34),0_1px_0_rgba(150,70,58,0.42)] disabled:opacity-45"
                    >
                      {cloudBusy ? "生成中…" : "确定，换一个"}
                    </button>
                    <SecondaryButton
                      onClick={() => setConfirmingReset(false)}
                      size="sm"
                      className="flex-1 whitespace-nowrap px-3"
                    >
                      再想想
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="w-full text-[12px] text-ink-soft/75 underline decoration-dotted underline-offset-2"
                >
                  重新生成口令 / 换一个 Agent
                </button>
              )}
            </div>
          )}
        </Panel>

        {cloudError && <p className="text-center text-sm text-accent">{cloudError}</p>}

        {/* the daily loop, for first-timers (gate / ready); returning owners
            know it. On short screens it's the first thing to give way so the
            口令 panel (and its copy button) never gets pushed out of view. */}
        {mode !== "revisit" && (
          <StepList className="[@media(max-height:700px)]:hidden" />
        )}
      </div>

      <div className="relative z-10 shrink-0 px-5 pb-5 pt-3">
        {mode === "gate" ? (
          // Not a button — nothing is tappable while we wait for the Agent. A
          // slim status pill keeps the whole gate (incl. 复制口令) on one
          // 320×568 screen, where the old disabled button pushed it under.
          <p className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-full bg-paper/80 px-4 py-2 text-[12px] text-ink-soft shadow-[0_4px_14px_-10px_rgba(58,46,42,0.55)] backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
            等我有了名字，这扇门就开了
          </p>
        ) : (
          <PrimaryButton onClick={enterIsland}>
            {mode === "ready" ? "进岛找我" : "回小屋"}
          </PrimaryButton>
        )}
        {mode === "ready" && (
          <p className="mt-2 text-center text-[11px] text-ink-soft/70">
            我去开门啦，马上带你进来…
          </p>
        )}
      </div>
    </div>
  );
}
