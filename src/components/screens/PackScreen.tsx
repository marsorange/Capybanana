"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { dayKey8, uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import { extractElement } from "../ui/photoExtract";

const MAX = 3;

// ── soft peach palette, local to this screen (reference: cozy pastel mock) ───
// Cards are barely-there cream on a peach wash; all line-work is warm brown.
const CARD = "rounded-[24px] border border-[#f2dfc4] bg-[#fdf4e6] shadow-[0_5px_14px_rgba(187,134,84,0.10)]";
const INK = "#54402e";
const INK_SOFT = "#b08a5e";

// Owner→pet message ideas, straight from the reference mock (tap to fill).
const MESSAGE_IDEAS = [
  "今天想去有风的地方看看。",
  "如果累了，就在家慢慢休息。",
  "带着这个，找一个安静的小角落吧。",
];

// ── inline SVG icons (rounded, soft — no emoji) ──────────────────────────────
type IP = { className?: string };
const BackArrow = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H6" />
    <path d="m11.5 6.5-6 5.5 6 5.5" />
  </svg>
);
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
const Speech = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.4-.27-3.4-.76L4 19.5l1.3-4.4A7.5 7.5 0 1 1 20 11.5Z" />
    <path d="M9 10.5h.01M12.5 10.5h.01M16 10.5h.01" strokeWidth={2.6} />
  </svg>
);
const Parcel = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5z" />
    <path d="M3.5 8.5 12 13l8.5-4.5" />
    <path d="M12 13v7" />
  </svg>
);
/** Tiny manga-style emphasis rays flanking the title. */
const Spark = ({ className }: IP) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="M8 2.5v3" />
    <path d="m3.4 4.8 2 2" />
    <path d="m12.6 4.8-2 2" />
  </svg>
);
/** Four-point sparkle (CTA accent). */
const Twinkle = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 3.5 13.9 9.6 20 11.5l-6.1 1.9L12 19.5l-1.9-6.1L4 11.5l6.1-1.9Z" />
  </svg>
);
/** Little tuft of leaves peeking from a card corner. */
const LeafTuft = ({ className }: IP) => (
  <svg viewBox="0 0 48 26" className={className} aria-hidden="true">
    <path d="M24 24C20 15 12 11 4 13c4 9 12 13 20 11Z" fill="#8fb267" />
    <path d="M24 24c2-10-2-18-10-20-2 8 2 16 10 20Z" fill="#a3c277" />
    <path d="M24 24c6-8 14-10 20-6-4 7-14 9-20 6Z" fill="#7da053" />
  </svg>
);
/** Capybara peeking over the wish card's top edge, with a tiny heart. */
const CapyPeek = ({ className }: IP) => (
  <svg viewBox="0 0 76 46" className={className} aria-hidden="true">
    <path
      d="M9 13C5.8 10.8 4.2 7.6 6.2 5.6c1.5-1.5 4-.9 4.9 1 .9-1.9 3.5-2.4 5-1 2 2 .3 5.2-2.9 7.4l-2.1 1.4Z"
      fill="#ef8a80"
    />
    <rect x="24" y="7" width="40" height="31" rx="14" fill="#c79a68" />
    <circle cx="31" cy="10" r="4.5" fill="#aa7d4e" />
    <circle cx="57" cy="10" r="4.5" fill="#aa7d4e" />
    <circle cx="31" cy="10" r="2" fill="#8a6238" />
    <circle cx="57" cy="10" r="2" fill="#8a6238" />
    <circle cx="36.5" cy="22" r="2.3" fill="#3c2d1f" />
    <circle cx="51.5" cy="22" r="2.3" fill="#3c2d1f" />
    <rect x="38" y="26" width="12" height="9" rx="4.5" fill="#e2bd8e" />
    <circle cx="42" cy="30" r="1" fill="#7c5a36" />
    <circle cx="46" cy="30" r="1" fill="#7c5a36" />
    <rect x="28" y="38" width="10" height="7" rx="3.5" fill="#c79a68" />
    <rect x="50" y="38" width="10" height="7" rx="3.5" fill="#c79a68" />
  </svg>
);

