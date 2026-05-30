"use client";

import type { DayOutcome } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import Capybara2D from "../home/Capybara2D";
import Button from "../ui/Button";

const EFFECT_LABELS: Record<string, string> = {
  mood: "心情",
  energy: "体力",
  curiosity: "好奇",
  bravery: "勇敢",
  injury: "伤痛",
  bond: "羁绊",
};

function EffectChips({ effects }: { effects: DayOutcome["effects"] }) {
  const entries = Object.entries(effects).filter(([, v]) => v && v !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {entries.map(([k, v]) => {
        const up = (v as number) > 0;
        const good = k === "injury" ? !up : up;
        return (
          <span
            key={k}
            className={`rounded-full border-2 px-3 py-1 text-sm ${
              good
                ? "border-leaf/40 bg-leaf/10 text-ink"
                : "border-accent/40 bg-accent/10 text-ink"
            }`}
          >
            {EFFECT_LABELS[k] ?? k} {up ? "+" : ""}
            {v}
          </span>
        );
      })}
    </div>
  );
}

export default function ResultScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const result = useGameStore((s) => s.lastResult);
  const goTo = useGameStore((s) => s.goTo);

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Button onClick={() => goTo("home")}>回家</Button>
      </div>
    );
  }

  const KIND_EMOJI: Record<string, string> = {
    home: "🏡",
    yard: "🌿",
    claw: "⚔️",
    rest: "😴",
    secret: "🌙",
    travel: "✈️",
  };
  const emoji = KIND_EMOJI[result.kind] ?? "🏡";

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[42%] shrink-0 items-end justify-center overflow-hidden bg-gradient-to-b from-cream-soft to-cream-deep pb-4">
        <Capybara2D
          color={companion.primaryColor}
          accessory={companion.accessory}
          className="h-40 w-40 animate-float-soft"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 text-center">
          <p className="text-sm text-ink-soft">{emoji} 昨天的包裹</p>
          <h1 className="mt-1 font-hand text-2xl text-ink">{result.title}</h1>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <p className="text-center text-[15px] leading-relaxed text-ink">
          {result.story}
        </p>

        {result.misunderstanding && (
          <div className="rounded-sticker border-2 border-dashed border-ink/20 bg-cream-soft px-4 py-3 text-center">
            <p className="mb-1 text-xs font-medium text-accent">误解词典 +1</p>
            <p className="text-sm text-ink-soft">{result.misunderstanding}</p>
          </div>
        )}

        {result.souvenir && (
          <p className="text-center text-sm text-ink-soft">
            🎁 它还带回了：<b className="text-ink">{result.souvenir}</b>
          </p>
        )}

        <EffectChips effects={result.effects} />
      </div>

      <div className="shrink-0 px-5 pb-6 pt-2">
        <Button size="lg" className="w-full" onClick={() => goTo("home")}>
          知道啦
        </Button>
      </div>
    </div>
  );
}
