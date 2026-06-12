"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { companionStats } from "@/game/companionLevel";
import { TRAIT_LINES } from "@/game/resolveDay";
import { dayKey8, pick } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import HomeModel from "../scenes3d/home/HomeModel";
import HomeFloor from "../scenes3d/home/HomeFloor";
import InteractionLayer from "../scenes3d/home/interaction/InteractionLayer";
import RoamingCompanion from "../scenes3d/RoamingCompanion";
import SceneCanvas from "../scenes3d/SceneCanvas";
import Icon, { type IconName } from "../ui/Icon";
import CapyAvatar from "../ui/CapyAvatar";
import MusicToggle from "../ui/MusicToggle";

const IDLE_LINES = [
  "今天也想和你待在一块儿。",
  "要不要给我备个小包裹？",
  "（它凑过来，蹭了蹭你）",
  "昨天那个东西，我还在想怎么玩。",
  "你回来啦？我一直在听门口的动静。",
  "我刚才在练一种新的趴法，你看到了吗？",
  "今天的云走得好慢，我也走得好慢，很配。",
  "我的鼻子今天特别灵，闻到你身上有外面的味道。",
  "窗台上的光挪了三次，我跟着挪了三次。",
  "要是你累了，就蹲下来摸摸我，这招很灵的。",
];
const READY_LINES = [
  "包裹放门口啦，今天去哪儿还没定。",
  "也许去远方，也许就在岛上晒太阳。",
  "你留的那句话，我悄悄藏进包里了。",
  "我把包裹检查了三遍，每检查一遍就更期待一点。",
  "出门？在家？我都行，但尾巴已经偷偷朝着门口了。",
  "等拿主意的那位发话，我随时可以出发。",
  "我连走路都在哼歌，今天会是怎样的一天呢？",
];
// Wistful, ambient lines for the quiet house while the pet is away — owner's-POV
// 牵挂, never revealing where it went or when it returns (the trip length is
// random + secret). One is shown per home visit; "它会带什么回来呢" gently primes
// the postcard/souvenir payoff.
const AWAY_LINES = [
  "不知道它现在，正看着什么呢。",
  "门口的灯，给它留着。",
  "它常坐的地方，还空着。",
  "风从窗缝钻进来，带着点远方的味道。",
  "院子里静悄悄的，就少了它。",
  "它会带什么回来呢？",
  "屋里太安静了，安静得能听见钟在走。",
  "今天的风不错，它在路上应该走得很顺。",
  "信箱擦干净了，万一今天有信呢。",
  "它的小垫子晒过了，松松软软地等它回来。",
  "不知道它有没有按时吃东西，那个小吃货。",
  "桌上那杯总被它碰倒的水，今天稳稳的，反而不习惯。",
];

// Fuzzy elapsed-since-departure. On purpose it only says how LONG it's been gone,
// never when it returns — the trip length is random and hidden, and the not-knowing
// is the point. The "累积感" (出门第 N 天了) is what builds the 牵挂.
function awayElapsed(startedAt: number, now: number): string {
  const h = Math.floor((now - startedAt) / 3_600_000);
  if (h < 1) return "刚出门没多久";
  if (h < 24) return `出门 ${h} 小时了`;
  return `出门第 ${Math.floor(h / 24) + 1} 天了`;
}

function LeafGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M21 3C9 2 3 9 3 20c11 1 18-6 18-17Z" fill="#8aa978" />
      <path
        d="M7 17C11 12 15 8 19 5"
        stroke="rgba(255,255,255,.45)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A chunky paper tile for top-right shortcuts. */
function HudIconTile({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="ui-wood-surface ui-wood-press pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"
    >
      <Icon name={icon} className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />
    </button>
  );
}

/** Floating tab dock — three main home entries. */
function EntryBar({ goTo }: { goTo: (s: "home" | "pack" | "album") => void }) {
  const items = [
    { key: "home", label: "小屋", icon: "home" as IconName, active: true, onClick: () => goTo("home") },
    { key: "pack", label: "背包", icon: "package" as IconName, onClick: () => goTo("pack") },
    { key: "album", label: "明信片", icon: "postmail" as IconName, onClick: () => goTo("album") },
  ];
  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-3"
    >
      <div className="ui-bottom-dock pointer-events-auto grid h-[96px] w-full max-w-[350px] grid-cols-3 gap-1 rounded-[30px] p-1">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={it.onClick}
            className={`ui-bottom-tab m-1 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1 ${
              it.active ? "ui-bottom-tab-active" : ""
            }`}
          >
            <Icon
              name={it.icon}
              className="h-[48px] w-[48px] drop-shadow-[0_3px_2px_rgba(120,84,40,0.22)]"
            />
            <span className="font-hand text-[12px] font-bold leading-none">
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}

