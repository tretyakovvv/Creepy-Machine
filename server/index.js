import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import {
  verifyGoogleCredential,
  createUserSession,
  createGuestSessionForIp,
  destroySession,
  resolveSession,
  getConfiguredGoogleAuth,
} from "./auth.js";
import {
  generateWithAi,
  getPublicModels,
  getAiProviders,
  getAllAiProviders,
  saveAiProviders,
  mergeAiProvidersWithDefaults,
  refreshOpenRouterFreeModels,
} from "./ai.js";
import {
  incrementDailyUsage,
  saveGeneration,
  activateSubscription,
  decrementSubscriptionGenerations,
  getSetting,
  setSetting,
  getDailyUsage,
  runTransaction,
  migrateEncryption,
  isEncryptionEnabled,
  deleteExpiredSessions,
  getDatabaseStatus,
  deleteUserAccount,
  savePayment,
  getPayment,
  markPaymentStatus,
} from "./db.js";
import { authOptional, authRequired, adminRequired, checkCanGenerate } from "./middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  const googleAuth = getConfiguredGoogleAuth();
  res.json({
    ok: true,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    google: !!googleAuth.clientId,
  });
});

app.get("/api/config/public", (_req, res) => {
  const providers = getAiProviders();
  const hasKey = providers.some((p) => p.apiKey);
  const hasEnvKey = !!process.env.OPENROUTER_API_KEY || !!process.env.DEEPSEEK_API_KEY;
  const tempGoogleAuthEnabled = process.env.TEMP_GOOGLE_AUTH_ENABLED === "true";
  const googleAuth = getConfiguredGoogleAuth();
  res.json({
    googleClientId: googleAuth.clientId,
    googleEnabled: googleAuth.enabled && !tempGoogleAuthEnabled,
    tempGoogleAuthEnabled,
    useMock: !hasKey && !hasEnvKey,
    freeGenerationsPerDay: parseInt(process.env.FREE_GENERATIONS_PER_DAY || "3", 10),
    openrouterConfigured: hasKey || hasEnvKey,
    devAuthEnabled:
      tempGoogleAuthEnabled ||
      (process.env.DEV_AUTH_ENABLED === "true" && !googleAuth.clientId),
    models: getPublicModels(),
  });
});

app.post("/api/auth/dev", (req, res) => {
  const tempGoogleAuthEnabled = process.env.TEMP_GOOGLE_AUTH_ENABLED === "true";
  const googleAuth = getConfiguredGoogleAuth();
  if (googleAuth.clientId && !tempGoogleAuthEnabled) {
    return res.status(403).json({ error: "USE_GOOGLE_AUTH" });
  }
  if (!tempGoogleAuthEnabled && process.env.DEV_AUTH_ENABLED !== "true") {
    return res.status(403).json({ error: "DEV_AUTH_DISABLED" });
  }

  const session = createUserSession({
    id: tempGoogleAuthEnabled ? "google-test-user" : "dev-tester",
    email: tempGoogleAuthEnabled ? "google-test@creepymachine.local" : "dev@creepymachine.local",
    name: tempGoogleAuthEnabled ? "Google Test User" : "Test User",
    picture: null,
    provider: tempGoogleAuthEnabled ? "google" : "dev",
  });

  res.json({
    token: session.token,
    user: session.user,
    subscription: session.subscription,
  });
});

app.get("/api/content", (_req, res) => {
  const fandoms = getSetting("fandoms");
  const genres = getSetting("genres");
  res.json({
    fandoms: fandoms || null,
    genres: genres || null,
    faq: getSetting("faq") || null,
    subscriptionPlans: getSetting("subscription_plans") || null,
    subscriptionPage: getSetting("subscription_page") || null,
    requisites: getSetting("requisites") || null,
    privacyPolicyRu: getSetting("privacy_policy_ru") || null,
    termsRu: getSetting("terms_ru") || null,
  });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ error: "CREDENTIAL_REQUIRED" });
    }

    const userData = await verifyGoogleCredential(credential);
    const session = createUserSession(userData);

    res.json({
      token: session.token,
      user: session.user,
      subscription: session.subscription,
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    const code =
      err.message === "GOOGLE_NOT_CONFIGURED"
        ? 503
        : err.message === "INVALID_GOOGLE_TOKEN"
          ? 401
          : 500;
    res.status(code).json({ error: err.message || "AUTH_FAILED" });
  }
});

