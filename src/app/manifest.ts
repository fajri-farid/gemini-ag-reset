import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { SEO_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: SEO_DESCRIPTION,
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#FDF8EE",
    theme_color: "#FDF8EE",
    icons: [
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
