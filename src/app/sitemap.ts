import type { MetadataRoute } from "next";
import { RELEASES } from "@/config/releases";
import { getSiteOrigin } from "@/lib/site-url";

const LATEST_RELEASE_DATE = RELEASES[0]?.publishedOn
  ? new Date(`${RELEASES[0].publishedOn}T00:00:00.000Z`)
  : undefined;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();

  return [
    {
      url: `${origin}/`,
      ...(LATEST_RELEASE_DATE ? { lastModified: LATEST_RELEASE_DATE } : {}),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${origin}/notes`,
      ...(LATEST_RELEASE_DATE ? { lastModified: LATEST_RELEASE_DATE } : {}),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${origin}/changelog`,
      ...(LATEST_RELEASE_DATE ? { lastModified: LATEST_RELEASE_DATE } : {}),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
