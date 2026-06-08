"use client";

import { useEffect, useRef, useState } from "react";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import { extractElement } from "../ui/photoExtract";
import { BackButton } from "../ui/kit";

const MAX = 3;

// warm storybook palette (local — the reference's grassy greens + cozy wood)
const GREEN = "#86a94e";
const GREEN_DK = "#6d9040";
const GREEN_DEEP = "#54752f";
const WOOD = "#e8cf98";
const WOOD_DK = "#bd8a52";

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
const Banana = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M4.5 8.5c1.2 7.3 7 11.2 14 9.4-1.2 1.3-3.4 2.3-6.2 2.1C6.6 19.6 3.6 14.2 3.4 9.4c0-.9.4-1.3 1.1-.9Z" fill="#f3c64a" stroke="#d7a738" strokeWidth={1.1} strokeLinejoin="round" />
    <path d="M18.5 17.9c.7-.2 1.2-.6 1.5-1.2" stroke="#caa05e" strokeWidth={1} strokeLinecap="round" />
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
      {/* ── header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-4">
        <BackButton onClick={() => goTo("home")} />
        <div
          className="flex items-center gap-2 rounded-[16px] px-4 py-1.5 shadow-[0_4px_0_rgba(90,57,29,.4)]"
          style={{ background: `linear-gradient(165deg, #cd9f63, ${WOOD})`, border: `3px solid ${WOOD_DK}` }}
        >
          <span className="font-hand text-[22px] font-bold leading-none text-[#46301c]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.28)" }}>
            今日包裹
          </span>
          <Banana className="-mr-1 h-5 w-5 rotate-[14deg]" />
        </div>
        <span className="w-11" aria-hidden />
      </header>
      <p className="relative z-10 px-6 pt-2 text-center text-[12px] leading-snug text-ink-soft">
        今天，我可以带上点什么？
      </p>

      {/* ── scrollable content ─────────────────────────────────────────────── */}
      <div className="no-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-4">
        {/* viewfinder */}
        <div
          className="relative overflow-hidden rounded-[24px] border-[4px] border-cream-soft shadow-[0_6px_0_rgba(111,84,55,.18)]"
          style={{ aspectRatio: "4 / 3", background: "#2b2620" }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ display: camPhase === "live" ? "block" : "none" }}
          />
          {camPhase !== "live" && (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#efe2c6] to-[#e3cfa6] px-8 text-center">
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#7a6244]">
                {camPhase === "starting"
                  ? "我在等镜头醒来…"
                  : "这里拿不到相机。\n先给我留一句话也可以。"}
              </p>
            </div>
          )}
          {camPhase === "live" && (
            <button
              onClick={switchCamera}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-paper backdrop-blur-sm"
              style={{ background: "rgba(20,16,12,.34)" }}
              aria-label="切换镜头"
            >
              <Switch className="h-4 w-4" />
            </button>
          )}
          {camPhase === "live" && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full px-3.5 py-1 text-[11px] text-paper backdrop-blur-sm" style={{ background: `${GREEN_DK}e6` }}>
                {full ? "都收下啦！" : "放在中间，让我看看"}
              </span>
            </div>
          )}
        </div>

        {/* three item slots */}
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => {
            const item = photos[i];
            const busy = item ? busyIds.includes(item.id) : false;
            return (
              <div
                key={i}
                className="relative rounded-[16px] border-2 border-ink/10 bg-paper p-1.5 shadow-[0_3px_0_rgba(111,84,55,.1)]"
              >
                {item ? (
                  <>
                    <button
                      onClick={() => removePhoto(item.id)}
                      aria-label="移除"
                      className="absolute -right-2 -top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-cream-soft text-ink-soft shadow-[0_0_0_2px_#fffdf8] active:translate-y-0.5"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo} alt={item.label} className="aspect-square w-full rounded-[11px] object-cover" />
                    <p className="mt-1 flex items-center justify-center gap-1 text-[12px] font-medium text-ink">
                      {busy && <span className="h-1.5 w-1.5 shrink-0 animate-breathe rounded-full" style={{ background: GREEN }} />}
                      <span className="truncate">{item.label}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid aspect-square w-full place-items-center rounded-[11px] border-2 border-dashed border-ink/15 bg-cream-soft/60">
                      <Camera className="h-6 w-6 text-ink-soft/35" />
                    </div>
                    <p className="mt-1 text-center text-[12px] text-ink-soft/55">还空着</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* optional one-line message to the agent */}
        <div className="rounded-[16px] border-2 border-ink/8 bg-[#fffdf5] px-3.5 py-3 shadow-[0_3px_0_rgba(111,84,55,.1)]">
          <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-ink-soft">
            <Heart className="h-3 w-3 text-accent" /> 想对我说点什么吗（可选）
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 50))}
            placeholder="今天有点累，我们慢一点也可以…"
            rows={2}
            className="w-full resize-none bg-transparent font-hand text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/45"
          />
        </div>
      </div>

      {/* ── capture + CTA ──────────────────────────────────────────────────── */}
      <div className="game-bottom-panel relative z-20 shrink-0 px-5 pb-4 pt-3">
        <div className="mb-3 flex justify-center">
          <button
            onClick={capture}
            disabled={camPhase !== "live" || full}
            aria-label="给我拍一样东西"
            className="grid h-[72px] w-[72px] place-items-center rounded-full p-1.5 shadow-[0_5px_0_rgba(60,80,40,.5)] transition active:translate-y-1 active:shadow-[0_1px_0_rgba(60,80,40,.5)] disabled:opacity-45 disabled:active:translate-y-0"
            style={{ background: GREEN_DEEP }}
          >
            <span
              className="grid h-full w-full place-items-center rounded-full ring-2 ring-paper/85"
              style={{ background: `linear-gradient(160deg, #a0c46c, ${GREEN_DK})` }}
            >
              <Camera className="h-8 w-8 text-paper" />
            </span>
          </button>
        </div>

        <button
          onClick={() => prepareBag(photos, message)}
          disabled={!hasClue}
          className="relative w-full overflow-hidden rounded-[20px] border-2 border-[#b8504a] py-3 text-center transition active:translate-y-0.5 disabled:opacity-45"
          style={{ background: "linear-gradient(180deg, #ef7e74, #d9554f)", boxShadow: "0 5px 0 rgba(150,70,58,0.5)" }}
        >
          <span className="pointer-events-none absolute inset-1.5 rounded-[14px] border-2 border-dashed border-paper/40" />
          <span className="relative font-hand text-xl font-bold text-paper">放到门口 ✨</span>
          <span className="relative mt-0.5 block text-[11px] text-paper/85">{subtext}</span>
        </button>
      </div>
    </div>
  );
}
