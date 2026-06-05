// The only "gamification" number we keep: a gentle level derived purely from how
// long the companion has lived with you (陪伴时长). One check-in a day is the
// whole loop ("每天一分钟，陪它过日子"), so the level is just time, nothing to grind.
//
// Curve: level L is reached at cumulative day = L*(L+1)/2, so early levels arrive
// quickly (day 1 → Lv.1, day 3 → Lv.2, day 6 → Lv.3, day 10 → Lv.4 …) then slow
// down — a soft, non-punishing climb. `progress` fills within the current level.

const DAY = 86_400_000;

export interface CompanionStats {
  /** Days together, 1-based (the adoption day is day 1). */
  days: number;
  /** Gentle level derived from `days`. */
  level: number;
  /** 0..1 progress through the current level. */
  progress: number;
  /** Days remaining until the next level. */
  daysToNext: number;
}

export function companionStats(createdAtISO: string, now: number = Date.now()): CompanionStats {
  const start = new Date(createdAtISO).getTime();
  const days = Number.isFinite(start) ? Math.max(1, Math.floor((now - start) / DAY) + 1) : 1;

  const level = Math.max(1, Math.floor((Math.sqrt(8 * days + 1) - 1) / 2));
  const levelStart = (level * (level - 1)) / 2; // cumulative days at this level's start
  const levelEnd = (level * (level + 1)) / 2; // cumulative days to reach the next
  const span = Math.max(1, levelEnd - levelStart);
  const into = days - levelStart;

  return {
    days,
    level,
    progress: Math.min(1, Math.max(0, into / span)),
    daysToNext: Math.max(0, levelEnd - days),
  };
}
