import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function normalizeVersion(tagOrVersion) {
  const trimmed = String(tagOrVersion ?? "").trim();
  if (!trimmed) {
    throw new Error("A version or tag argument (for example, v0.1.0) is required.");
  }
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractReleaseNotes(changelogMarkdown, tagOrVersion) {
  const version = normalizeVersion(tagOrVersion);
  const lines = String(changelogMarkdown).split(/\r?\n/);
  const headingRegex = new RegExp(
    `^##\\s+\\[?v?${escapeRegExp(version)}\\]?(?:\\s+-\\s+.*)?\\s*$`,
  );

  const startIndex = lines.findIndex((line) => headingRegex.test(line.trim()));
  if (startIndex === -1) {
    throw new Error(`Version "${version}" was not found in CHANGELOG.md.`);
  }

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (/^##\s+/.test(trimmed) || /^\[[^\]]+\]:\s+https?:\/\//.test(trimmed)) {
      endIndex = i;
      break;
    }
  }

  const body = lines
    .slice(startIndex + 1, endIndex)
    .join("\n")
    .trim();

  if (!body) {
    throw new Error(`Release section for "${version}" in CHANGELOG.md is empty.`);
  }

  return body;
}

function parseCliArgs(argv) {
  let tagArg = null;
  let outFile = null;
  let verifyPackageVersion = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--verify-package-version") {
      verifyPackageVersion = true;
    } else if (arg === "--out") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--out requires a file path.");
      }
      outFile = next;
      i += 1;
    } else if (!arg.startsWith("-") && !tagArg) {
      tagArg = arg;
    } else {
      throw new Error(`Unknown or duplicate argument: ${arg}`);
    }
  }

  return { tagArg, outFile, verifyPackageVersion };
}

function runCli() {
  const rootDir = process.cwd();
  const { tagArg, outFile, verifyPackageVersion } = parseCliArgs(
    process.argv.slice(2),
  );
  const version = normalizeVersion(tagArg);

  if (verifyPackageVersion) {
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    if (packageJson.version !== version) {
      throw new Error(
        `Tag version "${version}" does not match package.json version "${packageJson.version}".`,
      );
    }
  }

  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  const changelogMarkdown = fs.readFileSync(changelogPath, "utf8");
  const notes = extractReleaseNotes(changelogMarkdown, version);

  if (outFile) {
    fs.writeFileSync(path.resolve(rootDir, outFile), `${notes}\n`, "utf8");
  } else {
    process.stdout.write(`${notes}\n`);
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
