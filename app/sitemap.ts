import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { CATEGORY_SEO } from "@/lib/category-seo";

// Built on request (the database isn't available while the Docker image is being built), cached for an hour.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1, lastModified: now },
    { url: `${SITE_URL}/sell`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/browse`, changeFrequency: "hourly", priority: 0.9, lastModified: now },
    ...CATEGORY_SEO.map((c) => ({ url: `${SITE_URL}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8, lastModified: now })),
    { url: `${SITE_URL}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/refunds`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const listings = await db.listing.findMany({
      where: { status: { in: ["LIVE", "ENDED", "SOLD"] } },
      select: { id: true, updatedAt: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    for (const l of listings) {
      pages.push({ url: `${SITE_URL}/listings/${l.id}`, lastModified: l.updatedAt, changeFrequency: l.status === "LIVE" ? "hourly" : "monthly", priority: l.status === "LIVE" ? 0.7 : 0.3 });
    }
  } catch {
    // Database unavailable: still serve the static pages.
  }
  return pages;
}
