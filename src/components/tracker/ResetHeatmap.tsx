"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpRight, Globe, X } from "lucide-react";
import {
  formatDateKeyLabel,
  formatDateKeyWithWeekday,
  formatMonthYear,
  formatTimestamp,
} from "@/lib/datetime";
import type { Dictionary } from "@/lib/i18n";
import type {
  DynamicHeatmapData,
  HeatmapCell,
  Locale,
  TimezoneMode,
} from "@/lib/types";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface ActiveTooltip {
  cell: HeatmapCell;
  anchorX: number;
  anchorTop: number;
  anchorBottom: number;
}

interface TooltipLayout {
  dateKey: string;
  left: number;
  top: number;
  placement: "top" | "bottom";
  arrowOffsetX: number;
}

interface ResetHeatmapProps {
  heatmap: DynamicHeatmapData;
  dict: Dictionary;
  locale: Locale;
  timezoneMode: TimezoneMode;
  timeZone: string;
  onTimezoneModeChange: (mode: TimezoneMode) => void;
}

function getCellStatusText(cell: HeatmapCell, dict: Dictionary): string {
  if (cell.isFuture) {
    return dict.heatmap.upcomingLabel;
  }
  if (!cell.inTrackingRange) {
    return dict.heatmap.legendBeforeTracking;
  }
  if (cell.hasReset) {
    return cell.resets.length === 1
      ? dict.heatmap.resetsOnDayLabel
      : `${cell.resets.length} ${dict.heatmap.resetsCountUnit}`;
  }
  return dict.heatmap.legendNoReset;
}

function getTooltipStatusDotClass(cell: HeatmapCell): string {
  if (cell.hasReset) {
    return "bg-gemini-sky";
  }
  if (cell.isFuture) {
    return "bg-white/40";
  }
  if (!cell.inTrackingRange) {
    return "border border-dashed border-white/60 bg-transparent";
  }
  return "bg-heatmap-empty";
}

