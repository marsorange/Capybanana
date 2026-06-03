"use client";

import { useMemo } from "react";

import { useGameStore } from "@/state/gameStore";
import HomeModel from "../scenes3d/home/HomeModel";
import HomeColliders from "../scenes3d/home/HomeColliders";
import PhysicsToy from "../scenes3d/home/PhysicsToy";
import InteractionLayer from "../scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import MusicToggle from "../ui/MusicToggle";

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
  const bound = useGameStore((s) => !!s.cloud);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );

  return (
    <div className="relative h-full overflow-hidden">
      {/* clean warm-cream studio backdrop, letting the diorama pop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 78% 8%, #fdf3d6 0%, #f4e8cd 42%, #ecdcbd 100%)",
        }}
      />
      {/* the sun, glowing up in the corner */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full blur-[2px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,243,190,0.98) 0%, rgba(255,227,150,0.6) 36%, rgba(255,227,150,0) 70%)",
        }}
      />
      {/* free-orbit isometric view, centered on the island */}
      <SceneCanvas
        controls="orbit"
        orthographic
        sun
        physics
        cameraPosition={[5, 6.5, 11]}
        target={[-1.6, 2.0, -2.0]}
        zoom={60}
        enableZoom
        minZoom={34}
        maxZoom={120}
        minPolar={0.7}
        maxPolar={1.3}
        bendStrength={0}
      >
        {/* visual diorama (throwaway art) */}
        <HomeModel
          mode="home"
          postcardThemes={wallThemes}
          onOpenPack={() => goTo("pack")}
          onOpenAlbum={() => goTo("album")}
        />
        {/* lean physical proxy the pet + props collide against; also the
            tap-to-move ground catcher */}
        <HomeColliders />
        {/* physics pet (tap to move) + a reference physics prop (tap to toss) */}
        <RoamingCompanion
          type={companion.type}
          color={companion.primaryColor}
          accessory={companion.accessory}
          seed={companion.id}
          clickLines={companionState === "ready" ? READY_LINES : IDLE_LINES}
        />
        <PhysicsToy />
        <InteractionLayer />
      </SceneCanvas>

      {/* top bar: name + simple state */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <button
          onClick={() => goTo("profile")}
          className="pointer-events-auto text-left"
        >
          <h1 className="font-hand text-2xl leading-none text-ink drop-shadow-[0_1px_0_rgba(255,247,236,0.9)]">
            {companion.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            心情 {capy.mood} · 体力 {capy.energy}
            {capy.injury > 0 ? ` · 伤 ${capy.injury}` : ""}
            <span className="ml-1 text-ink-soft/60">· 档案 ›</span>
          </p>
        </button>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm text-ink-soft">
            {companionState === "ready" ? "今日包裹已备好" : "在家"}
          </p>
          <MusicToggle />
          <button
            onClick={() => goTo("album")}
            className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
          >
            明信片 {postcards.length}
          </button>
          {bound && (
            <button
              onClick={() => goTo("connect")}
              className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
            >
              Agent
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

    </div>
  );
}
