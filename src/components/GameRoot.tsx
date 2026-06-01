"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { completeOAuthLogin, getSupabase } from "@/lib/supabaseClient";
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

// Watch the Supabase Auth session and bridge it into our bind-token account.
// Fires after the Google OAuth round-trip lands back on this origin (and on any
// later session that appears while we're not yet bound). The bridge itself
// guards against double-binding, so this can fire freely.
function useSupabaseAuthBridge() {
  const loginWithSupabaseToken = useGameStore((s) => s.loginWithSupabaseToken);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    const bind = (token?: string | null) => {
      if (!active || !token) return;
      const st = useGameStore.getState();
      if (st.cloud || st.cloudBusy) return; // already bound / in flight
      void loginWithSupabaseToken(token, st.loginDestination);
    };

    // On mount: finish a pending Google redirect (?code=) if there is one,
    // otherwise pick up an existing session. Surface any OAuth/exchange error.
    void (async () => {
      try {
        const token = await completeOAuthLogin();
        if (token) {
          bind(token);
          return;
        }
        const { data } = await sb.auth.getSession();
        bind(data.session?.access_token);
      } catch (e) {
        if (active)
          useGameStore.setState({
            cloudError: (e as Error).message,
            cloudBusy: false,
          });
      }
    })();

    // React to any later sign-in (e.g. token refresh in another tab).
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) =>
      bind(session?.access_token),
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loginWithSupabaseToken]);
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

  // Bridge a Supabase (Google) session into a bound account when one appears.
  useSupabaseAuthBridge();

  // Lifecycle clock. Only bound accounts have a pet to advance; the server
  // resolves the lifecycle, so the web client just polls it.
  useEffect(() => {
    if (!hasHydrated || !bound) return;
    cloudPull();
    const id = setInterval(() => cloudPull(), 5000);
    const onWake = () => cloudPull();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [hasHydrated, bound, cloudPull]);

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

  // Login is mandatory: until a Supabase (Google) session is bridged into a
  // bound account, the only screen is login. (Guest / local-only play removed.)
  if (!bound) {
    return (
      <PortraitFrame>
        <ErrorBoundary>
          <LoginScreen />
        </ErrorBoundary>
      </PortraitFrame>
    );
  }

  // Bound but petless: a capybara is being adopted. Show the splash rather than
  // the connect screen (whose "enter" button is disabled without a pet).
  if (!companion && !cloudError) {
    return (
      <PortraitFrame>
        <Splash />
      </PortraitFrame>
    );
  }

  let effective: Screen = screen;
  if (!companion) {
    // No pet: a failed adoption falls back to the connect screen so the owner
    // can retry / attach an agent.
    effective = "connect";
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
