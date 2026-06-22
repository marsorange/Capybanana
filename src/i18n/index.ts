// Bilingual i18n entry point.
//
// Two ways to use it:
//  1. Co-located (preferred for screens): define strings next to the component
//     with `dom(zh, en)` and read them via the `useTr` hook.
//       const S = dom({ hi: "你好" }, { hi: "Hi" });
//       const t = useTr(S);  // t.hi
//  2. Shared: cross-screen strings live in ./domains/common and are read via
//     `useT("common")` (or `strings(locale, "common")` off the hook path).
import { useLocale, type Bi, type Locale } from "./core";
import { common } from "./domains/common";

export * from "./core";
export { common };

const dict = {
  common,
} satisfies Record<string, Bi<unknown>>;

export type Domain = keyof typeof dict;

/** Resolve a registered shared domain for an explicit locale (server/non-hook). */
export function strings<K extends Domain>(
  locale: Locale,
  domain: K,
): (typeof dict)[K]["zh"] {
  return dict[domain][locale] as (typeof dict)[K]["zh"];
}

/** Hook: a registered shared domain's strings for the active locale. */
export function useT<K extends Domain>(domain: K): (typeof dict)[K]["zh"] {
  return strings(useLocale(), domain);
}
