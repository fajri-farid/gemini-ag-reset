import "server-only";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { formatDaysMetric, formatTimestamp } from "@/lib/datetime";
import { getDictionary } from "@/lib/i18n";
import { isFreshReset } from "@/lib/reset-announcement";
import { SHARE_CARD_DIMENSIONS } from "@/lib/share-params";
import { truncateTweetSnippet } from "@/lib/share-templates";
import { getShareCardAssets } from "./share-card-assets";
import type { ShareCardViewModel } from "./share-card-data";

const COLORS = {
  canvas: "#FDF8EE",
  geminiTint: "#EFF6FF",
  surface: "#FFFFFF",
  heatmapEmpty: "#EDE7DA",
  ink: "#111111",
  inkMuted: "#52525B",
  inkSoft: "#71717A",
  geminiBlue: "#2563EB",
  geminiViolet: "#7C3AED",
  xVerifiedBlue: "#1D9BF0",
} as const;

function XLogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill={COLORS.ink}
      />
    </svg>
  );
}

function VerifiedBadgeSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={COLORS.xVerifiedBlue} />
      <path
        d="M8.5 12.2l2.3 2.3 4.8-5"
        stroke={COLORS.surface}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Renders the cached 1200x630 Dynamic OpenGraph / Twitter image via `next/og`
 * matching the clean flat Warm Neo-Brutalism design:
 * - `< 5 hours` since reset -> Gemini Blue fresh reset announcement card
 * - `>= 5 hours` -> Warm Cream web overview card with Last Reset highlight & 3 metrics
 */
