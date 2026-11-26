import "server-only";

const SENSITIVE_ENV_KEYS = [
  "SOCIALDATA_API_KEY",
  "GEMINI_API_KEY",
  "CRON_SECRET",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
] as const;

export function sanitizeErrorMessage(
  error: unknown,
  maxLength = 300,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  let sanitized = raw
    .replace(/\r?\n/g, " ")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_KEY]");

  for (const envKey of SENSITIVE_ENV_KEYS) {
    const secretVal = process.env[envKey]?.trim();
    if (secretVal && secretVal.length >= 6) {
      sanitized = sanitized.split(secretVal).join("[REDACTED]");
    }
  }

  const trimmed = sanitized.trim();
  if (!trimmed) {
    return "Unknown error";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3))}...`;
}
