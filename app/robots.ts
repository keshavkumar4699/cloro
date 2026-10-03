import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or per-member pages: nothing useful for search, and members' details stay out of search results.
        disallow: ["/admin", "/api/", "/dashboard", "/messages", "/deals", "/notifications", "/support", "/verify", "/guardian", "/welcome", "/membership", "/signin", "/u/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
