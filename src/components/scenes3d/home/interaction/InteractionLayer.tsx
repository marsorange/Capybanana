"use client";

import { useGameStore } from "@/state/gameStore";
import { commandWalk, type WalkOpts } from "./commandBus";
import InteractionMarker from "./InteractionMarker";
import {
  BED,
  BED_SLEEP,
  BENCH_SIT,
  PACK,
  PACK_BENCH,
  POSTCARD,
  POSTCARD_BOARD,
  YARD_BENCH,
  type Vec3,
} from "../layout";

// All the labelled, tap-to-move interaction points in the home scene. Tapping a
// label sends the pet walking there, then opens a screen or plays an activity
// (the furniture ones — bed/bench — make it hop on and hold a pose). While the
// pet is away travelling there's no walker to consume the command, so pet-bound
// actions (打包/休息/长椅) grey out and 明信片 opens the album directly.
export default function InteractionLayer({ away = false }: { away?: boolean }) {
  const goTo = useGameStore((s) => s.goTo);

  const walk = (target: Vec3, floor: 0 | 1, then?: () => void, opts?: WalkOpts) =>
    commandWalk(target, floor, then, opts);

  return (
    <group>
      {/* 打包 — on the bench at the front-left of the ground floor */}
      <InteractionMarker
        pos={PACK_BENCH}
        label="打包"
        labelY={1.4}
        disabled={away}
        onClick={() => walk(PACK.pos, 0, () => goTo("pack"))}
      />
      {/* 明信片 — on the postcard board out in the yard (right of the house) */}
      <InteractionMarker
        pos={POSTCARD_BOARD}
        label="明信片"
        labelY={1.75}
        labelX={-0.55}
        onClick={
          away
            ? () => goTo("album")
            : () => walk(POSTCARD.pos, 0, () => goTo("album"))
        }
      />
      {/* 休息 — the bed up in the loft: the pet climbs the stairs, hops onto
          the mattress and curls up for a nap */}
      <InteractionMarker
        pos={BED}
        label="休息"
        color="#9aa6c8"
        labelY={1.55}
        disabled={away}
        onClick={() =>
          walk(BED_SLEEP.approach, 1, undefined, {
            activity: "sleep",
            say: "困了，眯一会儿…",
            dwell: 12,
            perch: BED_SLEEP.perch,
            emote: "💤",
          })
        }
      />
      {/* 长椅 — the garden bench in the yard: hop up and sit in the sun */}
      <InteractionMarker
        pos={YARD_BENCH}
        label="长椅"
        color="#a8c686"
        labelY={1.15}
        disabled={away}
        onClick={() =>
          walk(BENCH_SIT.approach, 0, undefined, {
            activity: "look",
            say: "坐一会儿，晒晒太阳…",
            dwell: 10,
            perch: BENCH_SIT.perch,
            emote: "🍃",
          })
        }
      />
    </group>
  );
}
