"use client";

import { useMemo } from "react";

import { useGameStore } from "@/state/gameStore";
import HomeScene from "../scenes3d/HomeScene";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";

const IDLE_LINES = [
  "今天也想和你待在一起。",
  "要不要帮我收拾今日包裹呀？",
  "（它凑过来蹭了蹭你）",
  "我在想昨天那个东西能怎么玩。",
];
const READY_LINES = [
  "包裹我收下啦，让我想想今天怎么过~",
  "嗯…说不定我会出门，也说不定就在家。",
  "你留的那句话，我记住了。",
];

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const companionState = useGameStore((s) => s.companionState);
  const postcards = useGameStore((s) => s.postcards);
  const lastResult = useGameStore((s) => s.lastResult);
  const goTo = useGameStore((s) => s.goTo);
  const devRunTrip = useGameStore((s) => s.devRunTrip);
  const bound = useGameStore((s) => !!s.cloud);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );

  return (
    <div className="relative h-full overflow-hidden">
      {/* fixed immersive isometric view (no orbit / no zoom) */}
      <SceneCanvas
        controls="none"
        orthographic
        cameraPosition={[9, 9, 9]}
        target={[-1.3, 1.7, -1.3]}
        zoom={56}
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

      {/* top bar: name + simple state */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <div>
          <h1 className="font-hand text-2xl leading-none text-ink drop-shadow-[0_1px_0_rgba(255,247,236,0.9)]">
            {companion.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            😊 {capy.mood} · ⚡ {capy.energy}
            {capy.injury > 0 ? ` · 🤕 ${capy.injury}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm text-ink-soft">
            {companionState === "ready" ? "🎒 今日包裹已备好" : "🏡 在家"}
          </p>
          <button
            onClick={() => goTo("album")}
            className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
          >
            📮 {postcards.length}
          </button>
          {bound && (
            <button
              onClick={() => goTo("connect")}
              className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
            >
              🔗 Agent
            </button>
          )}
        </div>
      </div>

      {/* last result chip */}
      {lastResult && (
        <button
          onClick={() => goTo("result")}
          className="absolute inset-x-5 bottom-5 rounded-sticker border-2 border-ink/12 bg-paper/90 px-4 py-2.5 text-left shadow-[0_2px_0_rgba(58,46,42,0.1)]"
        >
          <span className="text-[11px] text-ink-soft">昨天的包裹 ›</span>
          <span className="block truncate text-sm text-ink">
            {lastResult.title} · {lastResult.story}
          </span>
        </button>
      )}

      {/* tiny dev test affordance (guest/local only — cloud pets run on real time) */}
      {!bound && (
        <button
          onClick={devRunTrip}
          className="absolute right-4 top-24 rounded-full border border-dashed border-ink/25 bg-cream-soft/70 px-3 py-1 text-[11px] text-ink-soft/70"
        >
          🧪 测试一天
        </button>
      )}
    </div>
  );
}
