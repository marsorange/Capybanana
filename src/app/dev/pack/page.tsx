"use client";

// Dev-only preview for the packing screen. Seeds a fake companion so PackScreen
// renders standalone without Google login or a cloud backend.
import { useEffect } from "react";

import PackScreen from "@/components/screens/PackScreen";
import type { Companion } from "@/game/types";
import { useGameStore } from "@/state/gameStore";

const DEV_COMPANION: Companion = {
  id: "dev-capy",
  name: "麻薯",
  type: "capybara",
  primaryColor: "#b27a43",
  personality: "gentle",
  accessory: "scarf",
  createdAt: new Date().toISOString(),
};

export default function DevPack() {
  const companion = useGameStore((s) => s.companion);

  useEffect(() => {
    useGameStore.setState({ companion: DEV_COMPANION, packedBag: null, hasHydrated: true });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {companion ? <PackScreen /> : null}
    </div>
  );
}
