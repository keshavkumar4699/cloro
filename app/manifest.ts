import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/** Lets members add Cloro to their phone's home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — pre-loved auctions`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f1",
    theme_color: "#0e4a3b",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
