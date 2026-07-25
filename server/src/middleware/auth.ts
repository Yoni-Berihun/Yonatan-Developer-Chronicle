import type { CookieOptions, NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { unauthorized } from "../lib/http-error.js";
import type { AdminIdentity } from "../types.js";

export const AUTH_COOKIE = "yt_session";

interface TokenPayload {
  sub: string;
  email: string;
}

export function signSession(admin: AdminIdentity): string {
  const payload: TokenPayload = { sub: admin.id, email: admin.email };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function sessionCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    // Keyed on the actual connection rather than NODE_ENV: a `Secure` cookie is
    // dropped silently over plain HTTP, which would break sign-in on localhost
    // for anyone whose shell exports NODE_ENV=production. Behind Render's proxy
    // this reads X-Forwarded-Proto, which is why `trust proxy` is set in app.ts.
    secure: req.secure,
    // The frontend reaches the API through a same-origin proxy rewrite, so the
    // cookie stays first-party and `lax` is enough. `none` would be required
    // only if the browser talked to the Render domain directly.
    sameSite: "lax",
    path: "/",
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];

  if (!token) {
    next(unauthorized("You need to sign in to do that."));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(unauthorized("Your session has expired. Please sign in again."));
  }
}
