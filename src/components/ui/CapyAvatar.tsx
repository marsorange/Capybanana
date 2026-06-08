"use client";

// The companion's portrait avatar. Framed usages still crop the original
// full-body reference art; the home HUD uses a transparent headshot cutout so it
// reads like a sticker instead of a boxed avatar.

import capyArt from "@/asset/Character/Capybanana.png";
import capyHead from "@/asset/Character/CapybananaHead.png";

export default function CapyAvatar({
  className = "",
  rounded = "full",
  variant = "framed",
}: {
  className?: string;
  /** "full" for a circle, "tile" for a rounded square. */
  rounded?: "full" | "tile";
  /** "sticker" removes the hard avatar crop for HUD headshot usage. */
  variant?: "framed" | "sticker";
}) {
  if (variant === "sticker") {
    return (
      <span className={`relative block overflow-visible ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capyHead.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute left-1/2 top-1/2 h-[112%] w-[112%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_7px_10px_rgba(107,76,39,0.18)]"
        />
      </span>
    );
  }

  return (
    <span
      className={`relative block overflow-hidden bg-cream-soft ${
        rounded === "full" ? "rounded-full" : "rounded-[14px]"
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={capyArt.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute left-1/2 top-1/2 h-[188%] w-[188%] max-w-none -translate-x-1/2 -translate-y-[43%] select-none object-contain"
      />
    </span>
  );
}