app.post("/api/auth/guest", (req, res) => {
  try {
    const ip =
      req.ip ||
      String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() ||
      req.socket?.remoteAddress ||
      "";
    const session = createGuestSessionForIp(ip);
    res.json({
      token: session.token,
      user: session.user,
      subscription: session.subscription,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "GUEST_AUTH_FAILED" });
  }
});

app.get("/api/auth/me", authOptional, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "NOT_AUTHENTICATED" });
  }
  res.json({
    user: req.user,
    subscription: req.user.subscription,
  });
});

app.post("/api/auth/logout", authOptional, (req, res) => {
  if (req.token) destroySession(req.token);
  res.json({ ok: true });
});

app.delete("/api/auth/account", authRequired, (req, res) => {
  const deleted = deleteUserAccount(req.user.id);
  if (req.token) destroySession(req.token);
  res.json({ ok: deleted });
});

app.post("/api/generate", authRequired, async (req, res) => {
  try {
    const { prompt, lang = "en", modelId, providerId, intensity } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "PROMPT_REQUIRED" });
    }

    const check = checkCanGenerate(req.user);
    if (!check.allowed) {
      return res.status(403).json({ error: check.reason });
    }

    const providers = getAiProviders();
    if (
      !providers.some((p) => p.apiKey) &&
      !process.env.OPENROUTER_API_KEY &&
      !process.env.DEEPSEEK_API_KEY
    ) {
      return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
    }

    const result = await generateWithAi(prompt.trim(), lang, {
      modelId,
      providerId,
      intensity,
    });
    const { text, model, modelName, providerName } = result;

    const today = new Date().toISOString().slice(0, 10);
    runTransaction(() => {
      saveGeneration({
        userId: req.user.id,
        prompt: prompt.trim(),
        result: text,
        lang,
        model,
      });

      if (req.user.subscription?.active) {
        if (req.user.subscription.generationsLeft != null) {
          decrementSubscriptionGenerations(req.user.id);
        }
      } else {
        incrementDailyUsage(req.user.id, today);
      }
    });

    res.json({ text, model, modelName, providerName });
  } catch (err) {
    console.error("Generate error:", err);
    const status =
      err.message === "API_KEY_NOT_CONFIGURED"
        ? 503
        : err.code === "AI_PROVIDER_ERROR"
          ? 502
          : 500;
    res.status(status).json({
      error: err.code || "GENERATION_FAILED",
      message: err.message,
      providerId: err.providerId,
      model: err.model,
      status: err.status,
    });
  }
});

app.get("/api/usage", authRequired, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    today,
    count: getDailyUsage(req.user.id, today),
    limit: parseInt(process.env.FREE_GENERATIONS_PER_DAY || "3", 10),
    subscription: req.user.subscription,
  });
});

function getPlanPrice(plan) {
  const value = Number(plan.price);
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "0.00";
}

function isLocalSiteUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

function getSiteUrl(req) {
  const configured = process.env.SITE_URL;
  if (configured && !isLocalSiteUrl(configured)) {
    return configured;
  }

  const host = req.get("host");
  if (!host) return configured || "";

  return `${req.protocol}://${host}`;
}

function getReturnUrl(req, planId) {
  const base = getSiteUrl(req);
  return new URL(`/subscription.html?status=success&plan=${encodeURIComponent(planId)}`, base)
    .toString();
}

function getConfiguredYooKassa() {
  const setting = getSetting("yookassa") || {};
  const envShopId = (process.env.YOOKASSA_SHOP_ID || "").trim();
  const envSecretKey = (process.env.YOOKASSA_SECRET_KEY || "").trim();
  const shopId = (setting.shopId || envShopId).trim();
  const secretKey = (setting.secretKey || envSecretKey).trim();
  const hasCredentials = !!shopId && !!secretKey;
  const enabled = setting.enabled ?? hasCredentials;

  return {
    enabled: !!enabled && hasCredentials,
    shopId,
    secretKey,
    returnUrl: setting.returnUrl || process.env.YOOKASSA_RETURN_URL || "/subscription.html?status=success",
    webhookUrl: setting.webhookUrl || "/api/payments/yookassa/webhook",
    createPaymentEndpoint: setting.createPaymentEndpoint || "/api/payments/create",
    source: setting.shopId || setting.secretKey ? "admin" : hasCredentials ? "env" : "none",
  };
}

