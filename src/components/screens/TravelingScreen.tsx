"use client";

import { useEffect, useMemo, useState } from "react";

import { tripProgress } from "@/game/clock";
import { dom, useTr } from "@/i18n";
import { useGameStore } from "@/state/gameStore";
import JournalMap from "../ui/JournalMap";
import { Panel, ProgressBar } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

const S = dom(
  {
    weathers: [
      "窗外是慢慢飘的云。",
      "外面起了一点薄雾。",
      "窗台上落着暖暖的阳光。",
      "天边的颜色一点点变深了。",
      "外面飘起了细细的小雨。",
    ],
    statusEarly: "我刚出门，背包还鼓鼓的。",
    statusMid: "走得有点远了，挺好的。",
    statusLate: "想好要给你寄什么啦。",
    statusAlmost: "我马上就到家咯。",
    away: (name: string) => `${name} 出门了`,
    quietHint: "小屋先安静一会儿，路上的事等我回来讲。",
    wayHome: "回家的路",
    secret: "去哪是秘密——等我回来。",
  },
  {
    weathers: [
      "Clouds drifting slowly past the window.",
      "A thin mist outside.",
      "Warm sunlight resting on the windowsill.",
      "The colors at the horizon are deepening.",
      "A fine drizzle has started outside.",
    ],
    statusEarly: "Just set off — my backpack's still full.",
    statusMid: "I've wandered pretty far. It's lovely.",
    statusLate: "I've decided what to send you!",
    statusAlmost: "Almost home now.",
    away: (name: string) => `${name} is out and about`,
    quietHint: "The cottage will be quiet a while — I'll tell you the road stories when I'm back.",
    wayHome: "The way home",
    secret: "Where I went is a secret — wait till I'm back.",
  },
);

export default function TravelingScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const activeTrip = useGameStore((s) => s.activeTrip);
  const t = useTr(S);

  function statusLine(p: number): string {
    if (p < 0.34) return t.statusEarly;
    if (p < 0.7) return t.statusMid;
    if (p < 0.98) return t.statusLate;
    return t.statusAlmost;
  }

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const progress = tripProgress(activeTrip, now);
  const weather = useMemo(() => {
    const seed = activeTrip ? activeTrip.id.length + activeTrip.startedAt : 0;
    return t.weathers[seed % t.weathers.length];
  }, [activeTrip, t]);

  const pct = Math.round(progress * 100);

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-travel-ref.png"
        overlay="travel"
        imageClassName="object-[52%_42%]"
      />

      <div className="relative h-[47%] shrink-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5">
          <Panel className="px-4 py-3">
            <p className="text-sm text-ink-soft">{weather}</p>
            <h1 className="mt-0.5 font-hand text-2xl text-ink">{t.away(companion.name)}</h1>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {t.quietHint}
            </p>
          </Panel>
        </div>
      </div>

      {/* journal map */}
      <div className="relative z-10 flex flex-1 flex-col px-5 py-4">
        <Panel className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-hand text-lg text-ink">{t.wayHome}</span>
            <span className="font-hand text-base text-accent">{pct}%</span>
          </div>
          <JournalMap progress={progress} />
          <ProgressBar value={progress} className="mt-2" />
          <p className="mt-3 text-center text-sm text-ink-soft">{statusLine(progress)}</p>
        </Panel>

        <p className="mt-auto pt-4 text-center text-xs leading-relaxed text-ink-soft/70">
          {t.secret}
        </p>
      </div>
    </div>
  );
}
