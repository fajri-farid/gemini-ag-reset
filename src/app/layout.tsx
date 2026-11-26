import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_SITE_URL = "https://geminireset.fajrifarid.com";

function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // Fallback ke domain produksi default jika format env tidak valid.
    }
  }
  return new URL(DEFAULT_SITE_URL);
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: siteConfig.tabTitle,
  description: siteConfig.shortDescription,
  openGraph: {
    title: siteConfig.tabTitle,
    description: siteConfig.shortDescription,
    siteName: siteConfig.name,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.tabTitle,
    description: siteConfig.shortDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
