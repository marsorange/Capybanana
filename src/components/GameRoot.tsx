"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { useGameStore, type Screen } from "@/state/gameStore";
import AlbumScreen from "./screens/AlbumScreen";
import ConnectAgentScreen from "./screens/ConnectAgentScreen";
import CreateScreen from "./screens/CreateScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import PackScreen from "./screens/PackScreen";
import PostcardScreen from "./screens/PostcardScreen";
import ResultScreen from "./screens/ResultScreen";
import TravelingScreen from "./screens/TravelingScreen";
import ErrorBoundary from "./ui/ErrorBoundary";
import PortraitFrame from "./ui/PortraitFrame";

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-soft">
      <div className="animate-float-soft text-5xl">🧳</div>
      <p className="font-hand text-xl">Capybanana</p>
    </div>
  );
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "create":
      return <CreateScreen />;
    case "connect":
      return <ConnectAgentScreen />;
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
    case "result":
      return <ResultScreen />;
  }
}

export default function GameRoot() {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const companion = useGameStore((s) => s.companion);
  const companionState = useGameStore((s) => s.companionState);
  const screen = useGameStore((s) => s.screen);
  const selectedPostcardId = useGameStore((s) => s.selectedPostcardId);
  const lastResult = useGameStore((s) => s.lastResult);
  const tick = useGameStore((s) => s.tick);
  const cloudPull = useGameStore((s) => s.cloudPull);
  const bound = useGameStore((s) => !!s.cloud);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    if (hasHydrated) return;
    void useGameStore.persist.rehydrate();
  }, [hasHydrated]);

  // Global lifecycle clock. Guests tick locally every second; bound accounts
  // poll the server (which resolves the lifecycle) on a slower cadence.
  useEffect(() => {
    if (!hasHydrated) return;
    const run = bound ? cloudPull : tick;
    run();
    const id = setInterval(() => run(), bound ? 5000 : 1000);
    const onWake = () => run();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [hasHydrated, bound, tick, cloudPull]);

  if (!hasHydrated) {
    return (
      <PortraitFrame>
        <Splash />
      </PortraitFrame>
    );
  }

  let effective: Screen = screen;
  if (!companion) {
    // No pet yet: bound accounts wait on the connect screen (the Agent creates
    // the pet); guests see login unless they chose to skip into local create.
    if (bound) effective = "connect";
    else effective = screen === "create" ? "create" : "login";
  } else if (screen === "login" || screen === "create") {
    effective = "home";
  } else if (
    companionState === "traveling" &&
    (screen === "home" || screen === "pack" || screen === "traveling")
  ) {
    effective = "traveling";
  } else if (screen === "postcard" && !selectedPostcardId) {
    effective = "album";
  } else if (screen === "result" && !lastResult) {
    effective = "home";
  }

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
            <ErrorBoundary>{renderScreen(effective)}</ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </div>
    </PortraitFrame>
  );
}
