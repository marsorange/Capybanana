"use client";

import { dom, useTr } from "@/i18n";
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
const S = dom(
  {
    pack: "打包",
    postcard: "明信片",
    rest: "休息",
    bench: "长椅",
    sleepSay: "困了，眯一会儿…",
    benchSay: "坐一会儿，晒晒太阳…",
  },
  {
    pack: "Pack",
    postcard: "Postcards",
    rest: "Rest",
    bench: "Bench",
    sleepSay: "Sleepy… just a little nap.",
    benchSay: "I'll sit a while and soak up the sun.",
  },
);

export default function InteractionLayer({ away = false }: { away?: boolean }) {
  const goTo = useGameStore((s) => s.goTo);
  const t = useTr(S);

  const walk = (target: Vec3, floor: 0 | 1, then?: () => void, opts?: WalkOpts) =>
    commandWalk(target, floor, then, opts);

  return (
    <group>
      {/* 打包 — on the bench at the front-left of the ground floor */}
      <InteractionMarker
        pos={PACK_BENCH}
        label={t.pack}
        icon="package"
        labelY={1.4}
        disabled={away}
        onClick={() => walk(PACK.pos, 0, () => goTo("pack"))}
      />
      {/* 明信片 — on the postcard board out in the yard (right of the house) */}
      <InteractionMarker
        pos={POSTCARD_BOARD}
        label={t.postcard}
        icon="postmail"
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
        label={t.rest}
        icon="sleep"
        color="#9aa6c8"
        labelY={1.55}
        disabled={away}
        onClick={() =>
          walk(BED_SLEEP.approach, 1, undefined, {
            activity: "sleep",
            say: t.sleepSay,
            dwell: 12,
            perch: BED_SLEEP.perch,
            emote: "💤",
          })
        }
      />
      {/* 长椅 — the garden bench in the yard: hop up and sit in the sun */}
      <InteractionMarker
        pos={YARD_BENCH}
        label={t.bench}
        icon="garden"
        color="#a8c686"
        labelY={1.15}
        disabled={away}
        onClick={() =>
          walk(BENCH_SIT.approach, 0, undefined, {
            activity: "look",
            say: t.benchSay,
            dwell: 10,
            perch: BENCH_SIT.perch,
            emote: "🍃",
          })
        }
      />
    </group>
  );
}