export function ResetHeatmap({
  heatmap,
  dict,
  locale,
  timezoneMode,
  timeZone,
  onTimezoneModeChange,
}: ResetHeatmapProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(
    null,
  );
  const [tooltipLayout, setTooltipLayout] = useState<TooltipLayout | null>(
    null,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const allCells = heatmap.weeks.flatMap((week) => week.cells);

  const selectedCell: HeatmapCell | null = selectedDateKey
    ? allCells.find((cell) => cell.dateKey === selectedDateKey && cell.hasReset) ??
      null
    : null;

  const todayCell: HeatmapCell | null =
    allCells.find((cell) => cell.isToday) ?? null;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const openTooltip = useCallback(
    (cell: HeatmapCell, element: HTMLElement) => {
      clearHideTimer();
      const rect = element.getBoundingClientRect();
      setActiveTooltip({
        cell,
        anchorX: rect.left + rect.width / 2,
        anchorTop: rect.top,
        anchorBottom: rect.bottom,
      });
    },
    [clearHideTimer],
  );

  const scheduleCloseTooltip = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setActiveTooltip(null);
      hideTimerRef.current = null;
    }, 90);
  }, [clearHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }

    const scrollToRight = () => {
      el.scrollLeft = el.scrollWidth;
    };

    scrollToRight();
    const frameId = window.requestAnimationFrame(scrollToRight);
    return () => window.cancelAnimationFrame(frameId);
  }, [heatmap.rangeEndKey]);

  useEffect(() => {
    if (!selectedCell && !activeTooltip) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearHideTimer();
        setActiveTooltip(null);
        setSelectedDateKey(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, activeTooltip, clearHideTimer]);

  useEffect(() => {
    if (!activeTooltip) {
      return;
    }

    const dismiss = () => {
      clearHideTimer();
      setActiveTooltip(null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        dismiss();
        return;
      }
      if (
        scrollContainerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      dismiss();
    };

    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("scroll", dismiss, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      container?.removeEventListener("scroll", dismiss);
      window.removeEventListener("scroll", dismiss);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeTooltip, clearHideTimer]);

  useIsomorphicLayoutEffect(() => {
    if (!activeTooltip) {
      return;
    }

    const el = tooltipRef.current;
    if (!el) {
      return;
    }

    if (typeof el.showPopover === "function" && !el.matches(":popover-open")) {
      try {
        el.showPopover();
      } catch {
        // Progressive enhancement: fixed viewport positioning remains active.
      }
    }

    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width === 0 || height === 0) {
      return;
    }

    const gap = 10;
    const viewportMargin = 12;
    const placement: "top" | "bottom" =
      activeTooltip.anchorTop >= height + gap + viewportMargin
        ? "top"
        : "bottom";

    const top =
      placement === "top"
        ? activeTooltip.anchorTop - height - gap
        : activeTooltip.anchorBottom + gap;

    const maxLeft = Math.max(
      viewportMargin,
      window.innerWidth - width - viewportMargin,
    );
    const left = Math.min(
      Math.max(activeTooltip.anchorX - width / 2, viewportMargin),
      maxLeft,
    );

    const arrowOffsetX = Math.min(
      Math.max(activeTooltip.anchorX - left, 14),
      width - 14,
    );

    setTooltipLayout({
      dateKey: activeTooltip.cell.dateKey,
      left,
      top,
      placement,
      arrowOffsetX,
    });
  }, [activeTooltip, locale, timeZone]);

  const handleJumpToToday = () => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    el.scrollTo({
      left: el.scrollWidth,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const resolvedLayout =
    activeTooltip && tooltipLayout?.dateKey === activeTooltip.cell.dateKey
      ? tooltipLayout
      : null;

  const cellSizeClass = "h-[22px] w-[22px] sm:h-6 sm:w-6";

  return (
    <section aria-labelledby="heatmap-heading">
      <div className="neo-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="heatmap-heading"
              className="text-lg font-extrabold tracking-tight text-ink sm:text-xl"
            >
              {dict.heatmap.title}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-ink-muted">
              {dict.heatmap.trackingSincePrefix}{" "}
              {formatMonthYear(heatmap.trackingStartKey, locale)}
            </p>
          </div>

          <div
            className="inline-flex w-fit items-center overflow-hidden rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#111111]"
            role="group"
            aria-label={dict.heatmap.timezoneSwitchLabel}
          >
            <button
              type="button"
              aria-pressed={timezoneMode === "varun"}
              onClick={() => onTimezoneModeChange("varun")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
                timezoneMode === "varun"
                  ? "bg-gemini-blue text-white"
                  : "bg-surface text-ink hover:bg-gemini-tint"
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict.heatmap.varunTimeLabel}</span>
            </button>
            <button
              type="button"
              aria-pressed={timezoneMode === "local"}
              onClick={() => onTimezoneModeChange("local")}
              className={`border-l-2 border-ink px-3 py-1.5 font-mono text-xs font-bold transition-colors ${
                timezoneMode === "local"
                  ? "bg-gemini-blue text-white"
                  : "bg-surface text-ink hover:bg-gemini-tint"
              }`}
            >
              {dict.heatmap.localTimeLabel}
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="mt-5 overflow-x-auto pb-2.5"
          tabIndex={0}
          role="region"
          aria-label={dict.heatmap.title}
        >
          <div className="inline-flex min-w-max items-start gap-1.5 pr-2 pb-1">
            <div
              className="sticky left-0 z-10 flex flex-col gap-1.5 bg-surface pt-6 pr-2.5"
              aria-hidden="true"
            >
              {dict.heatmap.weekdaysShort.map((dayLabel, idx) => (
                <div
                  key={dayLabel}
                  className={`${cellSizeClass} flex w-auto items-center font-mono text-[11px] font-medium leading-none text-ink-muted`}
                >
                  {idx % 2 === 0 ? dayLabel : ""}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5" aria-hidden="true">
                {heatmap.weeks.map((week) => (
                  <div
                    key={week.weekStartKey}
                    className={`${cellSizeClass} flex h-[18px] items-center overflow-visible font-mono text-[11px] font-medium leading-none text-ink-muted whitespace-nowrap`}
                  >
                    {week.monthLabel ?? ""}
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5">
                {heatmap.weeks.map((week) => (
                  <div
                    key={week.weekStartKey}
                    className="flex flex-col gap-1.5"
                  >
                    {week.cells.map((cell) => {
                      if (cell.isToday) {
                        const isSelected = selectedCell?.dateKey === cell.dateKey;
                        const statusText = getCellStatusText(cell, dict);
                        const todayLabel = `${formatDateKeyWithWeekday(cell.dateKey, locale)} — ${dict.heatmap.todayBadge} · ${statusText}`;

                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            aria-label={todayLabel}
                            aria-expanded={cell.hasReset ? isSelected : undefined}
                            onPointerEnter={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            onPointerLeave={scheduleCloseTooltip}
                            onFocus={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            onBlur={scheduleCloseTooltip}
                            onClick={(event) => {
                              openTooltip(cell, event.currentTarget);
                              if (cell.hasReset) {
                                setSelectedDateKey(
                                  isSelected ? null : cell.dateKey,
                                );
                              }
                            }}
                            className={`${cellSizeClass} rounded-[5px] border-2 border-ink shadow-[2px_2px_0px_#111111] ring-offset-1 ring-offset-surface transition-colors ${
                              cell.hasReset
                                ? `bg-gemini-blue ring-2 ring-gemini-blue hover:bg-gemini-blue-hover ${
                                    isSelected ? "ring-ink" : ""
                                  }`
                                : "bg-heatmap-empty ring-2 ring-gemini-blue hover:bg-gemini-tint"
                            }`}
                          />
                        );
                      }

                      if (cell.isFuture) {
                        return (
                          <div
                            key={cell.dateKey}
                            aria-hidden="true"
                            onPointerEnter={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            onPointerLeave={scheduleCloseTooltip}
                            onClick={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            className={`${cellSizeClass} rounded-[5px] border border-dashed border-ink/10 bg-transparent transition-colors hover:border-ink/40`}
                          />
                        );
                      }

                      if (!cell.inTrackingRange) {
                        return (
                          <div
                            key={cell.dateKey}
                            aria-hidden="true"
                            onPointerEnter={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            onPointerLeave={scheduleCloseTooltip}
                            onClick={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            className={`${cellSizeClass} rounded-[5px] border border-dashed border-ink/20 bg-surface-muted/45 transition-colors hover:border-ink/45`}
                          />
                        );
                      }

                      if (!cell.hasReset) {
                        return (
                          <div
                            key={cell.dateKey}
                            aria-hidden="true"
                            onPointerEnter={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            onPointerLeave={scheduleCloseTooltip}
                            onClick={(event) =>
                              openTooltip(cell, event.currentTarget)
                            }
                            className={`${cellSizeClass} rounded-[5px] border border-heatmap-empty-border bg-heatmap-empty transition-colors hover:border-ink/55`}
                          />
                        );
                      }

                      const isSelected = selectedCell?.dateKey === cell.dateKey;
                      const label = `${formatDateKeyWithWeekday(cell.dateKey, locale)} — ${getCellStatusText(cell, dict)}`;

                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          aria-label={label}
                          aria-expanded={isSelected}
                          onPointerEnter={(event) =>
                            openTooltip(cell, event.currentTarget)
                          }
                          onPointerLeave={scheduleCloseTooltip}
                          onFocus={(event) =>
                            openTooltip(cell, event.currentTarget)
                          }
                          onBlur={scheduleCloseTooltip}
                          onClick={(event) => {
                            openTooltip(cell, event.currentTarget);
                            setSelectedDateKey(isSelected ? null : cell.dateKey);
                          }}
                          className={`${cellSizeClass} rounded-[5px] border-[1.5px] border-ink bg-gemini-blue transition-colors hover:bg-gemini-blue-hover ${
                            isSelected
                              ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                              : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedCell && (
          <div
            role="region"
            aria-label={formatDateKeyLabel(selectedCell.dateKey, locale)}
            className="mt-4 rounded-xl border-2 border-ink bg-gemini-tint p-4 shadow-[3px_3px_0px_#111111]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-gemini-blue">
                  {dict.heatmap.resetsOnDayLabel}
                </p>
                <p className="mt-0.5 text-base font-extrabold text-ink">
                  {formatDateKeyLabel(selectedCell.dateKey, locale)}
                </p>
              </div>

              <button
                type="button"
                aria-label={dict.heatmap.closePopoverLabel}
                onClick={() => setSelectedDateKey(null)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border-2 border-ink bg-surface text-ink hover:bg-surface-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="mt-3 flex flex-col gap-3">
              {selectedCell.resets.map((item) => (
                <li
                  key={item.tweetId}
                  className="rounded-lg border-2 border-ink bg-surface p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <time
                      dateTime={item.resetAt}
                      className="font-mono text-xs text-ink-muted"
                    >
                      {formatTimestamp(item.resetAt, locale, timeZone)}
                    </time>
                    <a
                      href={item.tweetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gemini-blue hover:text-gemini-blue-hover"
                    >
                      <span>{dict.heatmap.openTweetCta}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                    {item.tweetText}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-3 font-mono text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            {todayCell && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-surface px-2.5 py-1 text-xs font-bold text-ink shadow-[2px_2px_0px_#111111] transition-colors hover:bg-gemini-tint"
              >
                <span
                  className="h-3 w-3 rounded-[3px] border-[1.5px] border-ink bg-heatmap-empty ring-2 ring-gemini-blue ring-offset-1 ring-offset-surface"
                  aria-hidden="true"
                />
                <span>
                  {dict.heatmap.todayBadge}:{" "}
                  {formatDateKeyLabel(todayCell.dateKey, locale)}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="inline-flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-[4px] border border-dashed border-ink/25 bg-surface-muted/45"
                aria-hidden="true"
              />
              <span>{dict.heatmap.legendBeforeTracking}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-[4px] border border-heatmap-empty-border bg-heatmap-empty"
                aria-hidden="true"
              />
              <span>{dict.heatmap.legendNoReset}</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-[4px] border-[1.5px] border-ink bg-gemini-blue"
                aria-hidden="true"
              />
              <span>{dict.heatmap.legendReset}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-[4px] border-[1.5px] border-ink bg-heatmap-empty ring-2 ring-gemini-blue ring-offset-1 ring-offset-surface"
                aria-hidden="true"
              />
              <span>{dict.heatmap.legendToday}</span>
            </div>
          </div>
        </div>
      </div>

      {activeTooltip && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          popover="manual"
          onPointerEnter={clearHideTimer}
          onPointerLeave={scheduleCloseTooltip}
          style={{
            left: resolvedLayout ? `${resolvedLayout.left}px` : "-9999px",
            top: resolvedLayout ? `${resolvedLayout.top}px` : "-9999px",
            right: "auto",
            bottom: "auto",
            margin: 0,
            visibility: resolvedLayout ? "visible" : "hidden",
          }}
          className="fixed z-50 m-0 max-w-[240px] overflow-visible rounded-lg border-2 border-ink bg-ink px-3 py-2 text-left text-white shadow-[3px_3px_0px_#2563eb]"
        >
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs font-bold whitespace-nowrap">
              {formatDateKeyWithWeekday(activeTooltip.cell.dateKey, locale)}
            </span>
            {activeTooltip.cell.isToday && (
              <span className="rounded bg-gemini-blue px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                {dict.heatmap.todayBadge}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-white/90">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${getTooltipStatusDotClass(activeTooltip.cell)}`}
              aria-hidden="true"
            />
            <span>{getCellStatusText(activeTooltip.cell, dict)}</span>
          </div>

          {activeTooltip.cell.resets.length === 1 && (
            <p className="mt-0.5 font-mono text-[10px] text-white/70">
              {formatTimestamp(
                activeTooltip.cell.resets[0].resetAt,
                locale,
                timeZone,
              )}
            </p>
          )}

          {resolvedLayout && (
            <span
              aria-hidden="true"
              style={{ left: `${resolvedLayout.arrowOffsetX}px` }}
              className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-ink ${
                resolvedLayout.placement === "top"
                  ? "-bottom-[6px] border-r-2 border-b-2 border-ink"
                  : "-top-[6px] border-l-2 border-t-2 border-ink"
              }`}
            />
          )}
        </div>
      )}
    </section>
  );
}
