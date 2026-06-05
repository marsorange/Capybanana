"use client";

// TEMPORARY dev-only preview for the packing screen (the real one is behind
// login). Seeds a fake companion so PackScreen renders standalone. Safe to delete.
import { useEffect, useState } from "react";

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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useGameStore.setState({ companion: DEV_COMPANION, packedBag: null, hasHydrated: true });
    setReady(true);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {ready ? <PackScreen /> : null}
    </div>
  );
}
