// Dev-only: drive the /dev/home walker through collision + interaction cases
// and assert the trajectories numerically (plus screenshots for eyeballing).
// Usage: node scripts/dev-verify-home.mjs   (needs `next dev` on :3000)
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 900, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto("http://localhost:3000/dev/home", { waitUntil: "networkidle" });
await page.waitForTimeout(2500); // scene + GLB warm-up

const pos = () => page.evaluate(() => window.__petPos);
const navTo = (x, y, z) => page.evaluate(([a, b, c]) => window.__navTo([a, b, c]), [x, y, z]);
const cmd = (target, floor, opts) =>
  page.evaluate(
    ([t, f, o]) => window.__cmd(t, f, undefined, o),
    [target, floor, opts],
  );

// sample the trajectory until the pet settles (or timeout)
async function settle(maxMs = 30000, stillFor = 1200) {
  const t0 = Date.now();
  let last = await pos();
  let stillSince = Date.now();
  const trail = [last];
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(200);
    const p = await pos();
    trail.push(p);
    const d = Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]);
    if (d > 0.02) stillSince = Date.now();
    last = p;
    if (Date.now() - stillSince > stillFor) break;
  }
  return trail;
}

// poll until predicate(pos) is true (returns the matching pos) or timeout (null)
async function waitFor(pred, maxMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const p = await pos();
    if (pred(p)) return p;
    await page.waitForTimeout(150);
  }
  return null;
}

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
};

// --- 1. stair climb hugs the ramp (no sinking into the treads) ---------------
// ramp line: bottom [-0.7,0,-1.15] → top [-0.7,2.2,-3.6]; while ON the ramp the
// pet's y must match the ramp height at its z within a small tolerance.
await navTo(-3.3, 2.22, -2.6); // tap the loft window spot → full climb
{
  const trail = await settle(40000);
  let worst = 0;
  for (const [x, y, z] of trail) {
    if (y > 0.3 && y < 1.9 && z > -3.6 && z < -1.15) {
      const t = (z - -1.15) / (-3.6 - -1.15);
      const rampY = t * 2.2;
      worst = Math.max(worst, Math.abs(y - rampY));
    }
  }
  const [fx, fy, fz] = trail.at(-1);
  check("climb: feet stay on the ramp", worst < 0.18, `max |y−ramp| = ${worst.toFixed(3)}`);
  check(
    "climb: arrived at loft window",
    Math.hypot(fx - -3.3, fz - -2.6) < 0.3 && Math.abs(fy - 2.2) < 0.05,
    `final = [${fx.toFixed(2)}, ${fy.toFixed(2)}, ${fz.toFixed(2)}]`,
  );
  await page.screenshot({ path: "/tmp/home-1-loft.png" });
}

// --- 2. loft obstacle: tap ON the bed → pet stops at its edge, never inside --
await navTo(-3.6, 2.22, -3.7); // bed center
{
  const trail = await settle(20000);
  const inBed = (x, z) => x > -4.45 + 0.1 && x < -2.75 - 0.1 && z > -4.35 + 0.1 && z < -3.05 - 0.1;
  const violated = trail.filter(([x, y, z]) => y > 2.15 && inBed(x, z)).length;
  check("loft: never walks through the bed", violated === 0, `${violated} samples inside`);
}

// --- 3. bed interaction: hop ON the mattress and sleep ----------------------
await cmd([-3.0, 2.2, -2.6], 1, {
  activity: "sleep", dwell: 6, emote: "💤",
  perch: { pos: [-3.3, 2.8, -3.6], face: 0.45 },
});
{
  const onBed = await waitFor(
    ([x, y, z]) => Math.abs(y - 2.8) < 0.1 && Math.hypot(x - -3.3, z - -3.6) < 0.2,
  );
  check(
    "bed perch: pet is on the mattress",
    !!onBed,
    onBed ? `pos = [${onBed.map((v) => v.toFixed(2)).join(", ")}]` : "never reached",
  );
  await page.waitForTimeout(1500); // pose eases in
  await page.screenshot({ path: "/tmp/home-2-bed-sleep.png" });
  // wait out the dwell → it must hop back DOWN on its own. Generous window:
  // headless GL renders ~10-20fps and the walker's clamped dt time-dilates the
  // hold (by design — on-device 30fps is wall-clock accurate).
  const down = await waitFor(([, y]) => y < 2.27, 40000);
  check("bed perch: dismounts after dwell", !!down, down ? `y = ${down[1].toFixed(2)}` : "stayed up");
}

// --- 4. descend + ground furniture: walk to the doorstep, table blocks line --
await navTo(0.95, 0.05, -0.3);
{
  const trail = await settle(40000);
  const inTable = (x, z) => Math.hypot(x - -1.7, z - -0.6) < 0.42;
  const violated = trail.filter(([x, y, z]) => y < 0.2 && inTable(x, z)).length;
  const [fx, fy, fz] = trail.at(-1);
  check("ground: never inside the dining table", violated === 0, `${violated} samples inside`);
  check(
    "descend: arrived at doorstep",
    Math.hypot(fx - 0.95, fz - -0.3) < 0.3 && fy < 0.1,
    `final = [${fx.toFixed(2)}, ${fy.toFixed(2)}, ${fz.toFixed(2)}]`,
  );
}

// --- 5. bench interaction: hop onto the garden bench and sit ----------------
await cmd([3.99, 0, 2.88], 0, {
  activity: "look", dwell: 8, emote: "🍃",
  perch: { pos: [3.93, 0.38, 1.83], face: -0.55 },
});
{
  const onBench = await waitFor(
    ([x, y, z]) => Math.abs(y - 0.38) < 0.1 && Math.hypot(x - 3.93, z - 1.83) < 0.2,
    35000,
  );
  check(
    "bench perch: pet sits on the seat",
    !!onBench,
    onBench ? `pos = [${onBench.map((v) => v.toFixed(2)).join(", ")}]` : "never reached",
  );
  await page.waitForTimeout(1500); // pose eases in
  await page.screenshot({ path: "/tmp/home-3-bench-sit.png" });
}

// --- 6. preempt: tap elsewhere mid-sit → cancels cleanly, walks off ---------
await navTo(-0.7, 0.05, 1.65);
{
  const trail = await settle(25000);
  const [fx, fy, fz] = trail.at(-1);
  check(
    "preempt: leaves the bench for the farm spot",
    Math.hypot(fx - -0.7, fz - 1.65) < 0.4 && fy < 0.1,
    `final = [${fx.toFixed(2)}, ${fy.toFixed(2)}, ${fz.toFixed(2)}]`,
  );
  await page.screenshot({ path: "/tmp/home-4-farm.png" });
}

const fails = results.filter((r) => !r.ok).length;
console.log(fails ? `\n${fails} FAILED` : "\nall good");
await browser.close();
process.exit(fails ? 1 : 0);
