import type { StaticImageData } from "next/image";

import bed from "@/asset/icon/bed.png";
import book from "@/asset/icon/book.png";
import feedbowl from "@/asset/icon/feedbowl.png";
import garden from "@/asset/icon/garden.png";
import gift from "@/asset/icon/gift.png";
import house from "@/asset/icon/house.png";
import map from "@/asset/icon/map.png";
import pkg from "@/asset/icon/package.png";
import photobook from "@/asset/icon/photobook.png";
import plant from "@/asset/icon/plant.png";
import postmail from "@/asset/icon/postmail.png";
import setting from "@/asset/icon/setting.png";

// Hand-rendered low-poly icon set (src/asset/icon, transparent PNGs).
const ICONS = {
  bed,
  book,
  feedbowl,
  garden,
  gift,
  house,
  map,
  package: pkg,
  photobook,
  plant,
  postmail,
  setting,
} satisfies Record<string, StaticImageData>;

export type IconName = keyof typeof ICONS;

/** A crisp PNG icon from the shared set. Size it via `className` (h-/w-). */
export default function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICONS[name].src}
      alt=""
      aria-hidden
      draggable={false}
      className={`select-none object-contain ${className ?? ""}`}
    />
  );
}
