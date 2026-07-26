import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { deleteImage, uploadImage } from "../lib/cloudinary.js";
import { badRequest } from "../lib/http-error.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminMediaRouter = Router();

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  // Leave room for multipart overhead under Vercel's 4.5 MB request limit.
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, GIF and AVIF images are allowed."));
      return;
    }
    cb(null, true);
  },
});

adminMediaRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ assets });
  }),
);

adminMediaRouter.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("Choose an image to upload.");

    const folder = typeof req.body?.folder === "string" ? req.body.folder : undefined;
    const alt = typeof req.body?.alt === "string" ? req.body.alt : "";

    const uploaded = await uploadImage(req.file.buffer, { folder });

    const asset = await prisma.mediaAsset.create({
      data: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        format: uploaded.format ?? null,
        bytes: uploaded.bytes ?? null,
        folder: folder ?? "portfolio",
        alt,
      },
    });

    res.status(201).json({ asset });
  }),
);

adminMediaRouter.put(
  "/:id",
  validateBody(z.object({ alt: z.string().max(200) })),
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.update({
      where: { id: param(req, "id") },
      data: { alt: (req.body as { alt: string }).alt },
    });
    res.json({ asset });
  }),
);

adminMediaRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.delete({ where: { id: param(req, "id") } });
    await deleteImage(asset.publicId);
    res.json({ ok: true });
  }),
);
