import type { MetadataRoute } from "next";
import { getPrisma } from "@/lib/db/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: baseUrl + "/laws",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: baseUrl + "/lawyers",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8
    }
  ];

  try {
    const prisma = getPrisma();

    const [laws, lawyers] = await Promise.all([
      prisma.law.findMany({
        where: {
          source: {
            official: true,
            enabled: true
          }
        },
        select: {
          slug: true,
          updatedAt: true
        },
        take: 5000
      }),
      prisma.lawyer.findMany({
        where: {
          active: true,
          verified: true
        },
        select: {
          slug: true,
          updatedAt: true
        },
        take: 5000
      })
    ]);

    routes.push(
      ...laws.map((law) => ({
        url: baseUrl + "/laws/" + law.slug,
        lastModified: law.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8
      })),
      ...lawyers.map((lawyer) => ({
        url: baseUrl + "/lawyers/" + lawyer.slug,
        lastModified: lawyer.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7
      }))
    );
  } catch {
    // Static routes remain available when the database is temporarily unavailable.
  }

  return routes;
}
