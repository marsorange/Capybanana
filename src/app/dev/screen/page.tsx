"use client";

// TEMPORARY dev-only preview harness for the 2D screen chrome (the real screens
// live behind Google login + a cloud backend). Seeds a fake bound companion into
// the store and renders the app by its `screen` state — exactly like GameRoot,
// but without the login gate or cloud polling — so every screen is clickable
// with no login. Cloud mutations (pack/collect/restyle) just no-op offline.
// Safe to delete.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { DEFAULT_CAPY } from "@/game/defaults";
import { useGameStore, type Screen } from "@/state/gameStore";
import type { BattleRecord, Companion, Postcard } from "@/game/types";
import PortraitFrame from "@/components/ui/PortraitFrame";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AlbumScreen from "@/components/screens/AlbumScreen";
import ConnectAgentScreen from "@/components/screens/ConnectAgentScreen";
import HomeScreen from "@/components/screens/HomeScreen";
import IntroScreen from "@/components/screens/IntroScreen";
import PackScreen from "@/components/screens/PackScreen";
import PostcardScreen from "@/components/screens/PostcardScreen";
import ProfileScreen from "@/components/screens/ProfileScreen";
import ResultScreen from "@/components/screens/ResultScreen";
import TravelingScreen from "@/components/screens/TravelingScreen";

const COMPANION: Companion = {
  id: "dev-capy",
  name: "麻薯",
  type: "capybara",
  primaryColor: "#C8893B",
  personality: "gentle",
  accessory: "scarf",
  createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
};

const POSTCARDS: Postcard[] = (
  ["forest", "seaside", "flowerfield", "mountain", "hotspring", "town"] as const
).map((theme, i) => ({
  id: `pc-${i}`,
  tripId: `t-${i}`,
  companionId: "dev-capy",
  locationName: ["森林小径", "海边的风", "花田漫步", "山顶的日出", "温泉小镇", "黄昏小城"][i],
  destinationTheme: theme,
  title: ["山坡上的问题", "海边的风", "花田漫步", "山顶的日出", "热气腾腾", "灯还亮着"][i],
  message: "今天的风有点慢。\n路边的猫没有看我。\n我把你的问题带去了山坡，它在那里变轻了一点。",
  reason: "因为你放进去的那只绿色小东西，它想去安静的地方。",
  imageKey: theme,
  sentAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
}));

const BATTLES: BattleRecord[] = [
  {
    id: "b0",
    day: "2026-06-05",
    opponentName: "流浪的小灰",
    opponentSpecies: "raccoon",
    isNpc: true,
    result: "win",
    title: "今天它赢啦",
    story: "麻薯鼓起勇气冲了上去，几个回合下来把小灰逗得手忙脚乱，赢得漂漂亮亮。",
    injury: 5,
    spoils: "一枚对手的纽扣",
    ratingDelta: 15,
    createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
  },
  {
    id: "b1",
    day: "2026-06-04",
    opponentName: "爱炫耀的圆圆",
    opponentSpecies: "duck",
    isNpc: false,
    result: "lose",
    title: "它输了一场",
    story: "圆圆比想象中厉害，麻薯拼到最后还是慢了一步，灰头土脸地回来了。",
    injury: 22,
    ratingDelta: -15,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

function renderScreen(screen: Screen) {
  switch (screen) {
    case "intro":
      return <IntroScreen />;
    case "connect":
      return <ConnectAgentScreen />;
    case "profile":
      return <ProfileScreen />;
    case "home":
    case "login":
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

export default function DevScreen() {
  const [ready, setReady] = useState(false);
  const screen = useGameStore((s) => s.screen);
  const selectedPostcardId = useGameStore((s) => s.selectedPostcardId);
  const lastResult = useGameStore((s) => s.lastResult);

  useEffect(() => {
    useGameStore.setState({
      hasHydrated: true,
      hasSeenIntro: true,
      companion: COMPANION,
      capyState: {
        ...DEFAULT_CAPY,
        mood: 72,
        energy: 64,
        courage: 58,
        injury: 0,
        traits: ["爱发呆", "怕吵", "喜欢绿色"],
        memories: ["你昨天留的那句话它还记得。", "山坡上的问题滚了一圈变小了。"],
      },
      companionState: "idle_home",
      packedBag: null,
      postcards: POSTCARDS,
      souvenirs: ["一颗温热的小石头", "半张被风吹皱的车票"],
      misunderstandings: ["把“早点睡”听成了“早点醒”。"],
      battleRecords: BATTLES,
      pendingPostcardId: null,
      selectedPostcardId: null,
      lastResult: {
        id: "r0",
        kind: "yard",
        title: "在岛上窝了一天",
        story: "它把背包放在门口，趴在草地上晒了一下午太阳。",
        reason: "你说今天想慢一点。",
        effects: { mood: 4, energy: 6 },
        souvenir: "一颗温热的小石头",
        resolvedAt: new Date().toISOString(),
      },
      cloud: { userId: "dev", email: "dev@capybanana.local", bindToken: "dev", rev: 1 },
      connectUrl: "https://capybanana.local/agent/skill.md?bind=dev-token",
      activeTrip: {
        id: "trip-dev",
        companionId: "dev-capy",
        items: [],
        message: "想去有风的地方看看。",
        status: "traveling",
        destination: "seaside",
        startedAt: Date.now() - 40 * 60_000,
        durationMs: 90 * 60_000,
        returnsAt: Date.now() + 50 * 60_000,
      },
      screen: "home",
    });
    // Optional ?s=<screen> to jump straight to a screen for previewing.
    const s = new URLSearchParams(window.location.search).get("s");
    const screens = [
      "home", "pack", "album", "postcard", "profile", "connect", "result", "traveling", "intro", "login",
    ];
    if (s && screens.includes(s)) {
      useGameStore.setState({
        screen: s as Screen,
        ...(s === "postcard" ? { selectedPostcardId: "pc-0" } : {}),
        ...(s === "traveling" ? { companionState: "traveling" } : {}),
      });
    }
    // ?r=battle previews a battle outcome on the result screen.
    if (new URLSearchParams(window.location.search).get("r") === "battle") {
      useGameStore.setState({
        screen: "result",
        lastResult: {
          id: "rb",
          kind: "battle",
          title: "今天它赢啦",
          story: "麻薯鼓起勇气冲了上去，几个回合下来把对手逗得手忙脚乱，赢得漂漂亮亮。",
          reason: "它今天勇气很足，想去试试身手。",
          effects: { energy: -15, courage: 5, mood: 8, injury: 5 },
          souvenir: "一枚对手的纽扣",
          resolvedAt: new Date().toISOString(),
        },
      });
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  // Mirror GameRoot's light redirects so we never land on a blank screen.
  let effective: Screen = screen === "login" ? "home" : screen;
  if (effective === "postcard" && !selectedPostcardId) effective = "album";
  if (effective === "result" && !lastResult) effective = "home";

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
