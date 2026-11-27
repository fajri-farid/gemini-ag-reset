import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { siteConfig } from "@/config/site";
import { resolveSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
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
    card: "summary_large_image",
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
        <Analytics />
      </body>
    </html>
  );
}
