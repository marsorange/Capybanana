"use client";

import { useEffect, useState } from "react";

import { useGameStore } from "@/state/gameStore";
import { dom, useTr } from "@/i18n";
import { Panel, PrimaryButton, ScreenHeader, SecondaryButton } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

// The daily ritual in the pet's own voice — simple, few words (旅行青蛙 vibe):
// you pack a little bag, the Agent listens for it, and it sends the day back.
const S = dom(
  {
    dailyIntro: "以后，你每天来看看我——",
    stepPack: "给我备个小包裹",
    stepListen: "让 Agent 听听我的小心思",
    stepLetter: "等我把远方寄回来",
    gateEyebrow: "岛上有谁醒了",
    gateTitle: "把我交给 Agent",
    readyEyebrow: "我探出了头",
    readyTitle: (name: string) => `我叫${name}啦`,
    revisitEyebrow: "小岛口令",
    revisitTitle: "接入 Agent",
    gateLead: "我刚到这座岛，还没有名字。",
    gateBody: "把下面这句话交给你的 Agent。它会替我取个名字，也会听见我每天的小心思。",
    agentSeen: "你的 Agent 来过啦，正在给我取名字…",
    agentWaiting: "我在岛上，等你的 Agent…",
    readyLead: (name: string) => `你的 Agent 给我取名「${name}」`,
    readyBody: "我在这座岛上住下啦。往后每天，来看看我就好。",
    revisitLead: (name: string) => `我是${name}，还在岛上。`,
    revisitBody: "想换个照看我的 Agent，或者再发一次口令，把下面这句给它。",
    snippetLabel: "交给 Agent 的一句话",
    snippetEmpty: "口令还没准备好，等我回到小岛再试。",
    copied: "已复制，悄悄带走吧",
    copy: "复制口令",
    snippetHint: "这句话能推开小岛的门，只给你信任的 Agent 看。",
    generating: "生成中…",
    swapToken: "换一句口令",
    makeToken: "生成一句口令",
    resetWarn: "重新生成后，",
    resetWarnBold: "现在照看我的 Agent 会立刻失效",
    resetWarnTail: "，要把新口令发给接手的 Agent 才行。确定吗？",
    resetConfirm: "确定，换一个",
    resetCancel: "再想想",
    resetTrigger: "重新生成口令 / 换一个 Agent",
    gateWait: "等我有了名字，这扇门就开了",
    enterIsland: "进岛找我",
    backHome: "回小屋",
    openingDoor: "我去开门啦，马上带你进来…",
  },
  {
    dailyIntro: "From now on, come see me each day —",
    stepPack: "Pack a little bag for me",
    stepListen: "Let the Agent hear what's on my mind",
    stepLetter: "Wait for me to send the far-away home",
    gateEyebrow: "Someone's awake on the island",
    gateTitle: "Hand me to your Agent",
    readyEyebrow: "I peeked out",
    readyTitle: (name: string) => `I'm ${name} now`,
    revisitEyebrow: "Island pass",
    revisitTitle: "Connect an Agent",
    gateLead: "I just arrived on this island, and I don't have a name yet.",
    gateBody:
      "Hand the line below to your Agent. It'll give me a name, and it'll hear what's on my mind each day.",
    agentSeen: "Your Agent stopped by — it's picking out my name…",
    agentWaiting: "I'm on the island, waiting for your Agent…",
    readyLead: (name: string) => `Your Agent named me "${name}"`,
    readyBody: "I've settled in on this island. From now on, just come see me each day.",
    revisitLead: (name: string) => `I'm ${name}, still here on the island.`,
    revisitBody:
      "Want a different Agent to look after me, or a fresh pass? Hand the line below to it.",
    snippetLabel: "The line to give your Agent",
    snippetEmpty: "The pass isn't ready yet — try again once I'm back on the island.",
    copied: "Copied — take it with you",
    copy: "Copy the pass",
    snippetHint: "This line opens the island gate. Only show it to an Agent you trust.",
    generating: "Generating…",
    swapToken: "Swap the pass",
    makeToken: "Make a pass",
    resetWarn: "Once you regenerate, ",
    resetWarnBold: "the Agent looking after me right now stops working immediately",
    resetWarnTail: ", and you'll need to give the new pass to the next Agent. Sure?",
    resetConfirm: "Yes, swap it",
    resetCancel: "Let me think",
    resetTrigger: "Regenerate the pass / switch Agent",
    gateWait: "Once I have a name, this door swings open",
    enterIsland: "Come find me",
    backHome: "Back to the cottage",
    openingDoor: "I'm off to open the door — bringing you in soon…",
  },
);

