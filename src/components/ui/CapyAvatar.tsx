"use client";

// The companion's portrait avatar — reuses the real reference art
// (src/asset/Character/Capybanana.png). The source art is a full-body capy on a
// cream backdrop, so we zoom in and lift it to frame the face inside the round
// (or rounded-square) tile, the way the reference UI shows the head crop.

import capyArt from "@/asset/Character/Capybanana.png";

export default function CapyAvatar({
  className = "",
  rounded = "full",
}: {
  className?: string;
  /** "full" for a circle, "tile" for a rounded square. */
  rounded?: "full" | "tile";
}) {
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
