import { Router } from "express";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { escapeXml } from "../lib/content.js";
import { asyncHandler } from "../middleware/validate.js";

export const feedRouter = Router();

const siteUrl = () => env.PUBLIC_SITE_URL.replace(/\/$/, "");

/**
 * Served live rather than prerendered, so a newly published article appears in
 * the feed immediately without waiting for a frontend rebuild.
 */
feedRouter.get(
  "/rss.xml",
  asyncHandler(async (_req, res) => {
    const [settings, posts] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 1 } }),
      prisma.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        take: 30,
      }),
    ]);

    const base = siteUrl();
    const title = settings?.siteTitle ?? "The Yonatan Times";
    const description = settings?.metaDescription ?? "A developer's chronicle.";

    const items = posts
      .map((post) =>
        [
          "    <item>",
          `      <title>${escapeXml(post.title)}</title>`,
          `      <link>${base}/edition/${post.slug}</link>`,
          `      <guid isPermaLink="true">${base}/edition/${post.slug}</guid>`,
          `      <description>${escapeXml(post.excerpt)}</description>`,
          post.publishedAt
            ? `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>`
            : "",
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      "  <channel>",
      `    <title>${escapeXml(title)}</title>`,
      `    <link>${base}</link>`,
      `    <description>${escapeXml(description)}</description>`,
      "    <language>en</language>",
      `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
      `    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />`,
      items,
      "  </channel>",
      "</rss>",
    ].join("\n");

    res.type("application/rss+xml").set("Cache-Control", "public, max-age=600").send(xml);
  }),
);

feedRouter.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const [posts, categories] = await Promise.all([
      prisma.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({ select: { slug: true } }),
    ]);

    const base = siteUrl();
    const now = new Date().toISOString();

    const urls = [
      { loc: base, lastmod: now, priority: "1.0" },
      { loc: `${base}/edition`, lastmod: now, priority: "0.8" },
      ...categories.map((c) => ({
        loc: `${base}/edition/category/${c.slug}`,
        lastmod: now,
        priority: "0.5",
      })),
      ...posts.map((p) => ({
        loc: `${base}/edition/${p.slug}`,
        lastmod: p.updatedAt.toISOString(),
        priority: "0.7",
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) =>
        [
          "  <url>",
          `    <loc>${escapeXml(url.loc)}</loc>`,
          `    <lastmod>${url.lastmod}</lastmod>`,
          `    <priority>${url.priority}</priority>`,
          "  </url>",
        ].join("\n"),
      ),
      "</urlset>",
    ].join("\n");

    res.type("application/xml").set("Cache-Control", "public, max-age=600").send(xml);
  }),
);
