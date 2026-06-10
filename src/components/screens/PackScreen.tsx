"use client";

import { useEffect, useRef, useState } from "react";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import { cn } from "../ui/cn";
import { extractElement } from "../ui/photoExtract";
import Icon from "../ui/Icon";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

const MAX = 3;

// The camera shutter uses the theme's leaf green — the only non-coral accent in
// the home palette — so it reads as a distinct "capture" action without
// inventing a new colour for this screen.
const LEAF = "#8aa978";
const LEAF_DK = "#6d9040";
const LEAF_DEEP = "#54752f";

// Polaroid jitter — each slot leans a touch differently so the row reads as
// photos taped to paper, not a UI grid.
const SLOT_TILT = ["rotate-[-1.6deg]", "rotate-[1.2deg]", "rotate-[-0.8deg]"];

// ── inline SVG icons (rounded, hand-drawn feel — no emoji) ───────────────────
type IP = { className?: string };
const Switch = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a8 8 0 0 1 13.5-3.3L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 14a8 8 0 0 1-13.5 3.3L4 15" />
    <path d="M4 20v-5h5" />
  </svg>
);
const Camera = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <rect x="2.5" y="7" width="19" height="13.5" rx="3.2" />
    <path d="M8 7 9.4 4.6h5.2L16 7" />
    <circle cx="12" cy="13.6" r="3.7" />
  </svg>
);
const Heart = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 20.4S4.2 15.5 4.2 9.9C4.2 7.3 6.1 5.6 8.3 5.6c1.5 0 2.8.8 3.7 2 .9-1.2 2.2-2 3.7-2 2.2 0 4.1 1.7 4.1 4.3 0 5.6-7.8 10.5-7.8 10.5Z" />
  </svg>
);

/** Viewfinder focus brackets — frames the "放在中间" spot without covering it. */
const Brackets = ({ className }: IP) => (
  <svg
    viewBox="0 0 100 75"
    preserveAspectRatio="none"
    className={className}
    fill="none"
    stroke="#fffdf8"
    strokeWidth={2.2}
    strokeLinecap="round"
  >
    {[
      "M13 22 V15 q0-4 4-4 h8",
      "M87 22 V15 q0-4-4-4 h-8",
      "M13 53 v7 q0 4 4 4 h8",
      "M87 53 v7 q0 4-4 4 h-8",
    ].map((d) => (
      <path key={d} d={d} vectorEffect="non-scaling-stroke" />
    ))}
  </svg>
);

