"use client";

import { motion } from "framer-motion";

// The brand mark in /public. The source PNG has a cream (non-transparent)
// background, so it's framed in a rounded "sticker" tile rather than shown as a
// bare cutout. Swap this one constant to change the logo everywhere.
const LOGO_SRC = "/logo.png";

interface CapyLogoProps {
  className?: string; // sizes the badge, e.g. "h-44 w-44"
  /** Gentle breathing float (on by default). Set false for a static mark. */
  float?: boolean;
}

/** Capybanana brand mark — the logo framed in a floating rounded sticker tile. */
export default function CapyLogo({ className, float = true }: CapyLogoProps) {
  return (
    <motion.div
      className={`overflow-hidden rounded-[28px] border-2 border-ink/10 bg-paper shadow-[0_16px_34px_-8px_rgba(58,46,42,0.28)] ${
        className ?? ""
      }`}
      animate={float ? { y: [0, -8, 0] } : undefined}
      transition={
        float ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Capybanana"
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </motion.div>
  );
}
