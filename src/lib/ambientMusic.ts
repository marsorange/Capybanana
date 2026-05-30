// Procedural, gentle "healing" ambient music — fully generated with the Web
// Audio API so it ships with no audio assets, matching the project's
// all-procedural ethos. A slow warm pad drifts under sparse pentatonic chimes;
// everything is soft, low-volume and randomized so it never loops audibly.
//
// Module singleton: the running graph survives screen changes. The browser
// blocks audio until a user gesture, so the engine is only started from a tap
// (the MusicToggle button, or a one-time pointer listener that restores a saved
// "on" preference).

const STORAGE_KEY = "capybanana-music";
const TARGET_VOLUME = 0.16;

// C major pentatonic, the classic calm/healing scale (no harsh intervals).
const PENTA = [0, 2, 4, 7, 9];
const ROOT = 60; // MIDI C4

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lowpass: BiquadFilterNode | null = null;
let delay: DelayNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextChime = 0;
let nextPad = 0;

const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

function ensureGraph(): boolean {
  if (ctx) return true;
  if (typeof window === "undefined") return false;
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) return false;

  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;

  // Soft low-pass keeps the timbre warm and removes any brittle highs.
  lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1500;
  lowpass.Q.value = 0.2;

  // A long, quiet echo gives the chimes a sense of open space.
  delay = ctx.createDelay(2);
  delay.delayTime.value = 0.45;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.34;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(lowpass);

  lowpass.connect(master);
  master.connect(ctx.destination);
  return true;
}

// One note: an oscillator with a slow, gentle envelope. Pads use a long fade-in;
// chimes pluck softly and ring out through the echo.
function voice(
  freq: number,
  when: number,
  dur: number,
  gain: number,
  type: OscillatorType,
  useDelay: boolean,
): void {
  if (!ctx || !lowpass || !delay) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  // A touch of detune keeps things from sounding sterile.
  osc.detune.value = (Math.random() - 0.5) * 8;

  const env = ctx.createGain();
  const attack = type === "triangle" ? 1.6 : 0.04;
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(gain, when + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  osc.connect(env);
  env.connect(lowpass);
  if (useDelay) env.connect(delay);
  osc.start(when);
  osc.stop(when + dur + 0.1);
}

// Look-ahead scheduler: queue any pad/chime events that fall within the next
// ~1.5s so timing stays rock-steady regardless of the JS timer jitter.
function schedule(): void {
  if (!ctx) return;
  const ahead = ctx.currentTime + 1.5;

  while (nextChime < ahead) {
    const deg = PENTA[Math.floor(Math.random() * PENTA.length)];
    const octave = 12 * (Math.random() < 0.5 ? 1 : 2); // C5..A5 sparkle range
    const note = ROOT + deg + octave;
    voice(midiToFreq(note), nextChime, 3.4, 0.085, "sine", true);
    // Occasionally answer an octave below for a little warmth.
    if (Math.random() < 0.3) {
      voice(midiToFreq(note - 12), nextChime + 0.06, 3.8, 0.04, "sine", true);
    }
    nextChime += 2.2 + Math.random() * 3.4;
  }

  while (nextPad < ahead) {
    const deg = PENTA[Math.floor(Math.random() * PENTA.length)];
    const base = ROOT - 12 + deg; // a low, slow drone chord
    voice(midiToFreq(base), nextPad, 11, 0.05, "triangle", false);
    voice(midiToFreq(base + 7), nextPad, 11, 0.034, "triangle", false);
    voice(midiToFreq(base + (Math.random() < 0.5 ? 4 : 9)), nextPad, 11, 0.028, "triangle", false);
    nextPad += 8 + Math.random() * 4;
  }
}

function start(): void {
  if (!ensureGraph() || !ctx || !master) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  nextChime = now + 0.4;
  nextPad = now + 0.2;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
  master.gain.linearRampToValueAtTime(TARGET_VOLUME, now + 2.5);
  if (timer == null) timer = setInterval(schedule, 500);
  schedule();
}

function stop(): void {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 1.2);
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

/** Turn the ambient music on/off and remember the choice. */
export function setMusicEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // ignore storage failures (private mode, etc.)
  }
  if (on) start();
  else stop();
}
