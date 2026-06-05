"use client";

import { useGameStore } from "@/state/gameStore";
import { commandWalk } from "./commandBus";
import InteractionMarker from "./InteractionMarker";
import {
  BED,
  PACK,
  PACK_BENCH,
  POSTCARD,
  POSTCARD_BOARD,
  REST,
  type Vec3,
} from "../layout";

// All the labelled, tap-to-move interaction points in the home scene. Tapping a
// label sends the pet walking there, then opens a screen or plays an activity.
export default function InteractionLayer() {
  const goTo = useGameStore((s) => s.goTo);

  const walk = (
    target: Vec3,
    floor: 0 | 1,
    then?: () => void,
    opts?: { activity?: "clean" | "sleep" | "look"; say?: string; dwell?: number },
  ) => commandWalk(target, floor, then, opts);

  return (
    <group>
      {/* 打包 — on the bench at the front-left of the ground floor */}
      <InteractionMarker
        pos={PACK_BENCH}
        label="打包"
        labelY={1.4}
        onClick={() => walk(PACK.pos, 0, () => goTo("pack"))}
      />
      {/* 明信片 — on the postcard board out in the yard (right of the house) */}
      <InteractionMarker
        pos={POSTCARD_BOARD}
        label="明信片"
        labelY={1.75}
        onClick={() => walk(POSTCARD.pos, 0, () => goTo("album"))}
      />
      {/* 休息 — the bed up in the loft (the pet climbs the stairs to get there) */}
      <InteractionMarker
        pos={BED}
        label="休息"
        color="#9aa6c8"
        labelY={1.55}
        onClick={() =>
          walk(REST.pos, 1, undefined, {
            activity: "sleep",
            say: "困了，眯一会儿…",
            dwell: 5,
          })
        }
      />
    </group>
  );
}
