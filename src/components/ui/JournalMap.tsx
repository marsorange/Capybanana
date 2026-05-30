"use client";

const W = 300;
const H = 170;
const STEPS = 48;

// A gentle wandering path from the little house to the destination flag.
function pointAt(t: number): { x: number; y: number } {
  const x = 24 + t * (W - 48);
  const y = 96 - Math.sin(t * Math.PI * 2.1) * 30 - t * 18;
  return { x, y };
}

function buildPath(): string {
  let d = "";
  for (let i = 0; i <= STEPS; i++) {
    const { x, y } = pointAt(i / STEPS);
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

const PATH = buildPath();

export default function JournalMap({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  const here = pointAt(p);
  const start = pointAt(0);
  const end = pointAt(1);

  // Footprints up to the current position.
  const prints = [];
  for (let i = 1; i < STEPS; i++) {
    const t = i / STEPS;
    if (t > p) break;
    if (i % 3 !== 0) continue;
    const { x, y } = pointAt(t);
    prints.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={2.2}
        fill="#3a2e2a"
        opacity={0.28}
      />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="旅行手账地图"
    >
      {/* dashed full route */}
      <path
        d={PATH}
        fill="none"
        stroke="#bda98c"
        strokeWidth={2.5}
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      {prints}

      {/* start: little house */}
      <g transform={`translate(${start.x - 11} ${start.y - 6})`}>
        <rect x={2} y={6} width={18} height={13} rx={2} fill="#e7d3b3" stroke="#3a2e2a" strokeWidth={1.6} />
        <path d="M0 7 L11 -1 L22 7 Z" fill="#d95f59" stroke="#3a2e2a" strokeWidth={1.6} strokeLinejoin="round" />
        <rect x={8} y={12} width={6} height={7} rx={1} fill="#3a2e2a" opacity={0.65} />
      </g>

      {/* destination: flag with a soft question — kept mysterious */}
      <g transform={`translate(${end.x - 2} ${end.y - 22})`}>
        <line x1={2} y1={0} x2={2} y2={24} stroke="#3a2e2a" strokeWidth={2} strokeLinecap="round" />
        <path d="M2 1 L18 5 L2 11 Z" fill="#8aa978" stroke="#3a2e2a" strokeWidth={1.4} strokeLinejoin="round" />
        <text x={9} y={9} fontSize={7} fill="#fffdf8" textAnchor="middle">?</text>
      </g>

      {/* the companion's position */}
      <g transform={`translate(${here.x} ${here.y})`} className="animate-float-soft">
        <circle cx={0} cy={0} r={7.5} fill="#fffdf8" stroke="#3a2e2a" strokeWidth={1.8} />
        <circle cx={0} cy={-1} r={3.4} fill="#d95f59" />
      </g>
    </svg>
  );
}
