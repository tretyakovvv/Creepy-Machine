import { resolveSession } from "./auth.js";
import { getDailyUsage } from "./db.js";

export function authOptional(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const session = resolveSession(token);
    if (session) {
      req.user = session.user;
      req.token = token;
    }
  }
  next();
}

export function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }
  const session = resolveSession(token);
  if (!session) {
    return res.status(401).json({ error: "SESSION_EXPIRED" });
  }
  req.user = session.user;
  req.token = token;
  next();
}

export function adminRequired(req, res, next) {
  const password = req.headers["x-admin-password"] || req.body?.adminPassword;
  const expectedPassword = process.env.ADMIN_PASSWORD || "creepy2024";
  if (!password || password !== expectedPassword) {
    return res.status(403).json({ error: "ADMIN_FORBIDDEN" });
  }
  next();
}

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.headers["x-session-token"] || null;
}

export function getFreeLimit() {
  return parseInt(process.env.FREE_GENERATIONS_PER_DAY || "3", 10);
}

export function checkCanGenerate(user) {
  if (!user) return { allowed: false, reason: "AUTH_REQUIRED" };

  const sub = user.subscription;
  if (sub?.active) {
    if (sub.generationsLeft != null && sub.generationsLeft <= 0) {
      return { allowed: false, reason: "SUBSCRIPTION_LIMIT" };
    }
    return { allowed: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  const count = getDailyUsage(user.id, today);
  const limit = getFreeLimit();
  if (count >= limit) return { allowed: false, reason: "DAILY_LIMIT" };
  return { allowed: true };
}
