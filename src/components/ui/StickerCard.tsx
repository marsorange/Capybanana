"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export default function StickerCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sticker border-2 border-ink/12 bg-cream-soft p-4 shadow-[0_2px_0_rgba(58,46,42,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
