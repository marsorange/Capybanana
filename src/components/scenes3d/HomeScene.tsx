"use client";

import type { DestinationTheme } from "@/game/types";
import House from "./House";
import Island from "./Island";
import Yard from "./Yard";

interface HomeSceneProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

export default function HomeScene({
  mode,
  postcardThemes,
  onOpenPack,
  onOpenAlbum,
}: HomeSceneProps) {
  return (
    <group>
      <Island />
      <House
        mode={mode}
        postcardThemes={postcardThemes}
        onOpenPack={onOpenPack}
        onOpenAlbum={onOpenAlbum}
      />
      <Yard />
    </group>
  );
}
