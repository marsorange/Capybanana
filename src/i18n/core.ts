// i18n core. The product is bilingual (中文 / English); the active language lives
// in the game store (`locale`, persisted + browser-auto-detected on first load).
//
// Conventions:
// - Every translatable domain is a `dom(zh, en)` pair. The `en` arg is typed to
//   match the `zh` shape, so a missing/extra key is a compile error — the two
//   languages can never drift out of sync.
// - Components read strings via the `useT(domain)` hook (see ./index).
// - Plain functions / server code read via `strings(locale, domain)` or `pick`.
import { useGameStore, type Locale } from "@/state/gameStore";

export type { Locale };

/** A bilingual value. `en` must structurally match `zh`. */
export interface Bi<Z> {
  zh: Z;
  en: Z;
}

/** Pair a zh value with its en counterpart (en typed to match zh). */
export function dom<Z>(zh: Z, en: Z): Bi<Z> {
  return { zh, en };
}

/** Resolve a bilingual value for a locale. Tolerates a plain (non-bi) string. */
export function localize(value: Bi<string> | string, locale: Locale): string {
  if (typeof value === "string") return value;
  return value[locale] ?? value.zh;
}

/** Inline pick — `pick(locale, "你好", "Hi")`. */
export function pick<T>(locale: Locale, zh: T, en: T): T {
  return locale === "en" ? en : zh;
}

/** The active locale, reactive (for components). */
export function useLocale(): Locale {
  return useGameStore((s) => s.locale);
}

/** Resolve a co-located bilingual bundle for an explicit locale (non-hook). */
export function tr<Z>(locale: Locale, bundle: Bi<Z>): Z {
  return bundle[locale];
}

/**
 * Hook: resolve a co-located bilingual bundle for the active locale. The
 * ergonomic primitive — define `const S = dom({...zh}, {...en})` next to a
 * component and read `const t = useTr(S)`. No central registry, so screens stay
 * independent (and convertible in parallel).
 */
export function useTr<Z>(bundle: Bi<Z>): Z {
  return bundle[useLocale()];
}
