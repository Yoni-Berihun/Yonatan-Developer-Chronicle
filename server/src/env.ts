import "dotenv/config";
import { z } from "zod";

// Deliberately avoids zod's `.url()` / `.email()` string helpers so the schema
// behaves identically across zod 3 and 4.
const emailish = z
  .string()
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "must be a valid email address");

const urlish = z.string().regex(/^https?:\/\/.+/, "must start with http(s)://");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters — generate one with `openssl rand -base64 48`"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_DOMAIN: z.string().optional(),

  // Seeded on first boot when no admin exists yet.
  ADMIN_EMAIL: emailish,
  ADMIN_PASSWORD: z.string().min(10).optional(),
  ADMIN_NAME: z.string().default("Yonatan Berihun"),

  PUBLIC_SITE_URL: urlish.default("http://localhost:5173"),
  // Comma-separated. Only needed when the frontend calls the API cross-origin
  // rather than through the Vercel proxy rewrite.
  CORS_ORIGINS: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("yonatan-times"),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("The Yonatan Times <onboarding@resend.dev>"),
  CONTACT_NOTIFY_EMAIL: emailish.optional(),

  // Called after publishing content so the prerendered frontend rebuilds.
  VERCEL_DEPLOY_HOOK_URL: urlish.optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";

export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

export const mailerConfigured = Boolean(env.RESEND_API_KEY && env.CONTACT_NOTIFY_EMAIL);

export const corsOrigins = (env.CORS_ORIGINS ?? env.PUBLIC_SITE_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
