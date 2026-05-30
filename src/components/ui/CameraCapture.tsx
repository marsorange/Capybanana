"use client";

import { useEffect, useRef, useState } from "react";

import { tagsFromHint } from "@/game/itemTags";
import type { ItemTag, PackedItem } from "@/game/types";
import { uid } from "@/game/util";
import Button from "./Button";
import { extractElement } from "./photoExtract";

type Phase = "live" | "review" | "error";

interface Captured {
  photo: string;
  hint: string; // 展示用：识别出的物体名，识别失败时退回取色描述
  keyword: string; // planTrip 偏好词
  color: string;
  tags: ItemTag[]; // 故事种子标签，按取色“氛围”得出，识别不改它
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
  const reqId = useRef(0); // 让过期的识别结果不覆盖最新一张
  const [phase, setPhase] = useState<Phase>("live");
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [recognizing, setRecognizing] = useState(false);

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

    const id = ++reqId.current;
    setCaptured({ photo, ...ex, tags: tagsFromHint(ex.hint) });
    setPhase("review");
    recognize(photo, id);
  };

  // 拍完即调用 MiniMax 视觉理解，把“这是什么”填进 hint / keyword。
  // 失败或没配 key 时保留取色启发式，不打断流程。
  const recognize = async (photo: string, id: number) => {
    setRecognizing(true);
    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo }),
      });
      const out = (await res.json()) as { ok: boolean; name?: string };
      if (id !== reqId.current) return; // 已被重拍/新拍替换
      if (out.ok && out.name)
        setCaptured((c) =>
          c ? { ...c, hint: out.name!, keyword: out.name! } : c,
        );
    } catch {
      /* 保留取色启发式 */
    } finally {
      if (id === reqId.current) setRecognizing(false);
    }
  };

  const retake = () => {
    reqId.current++; // 作废仍在飞行中的识别请求
    setRecognizing(false);
    setPhase("live");
  };

  const confirm = () => {
    if (!captured) return;
    onAdd({
      id: uid("pi"),
      kind: "photo",
      photo: captured.photo,
      label: captured.hint || "你拍的东西",
      hint: captured.hint,
      keyword: captured.keyword,
      color: captured.color,
      tags: captured.tags,
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
                可以先写一句话带上它。
              </p>
            </div>
          )}
          {phase === "review" && captured && (
            <div className="absolute inset-x-0 bottom-0 bg-ink/55 px-3 py-2 text-center text-sm text-paper">
              {recognizing ? (
                <span className="opacity-90">识别中…</span>
              ) : (
                <>
                  它看出来：<b>{captured.hint}</b>
                </>
              )}
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
            <Button variant="soft" onClick={retake}>
              重拍
            </Button>
            <Button onClick={confirm} disabled={recognizing}>
              {recognizing ? "识别中…" : "带上它 →"}
            </Button>
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
