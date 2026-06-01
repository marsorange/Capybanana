"use client";

import { useMemo, useState } from "react";

import type { OutcomeKind } from "@/game/types";
import { useGameStore } from "@/state/gameStore";
import HomeModel from "../scenes3d/home/HomeModel";
import InteractionLayer from "../scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import DiaryPanel from "../ui/DiaryPanel";
import MusicToggle from "../ui/MusicToggle";

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

// Dev/QA preview menu: one tap to see每种结局长什么样 —— 出门旅行 + 在家的各种状态。
const TEST_OUTCOMES: { kind: OutcomeKind; emoji: string; label: string }[] = [
  { kind: "travel", emoji: "✈️", label: "出门旅行" },
  { kind: "home", emoji: "🏡", label: "在家待着" },
  { kind: "yard", emoji: "🌿", label: "院子里晃" },
  { kind: "rest", emoji: "😴", label: "休息养伤" },
  { kind: "claw", emoji: "⚔️", label: "找 Claw 对决" },
  { kind: "secret", emoji: "🌙", label: "神秘事件" },
];

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const capy = useGameStore((s) => s.capyState);
  const companionState = useGameStore((s) => s.companionState);
  const postcards = useGameStore((s) => s.postcards);
  const lastResult = useGameStore((s) => s.lastResult);
  const goTo = useGameStore((s) => s.goTo);
  const devPreviewOutcome = useGameStore((s) => s.devPreviewOutcome);
  const devRunDay = useGameStore((s) => s.devRunDay);
  const openAgentOnboardingLogin = useGameStore(
    (s) => s.openAgentOnboardingLogin,
  );
  const cloudBusy = useGameStore((s) => s.cloudBusy);
  const cloudError = useGameStore((s) => s.cloudError);
  const bound = useGameStore((s) => !!s.cloud);
  const [showDiary, setShowDiary] = useState(false);
  const [showTest, setShowTest] = useState(false);
  // "preview" = pure local look-see (repeatable, no mutation);
  // "run" = actually resolve the day (guest: local apply / cloud: real server).
  const [testMode, setTestMode] = useState<"preview" | "run">("preview");

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
        cameraPosition={[9, 8.4, 9]}
        target={[-0.4, 2.4, -0.4]}
        zoom={45}
        enableZoom
        minZoom={30}
        maxZoom={95}
        minPolar={0.6}
        maxPolar={1.32}
      >
        <HomeModel
          mode="home"
          postcardThemes={wallThemes}
          onOpenPack={() => goTo("pack")}
          onOpenAlbum={() => goTo("album")}
        />
        <RoamingCompanion
          type={companion.type}
          color={companion.primaryColor}
          accessory={companion.accessory}
          seed={companion.id}
          clickLines={companionState === "ready" ? READY_LINES : IDLE_LINES}
        />
        <InteractionLayer onDiary={() => setShowDiary(true)} />
      </SceneCanvas>

      {showDiary && <DiaryPanel onClose={() => setShowDiary(false)} />}

      {/* top bar: name + simple state */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5">
        <button
          onClick={() => goTo("profile")}
          className="pointer-events-auto text-left"
        >
          <h1 className="font-hand text-2xl leading-none text-ink drop-shadow-[0_1px_0_rgba(255,247,236,0.9)]">
            {companion.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            心情 {capy.mood} · 体力 {capy.energy}
            {capy.injury > 0 ? ` · 伤 ${capy.injury}` : ""}
            <span className="ml-1 text-ink-soft/60">· 档案 ›</span>
          </p>
        </button>
        <div className="flex flex-col items-end gap-1.5">
          <p className="text-sm text-ink-soft">
            {companionState === "ready" ? "今日包裹已备好" : "在家"}
          </p>
          <MusicToggle />
          <button
            onClick={() => goTo("album")}
            className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
          >
            明信片 {postcards.length}
          </button>
          {bound && (
            <button
              onClick={() => goTo("connect")}
              className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
            >
              Agent
            </button>
          )}
        </div>
      </div>

      {/* last result chip */}
      {lastResult && (
        <button
          onClick={() => goTo("result")}
          className="absolute inset-x-5 bottom-5 rounded-sticker border-2 border-ink/12 bg-paper/90 px-4 py-2.5 text-left shadow-[0_2px_0_rgba(58,46,42,0.1)]"
        >
          <span className="text-[11px] text-ink-soft">昨天的包裹 ›</span>
          <span className="block truncate text-sm text-ink">
            {lastResult.title} · {lastResult.story}
          </span>
        </button>
      )}

      {/* dev/QA test panel: 走一遍每种结局 —— 出门旅行 + 在家的不同状态。
          「预览」纯本地、不改数值、可反复点；「真跑」真实结算（访客改本地数值 /
          云端驱动真宠物，受每日一次·受伤限制）。 */}
      <div className="absolute right-4 top-24 flex flex-col items-end gap-1.5">
        <button
          onClick={() => setShowTest((v) => !v)}
          className="pointer-events-auto rounded-full border border-dashed border-ink/30 bg-cream-soft/80 px-3 py-1 text-[11px] text-ink-soft/80"
        >
          🧪 测试{showTest ? " ▴" : " ▾"}
        </button>
        {showTest && (
          <div className="pointer-events-auto w-44 rounded-sticker border-2 border-dashed border-ink/15 bg-paper/95 p-2 shadow-[0_3px_0_rgba(58,46,42,0.12)]">
            {/* mode toggle */}
            <div className="mb-1.5 flex rounded-full border-2 border-ink/10 bg-cream-soft p-0.5 text-[11px]">
              {(["preview", "run"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTestMode(m)}
                  className={`flex-1 rounded-full px-2 py-1 ${
                    testMode === m
                      ? "bg-paper text-ink shadow-[0_1px_0_rgba(58,46,42,0.1)]"
                      : "text-ink-soft/70"
                  }`}
                >
                  {m === "preview" ? "👁 预览" : "▶️ 真跑"}
                </button>
              ))}
            </div>
            <p className="px-1 pb-1 text-[10px] leading-snug text-ink-soft/70">
              {testMode === "preview"
                ? "只看结果·不改数值"
                : bound
                  ? "真实结算·驱动云端宠物"
                  : "真实结算·会改数值"}
            </p>
            {TEST_OUTCOMES.map((o) => (
              <button
                key={o.kind}
                disabled={cloudBusy}
                onClick={() => {
                  setShowTest(false);
                  if (testMode === "preview") devPreviewOutcome(o.kind);
                  else devRunDay(o.kind);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink active:bg-cream-soft disabled:opacity-40"
              >
                <span className="w-5 text-center">{o.emoji}</span>
                <span>{o.label}</span>
              </button>
            ))}
            <div className="my-1 border-t border-dashed border-ink/15" />
            <button
              disabled={cloudBusy}
              onClick={() => {
                setShowTest(false);
                openAgentOnboardingLogin();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink active:bg-cream-soft disabled:opacity-40"
            >
              <span className="w-5 text-center">🔗</span>
              <span>新用户绑定页</span>
            </button>
            {cloudError && (
              <p className="px-1 pt-1 text-[10px] leading-snug text-accent">
                {cloudError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
