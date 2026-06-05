"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import { useGameStore } from "@/state/gameStore";
import CharacterModel from "../scenes3d/character/CharacterModel";
import SceneCanvas from "../scenes3d/SceneCanvas";
import { extractElement } from "../ui/photoExtract";
import { BackButton } from "../ui/kit";

const MAX = 3;
const MESSAGE_IDEAS = [
  "如果今天风太重，就在岛上休息。",
  "想去有风的地方看看，但别勉强。",
  "把这个当作今天的小线索吧。",
];
const TIPS = ["把物品放在取景框中央", "光线亮一点会更清楚", "一次只拍一样东西"];

// warm storybook palette (local — the reference's grassy greens + cozy wood)
const GREEN = "#86a94e";
const GREEN_DK = "#6d9040";
const GREEN_DEEP = "#54752f";
const WOOD = "#e8cf98";
const WOOD_DK = "#bd8a52";

// ── inline SVG icons (rounded, hand-drawn feel — no emoji) ───────────────────
type IP = { className?: string };
const Flash = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M13 2 5.5 13.2c-.3.5 0 1.1.6 1.1H10l-1.4 7.1c-.1.7.8 1.1 1.2.5L18.5 10c.3-.5 0-1.1-.6-1.1H13.7L15 2.6c.1-.7-.8-1.1-1.2-.6Z" />
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
const Suitcase = ({ className }: IP) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <rect x="3.5" y="7.5" width="17" height="12.5" rx="2.4" />
    <path d="M8.5 7.5V5.4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2.1" />
    <path d="M3.5 12.5h17" />
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
const Leaf = ({ className, fill }: IP & { fill: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <path d="M38 3C17 1 2 16 2 37c21 2 36-13 36-34Z" fill={fill} />
    <path d="M7 33C16 24 27 14 34 7" stroke="rgba(255,255,255,.35)" strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);

// four leafy corner clusters framing the page (decorative, behind content)
function Leaves() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -left-5 -top-4 rotate-[18deg]">
        <Leaf className="h-20 w-20" fill="#7fa64d" />
        <Leaf className="absolute left-7 top-6 h-14 w-14 -rotate-[40deg]" fill="#9cc169" />
      </div>
      <div className="absolute -right-5 -top-5 -rotate-[18deg]">
        <Leaf className="h-24 w-24 -scale-x-100" fill="#74a046" />
        <Leaf className="absolute right-6 top-7 h-14 w-14 rotate-[35deg] -scale-x-100" fill="#9cc169" />
      </div>
      <div className="absolute -bottom-5 -left-4 -rotate-[20deg]">
        <Leaf className="h-20 w-20 -scale-y-100" fill="#7aa249" />
      </div>
      <div className="absolute -bottom-6 -right-5 rotate-[20deg]">
        <Leaf className="h-24 w-24 -scale-100" fill="#74a046" />
        <Leaf className="absolute bottom-7 right-7 h-14 w-14 rotate-[40deg] -scale-100" fill="#9cc169" />
      </div>
    </div>
  );
}

// the dashed "frame your item" cloud + crosshair in the viewfinder centre
function CloudFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 220 150" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M58 44C92 28 132 28 160 46c24 11 24 44 4 56-6 16-28 22-44 16-16 12-58 12-74-2-22-6-26-36-6-50-6-22 6-34 14-22Z"
          stroke="#ffffff"
          strokeWidth={3}
          strokeDasharray="11 9"
          strokeLinecap="round"
          opacity={0.9}
        />
        <path d="M110 64v22M99 75h22" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.95} />
      </svg>
    </div>
  );
}

function CornerBrackets() {
  const base = "absolute h-6 w-6 border-paper/90";
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className={`${base} left-3 top-3 rounded-tl-md border-l-[3px] border-t-[3px]`} />
      <span className={`${base} right-3 top-3 rounded-tr-md border-r-[3px] border-t-[3px]`} />
      <span className={`${base} bottom-3 left-3 rounded-bl-md border-b-[3px] border-l-[3px]`} />
      <span className={`${base} bottom-3 right-3 rounded-br-md border-b-[3px] border-r-[3px]`} />
    </div>
  );
}

