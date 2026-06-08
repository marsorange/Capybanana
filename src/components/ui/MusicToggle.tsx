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
      className="ui-wood-surface ui-wood-press pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"
    >
      <NoteIcon on={on} className="h-7 w-7 drop-shadow-[0_2px_2px_rgba(126,83,38,0.16)]" />
    </button>
  );
}

function NoteIcon({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={on ? "#8aa978" : "#a89b90"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" fill={on ? "#8aa978" : "none"} />
      <circle cx="16" cy="16" r="3" fill={on ? "#8aa978" : "none"} />
      {!on && <path d="M3 3l18 18" stroke="#c77" />}
    </svg>
  );
}