export default function PackScreen() {
  const existing = useGameStore((s) => s.packedBag);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  const [photos, setPhotos] = useState<PackedItem[]>(
    () => existing?.items.filter((i) => i.kind === "photo") ?? [],
  );
  const [message, setMessage] = useState(existing?.message ?? "");
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // ── inline camera ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camPhase, setCamPhase] = useState<"starting" | "live" | "error">("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamPhase("error");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamPhase("live");
      } catch {
        if (!cancelled) setCamPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  // 拍完即调用 /api/web/recognize 把“这是什么”填进 label/keyword；失败/超时都保留取色启发式
  // （label 一开始就是启发式词，识别成功只是悄悄替换它，所以格子永远有名字、不会卡在“识别中”）。
  const recognize = async (photo: string, id: string) => {
    const ctrl = new AbortController();
    const to = window.setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch("/api/web/recognize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo }),
        signal: ctrl.signal,
      });
      const out = (await res.json()) as { ok: boolean; name?: string };
      if (out.ok && out.name) {
        const name = out.name;
        setPhotos((ps) =>
          ps.map((p) => (p.id === id ? { ...p, label: name, hint: name, keyword: name } : p)),
        );
      }
    } catch {
      /* keep the colour heuristic */
    } finally {
      window.clearTimeout(to);
      setBusyIds((b) => b.filter((x) => x !== id));
    }
  };

  const capture = () => {
    if (photos.length >= MAX) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    const c = document.createElement("canvas");
    c.width = 150;
    c.height = 150;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 150, 150);
    const photo = c.toDataURL("image/jpeg", 0.72);

    const sc = document.createElement("canvas");
    sc.width = 24;
    sc.height = 24;
    const sctx = sc.getContext("2d");
    if (!sctx) return;
    sctx.drawImage(video, sx, sy, size, size, 0, 0, 24, 24);
    const ex = extractElement(sctx.getImageData(0, 0, 24, 24).data);

    const id = uid("pi");
    const item: PackedItem = {
      id,
      kind: "photo",
      photo,
      label: ex.hint || "你拍的东西",
      hint: ex.hint,
      keyword: ex.keyword,
      color: ex.color,
      tags: tagsFromHint(ex.hint),
    };
    setPhotos((ps) => (ps.length >= MAX ? ps : [...ps, item]));
    setBusyIds((b) => [...b, id]);
    recognize(photo, id);
  };

  const removePhoto = (id: string) => {
    setPhotos((ps) => ps.filter((p) => p.id !== id));
    setBusyIds((b) => b.filter((x) => x !== id));
  };

  const switchCamera = () => {
    setCamPhase("starting");
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  };

  const hasClue = photos.length > 0 || message.trim().length > 0;
  const full = photos.length >= MAX;
  const subtext = full
    ? "够啦，我会小心背好"
    : photos.length > 0
      ? `${photos.length} 样啦，再给我一点线索也行`
      : "拍一样东西，或者给我留句话";

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/home-sky-soft.png"
        overlay="soft"
        imageClassName="object-[50%_22%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/88 via-cream-soft/45 to-transparent" />

      <ScreenHeader
        onBack={() => goTo("home")}
        eyebrow="拍下想让我带走的小东西，或留一句话"
        title="今日包裹"
        compact
        right={<Icon name="package" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
      />

      {/* ── single adaptive column: the viewfinder FLEXES to absorb whatever
          height the screen has, everything else stays compact — so the page
          always fits without scrolling, and the keyboard just squeezes the
          camera instead of covering the inputs (overflow-y-auto is only the
          extreme-squeeze fallback) ──────────────────────────────────────── */}
      <div className="no-scrollbar relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-2.5 pt-2">
        {/* viewfinder — wooden-framed camera window, elastic height */}
        <div className="sketch relative min-h-[150px] w-full flex-1 overflow-hidden rounded-[22px] border-[3px] border-[#d9b982] bg-[#2b2620] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_5px_0_rgba(111,84,55,0.16),0_16px_28px_-24px_rgba(58,46,42,0.52)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ display: camPhase === "live" ? "block" : "none" }}
          />
          {camPhase !== "live" && (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#efe2c6] to-[#e3cfa6] px-8 text-center">
              <p className="whitespace-pre-line font-hand text-[14px] leading-relaxed text-[#7a6244]">
                {camPhase === "starting"
                  ? "我在等镜头醒来…"
                  : "这里拿不到相机。\n先给我留一句话也可以。"}
              </p>
            </div>
          )}
          {camPhase === "live" && (
            <>
              <Brackets className="pointer-events-none absolute inset-0 h-full w-full opacity-65" />
              <button
                onClick={switchCamera}
                className="ui-wood-surface ui-wood-press absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full text-ink"
                aria-label="切换镜头"
              >
                <Switch className="h-4 w-4" />
              </button>
              <div className="absolute inset-x-0 bottom-2.5 flex justify-center">
                <span className="rounded-full px-3 py-1 font-hand text-[12px] text-paper backdrop-blur-sm" style={{ background: `${LEAF_DK}e6` }}>
                  {full ? "都收下啦" : "放在中间，让我看看"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 包裹里 — one compact strip: three small slots + the counter */}
        <Panel className="shrink-0 px-3 py-2" sketch={false}>
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 font-hand text-[14px] font-bold leading-none text-ink">
              包裹里
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-center gap-2.5">
              {[0, 1, 2].map((i) => {
                const item = photos[i];
                const busy = item ? busyIds.includes(item.id) : false;
                return (
                  <div key={i} className={cn("relative w-[60px] shrink-0", SLOT_TILT[i])}>
                    {item ? (
                      <>
                        <button
                          onClick={() => removePhoto(item.id)}
                          aria-label="移除"
                          className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-ink/60 text-paper transition active:translate-y-0.5"
                        >
                          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photo}
                          alt={item.label}
                          className="aspect-square w-full rounded-[10px] border-2 border-[#e4c89c] object-cover shadow-[0_2px_0_rgba(143,101,54,0.14)]"
                        />
                        <p className="mt-0.5 flex items-center justify-center gap-1 font-hand text-[10px] leading-none text-ink">
                          {busy && <span className="h-1.5 w-1.5 shrink-0 animate-breathe rounded-full" style={{ background: LEAF }} />}
                          <span className="truncate">{item.label}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="grid aspect-square w-full place-items-center rounded-[10px] border-2 border-dashed border-ink/12 bg-cream-soft/60">
                          <Camera className="h-4 w-4 text-ink-soft/30" />
                        </div>
                        <p className="mt-0.5 text-center font-hand text-[10px] leading-none text-ink-soft/45">
                          空着
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <span className="shrink-0 text-[11px] tabular-nums leading-none text-ink-soft">
              {photos.length} / {MAX}
            </span>
          </div>
        </Panel>

        {/* optional one-line message — a ruled scrap of letter paper */}
        <Panel sketch={false} className="shrink-0 px-3.5 py-2">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
              <Heart className="h-3 w-3 text-accent" /> 想对我说点什么吗（可选）
            </span>
            <span className="text-[10px] tabular-nums text-ink-soft/45">{message.length} / 50</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 50))}
            maxLength={50}
            placeholder="今天有点累，我们慢一点也可以…"
            rows={2}
            className="w-full resize-none bg-transparent font-hand text-[14px] leading-[24px] text-ink outline-none placeholder:text-ink-soft/45"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0 23px, rgba(189,138,82,0.28) 23px 24px)",
            }}
          />
        </Panel>
      </div>

      {/* ── shutter + CTA, one row so the dock stays short on small phones ──── */}
      <div
        className="game-bottom-panel relative z-20 flex shrink-0 items-center gap-3 px-4 pt-2.5"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={capture}
          disabled={camPhase !== "live" || full}
          aria-label="给我拍一样东西"
          className="grid h-[56px] w-[56px] shrink-0 place-items-center rounded-full p-1.5 shadow-[0_5px_0_rgba(60,80,40,.45)] transition active:translate-y-1 active:shadow-[0_1px_0_rgba(60,80,40,.45)] disabled:opacity-45 disabled:active:translate-y-0"
          style={{ background: LEAF_DEEP }}
        >
          <span
            className="grid h-full w-full place-items-center rounded-full ring-2 ring-paper/85"
            style={{ background: `linear-gradient(160deg, #a0c46c, ${LEAF_DK})` }}
          >
            <Camera className="h-6 w-6 text-paper" />
          </span>
        </button>

        <PrimaryButton size="sm" className="min-w-0 flex-1" onClick={() => prepareBag(photos, message)} disabled={!hasClue}>
          <span className="pointer-events-none absolute inset-1.5 rounded-[14px] border-2 border-dashed border-paper/40" />
          <span className="relative block">放到门口</span>
          <span className="relative mt-0.5 block truncate text-[11px] font-normal text-paper/85">{subtext}</span>
        </PrimaryButton>
      </div>
    </div>
  );
}
