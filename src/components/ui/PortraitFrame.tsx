"use client";

import type { ReactNode } from "react";

export default function PortraitFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-stretch justify-center sm:items-center sm:py-6">
      <div className="relative flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-cream sm:h-[860px] sm:max-h-[92dvh] sm:rounded-[34px] sm:border-2 sm:border-ink/10 sm:shadow-[0_24px_60px_-20px_rgba(58,46,42,0.45)]">
        {children}
      </div>
    </div>
  );
}
