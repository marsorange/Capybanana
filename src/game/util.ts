// Small shared helpers (random + ids).

export const uid = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const randRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(randRange(min, max + 1));

export function weightedPick<T extends string>(weights: Map<T, number>): T {
  let total = 0;
  for (const w of weights.values()) total += Math.max(0, w);
  let roll = Math.random() * total;
  for (const [key, w] of weights) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  // Fallback: first key.
  return weights.keys().next().value as T;
}
