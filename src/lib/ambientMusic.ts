// Background music controller. Plays the looped track shipped at
// `public/capy.mp3` (served from `/capy.mp3`) with gentle fade in/out so it
// never snaps on or off.
//
// Module singleton: one <audio> element survives screen changes. Browsers block
// audio until a user gesture, so playback is only kicked off from a tap (the
// MusicToggle button, or a one-time pointer listener that restores a saved "on"
// preference). The public API (getMusicPref / setMusicEnabled) is unchanged so
// callers don't care that the source is now a real file rather than procedural.

const STORAGE_KEY = "capybanana-music";
const SRC = "/capy.mp3";
const TARGET_VOLUME = 0.5;
const FADE_MS = 1200;

let audio: HTMLAudioElement | null = null;
let fadeRAF: number | null = null;

function ensureAudio(): HTMLAudioElement | null {
  if (audio) return audio;
  if (typeof window === "undefined") return null;
  audio = new Audio(SRC);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  return audio;
}

// Linear volume ramp toward `target`, cancelling any ramp already in flight.
function fade(target: number, onDone?: () => void): void {
  if (!audio) return;
  if (fadeRAF != null) cancelAnimationFrame(fadeRAF);
  const from = audio.volume;
  const startedAt = performance.now();
  const step = (now: number) => {
    if (!audio) return;
    const k = Math.min(1, (now - startedAt) / FADE_MS);
    audio.volume = from + (target - from) * k;
    if (k < 1) {
      fadeRAF = requestAnimationFrame(step);
    } else {
      fadeRAF = null;
      onDone?.();
    }
  };
  fadeRAF = requestAnimationFrame(step);
}

function start(): void {
  const a = ensureAudio();
  if (!a) return;
  const p = a.play();
  // play() rejects if there was no user gesture yet — swallow it; the toggle /
  // pointer listener will try again from within a real tap.
  if (p && typeof p.then === "function") {
    p.then(() => fade(TARGET_VOLUME)).catch(() => {});
  } else {
    fade(TARGET_VOLUME);
  }
}

function stop(): void {
  if (!audio) return;
  fade(0, () => audio?.pause());
}

/** Read the persisted preference (defaults to off — needs a gesture anyway). */
export function getMusicPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Turn the background music on/off and remember the choice. */
export function setMusicEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // ignore storage failures (private mode, etc.)
  }
  if (on) start();
  else stop();
}
