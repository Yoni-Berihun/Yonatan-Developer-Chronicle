import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { notFound } from "../lib/http-error.js";
import { asyncHandler } from "../middleware/validate.js";

export const publicRouter = Router();

const publishedOrder = { orderBy: { order: "asc" as const } };

/**
 * Everything the public page needs, in one round trip. Deliberately a single
 * endpoint: the site is small, and one request keeps the free-tier API awake
 * for less time than a dozen would.
 */
publicRouter.get(
  "/site",
  asyncHandler(async (_req, res) => {
    const [settings, socialLinks, sections] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: 1 } }),
      prisma.socialLink.findMany({ where: { isActive: true }, ...publishedOrder }),
      prisma.section.findMany({
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          projects: { where: { isPublished: true }, ...publishedOrder },
          skillCategories: {
            orderBy: { order: "asc" },
            include: { items: publishedOrder },
          },
          timelineEntries: { where: { isPublished: true }, ...publishedOrder },
          stats: publishedOrder,
          accolades: { where: { isPublished: true }, ...publishedOrder },
          impactStories: { where: { isPublished: true }, ...publishedOrder },
          impactMetrics: publishedOrder,
          blocks: publishedOrder,
          cta: true,
        },
      }),
    ]);

    if (!settings) {
      throw notFound("The site has not been set up yet. Run the seed script.");
    }

    // CMS edits must be visible immediately. This endpoint sits behind the
    // frontend's Vercel rewrite, so stale browser/CDN responses are otherwise
    // easy to mistake for a failed deployment.
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ settings, socialLinks, sections });
  }),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(9),
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
});

publicRouter.get(
  "/posts",
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters." });
      return;
    }
    const { page, perPage, category, tag, q } = parsed.data;

    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { lte: new Date() },
      ...(category ? { category: { slug: category } } : {}),
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { excerpt: { contains: q, mode: "insensitive" as const } },
              { contentMarkdown: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          coverImageAlt: true,
          readingMinutes: true,
          publishedAt: true,
          isFeatured: true,
          viewCount: true,
          category: { select: { slug: true, name: true } },
          tags: { select: { tag: { select: { slug: true, name: true } } } },
        },
      }),
    ]);

    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({
      posts: posts.map((post) => ({ ...post, tags: post.tags.map((t) => t.tag) })),
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) || 1 },
    });
  }),
);

publicRouter.get(
  "/posts/:slug",
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({
      where: {
        slug: param(req, "slug"),
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
      },
      include: {
        category: { select: { slug: true, name: true } },
        tags: { select: { tag: { select: { slug: true, name: true } } } },
        relatedTo: {
          where: { status: "PUBLISHED" },
          select: {
            slug: true,
            title: true,
            excerpt: true,
            coverImageUrl: true,
            readingMinutes: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!post) throw notFound("That article does not exist.");

    // Fire-and-forget: a failed counter must not break the page.
    void prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    let related = post.relatedTo;

    // Fall back to same-category articles when none were curated by hand.
    if (related.length === 0 && post.categoryId) {
      related = await prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          categoryId: post.categoryId,
          id: { not: post.id },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          readingMinutes: true,
          publishedAt: true,
        },
      });
    }

    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({
      post: { ...post, tags: post.tags.map((t) => t.tag), relatedTo: undefined },
      related,
    });
  }),
);

publicRouter.get(
  "/taxonomy",
  asyncHandler(async (_req, res) => {
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        orderBy: { order: "asc" },
        select: {
          slug: true,
          name: true,
          description: true,
          _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
        },
      }),
      prisma.tag.findMany({
        orderBy: { name: "asc" },
        select: {
          slug: true,
          name: true,
          _count: { select: { posts: true } },
        },
      }),
    ]);

    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({
      categories: categories.map((c) => ({ ...c, postCount: c._count.posts, _count: undefined })),
      tags: tags.map((t) => ({ ...t, postCount: t._count.posts, _count: undefined })),
    });
  }),
);
