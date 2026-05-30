"use client";

import { useEffect, useRef, useState } from "react";

import { tagsFromHint } from "@/game/itemTags";
import type { PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import Button from "./Button";
import { extractElement } from "./photoExtract";

type Phase = "live" | "review" | "error";

interface Captured {
  photo: string;
  hint: string;
  keyword: string;
  color: string;
}

export default function CameraCapture({
  onAdd,
  onClose,
}: {
  onAdd: (item: PackedItem) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("live");
  const [captured, setCaptured] = useState<Captured | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setPhase("error");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
      } catch {
        setPhase("error");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const capture = () => {
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
    const data = sctx.getImageData(0, 0, 24, 24).data;
    const ex = extractElement(data);

    setCaptured({ photo, ...ex });
    setPhase("review");
  };

  const confirm = () => {
    if (!captured) return;
    onAdd({
      id: uid("pi"),
      kind: "photo",
      photo: captured.photo,
      label: "你拍的东西",
      hint: captured.hint,
      keyword: captured.keyword,
      color: captured.color,
      tags: tagsFromHint(captured.hint),
    });
    stopStream();
    onClose();
  };

  const close = () => {
    stopStream();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-ink/92 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5 text-paper">
        <span className="font-hand text-xl">拍一件带上</span>
        <button onClick={close} className="rounded-full bg-paper/15 px-3 py-1 text-sm">
          关闭
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-paper/40 bg-black">
          {phase !== "review" && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
          {phase === "review" && captured && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={captured.photo}
              alt="拍到的东西"
              className="h-full w-full object-cover"
            />
          )}
          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-paper">
              <span className="text-3xl">📷</span>
              <p className="text-sm opacity-90">
                这台设备或当前页面拿不到摄像头。
                <br />
                可以先放几样预设小物带上。
              </p>
            </div>
          )}
          {phase === "review" && captured && (
            <div className="absolute inset-x-0 bottom-0 bg-ink/55 px-3 py-2 text-center text-sm text-paper">
              它看出来：<b>{captured.hint}</b>
              {captured.keyword && <span className="opacity-80"> · 像「{captured.keyword}」</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-6 pb-8">
        {phase === "live" && (
          <button
            onClick={capture}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-paper bg-accent text-2xl shadow-lg active:scale-95"
            aria-label="拍照"
          >
            📸
          </button>
        )}
        {phase === "review" && (
          <>
            <Button variant="soft" onClick={() => setPhase("live")}>
              重拍
            </Button>
            <Button onClick={confirm}>带上它 →</Button>
          </>
        )}
        {phase === "error" && (
          <Button variant="soft" onClick={close}>
            知道了
          </Button>
        )}
      </div>
    </div>
  );
}
