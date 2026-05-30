"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { useGameStore, type Screen } from "@/state/gameStore";
import AlbumScreen from "./screens/AlbumScreen";
import CreateScreen from "./screens/CreateScreen";
import HomeScreen from "./screens/HomeScreen";
import PackScreen from "./screens/PackScreen";
import PostcardScreen from "./screens/PostcardScreen";
import TravelingScreen from "./screens/TravelingScreen";
import PortraitFrame from "./ui/PortraitFrame";

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-soft">
      <div className="animate-float-soft text-5xl">🧳</div>
      <p className="font-hand text-xl">Capybanana</p>
    </div>
  );
}

function NoticeToast() {
  const notice = useGameStore((s) => s.notice);
  const clearNotice = useGameStore((s) => s.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(clearNotice, 3600);
    return () => clearTimeout(id);
  }, [notice, clearNotice]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-6"
        >
          <div className="rounded-full border-2 border-ink/15 bg-paper px-4 py-2 text-sm text-ink shadow-[0_3px_0_rgba(58,46,42,0.12)]">
            {notice}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case "create":
      return <CreateScreen />;
    case "home":
      return <HomeScreen />;
    case "pack":
      return <PackScreen />;
    case "traveling":
      return <TravelingScreen />;
    case "album":
      return <AlbumScreen />;
    case "postcard":
      return <PostcardScreen />;
  }
}

export default function GameRoot() {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const companion = useGameStore((s) => s.companion);
  const companionState = useGameStore((s) => s.companionState);
  const screen = useGameStore((s) => s.screen);
  const selectedPostcardId = useGameStore((s) => s.selectedPostcardId);
  const tick = useGameStore((s) => s.tick);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  // Global lifecycle clock: drives autonomous departure + return, and catches
  // up after the tab was hidden.
  useEffect(() => {
    if (!hasHydrated) return;
    tick();
    const id = setInterval(() => tick(), 1000);
    const onWake = () => tick();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [hasHydrated, tick]);

  if (!hasHydrated) {
    return (
      <PortraitFrame>
        <Splash />
      </PortraitFrame>
    );
  }

  let effective: Screen = screen;
  if (!companion) effective = "create";
  else if (screen === "create") effective = "home";
  else if (
    companionState === "traveling" &&
    (screen === "home" || screen === "pack" || screen === "traveling")
  )
    effective = "traveling";
  else if (screen === "postcard" && !selectedPostcardId) effective = "album";

  return (
    <PortraitFrame>
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={effective}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            {renderScreen(effective)}
          </motion.div>
        </AnimatePresence>
        <NoticeToast />
      </div>
    </PortraitFrame>
  );
}