export default function PackScreen() {
  const companion = useGameStore((s) => s.companion)!;
  const existing = useGameStore((s) => s.packedBag);
  const prepareBag = useGameStore((s) => s.prepareBag);
  const goTo = useGameStore((s) => s.goTo);

  const [photos, setPhotos] = useState<PackedItem[]>(
    () => existing?.items.filter((i) => i.kind === "photo") ?? [],
  );
  const [message, setMessage] = useState(existing?.message ?? "");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [tipsOpen, setTipsOpen] = useState(false);

  // ── inline camera ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camPhase, setCamPhase] = useState<"starting" | "live" | "error">("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [flashOn, setFlashOn] = useState(false);
  const [flashing, setFlashing] = useState(false);

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

  // 拍完即调用 /api/recognize 把“这是什么”填进 label/keyword；失败/超时都保留取色启发式
  // （label 一开始就是启发式词，识别成功只是悄悄替换它，所以格子永远有名字、不会卡在“识别中”）。
  const recognize = async (photo: string, id: string) => {
    const ctrl = new AbortController();
    const to = window.setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch("/api/recognize", {
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
    if (flashOn) {
      setFlashing(true);
      window.setTimeout(() => setFlashing(false), 200);
    }
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
    ? "线索都收好啦，放到门口等 Agent"
    : hasClue
      ? `已准备 ${photos.length}/${MAX} · Agent 会判断去留`
      : "至少拍一样，或留一句话";

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <Leaves />
      {flashing && <div className="pointer-events-none absolute inset-0 z-50 bg-white/80" />}

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-start justify-between px-4 pt-4">
        <BackButton onClick={() => goTo("home")} />

        <div
          className="relative mt-0.5 flex items-center gap-2 rounded-[18px] px-5 py-2 shadow-[0_5px_0_rgba(90,57,29,.4)]"
          style={{ background: `linear-gradient(165deg, #cd9f63, ${WOOD})`, border: `3px solid ${WOOD_DK}` }}
        >
          <span className="font-hand text-[26px] font-bold leading-none text-[#46301c]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.28)" }}>
            今日包裹
          </span>
          <Banana className="-mr-1 h-6 w-6 rotate-[14deg]" />
        </div>

        <div
          className="relative -rotate-[5deg] rounded-[12px] bg-cream-soft px-2.5 py-1.5 text-center shadow-[0_3px_0_rgba(111,84,55,.18)]"
          style={{ border: `2px dashed ${"#c6ab7d"}` }}
        >
          <span className="absolute left-1/2 top-0.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink/25" />
          <Suitcase className="mx-auto h-5 w-5" />
          <div className="mt-0.5 text-[8px] leading-none text-ink-soft">今日</div>
          <div className="text-[14px] font-bold leading-none text-accent">线索</div>
        </div>
      </header>
      <p className="relative z-10 px-6 pt-1.5 text-center text-[12px] leading-snug text-ink-soft">
        给它一点今天的方向：真实物品、颜色和一句话就够了。
      </p>

      {/* ── scrollable content ─────────────────────────────────────────────── */}
      <div className="no-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-3">
        {/* viewfinder */}
        <div
          className="relative overflow-hidden rounded-[26px] border-[5px] border-cream-soft shadow-[0_6px_0_rgba(111,84,55,.18)]"
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
              <p className="text-[13px] leading-relaxed text-[#7a6244]">
                {camPhase === "starting"
                  ? "正在唤醒相机…"
                  : "这里拿不到相机。\n先给它留一句话也可以～"}
              </p>
            </div>
          )}
          {/* flash */}
          <button
            onClick={() => setFlashOn((v) => !v)}
            className="absolute left-3 top-3 flex flex-col items-center gap-1"
            aria-label="闪光灯"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-full backdrop-blur-sm"
              style={{ background: "rgba(20,16,12,.34)", color: flashOn ? "#ffd866" : "#fff", outline: flashOn ? "2px solid #ffd866" : "none" }}
            >
              <Flash className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-paper" style={{ textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>闪光灯</span>
          </button>
          {/* switch */}
          <button
            onClick={switchCamera}
            className="absolute right-3 top-3 flex flex-col items-center gap-1"
            aria-label="切换镜头"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full text-paper backdrop-blur-sm" style={{ background: "rgba(20,16,12,.34)" }}>
              <Switch className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-paper" style={{ textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>切换</span>
          </button>
          <CloudFrame />
          <CornerBrackets />
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full px-3.5 py-1 text-[11px] text-paper backdrop-blur-sm" style={{ background: `${GREEN_DK}e6` }}>
              {full ? "线索收满啦！" : "把今天想交给它的东西放进框里"}
            </span>
          </div>
        </div>

        {/* step dots */}
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => {
            const filled = i < photos.length;
            const current = i === photos.length && !full;
            return (
              <Fragment key={i}>
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold transition"
                  style={
                    filled
                      ? { background: GREEN, color: "#fff", boxShadow: `0 2px 0 ${GREEN_DEEP}` }
                      : current
                        ? { background: "#fff", color: GREEN_DK, boxShadow: `inset 0 0 0 2px ${GREEN}` }
                        : { background: "#fff", color: "rgba(122,106,96,.5)", boxShadow: "inset 0 0 0 2px rgba(58,46,42,.12)" }
                  }
                >
                  {filled ? (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4 10-11" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {i < 2 && <span className="h-0 w-7 border-t-2 border-dashed border-ink/15" />}
              </Fragment>
            );
          })}
          <span className="ml-2 text-[15px] font-bold text-ink">
            {photos.length}/{MAX}
          </span>
        </div>

        {/* three item slots */}
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => {
            const item = photos[i];
            const busy = item ? busyIds.includes(item.id) : false;
            const tilt = i === 0 ? "-1.6deg" : i === 2 ? "1.6deg" : "0deg";
            return (
              <div
                key={i}
                className="relative rounded-[16px] border-2 border-ink/10 bg-paper p-1.5 shadow-[0_3px_0_rgba(111,84,55,.1)]"
                style={{ rotate: tilt }}
              >
                <span className="absolute -top-1.5 left-1/2 h-2.5 w-9 -translate-x-1/2 -rotate-3 rounded-[2px] bg-[#ecdcb4]/90" />
                <span
                  className="absolute -left-2 -top-2 z-10 grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold text-paper"
                  style={{ background: GREEN, boxShadow: `0 0 0 2px #fffdf8, 0 2px 0 ${GREEN_DEEP}` }}
                >
                  {i + 1}
                </span>
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
                    <p className="mt-1 flex items-center justify-center gap-1 text-[13px] font-medium text-ink">
                      {busy && <span className="h-1.5 w-1.5 shrink-0 animate-breathe rounded-full" style={{ background: GREEN }} />}
                      <span className="truncate">{item.label}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid aspect-square w-full place-items-center rounded-[11px] border-2 border-dashed border-ink/15 bg-cream-soft/60">
                      <Camera className="h-6 w-6 text-ink-soft/35" />
                    </div>
                    <p className="mt-1 text-center text-[12px] text-ink-soft/55">待拍摄</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* message note + capybara */}
        <div className="flex items-end gap-2">
          <div
            className="relative flex-1 rounded-[16px] border-2 border-ink/8 bg-[#fffdf5] px-3.5 pb-2.5 pt-5 shadow-[0_3px_0_rgba(111,84,55,.1)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent 0 26px, rgba(58,46,42,.07) 26px 27px)",
              backgroundPosition: "0 14px",
            }}
          >
            <span
              className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-medium text-paper -rotate-2 shadow-[0_2px_0_rgba(84,117,47,.4)]"
              style={{ background: GREEN }}
            >
              <Heart className="h-3 w-3 text-[#ffe1e0]" /> 给 Agent 和{companion.name}的话
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 50))}
              placeholder="今天有点累，能慢一点就慢一点…"
              rows={2}
              className="w-full resize-none bg-transparent font-hand text-[15px] leading-[27px] text-ink outline-none placeholder:text-ink-soft/45"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MESSAGE_IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setMessage(idea)}
                  className="rounded-full border border-ink/10 bg-cream-soft px-2 py-[3px] text-[10px] text-ink-soft active:translate-y-0.5"
                >
                  {idea.length > 9 ? `${idea.slice(0, 9)}…` : idea}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-[104px] shrink-0">
            <span className="absolute -top-1 right-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-paper text-accent shadow-[0_2px_0_rgba(111,84,55,.15)]">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <div className="h-[128px] w-full">
              <SceneCanvas controls="spin" cameraPosition={[0, 1.05, 2.85]} target={[0, 0.66, 0]}>
                <CharacterModel
                  type={companion.type}
                  color={companion.primaryColor}
                  accessory={companion.accessory}
                  seed={companion.id}
                />
              </SceneCanvas>
            </div>
          </div>
        </div>
      </div>

      {/* ── bottom controls + CTA ──────────────────────────────────────────── */}
      <div className="game-bottom-panel relative z-20 shrink-0 px-5 pb-4 pt-3">
        {tipsOpen && (
          <div className="absolute bottom-[150px] right-4 w-56 rounded-[14px] border-2 border-ink/10 bg-paper p-3 text-[12px] text-ink-soft shadow-[0_6px_18px_rgba(58,46,42,.18)]">
            <p className="mb-1 font-medium text-ink">拍摄小贴士</p>
            <ul className="space-y-0.5">
              {TIPS.map((t) => (
                <li key={t} className="flex gap-1.5">
                  <span style={{ color: GREEN_DK }}>·</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-[88px] items-center justify-center rounded-full border-2 border-ink/10 bg-cream-soft text-[12px] font-medium text-ink-soft">
            已选 {photos.length}/{MAX}
          </div>

          <button
            onClick={capture}
            disabled={camPhase !== "live" || full}
            aria-label="拍照"
            className="grid h-[68px] w-[68px] place-items-center rounded-full p-1.5 shadow-[0_5px_0_rgba(60,80,40,.5)] transition active:translate-y-1 active:shadow-[0_1px_0_rgba(60,80,40,.5)] disabled:opacity-45 disabled:active:translate-y-0"
            style={{ background: GREEN_DEEP }}
          >
            <span
              className="grid h-full w-full place-items-center rounded-full ring-2 ring-paper/85"
              style={{ background: `linear-gradient(160deg, #a0c46c, ${GREEN_DK})` }}
            >
              <Camera className="h-8 w-8 text-paper" />
            </span>
          </button>

          <button
            onClick={() => setTipsOpen((v) => !v)}
            className="flex h-9 w-[88px] items-center justify-center gap-1 rounded-full border-2 border-ink/10 bg-cream-soft text-[12px] font-medium text-ink-soft active:translate-y-0.5"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold" style={{ background: GREEN, color: "#fff" }}>?</span>
            小贴士
          </button>
        </div>

        <button
          onClick={() => prepareBag(photos, message)}
          disabled={!hasClue}
          className="relative w-full overflow-hidden rounded-[20px] border-2 border-[#b8504a] py-3 text-center transition active:translate-y-0.5 disabled:opacity-45"
          style={{ background: "linear-gradient(180deg, #ef7e74, #d9554f)", boxShadow: "0 5px 0 rgba(150,70,58,0.5)" }}
        >
          <span className="pointer-events-none absolute inset-1.5 rounded-[14px] border-2 border-dashed border-paper/40" />
          <span className="relative font-hand text-xl font-bold text-paper">先给它一个线索 ✨</span>
          <span className="relative mt-0.5 block text-[11px] text-paper/85">{subtext}</span>
        </button>
      </div>
    </div>
  );
}
