import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { uniqueSectionSlug } from "../lib/content.js";
import { triggerFrontendRebuild } from "../lib/deploy-hook.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminSectionsRouter = Router();

const sectionTypes = [
  "PROJECTS",
  "SKILLS",
  "TIMELINE",
  "ACCOLADES",
  "IMPACT",
  "BLOG_TEASER",
  "CTA",
  "CUSTOM",
] as const;

const blockTypes = [
  "HEADING",
  "PARAGRAPH",
  "IMAGE",
  "QUOTE",
  "BUTTON",
  "DIVIDER",
  "LIST",
  "HTML",
] as const;

const createSectionSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(300).nullable().optional(),
  type: z.enum(sectionTypes),
  slug: z.string().max(80).optional(),
  isPublished: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
});

const updateSectionSchema = createSectionSchema.partial();

adminSectionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sections = await prisma.section.findMany({
      orderBy: { order: "asc" },
      include: {
        cta: true,
        blocks: { orderBy: { order: "asc" } },
        _count: {
          select: {
            projects: true,
            skillCategories: true,
            timelineEntries: true,
            accolades: true,
            impactStories: true,
            impactMetrics: true,
            stats: true,
          },
        },
      },
    });
    res.json({ sections });
  }),
);

adminSectionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const section = await prisma.section.findUniqueOrThrow({
      where: { id: param(req, "id") },
      include: {
        cta: true,
        blocks: { orderBy: { order: "asc" } },
        projects: { orderBy: { order: "asc" } },
        skillCategories: {
          orderBy: { order: "asc" },
          include: { items: { orderBy: { order: "asc" } } },
        },
        timelineEntries: { orderBy: { order: "asc" } },
        stats: { orderBy: { order: "asc" } },
        accolades: { orderBy: { order: "asc" } },
        impactStories: { orderBy: { order: "asc" } },
        impactMetrics: { orderBy: { order: "asc" } },
      },
    });
    res.json({ section });
  }),
);

adminSectionsRouter.post(
  "/",
  validateBody(createSectionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSectionSchema>;
    const [count, slug] = await Promise.all([
      prisma.section.count(),
      uniqueSectionSlug(body.slug ?? body.title),
    ]);

    const section = await prisma.section.create({
      data: {
        title: body.title,
        subtitle: body.subtitle ?? null,
        type: body.type,
        slug,
        isPublished: body.isPublished,
        config: (body.config ?? undefined) as never,
        order: count,
      },
      include: { cta: true, blocks: true },
    });

    triggerFrontendRebuild(`section created: ${section.slug}`);
    res.status(201).json({ section });
  }),
);

adminSectionsRouter.put(
  "/:id",
  validateBody(updateSectionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateSectionSchema>;

    const slug =
      body.slug !== undefined
        ? await uniqueSectionSlug(body.slug, param(req, "id"))
        : undefined;

    const section = await prisma.section.update({
      where: { id: param(req, "id") },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
        ...(body.config !== undefined ? { config: (body.config ?? undefined) as never } : {}),
        ...(slug ? { slug } : {}),
      },
      include: { cta: true, blocks: { orderBy: { order: "asc" } } },
    });

    triggerFrontendRebuild(`section updated: ${section.slug}`);
    res.json({ section });
  }),
);

adminSectionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.section.delete({ where: { id: param(req, "id") } });
    triggerFrontendRebuild("section deleted");
    res.json({ ok: true });
  }),
);

adminSectionsRouter.post(
  "/reorder",
  validateBody(z.object({ ids: z.array(z.string().min(1)) })),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    await prisma.$transaction(
      ids.map((id, index) => prisma.section.update({ where: { id }, data: { order: index } })),
    );
    triggerFrontendRebuild("sections reordered");
    res.json({ ok: true });
  }),
);

// --- Call to action (the CV / GitHub banners) -------------------------------

const ctaSchema = z.object({
  heading: z.string().min(1).max(160),
  subheading: z.string().max(300).nullable().optional(),
  buttonLabel: z.string().min(1).max(60),
  buttonUrl: z.string().min(1),
  icon: z.string().max(40).nullable().optional(),
  decoration: z.string().max(10).nullable().optional(),
});

adminSectionsRouter.put(
  "/:id/cta",
  validateBody(ctaSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof ctaSchema>;
    const cta = await prisma.callToAction.upsert({
      where: { sectionId: param(req, "id") },
      create: { ...body, sectionId: param(req, "id") },
      update: body,
    });
    triggerFrontendRebuild("cta updated");
    res.json({ cta });
  }),
);

// --- Content blocks (custom sections) ---------------------------------------

const blockSchema = z.object({
  type: z.enum(blockTypes),
  data: z.record(z.string(), z.unknown()),
});

adminSectionsRouter.post(
  "/:id/blocks",
  validateBody(blockSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof blockSchema>;
    const count = await prisma.contentBlock.count({ where: { sectionId: param(req, "id") } });
    const block = await prisma.contentBlock.create({
      data: {
        sectionId: param(req, "id"),
        type: body.type,
        data: body.data as never,
        order: count,
      },
    });
    triggerFrontendRebuild("block added");
    res.status(201).json({ block });
  }),
);

adminSectionsRouter.put(
  "/blocks/:blockId",
  validateBody(blockSchema.partial()),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof blockSchema>>;
    const block = await prisma.contentBlock.update({
      where: { id: param(req, "blockId") },
      data: {
        ...(body.type ? { type: body.type } : {}),
        ...(body.data ? { data: body.data as never } : {}),
      },
    });
    triggerFrontendRebuild("block updated");
    res.json({ block });
  }),
);

adminSectionsRouter.delete(
  "/blocks/:blockId",
  asyncHandler(async (req, res) => {
    await prisma.contentBlock.delete({ where: { id: param(req, "blockId") } });
    triggerFrontendRebuild("block deleted");
    res.json({ ok: true });
  }),
);

adminSectionsRouter.post(
  "/:id/blocks/reorder",
  validateBody(z.object({ ids: z.array(z.string().min(1)) })),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    await prisma.$transaction(
      ids.map((id, index) => prisma.contentBlock.update({ where: { id }, data: { order: index } })),
    );
    res.json({ ok: true });
  }),
);
