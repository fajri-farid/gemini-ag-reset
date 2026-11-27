import { Suspense } from "react";
import type { Metadata } from "next";
import { NotesPageClient } from "@/components/notes/NotesPageClient";
import { siteConfig } from "@/config/site";
import { getCachedInitialNotesPage } from "@/lib/server/public-data";

const NOTES_DESCRIPTION =
  "Community sticky notes wall for Gemini Resets. Leave a note for the maker.";

export const metadata: Metadata = {
  title: `Community Notes — ${siteConfig.name}`,
  description: NOTES_DESCRIPTION,
  openGraph: {
    title: `Community Notes — ${siteConfig.name}`,
    description: NOTES_DESCRIPTION,
    siteName: siteConfig.name,
    url: "/notes",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Community Notes — ${siteConfig.name}`,
    description: NOTES_DESCRIPTION,
  },
};

async function NotesPageContent() {
  const { page, generatedAt } = await getCachedInitialNotesPage();
  return <NotesPageClient initialPage={page} generatedAt={generatedAt} />;
}

function NotesPageFallback() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="neo-card h-28 bg-surface p-6 motion-safe:animate-pulse" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="neo-card h-44 bg-surface motion-safe:animate-pulse" />
          <div className="neo-card h-44 bg-surface motion-safe:animate-pulse" />
          <div className="neo-card h-44 bg-surface motion-safe:animate-pulse" />
        </div>
      </div>
    </main>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<NotesPageFallback />}>
      <NotesPageContent />
    </Suspense>
  );
}
