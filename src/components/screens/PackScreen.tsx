"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { dayKey8, uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import Icon from "../ui/Icon";
import { PrimaryButton, ScreenHeader, SecondaryButton } from "../ui/kit";
import { extractElement } from "../ui/photoExtract";

const MAX = 3;

// Same paper card as PostcardScreen / kit Panel — this screen shares the global
// storybook material system. (Future background art slots in as <ScreenArtwork>
// right under the root, same as the postcard screen.)
const CARD =
  "tex-grain rounded-[24px] border-2 border-[#e4c89c] bg-paper/95 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_4px_0_rgba(143,101,54,0.14),0_14px_26px_-18px_rgba(58,46,42,0.42)]";

// Owner→pet message ideas — short chip label, tapping fills the full sentence
// (full sentences as chips wrap to 3 lines on 390px and crush the viewfinder).
const MESSAGE_IDEAS = [
  { label: "有风的地方", full: "今天想去有风的地方看看。" },
  { label: "在家休息", full: "如果累了，就在家慢慢休息。" },
  { label: "安静的角落", full: "带着这个，找一个安静的小角落吧。" },
];

// ── inline SVG bits the PNG icon set doesn't cover ───────────────────────────
type IP = { className?: string };
const Switch = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10a8 8 0 0 1 13.5-3.3L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 14a8 8 0 0 1-13.5 3.3L4 15" />
    <path d="M4 20v-5h5" />
  </svg>
);
const Speech = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.4-.27-3.4-.76L4 19.5l1.3-4.4A7.5 7.5 0 1 1 20 11.5Z" />
    <path d="M9 10.5h.01M12.5 10.5h.01M16 10.5h.01" strokeWidth={2.6} />
  </svg>
);
/** Capybara peeking over the tray card's top edge, with a tiny heart. */
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
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      {/* 背景图占位：后续在这里挂 <ScreenArtwork src=... overlay="soft" />，
          与 PostcardScreen 同构；现在先用 screen-bg 素底。 */}

      <ScreenHeader
        compact
        onBack={() => goTo("home")}
        eyebrow="拍到的都会变成我旅行的线索"
        title="今日包裹"
        right={<Icon name="package" className="h-7 w-7 drop-shadow-[0_3px_2px_rgba(126,83,38,0.18)]" />}
      />

      {gated ? (
        /* ── 已经打包过 / 它在旅行 — a quiet recap instead of the camera form ── */
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-3 px-5 pb-8">
          <div className={`relative px-5 pb-6 pt-7 text-center ${CARD}`}>
            <span className="ui-icon-well mx-auto h-16 w-16 rounded-[20px]">
              <Icon name="package" className="h-9 w-9" />
            </span>
            <p className="mt-3 font-hand text-[18px] font-bold leading-none text-ink">
              {away ? "我还在外面呢" : existing ? "包裹已经放在门口啦" : "今天已经打包过啦"}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
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
                      className="h-14 w-14 rounded-[14px] border-2 border-[#e4c89c] object-cover shadow-[0_3px_0_rgba(143,101,54,0.14)]"
                    />
                  ))}
              </div>
            )}
            {!away && existing?.message && (
              <p className="mt-3 font-hand text-[13px] leading-snug text-ink-soft">
                「{existing.message}」
              </p>
            )}
          </div>
          <SecondaryButton size="sm" onClick={() => goTo("home")}>
            回小屋
          </SecondaryButton>
        </div>
      ) : (
        <>
      {/* ── viewfinder is the hero: it FLEXES to absorb all leftover height;
          the tray below stays one compact card so the camera gets the screen.
          overflow-y-auto is only the extreme-squeeze fallback ───────────────── */}
      <div className="no-scrollbar relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-2 pt-2.5">
        {/* viewfinder card — camera window + grid + shutter + status chip.
            flex-1 makes it the hero, but max-h caps it (roughly square window)
            so tall screens don't turn it into a full-page mirror. */}
        <div
          className={`relative min-h-[220px] w-full flex-1 p-2 max-h-[min(52dvh,420px)] [@media(max-height:700px)]:min-h-[180px] [@media(max-height:620px)]:min-h-[130px]! ${CARD}`}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[17px] bg-[#352c22]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ display: camPhase === "live" ? "block" : "none" }}
            />
            {camPhase !== "live" && (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-cream-soft to-cream-deep px-8 text-center">
                <div>
                  <Icon name="photo" className="mx-auto mb-2 h-9 w-9 opacity-80" />
                  <p className="whitespace-pre-line font-hand text-[14px] leading-relaxed text-ink-soft">
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
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-[#241f1a]/40 text-white backdrop-blur-sm transition active:scale-95"
                >
                  <Switch className="h-4.5 w-4.5" />
                </button>
                {/* status chip — camera-HUD style, top-left inside the window */}
                <div className="absolute left-3 top-3 z-10 flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#241f1a]/40 px-3 backdrop-blur-sm">
                  <Icon name="photo" className="h-4 w-4 shrink-0" />
                  <span className="font-hand text-[12px] leading-none text-white/95">{pillText}</span>
                </div>
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

          {/* shutter — floats inside the window's bottom edge */}
          <button
            onClick={capture}
            disabled={camPhase !== "live" || full}
            aria-label="给我拍一样东西"
            className="absolute bottom-5 left-1/2 z-20 grid h-[68px] w-[68px] -translate-x-1/2 place-items-center rounded-full border-2 border-[#d9b982] bg-paper p-[5px] shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_5px_0_rgba(143,101,54,0.3),0_16px_26px_-14px_rgba(58,46,42,0.55)] transition active:scale-95 disabled:opacity-45 disabled:active:scale-100"
          >
            <span className="grid h-full w-full place-items-center rounded-full border-2 border-[#e4c89c] bg-cream-soft">
              <Icon name="photo" className="h-8 w-8" />
            </span>
          </button>
        </div>

        {/* 给我带上的小东西 — three roomy tap-to-shoot slots, capy peeking over */}
        <section className={`relative shrink-0 px-3.5 pb-3.5 pt-3 ${CARD}`}>
          <CapyPeek className="pointer-events-none absolute -top-[27px] right-4 h-[42px] w-[70px]" />
          <div className="flex items-center justify-between px-0.5">
            <h2 className="font-hand text-[15px] font-bold leading-none text-ink">给我带上的小东西</h2>
            <span className="text-[13px] font-bold tabular-nums leading-none text-ink-soft">
              {photos.length}/{MAX}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
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
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-[#d9b982] bg-cream-soft/70 transition active:scale-95 disabled:opacity-55 disabled:active:scale-100 [@media(max-height:700px)]:aspect-auto [@media(max-height:700px)]:h-16 [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:gap-1 [@media(max-height:620px)]:h-12!"
                  >
                    <span className="text-[26px] font-light leading-none text-[#c2a06f]">+</span>
                    <span className="font-hand text-[11px] leading-none text-ink-soft">拍照添加</span>
                  </button>
                );
              }
              return (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                  className="relative aspect-square w-full [@media(max-height:700px)]:aspect-auto [@media(max-height:700px)]:h-16 [@media(max-height:620px)]:h-12!"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[18px] border-2 border-[#e4c89c] shadow-[0_3px_0_rgba(143,101,54,0.14)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo} alt={item.label} className="absolute inset-0 h-full w-full object-cover" />
                    <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-paper/90 px-1 py-1 font-hand text-[10px] leading-none text-ink">
                      {busy && <span className="h-1.5 w-1.5 shrink-0 animate-breathe rounded-full bg-leaf" />}
                      <span className="truncate">{item.label}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => removePhoto(item.id)}
                    aria-label="移除"
                    className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-[#8c684a] text-paper shadow transition active:translate-y-0.5"
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

        {/* 写下一句心愿 — roomy note card with tap-to-fill idea chips */}
        <section className={`relative shrink-0 px-3.5 pb-3 pt-3 ${CARD}`}>
          <div className="flex items-center gap-2 [@media(max-height:620px)]:hidden">
            <span className="ui-icon-well h-7 w-7 shrink-0 rounded-full">
              <Speech className="h-4 w-4 text-[#8c684a]" />
            </span>
            <h2 className="font-hand text-[15px] font-bold leading-none text-ink">写下一句心愿</h2>
            <span className="ml-auto text-[10px] leading-none text-ink-soft/70 [@media(max-height:780px)]:hidden">
              点一句放进去
            </span>
          </div>
          <div className="relative mt-2 rounded-[16px] border-2 border-[#ead6b2] bg-cream-soft px-3 pb-5 pt-2 [@media(max-height:620px)]:mt-0">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 50))}
              maxLength={50}
              placeholder="留一句话，我带在路上看。"
              rows={2}
              className="w-full resize-none bg-transparent font-hand text-[14px] leading-[22px] text-ink outline-none placeholder:text-ink-soft/55"
            />
            <span className="absolute bottom-1.5 right-2.5 text-[10px] tabular-nums text-ink-soft/60">
              {message.length}/50
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 [@media(max-height:780px)]:hidden">
            {MESSAGE_IDEAS.map((idea) => (
              <button
                key={idea.label}
                onClick={() => setMessage(idea.full)}
                className="ui-wood-surface ui-wood-press rounded-full px-2.5 py-1.5 font-hand text-[11px] leading-none text-ink-soft"
              >
                {idea.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA — coral sticker on the shared bottom panel ─────────────────── */}
      <div
        className="game-bottom-panel relative z-20 shrink-0 px-4 pt-3"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <PrimaryButton
          size="sm"
          onClick={() => prepareBag(photos, message)}
          disabled={!hasClue}
          className="flex items-center justify-center gap-2"
        >
          <Icon name="package" className="h-6 w-6" />
          放到门口
        </PrimaryButton>
      </div>
        </>
      )}
    </div>
  );
}
