"use client";

import type { DestinationTheme } from "@/game/types";
import House from "./parts/House";
import Island from "./parts/Island";
import Yard from "./parts/Yard";

// The home scene's single model: the floating island + cutaway house + yard,
// assembled from the private geometry in ./parts. The rest of the app only ever
// renders <HomeModel> — the parts are implementation detail.
interface HomeModelProps {
  mode: "home" | "away";
  postcardThemes?: DestinationTheme[];
  onOpenPack?: () => void;
  onOpenAlbum?: () => void;
}

export default function HomeModel({
  mode,
  postcardThemes,
  onOpenPack,
  onOpenAlbum,
}: HomeModelProps) {
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
