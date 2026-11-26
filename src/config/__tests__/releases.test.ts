import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import { extractReleaseNotes } from "../../../scripts/extract-release-notes.mjs";
import {
  CURRENT_TAG,
  CURRENT_VERSION,
  getGitHubReleasesIndexUrl,
  getGitHubReleaseUrl,
  RELEASES,
} from "../releases";

describe("releases metadata and changelog consistency", () => {
  it("matches package.json version", () => {
    expect(CURRENT_VERSION).toBe(packageJson.version);
    expect(CURRENT_TAG).toBe(`v${packageJson.version}`);
  });

  it("provides valid bilingual entries and GitHub release URLs", () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    expect(RELEASES[0]?.version).toBe(CURRENT_VERSION);
    expect(new URL(getGitHubReleasesIndexUrl()).protocol).toBe("https:");

    for (const entry of RELEASES) {
      expect(entry.tag).toBe(`v${entry.version}`);
      expect(entry.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new URL(getGitHubReleaseUrl(entry.tag)).href).toContain(
        `/releases/tag/${entry.tag}`,
      );

      for (const locale of ["en", "id"] as const) {
        const localized = entry.content[locale];
        expect(localized.title.trim().length).toBeGreaterThan(0);
        expect(localized.summary.trim().length).toBeGreaterThan(0);

        const totalItems = Object.values(localized.sections).reduce(
          (sum, items) => sum + (items?.length ?? 0),
          0,
        );
        expect(totalItems).toBeGreaterThan(0);
      }
    }
  });

  it("extracts release notes cleanly from CHANGELOG.md", () => {
    const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
    const changelogContent = fs.readFileSync(changelogPath, "utf8");

    const notes = extractReleaseNotes(changelogContent, CURRENT_TAG);
    expect(notes).toContain("### Added");
    expect(notes.length).toBeGreaterThan(0);

    expect(() => extractReleaseNotes(changelogContent, "v9.9.9")).toThrow();
  });
});
