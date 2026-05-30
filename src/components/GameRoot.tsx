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
import ProfileScreen from "./screens/ProfileScreen";
import ResultScreen from "./screens/ResultScreen";
import TravelingScreen from "./screens/TravelingScreen";
import CapyLogo from "./screens/CapyLogo";
import ErrorBoundary from "./ui/ErrorBoundary";
import PortraitFrame from "./ui/PortraitFrame";

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-ink-soft">
      <CapyLogo className="h-24 w-24" />
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
    case "profile":
      return <ProfileScreen />;
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
  const ensureCloudPet = useGameStore((s) => s.ensureCloudPet);
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const cloudError = useGameStore((s) => s.cloudError);
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

  // A bound account with no pet means the server pet hasn't been adopted yet
  // (legacy account). Adopt one so the owner isn't stranded on the connect
  // screen. Guarded so it fires once, not on every poll.
  useEffect(() => {
    if (!hasHydrated) return;
    if (bound && !companion && !cloudBusy && !cloudError) void ensureCloudPet();
  }, [hasHydrated, bound, companion, cloudBusy, cloudError, ensureCloudPet]);

  if (!hasHydrated) {
    return (
      <PortraitFrame>
        <Splash />
      </PortraitFrame>
    );
  }

  // Bound but petless: a capybara is being adopted. Show the splash rather than
  // the connect screen (whose "enter" button is disabled without a pet).
  if (bound && !companion && !cloudError) {
    return (
      <PortraitFrame>
        <Splash />
      </PortraitFrame>
    );
  }

  let effective: Screen = screen;
  if (!companion) {
    // No pet: a failed adoption falls back to the connect screen so the owner
    // can retry/attach an agent; guests see login (or local create).
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
