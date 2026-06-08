"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export default function PortraitFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full items-stretch justify-center overflow-hidden sm:items-center sm:py-6">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <Image
          src="/art/lowpoly-login-ref.png"
          alt=""
          fill
          sizes="100vw"
          className="scale-105 select-none object-cover opacity-65 blur-[1.5px]"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(76%_58%_at_50%_42%,rgba(255,247,236,0.1)_0%,rgba(245,228,198,0.2)_54%,rgba(128,91,54,0.18)_100%)]" />
      </div>
      <div className="relative z-10 flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-cream sm:h-[860px] sm:max-h-[92dvh] sm:rounded-[34px] sm:border-2 sm:border-ink/10 sm:shadow-[0_24px_60px_-20px_rgba(58,46,42,0.45)]">
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
