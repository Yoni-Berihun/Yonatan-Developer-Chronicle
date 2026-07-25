import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { deleteImage } from "../lib/cloudinary.js";
import { triggerFrontendRebuild } from "../lib/deploy-hook.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminPortfolioRouter = Router();

const reorderSchema = z.object({ ids: z.array(z.string().min(1)) });

// --- Projects ---------------------------------------------------------------

const projectSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(1000),
  techTags: z.array(z.string().min(1).max(40)).max(12).default([]),
  imageUrl: z.string().min(1),
  imageAlt: z.string().max(200).default(""),
  imagePublicId: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  linkLabel: z.string().max(60).default("View Live Demo"),
  isArchived: z.boolean().default(false),
  featured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

adminPortfolioRouter.post(
  "/projects",
  validateBody(projectSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof projectSchema>;
    const count = await prisma.project.count({ where: { sectionId: body.sectionId } });
    const project = await prisma.project.create({ data: { ...body, order: count } });
    triggerFrontendRebuild("project created");
    res.status(201).json({ project });
  }),
);

adminPortfolioRouter.put(
  "/projects/:id",
  validateBody(projectSchema.partial()),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof projectSchema>>,
    });
    triggerFrontendRebuild("project updated");
    res.json({ project });
  }),
);

adminPortfolioRouter.delete(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.delete({ where: { id: param(req, "id") } });
    if (project.imagePublicId) await deleteImage(project.imagePublicId);
    triggerFrontendRebuild("project deleted");
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/projects/reorder",
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reorderSchema>;
    await prisma.$transaction(
      ids.map((id, index) => prisma.project.update({ where: { id }, data: { order: index } })),
    );
    triggerFrontendRebuild("projects reordered");
    res.json({ ok: true });
  }),
);

// --- Skills -----------------------------------------------------------------

const skillCategorySchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1).max(120),
});

const skillItemSchema = z.object({
  categoryId: z.string().min(1),
  heading: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
});

adminPortfolioRouter.post(
  "/skill-categories",
  validateBody(skillCategorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof skillCategorySchema>;
    const count = await prisma.skillCategory.count({ where: { sectionId: body.sectionId } });
    const category = await prisma.skillCategory.create({
      data: { ...body, order: count },
      include: { items: true },
    });
    triggerFrontendRebuild("skill category created");
    res.status(201).json({ category });
  }),
);

adminPortfolioRouter.put(
  "/skill-categories/:id",
  validateBody(skillCategorySchema.partial()),
  asyncHandler(async (req, res) => {
    const category = await prisma.skillCategory.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof skillCategorySchema>>,
      include: { items: { orderBy: { order: "asc" } } },
    });
    triggerFrontendRebuild("skill category updated");
    res.json({ category });
  }),
);

adminPortfolioRouter.delete(
  "/skill-categories/:id",
  asyncHandler(async (req, res) => {
    await prisma.skillCategory.delete({ where: { id: param(req, "id") } });
    triggerFrontendRebuild("skill category deleted");
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/skill-items",
  validateBody(skillItemSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof skillItemSchema>;
    const count = await prisma.skillItem.count({ where: { categoryId: body.categoryId } });
    const item = await prisma.skillItem.create({ data: { ...body, order: count } });
    triggerFrontendRebuild("skill item created");
    res.status(201).json({ item });
  }),
);

adminPortfolioRouter.put(
  "/skill-items/:id",
  validateBody(skillItemSchema.partial()),
  asyncHandler(async (req, res) => {
    const item = await prisma.skillItem.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof skillItemSchema>>,
    });
    triggerFrontendRebuild("skill item updated");
    res.json({ item });
  }),
);

adminPortfolioRouter.delete(
  "/skill-items/:id",
  asyncHandler(async (req, res) => {
    await prisma.skillItem.delete({ where: { id: param(req, "id") } });
    triggerFrontendRebuild("skill item deleted");
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/skill-items/reorder",
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reorderSchema>;
    await prisma.$transaction(
      ids.map((id, index) => prisma.skillItem.update({ where: { id }, data: { order: index } })),
    );
    res.json({ ok: true });
  }),
);

