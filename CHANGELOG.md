# Changelog

All notable changes to **Gemini Resets** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-27

First public release of **Gemini Resets** for tracking `@_mohansolo` Gemini quota reset announcements in Antigravity.

### Added

- Instant status card on the home page showing whether a reset was announced within the last 24 hours (`RESET RECENTLY` vs `WAITING`), with a direct link to `@_mohansolo`'s original post on X.
- Three summary metrics: total resets recorded, average interval between resets, and longest wait.
- 52-week daily reset history heatmap starting from the active tracking date, with interactive per-day details.
- Chronological reset announcements archive with original post excerpts, time gaps between announcements, and pagination.
- Time zone toggle (`Varun time (PT)` vs `Local time`) and bilingual `EN` / `ID` interface with saved preferences.
- Automated hourly checks for new reset announcements with a live "Last checked" status indicator.
- Version badge and dedicated `/changelog` page to follow future product updates.

[0.1.0]: https://github.com/fajri-farid/gemini-ag-reset/releases/tag/v0.1.0
