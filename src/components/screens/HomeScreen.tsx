"use client";

import { useMemo } from "react";

import { useGameStore } from "@/state/gameStore";
import type { CompanionState } from "@/game/types";
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

function dailyWish(
  state: CompanionState,
  mood: number,
  energy: number,
  injury: number,
) {
  if (state === "ready") {
    return {
      title: "今日包裹已放好",
      body: "它会先闻一闻、想一想，再等助手替它决定今天出门还是留在家。",
      cta: "查看助手",
    };
  }
  if (injury > 0) {
    return {
      title: "它今天走得慢一点",
      body: "可以给它拍一样柔软或暖暖的东西，留言也可以短一点。",
      cta: "准备包裹",
    };
  }
  if (energy < 35) {
    return {
      title: "它有点困",
      body: "今天适合带一件舒服的小东西，让它把日子过得慢一点。",
      cta: "准备包裹",
    };
  }
  if (mood < 45) {
    return {
      title: "它在窗边发呆",
      body: "拍一张你身边的颜色，或者留一句想去哪里的心愿。",
      cta: "准备包裹",
    };
  }
  return {
    title: "它在等今天的小线索",
    body: "拍 1-3 件真实物品，再留一句话。远方会从这些线索里长出来。",
    cta: "准备包裹",
  };
}

function TopIconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto flex h-14 w-14 flex-col items-center justify-center rounded-[18px] border-2 border-ink/10 bg-paper/82 text-ink shadow-[0_4px_0_rgba(111,84,55,0.12)] backdrop-blur active:translate-y-0.5"
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="mt-1 text-[11px] font-medium leading-none">{label}</span>
    </button>
  );
}

function BottomNav({
  onHome,
  onPack,
  onAlbum,
  onJournal,
}: {
  onHome: () => void;
  onPack: () => void;
  onAlbum: () => void;
  onJournal: () => void;
}) {
  const items = [
    { label: "小屋", icon: "🏠", active: true, onClick: onHome },
    { label: "背包", icon: "🎒", active: false, onClick: onPack },
    { label: "相册", icon: "📷", active: false, onClick: onAlbum },
    { label: "手账", icon: "📒", active: false, onClick: onJournal },
  ];
  return (
    <nav className="absolute inset-x-5 bottom-4 grid grid-cols-4 rounded-[28px] border-2 border-ink/10 bg-paper/88 p-2 shadow-[0_6px_0_rgba(111,84,55,0.1)] backdrop-blur">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`flex flex-col items-center justify-center rounded-[20px] py-2 text-sm transition active:translate-y-0.5 ${
            item.active ? "bg-leaf/14 text-ink" : "text-ink-soft"
          }`}
        >
          <span className="text-2xl leading-none">{item.icon}</span>
          <span className="mt-1 font-medium leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const companionState = useGameStore((s) => s.companionState);
  const postcards = useGameStore((s) => s.postcards);
  const lastResult = useGameStore((s) => s.lastResult);
  const memories = useGameStore((s) => s.capyState.memories);
  const goTo = useGameStore((s) => s.goTo);
  const bound = useGameStore((s) => !!s.cloud);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );
  const wish = dailyWish(
    companionState,
    capy.mood,
    capy.energy,
    capy.injury,
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
        sky
        physics
        cameraPosition={[6, 7, 12]}
        target={[-0.6, 0.4, -0.8]}
        zoom={38}
        enableZoom
        minZoom={24}
        maxZoom={110}
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

      {/* top bar: profile capsule + notebook controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-5">
        <button
          onClick={() => goTo("profile")}
          className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3 rounded-[26px] border-2 border-ink/10 bg-paper/82 py-2 pl-2 pr-4 text-left shadow-[0_4px_0_rgba(111,84,55,0.1)] backdrop-blur"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream-soft text-3xl shadow-inner">
            🐾
          </span>
          <span className="min-w-0">
            <span className="block truncate font-hand text-[26px] leading-none text-ink">
              {companion.name}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
              <span>🍃</span>
              <span>{postcards.length * 80 + memories.length * 20}</span>
            </span>
          </span>
        </button>
        <div className="flex gap-2">
          <TopIconButton label="手账" icon="📒" onClick={() => goTo("profile")} />
          {bound && (
            <TopIconButton
              label="助手"
              icon="⚙️"
              onClick={() => goTo("connect")}
            />
          )}
        </div>
      </div>
      <div className="absolute right-5 top-[5.35rem]">
        <MusicToggle />
      </div>

      <section className="absolute inset-x-5 bottom-28 rounded-[22px] border-2 border-ink/10 bg-paper/88 px-4 py-3 shadow-[0_4px_0_rgba(111,84,55,0.1)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-hand text-lg leading-none text-ink">{wish.title}</p>
          <span className="shrink-0 rounded-full bg-cream-deep px-2.5 py-1 text-[11px] text-ink-soft">
            {companionState === "ready" ? "等助手" : "在家"}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-soft">{wish.body}</p>
        <button
          onClick={() => goTo(companionState === "ready" && bound ? "connect" : "pack")}
          className="mt-2 inline-flex rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-paper shadow-[0_2px_0_rgba(58,46,42,0.15)] active:translate-y-0.5"
        >
          {wish.cta}
        </button>
      </section>

      {/* last result chip */}
      {lastResult && (
        <button
          onClick={() => goTo("result")}
          className="absolute inset-x-5 bottom-[13.25rem] rounded-sticker border-2 border-ink/12 bg-paper/90 px-4 py-2.5 text-left shadow-[0_2px_0_rgba(58,46,42,0.1)]"
        >
          <span className="text-[11px] text-ink-soft">昨天留下的小事 ›</span>
          <span className="block truncate text-sm text-ink">
            {lastResult.title} · {lastResult.story}
          </span>
        </button>
      )}

      <BottomNav
        onHome={() => goTo("home")}
        onPack={() => goTo("pack")}
        onAlbum={() => goTo("album")}
        onJournal={() => goTo("profile")}
      />
    </div>
  );
}
