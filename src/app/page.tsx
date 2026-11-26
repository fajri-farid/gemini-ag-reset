import { TrackerPageClient } from "@/components/tracker/TrackerPageClient";
import { getCachedPublicTrackerData } from "@/lib/server/public-data";

export default async function HomePage() {
  const initialData = await getCachedPublicTrackerData();

  return <TrackerPageClient initialData={initialData} />;
}
