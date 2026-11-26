import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SELF_RELATIVE = "scripts/check-public-safety.mjs";

const FORBIDDEN_STAGED_PATTERNS = [
  {
    name: "environment file",
    test: (relPath) => {
      const base = path.posix.basename(relPath);
      return /^\.env(\..+)?$/i.test(base) && !/^\.env\.example$/i.test(base);
    },
  },
  {
    name: "Firebase Admin SDK credential JSON",
    test: (relPath) => /firebase-adminsdk.*\.json$/i.test(path.posix.basename(relPath)),
  },
  {
    name: "service account JSON",
    test: (relPath) => /serviceAccount.*\.json$/i.test(path.posix.basename(relPath)),
  },
  {
    name: "google-services.json",
    test: (relPath) => /^google-services\.json$/i.test(path.posix.basename(relPath)),
  },
  {
    name: "private key or certificate",
    test: (relPath) => /\.(pem|key|p12)$/i.test(path.posix.basename(relPath)),
  },
];

const CONTENT_PATTERNS = [
  {
    label: "PEM private key",
    regex: /-----BEGIN PRIVATE KEY-----/,
  },
  {
    label: "Hardcoded Google API key",
    regex: /AIza[0-9A-Za-z_-]{20,}/,
  },
  {
    label: "Hardcoded secret key (sk-...)",
    regex: /sk-[A-Za-z0-9]{20,}/,
  },
  {
    label: "Sensitive NEXT_PUBLIC_ variable",
    regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|GEMINI_API|SOCIALDATA|ADMIN_EMAIL)/,
  },
  {
    label: "Local machine path or internal .agents/ reference",
    regex: /(?:C:\\Users\\|E:\\|\/Users\/|\.agents\/)/,
  },
];

function collectFilesRecursively(dirPath, results) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
        continue;
      }
      collectFilesRecursively(fullPath, results);
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
}

function getStagedFiles() {
  try {
    const output = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const findings = [];

  for (const stagedPath of getStagedFiles()) {
    const normalized = stagedPath.replace(/\\/g, "/");
    for (const rule of FORBIDDEN_STAGED_PATTERNS) {
      if (rule.test(normalized)) {
        findings.push(`Staged forbidden ${rule.name}: ${normalized}`);
      }
    }
  }

  const targetFiles = [];
  collectFilesRecursively(path.join(ROOT_DIR, "src"), targetFiles);
  collectFilesRecursively(path.join(ROOT_DIR, "scripts"), targetFiles);
  collectFilesRecursively(path.join(ROOT_DIR, ".github"), targetFiles);

  for (const rootFile of [
    "package.json",
    "vitest.config.mts",
    "commitlint.config.mjs",
    "next.config.ts",
    "eslint.config.mjs",
    "CHANGELOG.md",
    "README.md",
  ]) {
    const absPath = path.join(ROOT_DIR, rootFile);
    if (fs.existsSync(absPath)) {
      targetFiles.push(absPath);
    }
  }

  let scannedCount = 0;

  for (const filePath of targetFiles) {
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
    if (relPath === SELF_RELATIVE) {
      continue;
    }

    scannedCount += 1;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const pattern of CONTENT_PATTERNS) {
        if (pattern.regex.test(line)) {
          findings.push(`${pattern.label} detected in ${relPath}:${index + 1}`);
        }
      }
    });
  }

  const envExamplePath = path.join(ROOT_DIR, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    scannedCount += 1;
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    if (/AIza[0-9A-Za-z_-]{20,}/.test(envExampleContent)) {
      findings.push("Real Google API key detected in .env.example");
    }
    if (
      /-----BEGIN PRIVATE KEY-----/.test(envExampleContent) &&
      !/YOUR_PRIVATE_KEY_HERE/.test(envExampleContent)
    ) {
      findings.push("Non-placeholder private key detected in .env.example");
    }
  }

  if (findings.length > 0) {
    console.error("Public repo security check failed:");
    for (const finding of findings) {
      console.error(` - ${finding}`);
    }
    process.exit(1);
  }

  console.log(`Public repo security check passed (${scannedCount} files scanned, 0 findings).`);
}

main();
