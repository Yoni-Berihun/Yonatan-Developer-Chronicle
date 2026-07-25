import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { param } from "../lib/params.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const adminInboxRouter = Router();

adminInboxRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const archived = req.query.archived === "true";

    const [messages, unreadCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where: { isArchived: archived },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.contactMessage.count({ where: { isRead: false, isArchived: false } }),
    ]);

    res.json({ messages, unreadCount });
  }),
);

adminInboxRouter.put(
  "/:id",
  validateBody(z.object({ isRead: z.boolean().optional(), isArchived: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({
      where: { id: param(req, "id") },
      data: req.body as { isRead?: boolean; isArchived?: boolean },
    });
    res.json({ message });
  }),
);

adminInboxRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);
