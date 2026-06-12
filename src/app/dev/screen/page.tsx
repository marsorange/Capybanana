"use client";

// Dev-only preview harness for the 2D screen chrome. Seeds a fake bound
// companion into the store and renders by `screen`, like GameRoot, but without
// the login gate or cloud polling.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { DEFAULT_CAPY } from "@/game/defaults";
import { cardId } from "@/game/gacha";
import { useGameStore, type Screen } from "@/state/gameStore";
import type { BattleRecord, Companion, Postcard } from "@/game/types";
import type { AgentEvent } from "@/server/types";
import PortraitFrame from "@/components/ui/PortraitFrame";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import AboutScreen from "@/components/screens/AboutScreen";
import AlbumScreen from "@/components/screens/AlbumScreen";
import ConnectAgentScreen from "@/components/screens/ConnectAgentScreen";
import HomeScreen from "@/components/screens/HomeScreen";
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
  ["forest", "seaside", "flowerfield", "mountain", "snow", "town"] as const
).map((theme, i) => ({
  id: `pc-${i}`,
  tripId: `t-${i}`,
  companionId: "dev-capy",
  locationName: ["森林小径", "海边的风", "花田漫步", "山顶的日出", "初雪的村子", "黄昏小城"][i],
  destinationTheme: theme,
  rarity: (["N", "R", "SR", "R", "SR", "N"] as const)[i],
  title: ["山坡上的问题", "海边的风", "花田漫步", "山顶的日出", "踩雪一整天", "灯还亮着"][i],
  message: "今天的风有点慢。\n路边的猫没有看我。\n我把你的问题带去了山坡，它在那里变轻了一点。",
  reason: "因为你放进去的那只绿色小东西，我想找个安静的地方。",
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
    title: "今天我赢啦",
    story: "我鼓起勇气冲上去，几个回合就把小灰逗得手忙脚乱，赢得漂漂亮亮。",
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
    opponentPersonality: "dreamy",
    opponentAccessory: "scarf",
    opponentColor: "#6FA8C9",
    isNpc: false,
    result: "lose",
    title: "我输了一场",
    story: "圆圆比我想的厉害，我拼到最后还是慢了半步，灰头土脸地回来了。",
    injury: 22,
    ratingDelta: -15,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

// A believable activity log: drives the album 日记 tab and the home StressNote
// (the newest checkin is "today", so the stress one-liner previews too).
const EVENTS: AgentEvent[] = [
  {
    seq: 1,
    at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    type: "departed",
    text: "我背上包裹，出门去远方了。",
  },
  {
    seq: 2,
    at: new Date(Date.now() - 2 * 86_400_000 + 6 * 3_600_000).toISOString(),
    type: "postcard",
    text: "我寄回了一张明信片：「山坡上的问题」。",
    postcardId: "pc-0",
  },
  {
    seq: 3,
    at: new Date(Date.now() - 86_400_000).toISOString(),
    type: "battle",
    text: "我和「爱炫耀的圆圆」切磋了一场，输了。",
  },
  {
    seq: 4,
    at: new Date().toISOString(),
    type: "checkin",
    text: "照看我的人今天有点累，它说：「白天开了一天会」。我把下巴搁在它脚边，陪它坐了一会儿。",
    stress: "tired",
  },
];

function renderScreen(screen: Screen) {
  switch (screen) {
    case "about":
      return <AboutScreen />;
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
  const companion = useGameStore((s) => s.companion);
  const screen = useGameStore((s) => s.screen);
  const selectedPostcardId = useGameStore((s) => s.selectedPostcardId);
  const lastResult = useGameStore((s) => s.lastResult);
  // Connect-screen state previews: ?nopet=1 → the new-user gate (no pet yet),
  // ?fresh=1 → just-registered (pet exists, not onboarded), default → revisit.
  const [noPet] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("nopet") === "1",
  );

  useEffect(() => {
    useGameStore.setState({
      hasHydrated: true,
      hasOnboarded: true,
      companion: COMPANION,
      capyState: {
        ...DEFAULT_CAPY,
        mood: 72,
        energy: 64,
        courage: 58,
        injury: 0,
        traits: ["爱发呆", "怕吵", "喜欢绿色"],
        memories: ["你昨天留的那句话，我还记得。", "山坡上的问题滚了一圈，变小了。"],
      },
      companionState: "idle_home",
      packedBag: null,
      postcards: POSTCARDS,
      cardDex: Array.from(
        new Set(POSTCARDS.map((p) => cardId(p.destinationTheme, p.rarity))),
      ),
      events: EVENTS,
      lastActionDay: null,
      souvenirs: ["一颗温热的小石头", "半张被风吹皱的车票"],
      battleRecords: BATTLES,
      pendingPostcardId: null,
      selectedPostcardId: null,
      lastResult: {
        id: "r0",
        kind: "yard",
        title: "在岛上窝了一天",
        story: "我把背包放在门口，趴在草地上晒了一下午太阳。",
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
      "home", "pack", "album", "postcard", "profile", "about", "connect", "result", "traveling", "login",
    ];
    if (s && screens.includes(s)) {
      useGameStore.setState({
        screen: s as Screen,
        ...(s === "postcard" ? { selectedPostcardId: "pc-0" } : {}),
        ...(s === "traveling" ? { companionState: "traveling" } : {}),
      });
    }
    // Connect-screen state overrides (see noPet note above).
    const params = new URLSearchParams(window.location.search);
    if (params.get("nopet") === "1") {
      useGameStore.setState({
        companion: null,
        hasOnboarded: false,
        companionState: "idle_home",
        activeTrip: null,
        screen: "connect",
      });
    } else if (params.get("fresh") === "1") {
      useGameStore.setState({ hasOnboarded: false, screen: "connect" });
    }
    // Home-note / pack-gate previews: ?packed=1 (bag packed today), ?letter=1
    // (a postcard waiting), ?away=1 (pet out traveling), ?stale=1 (Agent quiet),
    // ?empty=1 (no records — empty-state cards).
    if (params.get("packed") === "1") {
      useGameStore.setState({
        packedBag: {
          items: [],
          message: "今天想去有风的地方看看。",
          packedAt: Date.now() - 3_600_000,
        },
        companionState: "ready",
      });
    }
    if (params.get("letter") === "1") {
      useGameStore.setState({ pendingPostcardId: "pc-0" });
    }
    if (params.get("away") === "1") {
      useGameStore.setState({ companionState: "traveling" });
    }
    if (params.get("stale") === "1") {
      useGameStore.setState({ events: [], lastActionDay: null });
    }
    if (params.get("empty") === "1") {
      useGameStore.setState({
        postcards: [],
        cardDex: [],
        battleRecords: [],
        events: [],
      });
    }
    // ?r=battle previews a battle outcome on the result screen.
    if (new URLSearchParams(window.location.search).get("r") === "battle") {
      useGameStore.setState({
        screen: "result",
        lastResult: {
          id: "rb",
          kind: "battle",
          title: "今天我赢啦",
          story: "我鼓起勇气冲上去，几个回合就把对手逗得手忙脚乱，赢得漂漂亮亮。",
          reason: "我今天勇气很足，想去试试身手。",
          effects: { energy: -15, courage: 5, mood: 8, injury: 5 },
          souvenir: "一枚对手的纽扣",
          resolvedAt: new Date().toISOString(),
        },
      });
    }
  }, []);

  if (!noPet && companion?.id !== COMPANION.id) return null;

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