function StepList({ className }: { className?: string }) {
  const t = useTr(S);
  const steps = [
    { icon: "🎒", label: t.stepPack },
    { icon: "🌤️", label: t.stepListen },
    { icon: "💌", label: t.stepLetter },
  ];
  return (
    <Panel className={`p-4 ${className ?? ""}`}>
      <p className="mb-3 text-[11px] font-medium text-accent">{t.dailyIntro}</p>
      <ul className="space-y-3">
        {steps.map((s) => (
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
  const t = useTr(S);
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
        { eyebrow: t.gateEyebrow, title: t.gateTitle }
      : mode === "ready"
        ? { eyebrow: t.readyEyebrow, title: t.readyTitle(companion!.name) }
        : { eyebrow: t.revisitEyebrow, title: t.revisitTitle };

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
              <p className="font-hand text-lg leading-tight text-ink">{t.gateLead}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {t.gateBody}
              </p>
              {/* Two-step liveness: the Agent reading skill.md stamps its bind
                  token server-side, so the owner sees progress (它来过了) before
                  the pet exists — not just a silent wait until create lands. */}
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-accent">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                {agentSeenAt ? t.agentSeen : t.agentWaiting}
              </p>
            </>
          )}
          {mode === "ready" && (
            <>
              <p className="font-hand text-lg leading-tight text-ink">
                {t.readyLead(companion!.name)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {t.readyBody}
              </p>
            </>
          )}
          {mode === "revisit" && (
            <>
              <p className="font-hand text-lg leading-tight text-ink">
                {t.revisitLead(companion!.name)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {t.revisitBody}
              </p>
            </>
          )}
        </Panel>

        {/* the skill-doc command link */}
        <Panel className="p-4">
          <p className="mb-2 text-[11px] font-medium text-accent">{t.snippetLabel}</p>
          <code className="block break-all rounded-xl border border-[#bd8a52]/25 bg-cream-soft px-3 py-2.5 text-sm text-ink">
            {snippet || t.snippetEmpty}
          </code>
          <SecondaryButton
            disabled={!snippet}
            onClick={copy}
            size="sm"
            className="mt-3"
          >
            {copied ? t.copied : t.copy}
          </SecondaryButton>
          <p className="mt-2 text-[11px] text-ink-soft/70">
            {t.snippetHint}
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
                  {cloudBusy ? t.generating : snippet ? t.swapToken : t.makeToken}
                </button>
              ) : confirmingReset ? (
                <div className="rounded-xl border border-accent/35 bg-accent/5 p-3">
                  <p className="text-[12px] leading-snug text-ink">
                    {t.resetWarn}
                    <b>{t.resetWarnBold}</b>
                    {t.resetWarnTail}
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
                      {cloudBusy ? t.generating : t.resetConfirm}
                    </button>
                    <SecondaryButton
                      onClick={() => setConfirmingReset(false)}
                      size="sm"
                      className="flex-1 whitespace-nowrap px-3"
                    >
                      {t.resetCancel}
                    </SecondaryButton>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="w-full text-[12px] text-ink-soft/75 underline decoration-dotted underline-offset-2"
                >
                  {t.resetTrigger}
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
            {t.gateWait}
          </p>
        ) : (
          <PrimaryButton onClick={enterIsland}>
            {mode === "ready" ? t.enterIsland : t.backHome}
          </PrimaryButton>
        )}
        {mode === "ready" && (
          <p className="mt-2 text-center text-[11px] text-ink-soft/70">
            {t.openingDoor}
          </p>
        )}
      </div>
    </div>
  );
}