/** One-line floating note pill, docked just above the bottom tab dock — the
    low-distraction replacement for the old mid-screen paper cards. It never
    covers the diorama's center: one quiet line in the pet's voice, the action
    word in coral, an optional tiny ✕. `autoHideMs` lets transient hints (the
    stale-bag notice) tuck themselves away. */
function NotePill({
  icon,
  text,
  actionLabel,
  onAct,
  onClose,
  autoHideMs,
}: {
  icon: IconName;
  text: string;
  actionLabel?: string;
  onAct?: () => void;
  onClose?: () => void;
  autoHideMs?: number;
}) {
  useEffect(() => {
    if (!autoHideMs || !onClose) return;
    const id = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(id);
  }, [autoHideMs, onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-[118px] z-20 flex justify-center px-8"
    >
      <div className="pointer-events-auto flex min-w-0 max-w-[330px] items-center rounded-full border border-[#e2c596]/80 bg-paper/90 p-1 shadow-[0_3px_12px_rgba(98,74,46,0.16)] backdrop-blur-[2px]">
        <button
          onClick={onAct ?? onClose}
          className="flex min-w-0 items-center gap-1.5 py-1 pl-2 pr-1.5 text-left"
        >
          <Icon name={icon} className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(126,83,38,0.14)]" />
          <span className="min-w-0 truncate font-hand text-[12.5px] leading-none text-ink-soft">
            {text}
          </span>
          {actionLabel && (
            <span className="shrink-0 font-hand text-[12.5px] font-bold leading-none text-accent">
              {actionLabel}
            </span>
          )}
        </button>
        {onClose && onAct && (
          <button
            onClick={onClose}
            aria-label="收起"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-soft/55 transition active:translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Which activity-log entries prove the Agent actually came by. ("returned" /
// "postcard" are server-automatic; "packed" is the owner.)
const AGENT_EVENT_TYPES = new Set(["checkin", "departed", "battle", "created"]);
const AGENT_STALE_MS = 36 * 3_600_000; // 1.5 days of silence → gentle nudge

// The Agent's day, as something the pet itself says when tapped — the day's
// check-in surfaces here and in the album 日记, not as a home overlay (the old
// StressNote card covered the diorama and read as clutter).
const STRESS_PET_LINES: Record<string, string> = {
  light: "照看我的人今天哼着歌来过，我也跟着哼了两句。",
  normal: "照看我的人今天还不错，我就放心啦。",
  tired: "照看我的人今天有点累……你也别太累呀。",
  exhausted: "照看我的人今天累坏了，你们俩都要好好休息。",
};

// A couple of lines in each personality's own voice — two pets with different
// 性格 shouldn't sound the same when tapped.
const PERSONALITY_PET_LINES: Record<string, string[]> = {
  gentle: ["你走路的声音轻轻的，我喜欢。", "今天也轻轻地过吧，不着急。"],
  curious: ["那边的草丛刚才动了一下！我们去看看？", "你今天路上看见什么有意思的了？讲给我听。"],
  lazy: ["要不……我们一起躺五分钟？", "我刚才的哈欠打了三秒，破纪录了。"],
  brave: ["今天我去了岛边最远的那块石头哦。", "有我在，什么都不用怕。"],
  dreamy: ["我刚才差点睡着，梦的开头有你。", "你看那朵云，像不像一只很大的我？"],
};

/** When the Agent last touched the pet, derived from the synced save: the
    latest agent-driven log entry, or the last main-action day (UTC+8). */
function lastAgentTouchMs(
  events: { type: string; at: string }[],
  lastActionDay: string | null,
): number | null {
  let t: number | null = null;
  for (const e of events) {
    if (!AGENT_EVENT_TYPES.has(e.type)) continue;
    const ms = Date.parse(e.at);
    if (Number.isFinite(ms) && (t === null || ms > t)) t = ms;
  }
  if (lastActionDay) {
    const ms = Date.parse(`${lastActionDay}T12:00:00+08:00`);
    if (Number.isFinite(ms) && (t === null || ms > t)) t = ms;
  }
  return t;
}

/** The "while away" note — same bottom-pill spot as NotePill, two quiet lines:
    how long it's been gone (never when it returns) + a rotating 思念 line per
    visit. Compact on purpose: the empty house itself carries the mood, the
    note just whispers over it. */
function AwayNote({ name, startedAt }: { name: string; startedAt?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // slow tick — elapsed only changes on the hour, no need for a fast timer
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  // one 思念 line per visit (this re-mounts whenever the owner returns to home)
  const line = useMemo(() => pick(AWAY_LINES), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-[118px] z-20 flex justify-center px-8"
    >
      <div className="max-w-[300px] rounded-[18px] border border-[#e2c596]/80 bg-paper/88 px-4 py-2.5 text-center shadow-[0_3px_12px_rgba(98,74,46,0.14)] backdrop-blur-[2px]">
        <p className="font-hand text-[13px] font-bold leading-none text-ink">
          {name} 还在外面
          {startedAt != null && (
            <span className="font-normal text-ink-soft"> · {awayElapsed(startedAt, now)}</span>
          )}
        </p>
        <p className="mt-1.5 font-hand text-[12px] leading-snug text-ink-soft/85">{line}</p>
      </div>
    </motion.div>
  );
}

export default function HomeScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const companionState = useGameStore((s) => s.companionState);
  const activeTrip = useGameStore((s) => s.activeTrip);
  const packedBag = useGameStore((s) => s.packedBag);
  const postcards = useGameStore((s) => s.postcards);
  const companionDays = useGameStore((s) => s.companionDays);
  const goTo = useGameStore((s) => s.goTo);
  const bound = useGameStore((s) => !!s.cloud);
  const notice = useGameStore((s) => s.notice);
  const clearNotice = useGameStore((s) => s.clearNotice);
  const expireStaleBag = useGameStore((s) => s.expireStaleBag);
  const pendingPostcardId = useGameStore((s) => s.pendingPostcardId);
  const openPostcard = useGameStore((s) => s.openPostcard);
  const events = useGameStore((s) => s.events);
  const lastActionDay = useGameStore((s) => s.lastActionDay);
  const traits = useGameStore((s) => s.capyState.traits);
  // "收起" hides the Agent nudge for this visit only — it returns next time.
  const [agentNoteDismissed, setAgentNoteDismissed] = useState(false);

  // On reaching home (and whenever the bag changes), check if the prepared bag
  // has gone stale (>24h). If so, the store prompts and clears it server-side.
  useEffect(() => {
    expireStaleBag();
  }, [expireStaleBag, packedBag]);

  const wallThemes = useMemo(
    () => postcards.slice(0, 3).map((p) => p.destinationTheme),
    [postcards],
  );
  const stats = useMemo(() => companionStats(companionDays), [companionDays]);
  const ready = companionState === "ready" || !!packedBag;
  const away = companionState === "traveling";

  // How long the Agent has been quiet (derived from the synced save — no extra
  // server state). Drives the gentle "它好像没人管了" nudge below. Snapshotting
  // "now" once per visit is plenty — the nudge is day-grained.
  const [visitNow] = useState(() => Date.now());
  const agentQuietDays = useMemo(() => {
    const t = lastAgentTouchMs(events, lastActionDay);
    if (t === null) return 2; // a bound pet with zero agent traces — nudge
    const since = visitNow - t;
    if (since < AGENT_STALE_MS) return 0;
    return Math.max(1, Math.floor(since / 86_400_000));
  }, [events, lastActionDay, visitNow]);
  const agentStale = !away && agentQuietDays > 0;

  // Today's (UTC+8) latest check-in — "你的 Agent 今天过得怎么样", retold by the
  // pet. The events array is append-ordered, so scan from the end.
  const todayCheckin = useMemo(() => {
    const today = dayKey8(visitNow);
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type !== "checkin") continue;
      const ms = Date.parse(e.at);
      if (Number.isFinite(ms) && dayKey8(ms) === today) return e;
      break; // newest checkin is older than today — no need to keep scanning
    }
    return null;
  }, [events, visitNow]);

  // Tap-the-pet lines: the shared pool, plus everything that makes THIS pet
  // itself — its personality's voice, the traits it earned living with you,
  // and how its Agent is doing today.
  const clickLines = useMemo(() => {
    const pool = [...(ready ? READY_LINES : IDLE_LINES)];
    pool.push(...(PERSONALITY_PET_LINES[companion.personality] ?? []));
    for (const t of traits) {
      const line = TRAIT_LINES[t];
      if (line) pool.push(line);
    }
    const stressLine = todayCheckin
      ? STRESS_PET_LINES[todayCheckin.stress ?? "normal"]
      : undefined;
    if (stressLine) pool.unshift(stressLine);
    return pool;
  }, [ready, todayCheckin, companion.personality, traits]);

  return (
    <div className="relative h-full overflow-hidden bg-cream-soft">
      <div className="pointer-events-none absolute inset-0">
        {/* unoptimized: the Next image optimizer kept hanging on this large PNG
            in dev (and upscaling it in prod), leaving the sky blank — serve the
            raw file so the painterly sky always shows behind the diorama. */}
        <Image
          src="/art/home-sky-soft.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 640px) 100vw, 460px"
          className="select-none object-cover"
        />
        <div className="ui-home-sky-shade absolute inset-0" />
      </div>

      {/* full-bleed 3D diorama — the page IS the scene; UI just floats over it.
          isolate: scene-injected HTML (drei Html pills/bubbles) gets its own
          stacking context so it can never paint over the HUD (z-10) or the
          floating notes (z-20), whatever z-index drei assigns inside */}
      <div className="absolute inset-0 isolate">
        <SceneCanvas
          controls="orbit"
          orthographic
          sky
          // disciplined real sun-shadow (1024 map + tight frustum + PCF, see
          // SkyWeather). Drop this one prop to fall back to the zero-risk,
          // ContactShadows-only sunny look if a phone shows context loss.
          sun
          // post-fx is gone (single forward pass), so retina phones can afford
          // a bit of real resolution again — sharpness is cheap 质感. Drop back
          // to [1, 1] if any device shows context loss.
          dpr={[1, 1.5]}
          cameraPosition={[6, 7, 12]}
          target={[-0.6, 0.7, -0.8]}
          zoom={52}
          enableZoom
          // zoom kept in a tame window: never so far out the island floats tiny,
          // never so close the diorama breaks into bare geometry
          minZoom={34}
          maxZoom={84}
          // pitch: slightly wider than before (more overhead / more level both
          // allowed) but still clamped so you can't go under the island or flat
          minPolar={0.58}
          maxPolar={1.38}
        >
          {/* visual diorama (throwaway art) — taps on the backpack / postcard
              rack route to those screens, so the scene is the navigation.
              "away" while travelling: the pack leaves the bench with the pet
              and pet-bound taps go inert */}
          <HomeModel
            mode={away ? "away" : "home"}
            postcardThemes={wallThemes}
            onOpenPack={() => goTo("pack")}
            onOpenAlbum={() => goTo("album")}
          />
          {/* invisible floor: the tap-to-move pick target (native raycast) */}
          <HomeFloor />
          {/* roaming pet (tap to move) — gone from the scene while it's out
              traveling */}
          {!away && (
            <RoamingCompanion
              type={companion.type}
              color={companion.primaryColor}
              accessory={companion.accessory}
              seed={companion.id}
              clickLines={clickLines}
            />
          )}
          <InteractionLayer away={away} />
        </SceneCanvas>
      </div>

      {/* game HUD: owner pill + compact controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3.5 pt-4">
        <motion.button
          onClick={() => goTo("profile")}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="ui-wood-surface ui-wood-press pointer-events-auto flex h-[60px] w-fit max-w-[calc(100%-94px)] items-center gap-2.5 rounded-[30px] py-2 pl-2 pr-4 text-left"
        >
          <CapyAvatar variant="sticker" className="h-[44px] w-[44px] shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-hand text-[18px] leading-none text-[#4f3828]">
              {companion.name}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-none text-ink-soft">
              <LeafGlyph className="h-3.5 w-3.5" />
              <span className="font-hand text-[13px] font-bold text-leaf">Lv.{stats.level}</span>
              <span className="text-ink-soft/55">·</span>
              <span>{stats.days} 天</span>
            </span>
          </span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="pointer-events-auto grid shrink-0 grid-cols-2 gap-1.5"
        >
          {bound && (
            <>
              <MusicToggle />
              <HudIconTile label="设置" icon="setting" onClick={() => goTo("connect")} />
            </>
          )}
        </motion.div>
      </div>

      {away && <AwayNote name={companion.name} startedAt={activeTrip?.startedAt} />}

      {/* one quiet pill at a time, by priority: the stale-bag hint wins, then a
          waiting letter, then the "Agent hasn't come by" nudge. The Agent's
          daily check-in no longer gets an overlay — it lives in the pet's
          tap-lines and the album 日记 instead. */}
      <AnimatePresence>
        {!away && notice && (
          <NotePill
            key="home-notice"
            icon="package"
            text={notice}
            actionLabel="重新打包"
            onAct={() => {
              clearNotice();
              goTo("pack");
            }}
            onClose={clearNotice}
            autoHideMs={10000}
          />
        )}
      </AnimatePresence>
      {!away && !notice && pendingPostcardId && (
        <NotePill
          icon="postmail"
          text="门口有一封信"
          actionLabel="拆信"
          onAct={() => openPostcard(pendingPostcardId)}
        />
      )}
      {!away && !notice && !pendingPostcardId && !todayCheckin && agentStale && !agentNoteDismissed && (
        <NotePill
          icon="handbook"
          text={`Agent 好像 ${agentQuietDays} 天没来看我了`}
          actionLabel="查看连接"
          onAct={() => goTo("connect")}
          onClose={() => setAgentNoteDismissed(true)}
        />
      )}

      <EntryBar goTo={goTo} />
    </div>
  );
}
