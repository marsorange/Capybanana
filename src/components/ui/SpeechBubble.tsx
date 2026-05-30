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
        "relative max-w-[220px] rounded-2xl border-2 border-ink bg-paper px-4 py-2 text-center text-sm leading-snug text-ink shadow-[0_3px_0_rgba(58,46,42,0.15)]",
        className,
      )}
    >
      {children}
      <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-paper" />
    </div>
  );
}
