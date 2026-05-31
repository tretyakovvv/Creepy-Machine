import { OAuth2Client } from "google-auth-library";
import { createHash, randomUUID } from "crypto";
import {
  upsertUser,
  createSession,
  getSession,
  deleteSession,
  getSetting,
  runTransaction,
  getUserById,
  getGuestUserIdByIpHash,
  upsertGuestAccess,
} from "./db.js";

const SESSION_DAYS = 30;
const SESSION_COOKIE_NAME = "cm_auth_token";

function getSessionCookieDomain() {
  const configured = (process.env.SESSION_COOKIE_DOMAIN || "").trim();
  if (configured) return configured.replace(/^\.+/, "");

  const siteUrl = (process.env.SITE_URL || "").trim();
  try {
    const host = new URL(siteUrl).hostname;
    if (host && !["localhost", "127.0.0.1", "::1"].includes(host)) return host.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return "";
}

function getSessionCookieBaseOptions() {
  const secure = (process.env.SITE_URL || "").startsWith("https://") || process.env.NODE_ENV === "production";
  const options = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  const domain = getSessionCookieDomain();
  if (domain) options.push(`Domain=${domain}`);
  if (secure) options.push("Secure");
  return options;
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${getSessionCookieBaseOptions().join("; ")}`,
  ]);
}

export function clearSessionCookie(res) {
  const opts = ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  const domain = getSessionCookieDomain();
  if (domain) opts.push(`Domain=${domain}`);
  if ((process.env.SITE_URL || "").startsWith("https://") || process.env.NODE_ENV === "production") {
    opts.push("Secure");
  }
  res.setHeader("Set-Cookie", [`${SESSION_COOKIE_NAME}=; ${opts.join("; ")}`]);
}

function getGoogleClient() {
  const clientId = getConfiguredGoogleClientId();
  if (!clientId) return null;
  return new OAuth2Client(clientId);
}

export function getConfiguredGoogleAuth() {
  const envClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const setting = getSetting("google_auth") || {};
  const settingClientId = (setting.clientId || "").trim();
  const enabled = setting.enabled ?? !!envClientId;

  return {
    enabled: !!enabled && !!(settingClientId || envClientId),
    clientId: settingClientId || envClientId,
    source: settingClientId ? "admin" : envClientId ? "env" : "none",
  };
}

export function getConfiguredGoogleClientId() {
  const config = getConfiguredGoogleAuth();
  return config.enabled ? config.clientId : "";
}

export async function verifyGoogleCredential(credential) {
  const client = getGoogleClient();
  if (!client) throw new Error("GOOGLE_NOT_CONFIGURED");
  const clientId = getConfiguredGoogleClientId();

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture || null,
    provider: "google",
  };
}

export function createUserSession(userData) {
  const user = upsertUser(userData);
  const token = randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  createSession(token, user.id, expires.toISOString());

  const session = getSession(token);
  return {
    token,
    user: session.user,
    subscription: session.user.subscription,
  };
}

export function createGuestSessionForIp(ip) {
  const ipHash = createHash("sha256")
    .update(`${String(ip || "")}:${process.env.SESSION_SECRET || process.env.DB_ENCRYPTION_KEY || ""}`)
    .digest("hex");

  return runTransaction(() => {
    const existingUserId = getGuestUserIdByIpHash(ipHash);
    if (existingUserId) {
      const existingUser = getUserById(existingUserId);
      if (existingUser) {
        return createUserSession(existingUser);
      }
      const error = new Error("GUEST_IP_LOCKED");
      error.status = 429;
      throw error;
    }

    const guestId = `guest-${randomUUID()}`;
    const session = createUserSession({
      id: guestId,
      email: `${guestId}@guest.local`,
      name: "Guest",
      picture: null,
      provider: "guest",
    });
    upsertGuestAccess(ipHash, session.user.id);
    return session;
  });
}

export function extractSessionTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = String(cookieHeader).match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function resolveSession(token) {
  if (!token) return null;
  return getSession(token);
}

export function destroySession(token) {
  if (token) deleteSession(token);
}
