import Image from "next/image";

import { cn } from "./cn";

type ScreenArtworkProps = {
  src: string;
  alt?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  overlay?: "login" | "soft" | "panel" | "travel";
};

const OVERLAY_CLASS: Record<NonNullable<ScreenArtworkProps["overlay"]>, string> = {
  login:
    "bg-[linear-gradient(180deg,rgba(255,247,236,0.1)_0%,rgba(255,247,236,0)_42%,rgba(255,246,231,0.38)_100%)]",
  soft:
    "bg-[linear-gradient(180deg,rgba(255,247,236,0.18)_0%,rgba(255,247,236,0.52)_62%,rgba(251,243,231,0.92)_100%)]",
  panel:
    "bg-[radial-gradient(80%_54%_at_50%_42%,rgba(255,253,248,0.1)_0%,rgba(255,253,248,0.34)_58%,rgba(126,83,38,0.14)_100%)]",
  travel:
    "bg-[linear-gradient(180deg,rgba(255,247,236,0.04)_0%,rgba(255,247,236,0.08)_46%,rgba(251,243,231,0.68)_100%)]",
};

export default function ScreenArtwork({
  src,
  alt = "",
  priority = false,
  className,
  imageClassName,
  overlay = "soft",
}: ScreenArtworkProps) {
  return (
    <div aria-hidden={alt === ""} className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 640px) 100vw, 460px"
        className={cn("select-none object-cover", imageClassName)}
      />
      <div className={cn("absolute inset-0", OVERLAY_CLASS[overlay])} />
      <div className="absolute inset-0 bg-[radial-gradient(110%_72%_at_50%_45%,transparent_42%,rgba(126,83,38,0.08)_100%)]" />
    </div>
  );
}
