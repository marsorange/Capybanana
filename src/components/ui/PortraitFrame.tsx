"use client";

import type { ReactNode } from "react";

export default function PortraitFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-stretch justify-center sm:items-center sm:py-6">
      <div className="relative flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-cream sm:h-[860px] sm:max-h-[92dvh] sm:rounded-[34px] sm:border-2 sm:border-ink/10 sm:shadow-[0_24px_60px_-20px_rgba(58,46,42,0.45)]">
        {children}
        {/* Global hand-drawn "wobble" filter used by the .sketch utility. */}
        <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
          <filter id="rough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014"
              numOctaves="2"
              seed="7"
              result="n"
            />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
          </filter>
        </svg>
      </div>
    </div>
  );
}
