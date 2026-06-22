"use client";

// 中文 / EN language switch. A two-segment wood pill matching the kit; flips the
// persisted `locale` in the game store, which re-renders every `useT` consumer.
import { useGameStore } from "@/state/gameStore";
import { useT } from "@/i18n";
import { cn } from "./cn";

export default function LanguageToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const locale = useGameStore((s) => s.locale);
  const setLocale = useGameStore((s) => s.setLocale);
  const t = useT("common");
  const opts: { id: "zh" | "en"; label: string }[] = [
    { id: "zh", label: t.langZh },
    { id: "en", label: t.langEn },
  ];
  return (
    <div
      role="group"
      aria-label={t.language}
      className={cn(
        "ui-bottom-dock inline-flex gap-1 rounded-full p-1",
        className,
      )}
    >
      {opts.map((o) => {
        const on = o.id === locale;
        return (
          <button
            key={o.id}
            onClick={() => setLocale(o.id)}
            aria-pressed={on}
            className={cn(
              "rounded-full font-hand transition active:translate-y-0.5",
              compact ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[14px]",
              on
                ? "ui-wood-surface font-bold text-[#5f442d]"
                : "text-ink-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
