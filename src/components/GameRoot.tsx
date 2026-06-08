"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { getMusicPref, setMusicEnabled } from "@/lib/ambientMusic";
import { completeOAuthLogin, getSupabase } from "@/lib/supabaseClient";
import { useGameStore, type Screen } from "@/state/gameStore";
import AlbumScreen from "./screens/AlbumScreen";
import AboutScreen from "./screens/AboutScreen";
import ConnectAgentScreen from "./screens/ConnectAgentScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import PackScreen from "./screens/PackScreen";
import PostcardScreen from "./screens/PostcardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ResultScreen from "./screens/ResultScreen";
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
      void loginWithSupabaseToken(token);
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

function useAmbientMusicStartup() {
  useEffect(() => {
    if (!getMusicPref()) return;
    setMusicEnabled(true);
    const kick = () => setMusicEnabled(true);
    window.addEventListener("pointerdown", kick, { once: true });
    return () => window.removeEventListener("pointerdown", kick);
  }, []);
}

function renderScreen(screen: Screen) {
  switch (screen) {
    case "login":
      return <LoginScreen />;
    case "connect":
      return <ConnectAgentScreen />;
    case "profile":
      return <ProfileScreen />;
    case "about":
      return <AboutScreen />;
    case "home":
      return <HomeScreen />;
    case "pack":
      return <PackScreen />;
    case "album":
      return <AlbumScreen />;
    case "postcard":
      return <PostcardScreen />;
    case "result":
      return <ResultScreen />;
    default:
      // Legacy/unknown persisted screen (e.g. the removed "intro"): land on home.
      return <HomeScreen />;
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
  const hasOnboarded = useGameStore((s) => s.hasOnboarded);
  const bound = useGameStore((s) => !!s.cloud);

  // Hydrate from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    if (hasHydrated) return;
    void useGameStore.persist.rehydrate();
  }, [hasHydrated]);

  // Bridge a Supabase (Google) session into a bound account when one appears.
  useSupabaseAuthBridge();
  useAmbientMusicStartup();

  // Pull the cloud save on load and whenever the tab is reopened/refocused — the
  // server is authoritative, but the user only sees changes (a trip that
  // resolved, a new postcard) on their NEXT visit, never live. The one exception
  // is the connect gate: while there's no pet yet, poll on a timer so it advances
  // on its own once the Agent registers one.
  useEffect(() => {
    if (!hasHydrated || !bound) return;
    cloudPull();
    const id = companion ? undefined : setInterval(() => cloudPull(), 5000);
    const onWake = () => cloudPull();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      if (id) clearInterval(id);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [hasHydrated, bound, companion, cloudPull]);

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

  let effective: Screen = screen;
  if (!companion) {
    // No pet yet: the Agent hasn't bound/registered one. The connect screen is
    // the gate — it shows the bind command and waits (via cloudPull polling)
    // until the Agent calls /api/agent/create and names the pet.
    effective = "connect";
  } else if (!hasOnboarded) {
    // First-time owner: the only gate before the island is the one-time
    // "connect an Agent" step. No pet display/selection screen.
    effective = "connect";
  } else if (screen === "login") {
    effective = "home";
  } else if (screen === "traveling") {
    // The travel progress page was removed — while the pet is out, the home
    // scene just goes quiet. Any persisted "traveling" screen lands on home.
    effective = "home";
  } else if (companionState === "traveling" && screen === "pack") {
    // Can't prep a bag while it's out (the server rejects it) — keep the user
    // on the quiet home scene instead of a pack screen that can't be confirmed.
    effective = "home";
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
