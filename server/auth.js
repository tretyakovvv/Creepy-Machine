import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import {
  upsertUser,
  createSession,
  getSession,
  deleteSession,
  getSetting,
} from "./db.js";

const SESSION_DAYS = 30;

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

export function resolveSession(token) {
  if (!token) return null;
  return getSession(token);
}

export function destroySession(token) {
  if (token) deleteSession(token);
}
