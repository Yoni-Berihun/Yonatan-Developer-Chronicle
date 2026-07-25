import { createHash } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendContactNotification } from "../lib/mailer.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const contactRouter = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "You have sent several messages already. Please try again later." },
});

const contactSchema = z.object({
  name: z.string().min(1, "Tell me your name").max(120),
  email: z
    .string()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "That email address does not look right"),
  subject: z.string().min(1, "Add a subject").max(200),
  message: z.string().min(10, "Please write at least a sentence or two").max(5000),
  // Honeypot: real people never see this field, bots fill it in. It has to
  // accept a value rather than reject one, otherwise validation answers with a
  // 400 and tells the bot it was spotted — the handler discards it silently.
  botField: z.string().max(200).optional(),
});

function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

contactRouter.post(
  "/",
  contactLimiter,
  validateBody(contactSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof contactSchema>;

    // Silently accept honeypot submissions so bots do not learn they failed.
    if (body.botField) {
      res.status(201).json({ ok: true });
      return;
    }

    await prisma.contactMessage.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        subject: body.subject.trim(),
        message: body.message.trim(),
        userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
        ipHash: hashIp(req.ip),
      },
    });

    void sendContactNotification({
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
    });

    res.status(201).json({ ok: true });
  }),
);
