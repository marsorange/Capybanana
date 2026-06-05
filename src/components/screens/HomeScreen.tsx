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
import Icon, { type IconName } from "../ui/Icon";

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

// A reserved ICON SLOT placeholder — real icon art will drop in here later.
// (No emoji per request; this just holds the icon's footprint.)
function IconSlot({ className = "" }: { className?: string }) {
  return (
    <span className={`block rounded-[7px] border-2 border-ink/10 bg-ink/[0.07] ${className}`} />
  );
}


function TopIconButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 flex-col items-center justify-center rounded-[14px] border-2 border-ink/10 bg-paper/85 text-ink shadow-[0_3px_0_rgba(111,84,55,0.12)] backdrop-blur active:translate-y-0.5"
    >
      <Icon name={icon} className="h-6 w-6" />
      <span className="mt-0.5 text-[9px] font-medium leading-none">{label}</span>
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
    { label: "小屋", icon: "house" as IconName, active: true, onClick: onHome },
    { label: "背包", icon: "package" as IconName, active: false, onClick: onPack },
    { label: "相册", icon: "photobook" as IconName, active: false, onClick: onAlbum },
    { label: "手账", icon: "book" as IconName, active: false, onClick: onJournal },
  ];
  return (
    <nav className="absolute inset-x-6 bottom-3 grid grid-cols-4 rounded-[22px] border-2 border-ink/10 bg-paper/90 p-1.5 shadow-[0_4px_0_rgba(111,84,55,0.1)] backdrop-blur">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`flex flex-col items-center justify-center rounded-[16px] py-1.5 transition active:translate-y-0.5 ${
            item.active ? "bg-leaf/14 text-ink" : "text-ink-soft"
          }`}
        >
          <Icon name={item.icon} className={`h-7 w-7 ${item.active ? "" : "opacity-70"}`} />
          <span className="mt-1 text-xs font-medium leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
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
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2.5 px-4 pt-4">
        <button
          onClick={() => goTo("profile")}
          className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-[18px] border-2 border-ink/10 bg-paper/85 py-1.5 pl-1.5 pr-3.5 text-left shadow-[0_3px_0_rgba(111,84,55,0.1)] backdrop-blur"
        >
          {/* avatar slot (capybara art TBD) */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-soft shadow-inner">
            <IconSlot className="h-6 w-6 rounded-lg" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-hand text-lg leading-none text-ink">
              {companion.name}
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <IconSlot className="h-3 w-3 rounded-[4px] border-leaf/40 bg-leaf/20" />
              <span>{postcards.length * 80 + memories.length * 20}</span>
            </span>
          </span>
        </button>
        <div className="flex gap-2">
          <TopIconButton label="手账" icon="book" onClick={() => goTo("profile")} />
          {bound && (
            <TopIconButton label="助手" icon="setting" onClick={() => goTo("connect")} />
          )}
        </div>
      </div>
      <div className="absolute right-4 top-[4.4rem]">
        <MusicToggle />
      </div>

      {/* (daily-wish card hidden for now) */}

      {/* last result chip */}
      {lastResult && (
        <button
          onClick={() => goTo("result")}
          className="absolute inset-x-6 bottom-[5.25rem] rounded-[16px] border-2 border-ink/12 bg-paper/90 px-3.5 py-2 text-left shadow-[0_2px_0_rgba(58,46,42,0.1)]"
        >
          <span className="text-[10px] text-ink-soft">昨天留下的小事 ›</span>
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
