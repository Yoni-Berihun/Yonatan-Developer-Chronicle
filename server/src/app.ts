import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, env, isProduction } from "./env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";
import { contactRouter } from "./routes/contact.js";
import { feedRouter } from "./routes/feed.js";
import { adminSettingsRouter } from "./routes/admin-settings.js";
import { adminSectionsRouter } from "./routes/admin-sections.js";
import { adminPortfolioRouter } from "./routes/admin-portfolio.js";
import { adminBlogRouter } from "./routes/admin-blog.js";
import { adminMediaRouter } from "./routes/admin-media.js";
import { adminInboxRouter } from "./routes/admin-inbox.js";
import { adminAnalyticsRouter } from "./routes/admin-analytics.js";
import "./types.js";

export function createApp() {
  const app = express();

  // Vercel terminates TLS at its proxy; without this req.ip is the proxy and
  // rate limiting would bucket every visitor together.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // the frontend is served by Vercel, not here
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // In production the frontend proxies /api through Vercel, so requests are
  // same-origin and CORS never comes into play. It stays enabled for local
  // development and any direct API consumers.
  app.use(
    cors({
      origin: isProduction ? corsOrigins : true,
      credentials: true,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV, time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/feed", feedRouter);

  app.use("/api/admin/settings", requireAuth, adminSettingsRouter);
  app.use("/api/admin/sections", requireAuth, adminSectionsRouter);
  app.use("/api/admin/portfolio", requireAuth, adminPortfolioRouter);
  app.use("/api/admin/blog", requireAuth, adminBlogRouter);
  app.use("/api/admin/media", requireAuth, adminMediaRouter);
  app.use("/api/admin/inbox", requireAuth, adminInboxRouter);
  app.use("/api/admin/analytics", requireAuth, adminAnalyticsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
