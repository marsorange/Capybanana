"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { companionStats } from "@/game/companionLevel";
import { useGameStore } from "@/state/gameStore";
import HomeModel from "../scenes3d/home/HomeModel";
import HomeColliders from "../scenes3d/home/HomeColliders";
import PhysicsToy from "../scenes3d/home/PhysicsToy";
import InteractionLayer from "../scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Icon, { type IconName } from "../ui/Icon";
import CapyAvatar from "../ui/CapyAvatar";
import MusicToggle from "../ui/MusicToggle";

const IDLE_LINES = [
  "今天也想和你待在一块儿。",
  "要不要给我备个小包裹？",
  "（它凑过来，蹭了蹭你）",
  "昨天那个东西，我还在想怎么玩。",
];
const READY_LINES = [
  "包裹放门口啦，今天去哪儿还没定。",
  "也许去远方，也许就在岛上晒太阳。",
  "你留的那句话，我悄悄藏进包里了。",
];

function LeafGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M21 3C9 2 3 9 3 20c11 1 18-6 18-17Z" fill="#8aa978" />
      <path
        d="M7 17C11 12 15 8 19 5"
        stroke="rgba(255,255,255,.45)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A chunky paper tile for top-right shortcuts. */
function HudIconTile({
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
      aria-label={label}
      className="ui-wood-surface ui-wood-press pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"
    >
      <Icon name={icon} className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />
    </button>
  );
}

/** Floating tab dock — three main home entries. */
function EntryBar({ goTo }: { goTo: (s: "home" | "pack" | "album") => void }) {
  const items = [
    { key: "home", label: "小屋", icon: "home" as IconName, active: true, onClick: () => goTo("home") },
    { key: "pack", label: "背包", icon: "package" as IconName, onClick: () => goTo("pack") },
    { key: "album", label: "明信片", icon: "postmail" as IconName, onClick: () => goTo("album") },
  ];
  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-5 pb-4"
    >
      <div className="ui-bottom-dock pointer-events-auto grid h-[88px] w-full max-w-[350px] grid-cols-3 gap-1 rounded-[30px] p-1.5">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className={`ui-bottom-tab flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-1 py-1.5 ${
              it.active ? "ui-bottom-tab-active" : ""
            }`}
          >
            <Icon
              name={it.icon}
              className="h-[48px] w-[48px] drop-shadow-[0_3px_2px_rgba(120,84,40,0.22)]"
            />
            <span className="font-hand text-[15px] font-bold leading-none">
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}

/** Floating paper toast — a soft, cozy hint (e.g. the doorway bag went stale).
    Auto-dismisses after a few seconds; "重新打包" hops straight to packing. */
function NoticeToast({
  text,
  onPack,
  onClose,
}: {
  text: string;
  onPack: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 9000);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="pointer-events-auto absolute inset-x-4 top-[88px] z-20"
    >
      <div className="sketch tex-grain flex items-start gap-3 rounded-[24px] border-2 border-[#e2c596] bg-paper/95 px-4 py-3 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_5px_0_rgba(143,101,54,0.16),0_16px_28px_-18px_rgba(58,46,42,0.48)]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[17px] bg-[#f6edd8] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <Icon name="package" className="h-9 w-9" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-hand text-[15px] leading-snug text-ink">{text}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onPack}
              className="rounded-[15px] border-2 border-accent/35 bg-accent/10 px-3.5 py-1.5 font-hand text-[13px] font-semibold text-accent transition active:translate-y-0.5"
            >
              重新打包
            </button>
            <button
              onClick={onClose}
              className="rounded-[15px] px-3.5 py-1.5 font-hand text-[13px] text-ink-soft transition active:translate-y-0.5"
            >
              知道啦
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const companionState = useGameStore((s) => s.companionState);
  const packedBag = useGameStore((s) => s.packedBag);
  const postcards = useGameStore((s) => s.postcards);
  const companionDays = useGameStore((s) => s.companionDays);
  const goTo = useGameStore((s) => s.goTo);
  const bound = useGameStore((s) => !!s.cloud);
  const notice = useGameStore((s) => s.notice);
  const clearNotice = useGameStore((s) => s.clearNotice);
  const expireStaleBag = useGameStore((s) => s.expireStaleBag);

  // On reaching home (and whenever the bag changes), check if the prepared bag
  // has gone stale (>24h). If so, the store prompts and clears it server-side.
  useEffect(() => {
    expireStaleBag();
  }, [expireStaleBag, packedBag]);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );
  const stats = useMemo(() => companionStats(companionDays), [companionDays]);
  const ready = companionState === "ready" || !!packedBag;

  return (
    <div className="relative h-full overflow-hidden bg-cream-soft">
      <div className="pointer-events-none absolute inset-0">
        {/* unoptimized: the Next image optimizer kept hanging on this large PNG
            in dev (and upscaling it in prod), leaving the sky blank — serve the
            raw file so the painterly sky always shows behind the diorama. */}
        <Image
          src="/art/home-sky-soft.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 640px) 100vw, 460px"
          className="select-none object-cover"
        />
        <div className="ui-home-sky-shade absolute inset-0" />
      </div>

      {/* full-bleed 3D diorama — the page IS the scene; UI just floats over it */}
      <div className="absolute inset-0">
        <SceneCanvas
          controls="orbit"
          orthographic
          sky
          physics
          dpr={[1, 1]}
          cameraPosition={[6, 7, 12]}
          target={[-0.6, 0.7, -0.8]}
          zoom={52}
          enableZoom
          minZoom={24}
          maxZoom={110}
          minPolar={0.7}
          maxPolar={1.3}
          bendStrength={0}
        >
          {/* visual diorama (throwaway art) — taps on the backpack / postcard
              rack route to those screens, so the scene is the navigation */}
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
            clickLines={ready ? READY_LINES : IDLE_LINES}
          />
          <PhysicsToy />
          <InteractionLayer />
        </SceneCanvas>
      </div>

      {/* game HUD: owner pill + compact controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3.5 pt-4">
        <motion.button
          onClick={() => goTo("profile")}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="ui-wood-surface ui-wood-press pointer-events-auto relative flex h-16 w-[270px] max-w-[calc(100%-96px)] items-center rounded-[28px] py-2 pl-[70px] pr-3.5 text-left"
        >
          <span className="absolute left-2 top-1/2 -translate-y-1/2">
            <span className="ui-icon-well h-[56px] w-[56px] rounded-full shadow-[0_8px_14px_-6px_rgba(90,60,30,0.4)]">
              <CapyAvatar className="h-12 w-12 shrink-0" />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate font-hand text-[20px] leading-none text-[#4f3828]">
              {companion.name}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-none text-ink-soft">
              <LeafGlyph className="h-3.5 w-3.5" />
              <span className="font-hand text-[13px] font-bold text-leaf">Lv.{stats.level}</span>
              <span className="text-ink-soft/55">·</span>
              <span>{stats.days} 天</span>
            </span>
          </span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="pointer-events-auto grid shrink-0 grid-cols-2 gap-1.5"
        >
          {bound && (
            <>
              <MusicToggle />
              <HudIconTile label="设置" icon="setting" onClick={() => goTo("connect")} />
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {notice && (
          <NoticeToast
            key="home-notice"
            text={notice}
            onPack={() => {
              clearNotice();
              goTo("pack");
            }}
            onClose={clearNotice}
          />
        )}
      </AnimatePresence>

      <EntryBar goTo={goTo} />
    </div>
  );
}
