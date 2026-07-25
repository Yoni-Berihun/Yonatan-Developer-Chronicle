import path from "node:path";
import { fileURLToPath } from "node:url";
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
import "./types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../../web/dist");
const imagesDir = path.resolve(here, "../../images");

export function createApp() {
  const app = express();

  // Railway (and similar hosts) terminate TLS at the proxy.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // In production the React build is served from this same origin, so the
  // browser never cross-origin calls the API. CORS stays for local Vite
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

  // Friendly aliases used by robots.txt and the original site docs.
  app.get("/rss.xml", (_req, res) => res.redirect(301, "/api/feed/rss.xml"));
  app.get("/sitemap.xml", (_req, res) => res.redirect(301, "/api/feed/sitemap.xml"));

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

  // Seeded content references /images/... from the repo root.
  app.use("/images", express.static(imagesDir, { maxAge: "7d", fallthrough: true }));

  if (isProduction) {
    app.use(
      express.static(webDist, {
        index: false,
        maxAge: "1y",
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );

    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api") || req.path === "/health") return next();
      res.sendFile(path.join(webDist, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
