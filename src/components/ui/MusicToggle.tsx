"use client";

import { useEffect, useState } from "react";

import { getMusicPref, setMusicEnabled } from "@/lib/ambientMusic";

// Small round toggle for the background music. Browsers won't let audio start
// without a user gesture, so when a saved "on" preference exists we wait for the
// first tap anywhere to quietly resume it.
export default function MusicToggle() {
  const [on, setOn] = useState(() => getMusicPref());

  useEffect(() => {
    // Restore a saved "on" preference, but audio can't autostart — wait for the
    // first tap anywhere to quietly resume it.
    if (!getMusicPref()) return;
    const kick = () => setMusicEnabled(true);
    window.addEventListener("pointerdown", kick, { once: true });
    return () => window.removeEventListener("pointerdown", kick);
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setMusicEnabled(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={on ? "关闭背景音乐" : "开启背景音乐"}
      aria-pressed={on}
      className="pointer-events-auto rounded-full border-2 border-ink/12 bg-cream-soft/90 px-3 py-1 text-sm text-ink-soft shadow-[0_2px_0_rgba(58,46,42,0.08)]"
    >
      {on ? "🎵" : "🔇"}
    </button>
  );
}
