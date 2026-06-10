"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export default function SpeechBubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tex-grain sketch relative max-w-[220px] rounded-2xl border-2 border-[#e4c89c] bg-paper px-4 py-2 text-center font-hand text-[15px] leading-snug text-[#4f3828] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.82),0_4px_0_rgba(143,101,54,0.14),0_14px_26px_-18px_rgba(58,46,42,0.42)]",
        className,
      )}
    >
      {children}
      {/* tail — solid paper square rotated over the bottom border so the seam
          disappears (bubble bg must stay opaque for this trick) */}
      <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#e4c89c] bg-paper" />
    </div>
  );
}
