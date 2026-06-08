"use client";

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
import MusicToggle from "../ui/MusicToggle";
import Icon, { type IconName } from "../ui/Icon";
import CapyAvatar from "../ui/CapyAvatar";

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

/** A round paper icon button for the top-right cluster (Agent, etc.). */
function RoundIconBtn({
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
      className="sketch tex-grain pointer-events-auto grid h-11 w-11 place-items-center rounded-full border-2 border-[#bd8a52]/45 bg-paper text-ink shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.18)] transition active:translate-y-0.5"
    >
      <Icon name={icon} className="h-6 w-6" />
    </button>
  );
}

/** Floating entry bar — three simple shortcuts off the home scene. A puffy,
    centered, translucent pill with the low-poly toy icons (the cozy-game look). */
function EntryBar({ goTo }: { goTo: (s: "pack" | "album" | "profile") => void }) {
  const items = [
    { key: "pack", label: "打包", icon: "package" as IconName, onClick: () => goTo("pack") },
    { key: "album", label: "相册", icon: "photobook" as IconName, onClick: () => goTo("album") },
    { key: "journal", label: "手账", icon: "book" as IconName, onClick: () => goTo("profile") },
  ];
  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-5"
    >
      <div className="sketch tex-wood pointer-events-auto relative flex items-center gap-1 rounded-[26px] border-2 border-[#cdab6e] p-2 shadow-[inset_0_1.5px_0_rgba(255,250,236,0.65),0_5px_0_rgba(150,112,60,0.4),0_16px_30px_-18px_rgba(120,90,50,0.4)]">
        {/* carved decorative groove */}
        <span className="pointer-events-none absolute inset-[5px] rounded-[20px] border border-dashed border-[#a07c48]/35" />
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className="group relative flex w-[78px] flex-col items-center justify-center gap-1 rounded-[20px] py-2 transition hover:bg-white/20 active:translate-y-0.5"
          >
            <Icon
              name={it.icon}
              className="h-8 w-8 drop-shadow-[0_2px_2px_rgba(140,104,56,0.3)] transition group-active:scale-95"
            />
            <span className="wood-text font-hand text-[13px] leading-none">
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
      <div className="sketch tex-grain flex items-start gap-3 rounded-[20px] border-2 border-[#bd8a52]/45 bg-paper px-4 py-3 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_4px_0_rgba(111,84,55,0.18),0_14px_26px_-14px_rgba(58,46,42,0.45)]">
        <span className="mt-0.5 shrink-0 text-2xl leading-none">🧺</span>
        <div className="min-w-0 flex-1">
          <p className="font-hand text-[15px] leading-snug text-ink">{text}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onPack}
              className="rounded-[14px] border-2 border-accent/40 bg-accent/10 px-3 py-1 font-hand text-[13px] text-accent transition active:translate-y-0.5"
            >
              重新打包
            </button>
            <button
              onClick={onClose}
              className="rounded-[14px] px-3 py-1 font-hand text-[13px] text-ink-soft transition active:translate-y-0.5"
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
    <div
      className="relative h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 78% 6%, #fdf3d6 0%, #f4e8cd 42%, #ecdcbd 100%)",
      }}
    >
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

      {/* the only floating chrome: a thin identity + controls bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2.5 px-4 pt-4">
        <motion.button
          onClick={() => goTo("profile")}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="sketch tex-grain pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-[20px] border-2 border-[#bd8a52]/45 bg-paper py-1.5 pl-1.5 pr-4 text-left shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),0_3px_0_rgba(111,84,55,0.18),0_12px_24px_-14px_rgba(58,46,42,0.45)] active:translate-y-0.5"
        >
          <CapyAvatar className="h-11 w-11 shrink-0 ring-2 ring-[#cda269]" />
          <span className="min-w-0">
            <span className="block truncate font-hand text-[19px] leading-none text-ink">
              {companion.name}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-none text-ink-soft">
              <LeafGlyph className="h-3.5 w-3.5" />
              <span className="font-semibold text-leaf">Lv.{stats.level}</span>
              <span className="text-ink-soft/55">·</span>
              <span>陪伴 {stats.days} 天</span>
            </span>
          </span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="pointer-events-auto flex shrink-0 items-center gap-2"
        >
          {bound && (
            <>
              <RoundIconBtn label="关于 Capybanana" icon="book" onClick={() => goTo("about")} />
              <RoundIconBtn label="接入 Agent" icon="setting" onClick={() => goTo("connect")} />
            </>
          )}
          <MusicToggle />
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
