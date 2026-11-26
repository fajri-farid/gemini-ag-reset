import { formatDaysMetric } from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, TrackerMetrics } from "@/lib/types";

interface KeyMetricsStripProps {
  metrics: TrackerMetrics;
  dict: Dictionary;
  locale: Locale;
}

export function KeyMetricsStrip({
  metrics,
  dict,
  locale,
}: KeyMetricsStripProps) {
  const cards = [
    {
      label: dict.metrics.totalResets,
      value: String(metrics.total),
    },
    {
      label: dict.metrics.avgInterval,
      value: formatDaysMetric(metrics.avgIntervalDays, locale),
    },
    {
      label: dict.metrics.longestWait,
      value: formatDaysMetric(metrics.longestWaitDays, locale),
    },
  ];

  return (
    <section aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="sr-only">
        {dict.metrics.totalResets}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="neo-card p-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-ink sm:text-4xl">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
