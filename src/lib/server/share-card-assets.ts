import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export interface SatoriFontAsset {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 800;
  style: "normal";
}

export interface ShareCardAssets {
  fonts: SatoriFontAsset[];
  brandIconDataUri: string;
  varunAvatarDataUri: string | null;
}

let cachedAssetsPromise: Promise<ShareCardAssets> | null = null;

async function readOptionalAvatar(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(filePath);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadAssetsFromDisk(): Promise<ShareCardAssets> {
  const rootDir = process.cwd();
  const fontsDir = path.join(rootDir, "src", "assets", "fonts");

  const [sans400, sans700, sans800, mono700, iconPng, varunAvatarDataUri] =
    await Promise.all([
      fs.readFile(path.join(fontsDir, "plus-jakarta-400.woff")),
      fs.readFile(path.join(fontsDir, "plus-jakarta-700.woff")),
      fs.readFile(path.join(fontsDir, "plus-jakarta-800.woff")),
      fs.readFile(path.join(fontsDir, "jetbrains-mono-700.woff")),
      fs.readFile(path.join(rootDir, "src", "app", "icon.png")),
      readOptionalAvatar(path.join(rootDir, "public", "V0Y7u33_.jpg")),
    ]);

  return {
    fonts: [
      { name: "Plus Jakarta Sans", data: sans400, weight: 400, style: "normal" },
      { name: "Plus Jakarta Sans", data: sans700, weight: 700, style: "normal" },
      { name: "Plus Jakarta Sans", data: sans800, weight: 800, style: "normal" },
      { name: "JetBrains Mono", data: mono700, weight: 700, style: "normal" },
    ],
    brandIconDataUri: `data:image/png;base64,${iconPng.toString("base64")}`,
    varunAvatarDataUri,
  };
}

/**
 * Loads and caches local font buffers, brand PNG icon, and Varun's JPEG avatar
 * for server-side `next/og` rendering.
 */
export function getShareCardAssets(): Promise<ShareCardAssets> {
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = loadAssetsFromDisk().catch((error) => {
      cachedAssetsPromise = null;
      throw error;
    });
  }
  return cachedAssetsPromise;
}
