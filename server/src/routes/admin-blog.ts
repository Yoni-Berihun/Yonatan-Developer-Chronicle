import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { buildExcerpt, estimateReadingMinutes, toSlug, uniquePostSlug } from "../lib/content.js";
import { deleteImage } from "../lib/cloudinary.js";
import { triggerFrontendRebuild } from "../lib/deploy-hook.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminBlogRouter = Router();

const postSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(120).optional(),
  excerpt: z.string().max(400).optional(),
  contentMarkdown: z.string().default(""),
  coverImageUrl: z.string().nullable().optional(),
  coverImageAlt: z.string().max(200).default(""),
  coverPublicId: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  publishedAt: z.string().datetime().nullable().optional(),
  isFeatured: z.boolean().default(false),
  metaTitle: z.string().max(160).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  ogImageUrl: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tagNames: z.array(z.string().min(1).max(40)).max(15).default([]),
  relatedPostIds: z.array(z.string().min(1)).max(6).default([]),
});

/** Turns free-text tag names into Tag rows, reusing existing ones by slug. */
async function resolveTagIds(names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  const tags = await Promise.all(
    unique.map((name) => {
      const slug = toSlug(name);
      return prisma.tag.upsert({
        where: { slug },
        create: { slug, name },
        update: {},
        select: { id: true },
      });
    }),
  );

  return tags.map((tag) => tag.id);
}

adminBlogRouter.get(
  "/posts",
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const posts = await prisma.post.findMany({
      where: status === "DRAFT" || status === "PUBLISHED" ? { status } : {},
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        readingMinutes: true,
        viewCount: true,
        coverImageUrl: true,
        updatedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });

    res.json({ posts: posts.map((p) => ({ ...p, tags: p.tags.map((t) => t.tag) })) });
  }),
);

adminBlogRouter.get(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: param(req, "id") },
      include: {
        category: true,
        tags: { select: { tag: true } },
        relatedTo: { select: { id: true, title: true, slug: true } },
      },
    });

    res.json({
      post: {
        ...post,
        tags: post.tags.map((t) => t.tag),
        relatedPostIds: post.relatedTo.map((p) => p.id),
      },
    });
  }),
);

adminBlogRouter.post(
  "/posts",
  validateBody(postSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof postSchema>;

    const slug = await uniquePostSlug(body.slug || body.title);
    const tagIds = await resolveTagIds(body.tagNames);
    const shouldPublish = body.status === "PUBLISHED";

    const post = await prisma.post.create({
      data: {
        slug,
        title: body.title,
        excerpt: body.excerpt?.trim() || buildExcerpt(body.contentMarkdown),
        contentMarkdown: body.contentMarkdown,
        coverImageUrl: body.coverImageUrl ?? null,
        coverImageAlt: body.coverImageAlt,
        coverPublicId: body.coverPublicId ?? null,
        readingMinutes: estimateReadingMinutes(body.contentMarkdown),
        status: body.status,
        publishedAt: shouldPublish ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null,
        isFeatured: body.isFeatured,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        ogImageUrl: body.ogImageUrl ?? null,
        categoryId: body.categoryId ?? null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        relatedTo: { connect: body.relatedPostIds.map((id) => ({ id })) },
      },
    });

    if (shouldPublish) triggerFrontendRebuild(`post published: ${post.slug}`);
    res.status(201).json({ post });
  }),
);

adminBlogRouter.put(
  "/posts/:id",
  validateBody(postSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof postSchema>>;
    const existing = await prisma.post.findUniqueOrThrow({ where: { id: param(req, "id") } });

    const slug =
      body.slug !== undefined || body.title !== undefined
        ? await uniquePostSlug(body.slug || body.title || existing.title, existing.id)
        : undefined;

    const nextStatus = body.status ?? existing.status;
    const becomingPublished = nextStatus === "PUBLISHED" && existing.status !== "PUBLISHED";

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: {
        ...(slug ? { slug } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.contentMarkdown !== undefined
          ? {
              contentMarkdown: body.contentMarkdown,
              readingMinutes: estimateReadingMinutes(body.contentMarkdown),
            }
          : {}),
        ...(body.excerpt !== undefined
          ? {
              excerpt:
                body.excerpt.trim() ||
                buildExcerpt(body.contentMarkdown ?? existing.contentMarkdown),
            }
          : {}),
        ...(body.coverImageUrl !== undefined ? { coverImageUrl: body.coverImageUrl } : {}),
        ...(body.coverImageAlt !== undefined ? { coverImageAlt: body.coverImageAlt } : {}),
        ...(body.coverPublicId !== undefined ? { coverPublicId: body.coverPublicId } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.metaTitle !== undefined ? { metaTitle: body.metaTitle } : {}),
        ...(body.metaDescription !== undefined ? { metaDescription: body.metaDescription } : {}),
        ...(body.ogImageUrl !== undefined ? { ogImageUrl: body.ogImageUrl } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        publishedAt: becomingPublished
          ? (body.publishedAt ? new Date(body.publishedAt) : new Date())
          : nextStatus === "DRAFT"
            ? null
            : body.publishedAt !== undefined && body.publishedAt !== null
              ? new Date(body.publishedAt)
              : existing.publishedAt,
        ...(body.tagNames !== undefined
          ? {
              tags: {
                deleteMany: {},
                create: (await resolveTagIds(body.tagNames)).map((tagId) => ({ tagId })),
              },
            }
          : {}),
        ...(body.relatedPostIds !== undefined
          ? { relatedTo: { set: body.relatedPostIds.map((id) => ({ id })) } }
          : {}),
      },
    });

    if (nextStatus === "PUBLISHED") triggerFrontendRebuild(`post updated: ${post.slug}`);
    res.json({ post });
  }),
);

adminBlogRouter.delete(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await prisma.post.delete({ where: { id: param(req, "id") } });
    if (post.coverPublicId) await deleteImage(post.coverPublicId);
    triggerFrontendRebuild("post deleted");
    res.json({ ok: true });
  }),
);

// --- Categories -------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
});

adminBlogRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    res.json({ categories });
  }),
);

adminBlogRouter.post(
  "/categories",
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof categorySchema>;
    const count = await prisma.category.count();
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: toSlug(body.name),
        description: body.description ?? null,
        order: count,
      },
    });
    res.status(201).json({ category });
  }),
);

adminBlogRouter.put(
  "/categories/:id",
  validateBody(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof categorySchema>>;
    const category = await prisma.category.update({
      where: { id: param(req, "id") },
      data: {
        ...(body.name ? { name: body.name, slug: toSlug(body.name) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    res.json({ category });
  }),
);

adminBlogRouter.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

// --- Tags -------------------------------------------------------------------

adminBlogRouter.get(
  "/tags",
  asyncHandler(async (_req, res) => {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    res.json({ tags });
  }),
);

adminBlogRouter.delete(
  "/tags/:id",
  asyncHandler(async (req, res) => {
    await prisma.tag.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);
