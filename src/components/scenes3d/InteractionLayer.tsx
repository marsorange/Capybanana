"use client";

import { useGameStore } from "@/state/gameStore";
import { commandWalk } from "./commandBus";
import InteractionMarker from "./InteractionMarker";
import { FLOOR_H, type Vec3 } from "./home/villaLayout";

// All the labelled, tap-to-move interaction points in the home scene. Tapping a
// label sends the pet walking there, then opens a screen or plays an activity.
export default function InteractionLayer({ onDiary }: { onDiary: () => void }) {
  const goTo = useGameStore((s) => s.goTo);

  const walk = (
    target: Vec3,
    floor: 0 | 1,
    then?: () => void,
    opts?: { activity?: "clean" | "sleep" | "look"; say?: string; dwell?: number },
  ) => commandWalk(target, floor, then, opts);

  return (
    <group>
      {/* screen actions */}
      <InteractionMarker
        pos={[-1.5, 0, -0.7]}
        label="打包"
        onClick={() => walk([-1.0, 0, -0.3], 0, () => goTo("pack"))}
      />
      <InteractionMarker
        pos={[-3.9, 0, -1.05]}
        label="明信片"
        onClick={() => walk([-3.9, 0, -1.05], 0, () => goTo("album"))}
      />
      <InteractionMarker
        pos={[-2.85, 0, -0.55]}
        label="日记"
        onClick={() => walk([-2.6, 0, -0.6], 0, onDiary)}
      />

      {/* in-scene activities */}
      <InteractionMarker
        pos={[0.7, 0, 2.0]}
        label="种田"
        color="#7caf58"
        onClick={() =>
          walk([0.7, 0, 2.0], 0, undefined, {
            activity: "clean",
            say: "帮菜地松松土～",
            dwell: 4,
          })
        }
      />
      <InteractionMarker
        pos={[3.0, 0, 1.85]}
        label="采摘"
        color="#7caf58"
        onClick={() =>
          walk([2.9, 0, 1.6], 0, undefined, {
            activity: "look",
            say: "摘点果子～",
            dwell: 3.5,
          })
        }
      />
      <InteractionMarker
        pos={[-3.6, FLOOR_H, -3.4]}
        label="睡觉"
        color="#9aa6c8"
        labelY={1.05}
        onClick={() =>
          walk([-3.6, FLOOR_H, -3.5], 1, undefined, {
            activity: "sleep",
            say: "困了，眯一会儿…",
            dwell: 5,
          })
        }
      />
    </group>
  );
}