async function createYooKassaPayment(req, plan) {
  const yookassa = getConfiguredYooKassa();
  const { shopId, secretKey } = yookassa;
  const paymentId = crypto.randomUUID();
  const amount = getPlanPrice(plan);
  const currency = plan.currency || "RUB";
  const generations = plan.generationsPerMonth ?? 50;
  const metadata = {
    paymentId,
    userId: req.user.id,
    planId: plan.id,
    generations: String(generations),
  };

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotence-Key": paymentId,
    },
    body: JSON.stringify({
      amount: { value: amount, currency },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: getReturnUrl(req, plan.id),
      },
      description: `Creepy Machine: ${plan.id}`,
      metadata,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.description || data.message || "YOOKASSA_PAYMENT_FAILED";
    const err = new Error(message);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  savePayment({
    id: data.id,
    userId: req.user.id,
    planId: plan.id,
    status: data.status || "pending",
    amount,
    currency,
    generations,
  });

  return data;
}

async function fetchYooKassaPayment(paymentId) {
  const yookassa = getConfiguredYooKassa();
  const { shopId, secretKey } = yookassa;
  if (!yookassa.enabled) {
    throw new Error("YOOKASSA_NOT_CONFIGURED");
  }

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.description || data.message || "YOOKASSA_STATUS_FAILED";
    const err = new Error(message);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

app.post("/api/payments/create", authRequired, async (req, res) => {
  if (req.user.provider !== "google") {
    return res.status(403).json({ error: "GOOGLE_REQUIRED" });
  }
  const { planId } = req.body;
  const plans = getSetting("subscription_plans") || [
    { id: "nightmare", price: 199, currency: "RUB", generationsPerMonth: 100 },
    { id: "abyss", price: 399, currency: "RUB", generationsPerMonth: 250 },
  ];
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return res.status(400).json({ error: "PLAN_NOT_FOUND" });

  if (!getConfiguredYooKassa().enabled) {
    return res.status(503).json({ error: "YOOKASSA_NOT_CONFIGURED" });
  }

  try {
    const payment = await createYooKassaPayment(req, plan);
    res.json({
      paymentId: payment.id,
      status: payment.status,
      confirmationUrl: payment.confirmation?.confirmation_url,
    });
  } catch (err) {
    console.error("YooKassa payment error:", err.details || err.message);
    res.status(err.status || 502).json({ error: "PAYMENT_CREATE_FAILED" });
  }
});

app.post("/api/payments/confirm", authRequired, async (req, res) => {
  if (req.user.provider !== "google") {
    return res.status(403).json({ error: "GOOGLE_REQUIRED" });
  }

  const { paymentId } = req.body || {};
  if (!paymentId || typeof paymentId !== "string") {
    return res.status(400).json({ error: "PAYMENT_ID_REQUIRED" });
  }

  const record = getPayment(paymentId);
  if (record && record.user_id !== req.user.id) {
    return res.status(403).json({ error: "PAYMENT_FORBIDDEN" });
  }

  try {
    const payment = await fetchYooKassaPayment(paymentId);
    const status = payment.status || "pending";
    const paid = !!payment.paid;
    const generations = Number(record?.generations || payment.metadata?.generations || 50);

    markPaymentStatus(paymentId, status);

    if (status === "succeeded" && paid && record?.user_id && record?.plan_id) {
      activateSubscription(
        record.user_id,
        record.plan_id,
        Number.isFinite(generations) ? generations : 50
      );
    }

    const session = resolveSession(req.token);
    res.json({
      status,
      paid,
      user: session?.user,
      subscription: session?.user?.subscription,
    });
  } catch (err) {
    console.error("YooKassa confirm error:", err.details || err.message);
    res.status(err.status || 502).json({ error: err.message || "PAYMENT_CONFIRM_FAILED" });
  }
});

app.post("/api/payments/yookassa/webhook", (req, res) => {
  const payment = req.body?.object;
  if (!payment?.id) return res.status(400).json({ error: "PAYMENT_REQUIRED" });

  const metadata = payment.metadata || {};
  const record = getPayment(payment.id);
  const userId = record?.user_id || metadata.userId;
  const planId = record?.plan_id || metadata.planId;
  const generations = Number(record?.generations || metadata.generations || 50);
  const status = payment.status || "unknown";

  if (record) markPaymentStatus(payment.id, status);

  if (status === "succeeded" && payment.paid && userId && planId) {
    activateSubscription(userId, planId, Number.isFinite(generations) ? generations : 50);
    if (!record) {
      savePayment({
        id: payment.id,
        userId,
        planId,
        status,
        amount: payment.amount?.value,
        currency: payment.amount?.currency,
        generations: Number.isFinite(generations) ? generations : 50,
      });
    }
  }

  res.json({ ok: true });
});

app.post("/api/payments/activate", authRequired, (req, res) => {
  if (process.env.PAYMENTS_MOCK_MODE !== "true") {
    return res.status(403).json({ error: "PAYMENT_CONFIRMATION_DISABLED" });
  }
  if (req.user.provider !== "google") {
    return res.status(403).json({ error: "GOOGLE_REQUIRED" });
  }
  const { planId } = req.body;
  const plans = getSetting("subscription_plans") || [
    { id: "nightmare", generationsPerMonth: 100 },
    { id: "abyss", generationsPerMonth: 250 },
  ];
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return res.status(400).json({ error: "PLAN_NOT_FOUND" });

  activateSubscription(req.user.id, planId, plan.generationsPerMonth ?? 50);
  const session = resolveSession(req.token);
  res.json({
    subscription: session?.user?.subscription,
    user: session?.user,
  });
});

app.get("/api/admin/settings", adminRequired, (_req, res) => {
  const providers = getAllAiProviders();
  const googleAuth = getConfiguredGoogleAuth();
  const yookassa = getConfiguredYooKassa();
  res.json({
    freeGenerationsPerDay: process.env.FREE_GENERATIONS_PER_DAY || "3",
    googleClientId: googleAuth.clientId ? "[set]" : "",
    googleEnabled: googleAuth.enabled,
    googleAuth: {
      enabled: googleAuth.enabled,
      clientId: googleAuth.clientId,
      source: googleAuth.source,
    },
    yookassa: {
      enabled: yookassa.enabled,
      shopId: yookassa.shopId,
      secretKey: yookassa.secretKey ? "[hidden]" : "",
      returnUrl: yookassa.returnUrl,
      webhookUrl: yookassa.webhookUrl,
      createPaymentEndpoint: yookassa.createPaymentEndpoint,
      source: yookassa.source,
    },
    fandoms: getSetting("fandoms"),
    genres: getSetting("genres"),
    subscriptionPlans: getSetting("subscription_plans"),
    faq: getSetting("faq"),
    subscriptionPage: getSetting("subscription_page"),
    requisites: getSetting("requisites"),
    privacyPolicyRu: getSetting("privacy_policy_ru"),
    termsRu: getSetting("terms_ru"),
    aiProviders: providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? "[hidden]" : "",
    })),
  });
});

