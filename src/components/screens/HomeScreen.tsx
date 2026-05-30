"use client";

import { useMemo } from "react";

import { useGameStore } from "@/state/gameStore";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Villa from "../scenes3d/Villa";
import Button from "../ui/Button";

const IDLE_LINES = [
  "今天也想和你待在一起。",
  "要不要帮我收拾行李呀？",
  "（它凑过来蹭了蹭你）",
  "我在想下次去哪里好呢。",
  "这屋子被我逛了一圈又一圈。",
];
const READY_LINES = [
  "行李我看过啦，等我哪天想走就走咯~",
  "背包好啦！说不定一转身我就出门了。",
  "我在门口转了两圈，还没想好哪天走。",
];

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const companionState = useGameStore((s) => s.companionState);
  const postcards = useGameStore((s) => s.postcards);
  const goTo = useGameStore((s) => s.goTo);
  const devRunTrip = useGameStore((s) => s.devRunTrip);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );

  return (
    <div className="relative flex h-full flex-col">
      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-5 pt-5">
        <div>
          <h1 className="font-hand text-2xl leading-none text-ink">
            {companion.name} 的小别墅
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {companionState === "ready" ? "🎒 行李已备好，等它出发" : "🏡 它在家里晃来晃去"}
          </p>
        </div>
        <div className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft px-3 py-1 text-sm text-ink-soft">
          📮 {postcards.length}
        </div>
      </div>

      {/* 3D villa */}
      <div className="flex-1">
        <SceneCanvas
          controls="orbit"
          cameraPosition={[0, 2.5, 7.4]}
          target={[0, 1.7, -0.2]}
        >
          <Villa
            mode="home"
            postcardThemes={wallThemes}
            onOpenPack={() => goTo("pack")}
            onOpenAlbum={() => goTo("album")}
          />
          <RoamingCompanion
            type={companion.type}
            color={companion.primaryColor}
            accessory={companion.accessory}
            clickLines={companionState === "ready" ? READY_LINES : IDLE_LINES}
          />
        </SceneCanvas>
      </div>

      {/* hint + actions */}
      <div className="shrink-0 px-5 pb-5">
        <p className="mb-3 text-center text-xs text-ink-soft/80">
          拖动转一转别墅 · 点点它会说话 · 它会自己上下楼、看书、打扫
        </p>
        <div className="flex gap-3">
          <Button variant="primary" className="flex-1" onClick={() => goTo("pack")}>
            🧳 {companionState === "ready" ? "整理行李" : "帮它打包"}
          </Button>
          <Button variant="soft" className="flex-1" onClick={() => goTo("album")}>
            📮 明信片相册
          </Button>
        </div>
        <button
          onClick={devRunTrip}
          className="mt-3 w-full rounded-sticker border-2 border-dashed border-ink/25 py-2 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
        >
          🧪 测试：立刻跑一趟（出门 → 马上寄回明信片）
        </button>
      </div>
    </div>
  );
}
