import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../lib/http-error.js";
import { AUTH_COOKIE, requireAuth, sessionCookieOptions, signSession } from "../middleware/auth.js";
import { asyncHandler, validateBody } from "../middleware/validate.js";

export const authRouter = Router();

// Credential stuffing protection. Counted per IP, generous enough that a real
// person fumbling their password is never locked out.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Use at least 10 characters"),
});

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const admin = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Compare against a dummy hash when the user is missing so the response
    // time does not reveal whether the address exists.
    const hash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";
    const valid = await bcrypt.compare(password, hash);

    if (!admin || !valid) {
      throw unauthorized("Email or password is incorrect.");
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const identity = { id: admin.id, email: admin.email };
    res.cookie(AUTH_COOKIE, signSession(identity), sessionCookieOptions(req));
    res.json({ admin: { ...identity, name: admin.name } });
  }),
);

authRouter.post("/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...sessionCookieOptions(req), maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.admin!.id },
      select: { id: true, email: true, name: true, lastLoginAt: true },
    });
    if (!admin) throw unauthorized("Account no longer exists.");
    res.json({ admin });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

    const admin = await prisma.adminUser.findUnique({ where: { id: req.admin!.id } });
    if (!admin) throw unauthorized("Account no longer exists.");

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) throw badRequest("Your current password is incorrect.");

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    // Force a fresh sign-in everywhere else.
    res.clearCookie(AUTH_COOKIE, { ...sessionCookieOptions(req), maxAge: undefined });
    res.json({ ok: true });
  }),
);
