"use client";

import { useEffect, useMemo, useState } from "react";

import { tripProgress } from "@/game/clock";
import { useGameStore } from "@/state/gameStore";
import HomeModel from "../scenes3d/home/HomeModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import JournalMap from "../ui/JournalMap";

const WEATHERS = [
  "窗外是慢慢飘的云。",
  "外面起了一点薄雾。",
  "窗台上落着暖暖的阳光。",
  "天边的颜色一点点变深了。",
  "外面飘起了细细的小雨。",
];

function statusLine(p: number): string {
  if (p < 0.34) return "今天才刚开始，它还在琢磨你的包裹。";
  if (p < 0.7) return "它正捣鼓着你给的东西，不知道在干嘛。";
  if (p < 0.98) return "好像有点眉目了，再等等。";
  return "今天的结果马上揭晓！";
}

export default function TravelingScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const activeTrip = useGameStore((s) => s.activeTrip);
  const postcards = useGameStore((s) => s.postcards);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const progress = tripProgress(activeTrip, now);
  const weather = useMemo(() => {
    const seed = activeTrip ? activeTrip.id.length + activeTrip.startedAt : 0;
    return WEATHERS[seed % WEATHERS.length];
  }, [activeTrip]);

  const wallThemes = postcards.slice(0, 3).map((p) => p.destinationTheme);

  return (
    <div className="flex h-full flex-col">
      {/* empty room */}
      <div className="relative h-[42%] shrink-0 overflow-hidden bg-gradient-to-b from-cream-soft to-cream-deep">
        <SceneCanvas
          controls="none"
          orthographic
          cameraPosition={[9, 9, 9]}
          target={[-1.1, 1.4, -1.1]}
          zoom={35}
        >
          <HomeModel mode="away" postcardThemes={wallThemes} />
        </SceneCanvas>
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5">
          <h1 className="font-hand text-2xl text-ink">{companion.name} 的今天</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{weather}</p>
        </div>
      </div>

      {/* journal map */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="rounded-sticker border-2 border-ink/12 bg-paper p-4 shadow-[0_2px_0_rgba(58,46,42,0.06)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-hand text-lg text-ink">旅行手账</span>
            <span className="text-sm text-ink-soft">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <JournalMap progress={progress} />
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-center text-sm text-ink-soft">
            {statusLine(progress)}
          </p>
        </div>

        <p className="mt-auto pt-4 text-center text-xs text-ink-soft/70">
          今天它会把你的包裹玩成什么呢？回来看看就知道。
        </p>

      </div>
    </div>
  );
}
