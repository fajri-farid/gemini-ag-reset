import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackerPageClient } from "@/components/tracker/TrackerPageClient";
import { buildHomeJsonLd, serializeJsonLd } from "@/lib/seo";
import { getCachedPublicTrackerHomeData } from "@/lib/server/public-data";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

async function HomePageContent() {
  const initialData = await getCachedPublicTrackerHomeData();

  return <TrackerPageClient initialData={initialData} />;
}

function HomePageFallback() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="neo-card h-44 bg-surface p-6 motion-safe:animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="neo-card h-24 animate-pulse bg-surface" />
          <div className="neo-card h-24 animate-pulse bg-surface" />
          <div className="neo-card h-24 animate-pulse bg-surface" />
        </div>
        <div className="neo-card h-64 animate-pulse bg-surface" />
      </div>
    </main>
  );
}

export default function HomePage() {
  const jsonLd = serializeJsonLd(buildHomeJsonLd());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Suspense fallback={<HomePageFallback />}>
        <HomePageContent />
      </Suspense>
    </>
  );
}
