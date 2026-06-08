import type { StaticImageData } from "next/image";

import feed from "@/asset/icon/feed.png";
import garden from "@/asset/icon/garden.png";
import gift from "@/asset/icon/gift.png";
import handbook from "@/asset/icon/handbook.png";
import home from "@/asset/icon/home.png";
import map from "@/asset/icon/map.png";
import pkg from "@/asset/icon/package.png";
import photo from "@/asset/icon/photo.png";
import plant from "@/asset/icon/plant.png";
import postmail from "@/asset/icon/postmail.png";
import setting from "@/asset/icon/setting.png";
import sleep from "@/asset/icon/sleep.png";

// Hand-rendered low-poly icon set (src/asset/icon, transparent PNGs).
const ICONS = {
  feed,
  garden,
  gift,
  handbook,
  home,
  map,
  package: pkg,
  photo,
  plant,
  postmail,
  setting,
  sleep,
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