export async function renderOgShareImage(
  viewModel: ShareCardViewModel,
): Promise<ImageResponse> {
  const { fonts, brandIconDataUri, varunAvatarDataUri } =
    await getShareCardAssets();
  const dict = getDictionary(viewModel.locale);
  const now = new Date(viewModel.nowIso);

  const isFresh =
    viewModel.reset !== null &&
    isFreshReset(viewModel.reset.resetAt, now.getTime());

  const canvasBg = isFresh ? COLORS.geminiTint : COLORS.canvas;
  const formattedTime = viewModel.reset
    ? formatTimestamp(
        viewModel.reset.resetAt,
        viewModel.locale,
        viewModel.timeZone,
      )
    : viewModel.locale === "id"
      ? "Belum ada data"
      : "No resets yet";

  const tweetBody = viewModel.reset
    ? truncateTweetSnippet(viewModel.reset.tweetText, 150) ||
      dict.hero.noSummaryFallback
    : dict.hero.emptyDescription;

  const metricBoxes = [
    {
      label: viewModel.locale === "id" ? "TOTAL RESET" : "RESETS",
      value: String(viewModel.metrics.total),
      accent: COLORS.geminiBlue,
    },
    {
      label: viewModel.locale === "id" ? "RATA-RATA JEDA" : "AVG. INTERVAL",
      value: formatDaysMetric(viewModel.metrics.avgIntervalDays, viewModel.locale),
      accent: COLORS.geminiViolet,
    },
    {
      label: viewModel.locale === "id" ? "JEDA TERLAMA" : "LONGEST WAIT",
      value: formatDaysMetric(viewModel.metrics.longestWaitDays, viewModel.locale),
      accent: COLORS.ink,
    },
  ];

  const { width, height } = SHARE_CARD_DIMENSIONS.og;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          backgroundColor: canvasBg,
          padding: "36px 46px",
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                backgroundColor: COLORS.surface,
                border: `3px solid ${COLORS.ink}`,
                borderRadius: 12,
                boxShadow: `4px 4px 0px ${COLORS.ink}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandIconDataUri}
                alt=""
                width={34}
                height={34}
                style={{ borderRadius: 7 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: COLORS.ink,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                }}
              >
                {siteConfig.name}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.inkMuted,
                  marginTop: 2,
                }}
              >
                {viewModel.locale === "id"
                  ? "Pantau reset kuota Antigravity"
                  : "Track Antigravity quota resets"}
              </span>
            </div>
          </div>

          {isFresh && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: COLORS.geminiBlue,
                color: COLORS.surface,
                border: `3px solid ${COLORS.ink}`,
                borderRadius: 10,
                padding: "7px 18px",
                boxShadow: `4px 4px 0px ${COLORS.ink}`,
                fontFamily: "JetBrains Mono",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {viewModel.locale === "id" ? "RESET KUOTA" : "QUOTA RESET"}
            </div>
          )}
        </div>

        {/* Middle 2-Column Content */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 28,
          }}
        >
          {/* Left Column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 510,
              gap: 18,
            }}
          >
            {isFresh ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: COLORS.surface,
                  border: `3.5px solid ${COLORS.ink}`,
                  borderRadius: 20,
                  padding: "24px 28px",
                  boxShadow: `7px 7px 0px ${COLORS.ink}`,
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.geminiBlue,
                  }}
                >
                  {viewModel.locale === "id"
                    ? "GEMINI DI ANTIGRAVITY"
                    : "GEMINI IN ANTIGRAVITY"}
                </span>

                <span
                  style={{
                    fontSize: 54,
                    fontWeight: 800,
                    color: COLORS.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.04,
                  }}
                >
                  {viewModel.locale === "id"
                    ? "Kuota baru di-reset."
                    : "Quota just reset."}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: COLORS.geminiBlue,
                      color: COLORS.surface,
                      border: `3px solid ${COLORS.ink}`,
                      borderRadius: 12,
                      padding: "8px 20px",
                      boxShadow: `5px 5px 0px ${COLORS.ink}`,
                      fontFamily: "JetBrains Mono",
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    Antigravity
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 16,
                    fontWeight: 700,
                    color: COLORS.inkMuted,
                    marginTop: 4,
                  }}
                >
                  {formattedTime}
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      color: COLORS.ink,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.06,
                    }}
                  >
                    {viewModel.locale === "id"
                      ? "Cek kapan kuota Gemini di-reset."
                      : "See when Gemini quota resets."}
                  </span>

                  {/* Prominent Last Reset Highlight Pill */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: COLORS.geminiTint,
                      border: `3px solid ${COLORS.ink}`,
                      borderRadius: 12,
                      padding: "6px 14px 6px 6px",
                      boxShadow: `4px 4px 0px ${COLORS.ink}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        backgroundColor: COLORS.geminiBlue,
                        color: COLORS.surface,
                        border: `2px solid ${COLORS.ink}`,
                        borderRadius: 8,
                        padding: "5px 10px",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {viewModel.locale === "id"
                        ? "RESET TERAKHIR"
                        : "LAST RESET"}
                    </div>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 15,
                        fontWeight: 700,
                        color: COLORS.ink,
                      }}
                    >
                      {formattedTime}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  {metricBoxes.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        backgroundColor: COLORS.surface,
                        border: `3px solid ${COLORS.ink}`,
                        borderRadius: 16,
                        padding: "12px 14px",
                        boxShadow: `4px 4px 0px ${COLORS.ink}`,
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "JetBrains Mono",
                          fontSize: 11,
                          fontWeight: 700,
                          color: COLORS.inkMuted,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: item.accent,
                          lineHeight: 1.08,
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Clean X-Style Proof Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              backgroundColor: COLORS.surface,
              border: `3.5px solid ${COLORS.ink}`,
              borderRadius: 20,
              padding: "22px 24px",
              boxShadow: `7px 7px 0px ${COLORS.ink}`,
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              {varunAvatarDataUri ? (
                <div
                  style={{
                    display: "flex",
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: `2.5px solid ${COLORS.ink}`,
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={varunAvatarDataUri}
                    alt=""
                    width={52}
                    height={52}
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    backgroundColor: COLORS.geminiBlue,
                    border: `2.5px solid ${COLORS.ink}`,
                    color: COLORS.surface,
                    fontSize: 20,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  VM
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 21,
                        fontWeight: 800,
                        color: COLORS.ink,
                      }}
                    >
                      {siteConfig.targetAccount.name}
                    </span>
                    <VerifiedBadgeSvg />
                    <span
                      style={{
                        fontSize: 17,
                        fontWeight: 400,
                        color: COLORS.inkSoft,
                      }}
                    >
                      {siteConfig.targetAccount.handle}
                    </span>
                  </div>

                  <XLogoMark size={19} />
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 23,
                    fontWeight: 400,
                    lineHeight: 1.42,
                    color: COLORS.ink,
                  }}
                >
                  {tweetBody}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `2px solid ${COLORS.heatmapEmpty}`,
                paddingTop: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.inkMuted,
                }}
              >
                {viewModel.locale === "id"
                  ? "PENGUMUMAN TERAKHIR"
                  : "LATEST ANNOUNCEMENT"}
              </span>

              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.inkSoft,
                }}
              >
                x.com/_mohansolo
              </span>
            </div>
          </div>
        </div>

        {/* Clean Centered Domain Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.ink,
            color: COLORS.surface,
            borderRadius: 14,
            padding: "14px 22px",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 20,
              fontWeight: 700,
              color: COLORS.surface,
            }}
          >
            {viewModel.displayHost}
          </span>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts,
    },
  );
}