app.get("/api/admin/db-status", adminRequired, (_req, res) => {
  try {
    res.json(getDatabaseStatus());
  } catch (err) {
    console.error("DB status error:", err);
    res.status(500).json({ error: "DB_STATUS_FAILED", message: err.message });
  }
});

app.put("/api/admin/settings", adminRequired, (req, res) => {
  const {
    fandoms,
    genres,
    subscriptionPlans,
    faq,
    subscriptionPage,
    requisites,
    yookassa,
    googleAuth,
    privacyPolicyRu,
    termsRu,
    aiProviders,
  } = req.body;
  if (fandoms) setSetting("fandoms", fandoms);
  if (genres) setSetting("genres", genres);
  if (subscriptionPlans) setSetting("subscription_plans", subscriptionPlans);
  if (faq) setSetting("faq", faq);
  if (subscriptionPage) setSetting("subscription_page", subscriptionPage);
  if (requisites) setSetting("requisites", requisites);
  if (yookassa) {
    const current = getConfiguredYooKassa();
    const next = {
      ...current,
      ...yookassa,
      shopId: yookassa.shopId || current.shopId,
      secretKey:
        yookassa.secretKey && yookassa.secretKey !== "[hidden]"
          ? yookassa.secretKey
          : current.secretKey,
    };
    setSetting("yookassa", next);
  }
  if (googleAuth) setSetting("google_auth", googleAuth);
  if (privacyPolicyRu) setSetting("privacy_policy_ru", privacyPolicyRu);
  if (termsRu) setSetting("terms_ru", termsRu);
  if (aiProviders) {
    const current = getAllAiProviders();
    const merged = aiProviders.map((p) => {
      const prev = current.find((c) => c.id === p.id);
      if (p.apiKey === "[hidden]" || !p.apiKey) {
        return { ...p, apiKey: prev?.apiKey || "" };
      }
      return p;
    });
    saveAiProviders(merged);
  }
  res.json({ ok: true });
});

