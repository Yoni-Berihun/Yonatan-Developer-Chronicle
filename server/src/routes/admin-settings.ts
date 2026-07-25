import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { notFound } from "../lib/http-error.js";
import { triggerFrontendRebuild } from "../lib/deploy-hook.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminSettingsRouter = Router();

const settingsSchema = z.object({
  siteTitle: z.string().min(1).max(120),
  siteSubtitle: z.string().max(200),
  volumeLabel: z.string().max(80),
  editionLabel: z.string().max(80),
  datelineText: z.string().max(120),

  authorName: z.string().min(1).max(120),
  authorSubtitle: z.string().max(200),
  aboutParagraphs: z.array(z.string().min(1)).min(1).max(10),
  portraitUrl: z.string().min(1),
  portraitAlt: z.string().max(200),

  cvTitle: z.string().max(120),
  cvSubtitle: z.string().max(240),
  cvUrl: z.string().min(1),
  cvEnabled: z.boolean(),

  contactIntro: z.string().max(600),

  footerAbout: z.string().max(1200),
  copyright: z.string().max(200),

  metaTitle: z.string().min(1).max(160),
  metaDescription: z.string().min(1).max(320),
  ogImageUrl: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
});

adminSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (!settings) throw notFound("Settings have not been initialised. Run the seed script.");
    res.json({ settings });
  }),
);

adminSettingsRouter.put(
  "/",
  validateBody(settingsSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof settingsSchema>;
    const settings = await prisma.siteSettings.update({
      where: { id: 1 },
      data,
    });
    triggerFrontendRebuild("site settings updated");
    res.json({ settings });
  }),
);

// --- Social links -----------------------------------------------------------

const socialSchema = z.object({
  platform: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  url: z.string().min(1),
  isActive: z.boolean().default(true),
});

adminSettingsRouter.get(
  "/social",
  asyncHandler(async (_req, res) => {
    res.json({ socialLinks: await prisma.socialLink.findMany({ orderBy: { order: "asc" } }) });
  }),
);

adminSettingsRouter.post(
  "/social",
  validateBody(socialSchema),
  asyncHandler(async (req, res) => {
    const count = await prisma.socialLink.count();
    const socialLink = await prisma.socialLink.create({
      data: { ...(req.body as z.infer<typeof socialSchema>), order: count },
    });
    res.status(201).json({ socialLink });
  }),
);

adminSettingsRouter.put(
  "/social/:id",
  validateBody(socialSchema.partial()),
  asyncHandler(async (req, res) => {
    const socialLink = await prisma.socialLink.update({
      where: { id: param(req, "id") },
      data: req.body as Partial<z.infer<typeof socialSchema>>,
    });
    res.json({ socialLink });
  }),
);

adminSettingsRouter.delete(
  "/social/:id",
  asyncHandler(async (req, res) => {
    await prisma.socialLink.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

adminSettingsRouter.post(
  "/social/reorder",
  validateBody(z.object({ ids: z.array(z.string().min(1)) })),
  asyncHandler(async (req, res) => {
    const { ids } = req.body as { ids: string[] };
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.socialLink.update({ where: { id }, data: { order: index } }),
      ),
    );
    res.json({ ok: true });
  }),
);
