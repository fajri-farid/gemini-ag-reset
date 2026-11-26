import { AtSign, Briefcase, Code2, Globe } from "lucide-react";
import {
  getDeveloperLinks,
  siteConfig,
  type DeveloperLinkId,
} from "@/config/site";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface TrackerFooterProps {
  dict: Dictionary;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

function renderLinkIcon(id: DeveloperLinkId) {
  switch (id) {
    case "website":
      return <Globe className="h-3.5 w-3.5" aria-hidden="true" />;
    case "github":
      return <Code2 className="h-3.5 w-3.5" aria-hidden="true" />;
    case "linkedin":
      return <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />;
    case "instagram":
      return <AtSign className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

export function TrackerFooter({
  dict,
  locale,
  onLocaleChange,
}: TrackerFooterProps) {
  const developerLinks = getDeveloperLinks();

  return (
    <footer className="mt-4 flex flex-col gap-4 border-t-2 border-ink/15 pt-6 text-sm text-ink-muted">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {dict.footer.languageLabel}:
        </span>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-pressed={locale === "en"}
            onClick={() => onLocaleChange("en")}
            className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
              locale === "en"
                ? "bg-ink text-white"
                : "bg-surface-muted text-ink hover:bg-gemini-tint"
            }`}
          >
            English
          </button>
          <button
            type="button"
            aria-pressed={locale === "id"}
            onClick={() => onLocaleChange("id")}
            className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
              locale === "id"
                ? "bg-ink text-white"
                : "bg-surface-muted text-ink hover:bg-gemini-tint"
            }`}
          >
            Bahasa Indonesia
          </button>
        </div>
      </div>

      <p>{dict.footer.disclaimer}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          {dict.footer.builtByPrefix}{" "}
          <strong className="font-semibold text-ink">
            {siteConfig.developer.name}
          </strong>
        </span>

        {developerLinks.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {developerLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink/25 bg-surface px-2.5 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-gemini-tint"
                >
                  {renderLinkIcon(link.id)}
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