app.use(express.static(rootDir));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const file = path.join(rootDir, req.path === "/" ? "index.html" : req.path);
  res.sendFile(file, (err) => {
    if (err) res.sendFile(path.join(rootDir, "index.html"));
  });
});

async function bootstrapAiProviders() {
  let providers = mergeAiProvidersWithDefaults(getSetting("ai_providers"));

  const or = providers.find((p) => p.id === "openrouter") || providers[0];
  if (process.env.OPENROUTER_API_KEY) {
    or.apiKey = process.env.OPENROUTER_API_KEY;
    or.enabled = true;
  }

  const ds = providers.find((p) => p.id === "deepseek");
  if (ds && process.env.DEEPSEEK_API_KEY) {
    ds.apiKey = process.env.DEEPSEEK_API_KEY;
    ds.enabled = true;
  }

  if (or) {
    const defaultOpenRouterModel =
      process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash:free";
    const hasDefault = or.models?.some((m) => m.id === defaultOpenRouterModel);
    if (!hasDefault) {
      or.models = [
        {
          id: defaultOpenRouterModel,
          name: defaultOpenRouterModel,
          enabled: true,
          isDefault: true,
        },
        ...(or.models || []).map((m) => ({ ...m, isDefault: false })),
      ];
    } else {
      or.models = or.models.map((m) => ({
        ...m,
        isDefault: m.id === defaultOpenRouterModel,
      }));
    }
  }

  saveAiProviders(providers);

  try {
    providers = await refreshOpenRouterFreeModels(providers);
    const openrouter = providers.find((p) => p.id === "openrouter");
    const autoCount =
      openrouter?.models?.filter((m) => m.autoDiscovered && m.enabled !== false).length || 0;
    if (autoCount > 0) {
      console.log(`OpenRouter: loaded ${autoCount} free text models`);
    }
  } catch (err) {
    console.warn(`OpenRouter: could not auto-load free models: ${err.message}`);
  }
}

await bootstrapAiProviders();

const migration = migrateEncryption();
if (migration.migrated > 0) {
  console.log(`DB encryption: migrated ${migration.migrated} records`);
}

const expiredSessions = deleteExpiredSessions();
if (expiredSessions > 0) {
  console.log(`Sessions: removed ${expiredSessions} expired records`);
}

const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Creepy Machine server: http://${HOST}:${PORT}`);
  console.log(`OpenRouter: ${process.env.OPENROUTER_API_KEY ? "configured" : "NOT SET"}`);
  console.log(`Google: ${getConfiguredGoogleAuth().clientId ? "configured" : "NOT SET"}`);
  if (process.env.TEMP_GOOGLE_AUTH_ENABLED === "true") {
    console.log("Temporary Google test login: enabled — disable TEMP_GOOGLE_AUTH_ENABLED before production");
  } else if (!getConfiguredGoogleAuth().clientId && process.env.DEV_AUTH_ENABLED === "true") {
    console.log("Dev login: enabled — use «Test login» on the site");
  }
  console.log(
    `DB encryption: ${isEncryptionEnabled() ? "ON (AES-256-GCM)" : "OFF — set DB_ENCRYPTION_KEY"}`
  );
  if (!isEncryptionEnabled()) {
    console.log("  Generate key: openssl rand -hex 32  →  add to DB_ENCRYPTION_KEY in .env");
  }
});
