"use client";

import { useMemo } from "react";

import { useGameStore } from "@/state/gameStore";
import HomeScene from "../scenes3d/HomeScene";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { requestZoom } from "../scenes3d/zoomBus";

const IDLE_LINES = [
  "今天也想和你待在一起。",
  "要不要帮我收拾行李呀？",
  "（它凑过来蹭了蹭你）",
  "我在想下次去哪里好呢。",
];
const READY_LINES = [
  "行李我看过啦，等我哪天想走就走咯~",
  "背包好啦！说不定一转身我就出门了。",
  "我在门口转了两圈，还没想好哪天走。",
];

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const companionState = useGameStore((s) => s.companionState);
  const postcards = useGameStore((s) => s.postcards);
  const goTo = useGameStore((s) => s.goTo);
  const devRunTrip = useGameStore((s) => s.devRunTrip);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );

  return (
    <div className="relative h-full overflow-hidden">
      <SceneCanvas
        controls="orbit"
        orthographic
        enableZoom
        cameraPosition={[9, 9, 9]}
        target={[-1.3, 1.7, -1.3]}
        zoom={56}
        minZoom={34}
        maxZoom={130}
        azimuth={0.85}
        minPolar={0.72}
        maxPolar={1.18}
      >
        <HomeScene
          mode="home"
          postcardThemes={wallThemes}
          onOpenPack={() => goTo("pack")}
          onOpenAlbum={() => goTo("album")}
        />
        <RoamingCompanion
          type={companion.type}
          color={companion.primaryColor}
          accessory={companion.accessory}
          clickLines={companionState === "ready" ? READY_LINES : IDLE_LINES}
        />
      </SceneCanvas>

      {/* minimal top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <div>
          <h1 className="font-hand text-2xl leading-none text-ink drop-shadow-[0_1px_0_rgba(255,247,236,0.9)]">
            {companion.name} 的家
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {companionState === "ready" ? "🎒 行李已备好，等它出发" : "🏡 它在家里晃来晃去"}
          </p>
        </div>
        <span className="rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft">
          📮 {postcards.length}
        </span>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-5 right-4 flex flex-col gap-2">
        <button
          onClick={() => requestZoom(1.18)}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 bg-paper/90 text-xl text-ink shadow-[0_2px_0_rgba(58,46,42,0.12)] active:translate-y-0.5"
          aria-label="放大"
        >
          ＋
        </button>
        <button
          onClick={() => requestZoom(0.85)}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 bg-paper/90 text-xl text-ink shadow-[0_2px_0_rgba(58,46,42,0.12)] active:translate-y-0.5"
          aria-label="缩小"
        >
          －
        </button>
      </div>

      {/* tiny dev test affordance */}
      <button
        onClick={devRunTrip}
        className="absolute bottom-5 left-4 rounded-full border border-dashed border-ink/25 bg-cream-soft/70 px-3 py-1 text-[11px] text-ink-soft/70"
      >
        🧪 测试一趟
      </button>
    </div>
  );
}