// --- Timeline + stats -------------------------------------------------------

const timelineSchema = z.object({
  sectionId: z.string().min(1),
  dateLabel: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  logoUrl: z.string().nullable().optional(),
  logoAlt: z.string().max(200).default(""),
  isPublished: z.boolean().default(true),
});

const statSchema = z.object({
  sectionId: z.string().min(1),
  value: z.string().min(1).max(20),
  label: z.string().min(1).max(80),
});

adminPortfolioRouter.post(
  "/timeline",
  validateBody(timelineSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof timelineSchema>;
    const count = await prisma.timelineEntry.count({ where: { sectionId: body.sectionId } });
    const entry = await prisma.timelineEntry.create({ data: { ...body, order: count } });
    triggerFrontendRebuild("timeline entry created");
    res.status(201).json({ entry });
  }),
);

adminPortfolioRouter.put(
  "/timeline/:id",
  validateBody(timelineSchema.partial()),
  asyncHandler(async (req, res) => {
    const entry = await prisma.timelineEntry.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof timelineSchema>>,
    });
    triggerFrontendRebuild("timeline entry updated");
    res.json({ entry });
  }),
);

adminPortfolioRouter.delete(
  "/timeline/:id",
  asyncHandler(async (req, res) => {
    await prisma.timelineEntry.delete({ where: { id: param(req, "id") } });
    triggerFrontendRebuild("timeline entry deleted");
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/timeline/reorder",
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reorderSchema>;
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.timelineEntry.update({ where: { id }, data: { order: index } }),
      ),
    );
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/stats",
  validateBody(statSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof statSchema>;
    const count = await prisma.stat.count({ where: { sectionId: body.sectionId } });
    const stat = await prisma.stat.create({ data: { ...body, order: count } });
    triggerFrontendRebuild("stat created");
    res.status(201).json({ stat });
  }),
);

adminPortfolioRouter.put(
  "/stats/:id",
  validateBody(statSchema.partial()),
  asyncHandler(async (req, res) => {
    const stat = await prisma.stat.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof statSchema>>,
    });
    triggerFrontendRebuild("stat updated");
    res.json({ stat });
  }),
);

adminPortfolioRouter.delete(
  "/stats/:id",
  asyncHandler(async (req, res) => {
    await prisma.stat.delete({ where: { id: param(req, "id") } });
    triggerFrontendRebuild("stat deleted");
    res.json({ ok: true });
  }),
);

// --- Accolades --------------------------------------------------------------

const accoladeSchema = z.object({
  sectionId: z.string().min(1),
  dateLabel: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  description: z.string().min(1).max(1500),
  imageUrl: z.string().min(1),
  imageAlt: z.string().max(200).default(""),
  imagePublicId: z.string().nullable().optional(),
  isPublished: z.boolean().default(true),
});

adminPortfolioRouter.post(
  "/accolades",
  validateBody(accoladeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof accoladeSchema>;
    const count = await prisma.accolade.count({ where: { sectionId: body.sectionId } });
    const accolade = await prisma.accolade.create({ data: { ...body, order: count } });
    triggerFrontendRebuild("accolade created");
    res.status(201).json({ accolade });
  }),
);

adminPortfolioRouter.put(
  "/accolades/:id",
  validateBody(accoladeSchema.partial()),
  asyncHandler(async (req, res) => {
    const accolade = await prisma.accolade.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof accoladeSchema>>,
    });
    triggerFrontendRebuild("accolade updated");
    res.json({ accolade });
  }),
);

adminPortfolioRouter.delete(
  "/accolades/:id",
  asyncHandler(async (req, res) => {
    const accolade = await prisma.accolade.delete({ where: { id: param(req, "id") } });
    if (accolade.imagePublicId) await deleteImage(accolade.imagePublicId);
    triggerFrontendRebuild("accolade deleted");
    res.json({ ok: true });
  }),
);

adminPortfolioRouter.post(
  "/accolades/reorder",
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reorderSchema>;
    await prisma.$transaction(
      ids.map((id, index) => prisma.accolade.update({ where: { id }, data: { order: index } })),
    );
    res.json({ ok: true });
  }),
);