export default function PackScreen() {
  const existing = useGameStore((s) => s.packedBag);
  const events = useGameStore((s) => s.events);
  const companionState = useGameStore((s) => s.companionState);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  // 打包是一次性的：门口还放着包就不能再改（直到被出门消耗、或满 24h 过期被
  // 收走）；包被今天的行动消耗掉了也不行——每天只打包一次，看当天的 packed
  // 事件。"今天"按进屏那一刻取一次就够；服务端 /api/web/pack 有同样的兜底。
  const away = companionState === "traveling";
  const [today] = useState(() => dayKey8(Date.now()));
  const packedEventToday = events.some((e) => {
    if (e.type !== "packed") return false;
    const ms = Date.parse(e.at);
    return Number.isFinite(ms) && dayKey8(ms) === today;
  });
  const gated = away || !!existing || packedEventToday;

  const [photos, setPhotos] = useState<PackedItem[]>(
    () => existing?.items.filter((i) => i.kind === "photo") ?? [],
  );
  const [message, setMessage] = useState(existing?.message ?? "");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  // bumped on every capture; keyed flash overlay re-mounts and replays its fade
  const [flashKey, setFlashKey] = useState(0);

  // ── inline camera ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camPhase, setCamPhase] = useState<"starting" | "live" | "error">("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    if (gated) return; // already-packed / away view — never wake the camera
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
  }, [facing, gated]);

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
    setFlashKey((k) => k + 1);
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
  // The pill under the viewfinder carries the running state, so the CTA stays
  // one clean line and the footer never changes height.
  const pillText = full
    ? "都收下啦，背包装满了"
    : photos.length > 0
      ? `收到 ${photos.length} 样啦，还能再装`
      : "拍下想让我带走的小东西";

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 70% at 50% 0%, #fdf3e4 0%, #fbecd9 55%, #f7e2c8 100%)",
      }}
    >
      {/* ── header: soft squircle back + sparkled title ──────────────────────── */}
      <header className="relative z-20 flex items-center gap-2 px-4 pt-3">
        <button
          onClick={() => goTo("home")}
          aria-label="返回"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-[#f2dfc4] bg-[#fdf4e6] text-[#8a6a4c] shadow-[0_4px_10px_rgba(187,134,84,0.14)] transition active:translate-y-0.5"
        >
          <BackArrow className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Spark className="h-3.5 w-3.5 shrink-0 -rotate-45 text-[#eda05f]" />
          <h1 className="truncate font-hand text-[21px] font-bold" style={{ color: INK }}>
            今日包裹
          </h1>
          <Spark className="h-3.5 w-3.5 shrink-0 rotate-45 text-[#eda05f]" />
        </div>
        <div className="h-11 w-11 shrink-0" aria-hidden />
      </header>

      {gated ? (
        /* ── 已经打包过 / 它在旅行 — a quiet recap instead of the camera form ── */
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-3 px-4 pb-8">
          <div className={`relative px-5 pb-6 pt-7 text-center ${CARD}`}>
            <LeafTuft className="pointer-events-none absolute -bottom-1.5 -left-2.5 h-6 w-11" />
            <LeafTuft className="pointer-events-none absolute -bottom-1.5 -right-2.5 h-6 w-11 -scale-x-100" />
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fbeeda] text-[#bd9468]">
              <Parcel className="h-7 w-7" />
            </span>
            <p className="mt-3 font-hand text-[18px] font-bold leading-none" style={{ color: INK }}>
              {away ? "我还在外面呢" : existing ? "包裹已经放在门口啦" : "今天已经打包过啦"}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: INK_SOFT }}>
              {away
                ? "等我回家，再给我装新的小东西吧。"
                : existing
                  ? "我会带着它出门的，先不拆开换东西啦。"
                  : "一天备一个就够啦，明天再来给我装新的。"}
            </p>
            {!away && existing && existing.items.some((i) => i.kind === "photo" && i.photo) && (
              <div className="mt-4 flex justify-center gap-2">
                {existing.items
                  .filter((i) => i.kind === "photo" && i.photo)
                  .map((i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i.id}
                      src={i.photo}
                      alt={i.label}
                      className="h-14 w-14 rounded-[14px] border border-[#f2dfc4] object-cover shadow-[0_3px_8px_rgba(187,134,84,0.18)]"
                    />
                  ))}
              </div>
            )}
            {!away && existing?.message && (
              <p className="mt-3 font-hand text-[13px] leading-snug text-[#7a5c40]">
                「{existing.message}」
              </p>
            )}
          </div>
          <button
            onClick={() => goTo("home")}
            className="flex h-[50px] w-full items-center justify-center rounded-[22px] border border-[#f2dfc4] bg-[#fdf4e6] font-hand text-[16px] font-bold text-[#8a6a4c] shadow-[0_4px_10px_rgba(187,134,84,0.14)] transition active:translate-y-0.5"
          >
            回小屋
          </button>
        </div>
      ) : (
        <>
      {/* ── single adaptive column: the viewfinder FLEXES to absorb whatever
          height the screen has; the idea-chips and hint line drop out on short
          screens so everything always fits without scrolling (overflow-y-auto
          is only the extreme-squeeze fallback) ─────────────────────────────── */}
      <div className="no-scrollbar relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-2 pt-2.5 [@media(max-height:620px)]:gap-2">
        {/* viewfinder card — camera window + grid + shutter + status pill */}
        <div
          className={`relative mb-2 min-h-[150px] w-full flex-1 p-[7px] [@media(max-height:620px)]:min-h-[140px] ${CARD}`}
          style={{ borderRadius: 28 }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#3a322a]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: camPhase === "live" ? "block" : "none" }}
            />
            {camPhase !== "live" && (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#f6e8d2] to-[#eedab9] px-8 text-center">
                <div>
                  <Camera className="mx-auto mb-2 h-7 w-7 text-[#bd9468]/80" />
                  <p className="whitespace-pre-line font-hand text-[14px] leading-relaxed text-[#8a6a4c]">
                    {camPhase === "starting"
                      ? "我在等镜头醒来…"
                      : "这里拿不到相机。\n先给我留一句话也可以。"}
                  </p>
                </div>
              </div>
            )}
            {camPhase === "live" && (
              <>
                {/* rule-of-thirds grid */}
                <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/12" />
                <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/12" />
                <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/12" />
                <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/12" />
                {/* corner marks */}
                <div className="pointer-events-none absolute left-3.5 top-3.5 h-6 w-6 rounded-tl-[9px] border-l-2 border-t-2 border-white/80" />
                <div className="pointer-events-none absolute right-3.5 top-3.5 h-6 w-6 rounded-tr-[9px] border-r-2 border-t-2 border-white/80" />
                <div className="pointer-events-none absolute bottom-3.5 left-3.5 h-6 w-6 rounded-bl-[9px] border-b-2 border-l-2 border-white/80" />
                <div className="pointer-events-none absolute bottom-3.5 right-3.5 h-6 w-6 rounded-br-[9px] border-b-2 border-r-2 border-white/80" />
                <button
                  onClick={switchCamera}
                  aria-label="切换镜头"
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-[14px] bg-[#241f1a]/35 text-white backdrop-blur-sm transition active:scale-95"
                >
                  <Switch className="h-4.5 w-4.5" />
                </button>
              </>
            )}
            {flashKey > 0 && (
              <motion.div
                key={flashKey}
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 z-10 bg-[#fffdf8]"
              />
            )}
          </div>

          {/* shutter — floats inside the window, above the status pill */}
          <button
            onClick={capture}
            disabled={camPhase !== "live" || full}
            aria-label="给我拍一样东西"
            className="absolute bottom-8 left-1/2 z-20 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full bg-[#fff8ee]/95 p-[5px] shadow-[0_5px_14px_rgba(58,40,20,0.28)] transition active:scale-92 disabled:opacity-45 disabled:active:scale-100"
          >
            <span className="grid h-full w-full place-items-center rounded-full border-2 border-[#e9d6bb] bg-[#fffdf8]">
              <Camera className="h-6 w-6 text-[#8a6a4c]" />
            </span>
          </button>

          {/* status pill — straddles the card's bottom edge */}
          <div className="absolute -bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f2dfc4] bg-[#fdf4e6] px-4 py-1.5 shadow-[0_4px_10px_rgba(187,134,84,0.16)]">
            <Camera className="h-3.5 w-3.5 shrink-0 text-[#bd9468]" />
            <span className="font-hand text-[12px] leading-none text-[#8a6a4c]">{pillText}</span>
          </div>
        </div>

        {/* 可放入物品 — three big tappable slots, leaf tufts at the corners */}
        <section className={`relative shrink-0 px-4 pb-3 pt-3 ${CARD}`}>
          <LeafTuft className="pointer-events-none absolute -bottom-1.5 -left-2.5 h-6 w-11" />
          <LeafTuft className="pointer-events-none absolute -bottom-1.5 -right-2.5 h-6 w-11 -scale-x-100" />
          <div className="flex items-center justify-between">
            <h2 className="font-hand text-[15px] font-bold leading-none" style={{ color: INK }}>
              可放入物品
            </h2>
            <span className="text-[13px] font-bold tabular-nums leading-none" style={{ color: INK_SOFT }}>
              {photos.length}/{MAX}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => {
              const item = photos[i];
              const busy = item ? busyIds.includes(item.id) : false;
              if (!item) {
                return (
                  <button
                    key={i}
                    onClick={capture}
                    disabled={camPhase !== "live"}
                    aria-label="给我拍一样东西"
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-[#e8cda7] bg-[#fbeeda]/70 transition active:scale-95 disabled:active:scale-100 [@media(max-height:620px)]:aspect-auto [@media(max-height:620px)]:h-16"
                  >
                    <span className="text-[26px] font-light leading-none text-[#d8b48e]">+</span>
                    <span className="font-hand text-[11px] leading-none text-[#c9a883]">拍照添加</span>
                  </button>
                );
              }
              return (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                  className="relative aspect-square w-full [@media(max-height:620px)]:aspect-auto [@media(max-height:620px)]:h-16"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[18px] border border-[#f2dfc4] shadow-[0_3px_8px_rgba(187,134,84,0.18)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo} alt={item.label} className="absolute inset-0 h-full w-full object-cover" />
                    <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#fff8ee]/90 px-1 py-1 font-hand text-[10px] leading-none text-[#6b5238]">
                      {busy && <span className="h-1.5 w-1.5 shrink-0 animate-breathe rounded-full bg-[#9cba66]" />}
                      <span className="truncate">{item.label}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => removePhoto(item.id)}
                    aria-label="移除"
                    className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-[#9c7a55]/90 text-[#fffaf2] shadow transition active:translate-y-0.5"
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* one-line explainer — drops out first on short screens */}
        <p className="flex shrink-0 items-center justify-center gap-1.5 px-2 text-center text-[11px] leading-tight text-[#bd9468] [@media(max-height:620px)]:hidden">
          <Heart className="h-3 w-3 shrink-0 text-[#ef8a80]" />
          拍到的东西都会变成我旅行的线索～
        </p>

        {/* 写下一句心愿 — wish note with the capy peeking over the edge */}
        <section className={`relative shrink-0 px-4 pb-3 pt-3 ${CARD}`}>
          <CapyPeek className="pointer-events-none absolute -top-[27px] right-3 h-[42px] w-[70px]" />
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fbeeda] text-[#bd9468]">
              <Speech className="h-4 w-4" />
            </span>
            <h2 className="font-hand text-[15px] font-bold leading-none" style={{ color: INK }}>
              写下一句心愿
            </h2>
          </div>
          <div className="relative mt-2 rounded-[16px] border border-[#f2dfc4] bg-[#fffaf2] px-3 pb-5 pt-2 [@media(max-height:620px)]:pb-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 50))}
              maxLength={50}
              placeholder="比如：今天想去有风的地方看看。"
              rows={2}
              className="w-full resize-none bg-transparent font-hand text-[14px] leading-[22px] outline-none placeholder:text-[#cfae85]"
              style={{ color: INK }}
            />
            <span className="absolute bottom-1.5 right-2.5 text-[10px] tabular-nums text-[#cfae85]">
              {message.length}/50
            </span>
          </div>
          <div className="[@media(max-height:760px)]:hidden">
            <p className="mt-2 text-[11px] leading-none text-[#b08a5e]">试试看这些句子</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MESSAGE_IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setMessage(idea)}
                  className="rounded-full border border-[#f0d9bb] bg-[#fdf4e6] px-3 py-1.5 font-hand text-[12px] leading-none text-[#7a5c40] shadow-[0_2px_5px_rgba(187,134,84,0.1)] transition active:scale-95"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── CTA — one soft salmon button, floating on the wash ─────────────── */}
      <div
        className="relative z-20 shrink-0 px-4 pt-1.5"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => prepareBag(photos, message)}
          disabled={!hasClue}
          className="relative flex h-[54px] w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-b from-[#f29c86] to-[#e87f6b] font-hand text-[18px] font-bold text-[#fffaf4] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_8px_18px_rgba(222,120,98,0.38)] transition active:translate-y-0.5 active:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_3px_8px_rgba(222,120,98,0.3)] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0"
        >
          <Parcel className="h-5 w-5" />
          放到门口
          <Twinkle className="absolute bottom-2 right-3.5 h-3.5 w-3.5 text-[#ffd9a8]" />
        </button>
      </div>
        </>
      )}
    </div>
  );
}
