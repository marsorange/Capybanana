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
  if (p < 0.34) return "它刚出门不久，包裹应该还背得很紧。";
  if (p < 0.7) return "小屋安静下来，远方正在发生一点小事。";
  if (p < 0.98) return "它好像快想好要寄什么回来了。";
  return "门口快有动静了。";
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
    <div className="game-bg flex h-full flex-col">
      {/* empty room */}
      <div className="relative h-[46%] shrink-0 overflow-hidden">
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
          <div className="game-card px-4 py-3">
            <p className="text-sm text-ink-soft">{weather}</p>
            <h1 className="mt-0.5 font-hand text-2xl text-ink">
              {companion.name} 出门了
            </h1>
          </div>
        </div>
      </div>

      {/* journal map */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="game-card p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-hand text-lg text-ink">今日路程</span>
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
          目的地先不告诉你。等它回来，故事会自己落进相册里。
        </p>

      </div>
    </div>
  );
}
