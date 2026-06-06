// The only "gamification" number we SHOW the user: a gentle level derived from
// 陪伴时长 — the number of days the pet's Agent actually engaged (took its one
// daily action). The pet's five core stats stay hidden; this is the single
// visible meter. A silent Agent (no action that day) does not advance it, so the
// level reflects real companionship, nothing to grind.
//
// Curve: level L is reached at cumulative day = L*(L+1)/2, so early levels arrive
// quickly (1 day → Lv.1, 3 → Lv.2, 6 → Lv.3, 10 → Lv.4 …) then slow — a soft,
// non-punishing climb. `progress` fills within the current level.

export interface CompanionStats {
  /** 陪伴天数 — active days the Agent participated (companionDays). */
  days: number;
  /** Gentle level derived from `days`. */
  level: number;
  /** 0..1 progress through the current level. */
  progress: number;
  /** Days remaining until the next level. */
  daysToNext: number;
}

/** Derive the visible level from 陪伴天数 (the Agent-engagement day count). */
export function companionStats(companionDays: number): CompanionStats {
  const days = Math.max(0, Math.floor(companionDays || 0));

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
