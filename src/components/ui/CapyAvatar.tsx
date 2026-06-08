"use client";

// The companion's portrait avatar. Framed usages crop the full-body reference
// art; the home HUD ("sticker") frames the headshot cutout inside a circle that
// sits neatly within the wood pill (no longer poking out as a loose sticker).

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
  /** "sticker" = circular headshot for the home HUD pill. */
  variant?: "framed" | "sticker";
}) {
  if (variant === "sticker") {
    return (
      <span
        className={`relative block overflow-hidden rounded-full bg-[#f6edd6] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.55),inset_0_-2px_5px_rgba(125,86,40,0.12)] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capyHead.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute left-1/2 top-1/2 h-[114%] w-[114%] max-w-none -translate-x-1/2 -translate-y-[48%] select-none object-contain"
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
