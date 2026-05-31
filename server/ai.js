import { CREEPY_MACHINE_SYSTEM_PROMPT, buildUserMessage } from "./prompts.js";
import { getSetting, setSetting } from "./db.js";

export const DEFAULT_AI_PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai_chat",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: "",
    enabled: true,
    models: [
      {
        id: "openrouter/free",
        name: "Free Models Router",
        enabled: true,
        isDefault: true,
      },
    ],
  },
  {
    id: "polza",
    name: "Polza AI",
    type: "openai_chat",
    baseUrl: "https://polza.ai/api/v1/chat/completions",
    apiKey: "",
    enabled: true,
    models: [
      {
        id: "deepseek/deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        enabled: true,
        requiresSubscription: true,
        priceHint: "12.69 ₽ / 1M input tokens",
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai_chat",
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    apiKey: "",
    enabled: false,
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        enabled: true,
        isDefault: true,
      },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner", enabled: true },
    ],
  },
];

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_FREE_MODEL_LIMIT = parseInt(process.env.OPENROUTER_FREE_MODEL_LIMIT || "40", 10);
const STABLE_FREE_MODEL_IDS = new Set([
  "openrouter/free",
]);

const ENV_API_KEYS = {
  openrouter: "OPENROUTER_API_KEY",
  polza: "POLZA_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function isLocalSiteUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return true;
  }
}

function cloneDefaults() {
  return structuredClone(DEFAULT_AI_PROVIDERS);
}

export function mergeAiProvidersWithDefaults(saved) {
  const providers = Array.isArray(saved) && saved.length ? structuredClone(saved) : [];

  for (const defaults of cloneDefaults()) {
    const existing = providers.find((p) => p.id === defaults.id);
    if (!existing) {
      providers.push(defaults);
      continue;
    }

    existing.name ||= defaults.name;
    existing.type ||= defaults.type;
    existing.baseUrl ||= defaults.baseUrl;
    existing.models = Array.isArray(existing.models) ? existing.models : [];

    for (const defaultModel of defaults.models || []) {
      if (!existing.models.some((m) => m.id === defaultModel.id)) {
        existing.models.push(defaultModel);
      }
    }
  }

  return providers.length ? providers : cloneDefaults();
}

function applyEnvProviderConfig(providers) {
  for (const provider of providers) {
    const envKeyName = ENV_API_KEYS[provider.id];
    const envKeyValue = envKeyName ? process.env[envKeyName] : "";
    if (envKeyValue) {
      if (!provider.apiKey) provider.apiKey = envKeyValue;
      provider.enabled = true;
    }
  }

  const openrouter = providers.find((p) => p.id === "openrouter");
  if (openrouter && process.env.OPENROUTER_MODEL) {
    const wanted = process.env.OPENROUTER_MODEL;
    if (!openrouter.models?.some((m) => m.id === wanted)) {
      openrouter.models = [
        { id: wanted, name: wanted, enabled: true, isDefault: true },
        ...(openrouter.models || []).map((m) => ({ ...m, isDefault: false })),
      ];
    } else {
      openrouter.models = openrouter.models.map((m) => ({
        ...m,
        isDefault: m.id === wanted,
      }));
    }
  }

  return providers;
}

export function getAiProviders() {
  return getAllAiProviders().filter((p) => p.enabled !== false);
}

export function getAllAiProviders() {
  const saved = getSetting("ai_providers");
  return applyEnvProviderConfig(mergeAiProvidersWithDefaults(saved));
}

export function saveAiProviders(providers) {
  setSetting("ai_providers", providers);
}

function isFreeTextModel(model) {
  const pricing = model?.pricing || {};
  const architecture = model?.architecture || {};
  const input = Array.isArray(architecture.input_modalities)
    ? architecture.input_modalities
    : [];
  const output = Array.isArray(architecture.output_modalities)
    ? architecture.output_modalities
    : [];

  return (
    Number(pricing.prompt || 0) === 0 &&
    Number(pricing.completion || 0) === 0 &&
    input.length === 1 &&
    input.includes("text") &&
    output.length === 1 &&
    output.includes("text")
  );
}

function sanitizeModelName(nameOrId) {
  return String(nameOrId || "")
    .replace(/^OpenRouter Router$/i, "Free Models Router")
    .replace(/\s*\((?:free|бесплатно)\)\s*/gi, "")
    .replace(/\s*:\s*free\b/gi, "")
    .replace(/\bfree\s+models?\s+router\b/gi, "Model Router")
    .replace(/\bfree\s+router\b/gi, "Router")
    .replace(/\bfree\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function probeChatModel(provider, model) {
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) return { available: false, status: 503, message: "API_KEY_NOT_CONFIGURED" };

  const baseUrl = normalizeChatCompletionsUrl(
    provider.baseUrl || "https://openrouter.ai/api/v1/chat/completions"
  );

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (provider.id === "openrouter" || baseUrl.includes("openrouter")) {
    const siteUrl = process.env.SITE_URL;
    if (siteUrl && !isLocalSiteUrl(siteUrl)) {
      headers["HTTP-Referer"] = siteUrl;
    }
    headers["X-Title"] = "Creepy Machine";
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model.id,
      messages: [
        { role: "system", content: "Reply with one short word." },
        { role: "user", content: "ping" },
      ],
      temperature: 0,
      max_tokens: 1,
    }),
  });

  if (!response.ok) {
    const message = await parseProviderError(response);
    return {
      available: false,
      status: response.status,
      message: message || `AI provider error: ${response.status}`,
    };
  }

  return { available: true, status: 200, message: "ok" };
}

export async function probeModelAvailability(providerId, modelId) {
  try {
    const providers = getAiProviders();
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return { available: false, status: 404, message: "PROVIDER_NOT_FOUND" };
    const model = (provider.models || []).find((m) => m.id === modelId && m.enabled !== false);
    if (!model) return { available: false, status: 404, message: "MODEL_NOT_FOUND" };
    return await probeChatModel(provider, model);
  } catch (err) {
    return {
      available: false,
      status: err?.status || 503,
      message: err?.message || "MODEL_PROBE_FAILED",
    };
  }
}

function collectAccessibleCandidates(providerId, modelId, user) {
  const providers = getAiProviders();
  if (!providers.length) throw new Error("NO_AI_PROVIDERS");

  const candidates = [];
  for (const provider of providers) {
    for (const model of provider.models || []) {
      if (!isModelAccessible(model, user)) continue;
      candidates.push({ provider, model });
    }
  }

  if (!candidates.length) {
    const hasPremium = providers.some((provider) =>
      (provider.models || []).some((model) => model.requiresSubscription === true && model.enabled !== false)
    );
    const err = new Error(hasPremium && !user?.subscription?.active ? "SUBSCRIPTION_REQUIRED" : "NO_MODELS");
    err.code = hasPremium && !user?.subscription?.active ? "SUBSCRIPTION_REQUIRED" : "NO_MODELS";
    err.status = hasPremium && !user?.subscription?.active ? 403 : 404;
    throw err;
  }

  const preferredProvider = providers.find((p) => p.id === providerId) || candidates[0].provider;
  const preferredModel =
    (preferredProvider.models || []).find((m) => m.id === modelId && isModelAccessible(m, user)) ||
    (preferredProvider.models || []).find((m) => m.isDefault && isModelAccessible(m, user)) ||
    (preferredProvider.models || []).find((m) => isModelAccessible(m, user));

  if (!preferredModel) {
    const err = new Error("SUBSCRIPTION_REQUIRED");
    err.code = "SUBSCRIPTION_REQUIRED";
    err.status = 403;
    throw err;
  }

  const ordered = [
    { provider: preferredProvider, model: preferredModel },
    ...candidates.filter(
      (entry) => entry.provider.id !== preferredProvider.id || entry.model.id !== preferredModel.id
    ),
  ];

  const seen = new Set();
  return ordered.filter((entry) => {
    const key = `${entry.provider.id}:${entry.model.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeModel(model) {
  return {
    ...model,
    name: sanitizeModelName(model.name || model.id),
  };
}

function isKnownFreeModel(model) {
  const id = String(model?.id || "").toLowerCase();
  return (
    STABLE_FREE_MODEL_IDS.has(id) &&
    (model?.free === true ||
      model?.autoDiscovered === true ||
      id.endsWith(":free") ||
      id === "openrouter/free")
  );
}

function isPublicSelectableModel(model) {
  return model?.enabled !== false && (isKnownFreeModel(model) || model?.requiresSubscription === true);
}

function isModelAccessible(model, user) {
  if (!isPublicSelectableModel(model)) return false;
  if (!model.requiresSubscription) return true;
  return !!user?.subscription?.active;
}

function sortFreeOpenRouterModels(a, b) {
  const aDeepSeek = a.id?.startsWith("deepseek/") ? 0 : 1;
  const bDeepSeek = b.id?.startsWith("deepseek/") ? 0 : 1;
  if (aDeepSeek !== bDeepSeek) return aDeepSeek - bDeepSeek;
  return String(b.created || "").localeCompare(String(a.created || ""));
}

async function fetchOpenRouterFreeTextModels() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`OpenRouter models request failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || [])
      .filter(isFreeTextModel)
      .sort(sortFreeOpenRouterModels)
      .slice(0, Number.isFinite(OPENROUTER_FREE_MODEL_LIMIT) ? OPENROUTER_FREE_MODEL_LIMIT : 40)
      .map((m) => ({
        id: m.id,
        name: sanitizeModelName(m.name || m.id),
        enabled: true,
        autoDiscovered: true,
      }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectOpenRouterFreeModels() {
  return fetchOpenRouterFreeTextModels();
}

export async function refreshOpenRouterFreeModels(providers = getAllAiProviders()) {
  if (process.env.OPENROUTER_AUTO_FREE_MODELS === "false") return providers;

  const openrouter = providers.find((p) => p.id === "openrouter");
  if (!openrouter) return providers;

  const existingModels = Array.isArray(openrouter.models) ? openrouter.models : [];
  const existingById = new Map(
    existingModels
      .filter(isKnownFreeModel)
      .map((m) => [m.id, normalizeModel({ ...m, free: true })])
  );

  openrouter.models = [...existingById.values()].filter((m) =>
    STABLE_FREE_MODEL_IDS.has(String(m.id || "").toLowerCase())
  );

  try {
    const freeModels = await fetchOpenRouterFreeTextModels();
    for (const model of freeModels) {
      if (!STABLE_FREE_MODEL_IDS.has(String(model.id || "").toLowerCase())) continue;
      const existing = existingById.get(model.id);
      existingById.set(model.id, {
        ...(existing || {}),
        ...model,
        free: true,
        isDefault: existing?.isDefault || false,
      });
    }
  } catch (err) {
    console.warn(`OpenRouter: could not refresh free models: ${err.message}`);
  }

  openrouter.models = [...existingById.values()].filter((m) =>
    STABLE_FREE_MODEL_IDS.has(String(m.id || "").toLowerCase())
  );
  if (!openrouter.models.some((m) => m.isDefault) && openrouter.models[0]) {
    openrouter.models[0].isDefault = true;
  }
  saveAiProviders(providers);
  return providers;
}

export function getPublicModels() {
  const providers = getAiProviders();
  const models = [];

  for (const p of providers) {
    for (const m of p.models || []) {
      if (!isPublicSelectableModel(m)) continue;
      const cleanModel = normalizeModel(m);
      models.push({
        id: cleanModel.id,
        name: cleanModel.name || cleanModel.id,
        providerId: p.id,
        providerName: p.name,
        isDefault: !!cleanModel.isDefault,
        requiresSubscription: !!cleanModel.requiresSubscription,
        priceHint: cleanModel.priceHint || "",
      });
    }
  }

  if (!models.some((m) => m.isDefault) && models[0]) models[0].isDefault = true;
  return models;
}

function resolveProviderAndModel(providerId, modelId, user) {
  const candidates = collectAccessibleCandidates(providerId, modelId, user);
  return candidates[0];
}

function getProviderApiKey(provider) {
  const envKeyName = ENV_API_KEYS[provider.id];
  return provider.apiKey || (envKeyName ? process.env[envKeyName] : "") || "";
}

export function normalizeChatCompletionsUrl(baseUrl) {
  const url = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!url) return "https://openrouter.ai/api/v1/chat/completions";
  if (/\/chat\/completions$/i.test(url)) return url;
  if (/\/(v1|beta)$/i.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

async function parseProviderError(response) {
  const raw = await response.text();
  if (!raw) return "";
  try {
    const data = JSON.parse(raw);
    const parts = [
      data.error?.message,
      data.error?.code,
      data.error?.metadata?.raw,
      data.message,
    ].filter(Boolean);
    return parts.join(" ");
  } catch {
    return raw;
  }
}

function buildProviderErrorMessage(provider, model, status, errText) {
  if (status === 404) {
    return `Model unavailable: ${model.id}. The provider no longer serves this model.`;
  }
  if (status === 429 && provider.id === "openrouter") {
    return `OpenRouter rate limit or free model capacity reached for ${model.id}. Try another free model, or wait and retry.`;
  }
  return errText || `AI provider error: ${status}`;
}

function isRetriableProviderError(status) {
  return [404, 429, 500, 502, 503, 504].includes(Number(status));
}

async function requestGeneration({ baseUrl, headers, modelId, userContent, intensity, user }) {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: CREEPY_MACHINE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: intensity === "subtle" ? 0.75 : intensity === "extreme" ? 0.95 : 0.85,
      max_tokens: 2048,
      ...(user ? { user } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await parseProviderError(response);
    const err = new Error(errText || `AI provider error: ${response.status}`);
    err.code = "AI_PROVIDER_ERROR";
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

export async function generateWithAi(prompt, lang, { providerId, modelId, intensity, user } = {}) {
  let userContent = buildUserMessage(prompt, lang);
  if (intensity === "extreme") {
    userContent += "\n\n[Intensity: maximum horror, visceral dread, deeply unsettling.]";
  } else if (intensity === "subtle") {
    userContent += "\n\n[Intensity: slow-burn, subtle dread, ambiguous horror.]";
  }

  const tryModels = collectAccessibleCandidates(providerId, modelId, user);

  let text = "";
  let usedProvider = tryModels[0].provider;
  let usedModel = tryModels[0].model;
  let lastErr = null;

  for (const candidate of tryModels) {
    try {
      const apiKey = getProviderApiKey(candidate.provider);
      if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

      const baseUrl = normalizeChatCompletionsUrl(
        candidate.provider.baseUrl || "https://openrouter.ai/api/v1/chat/completions"
      );

      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      if (candidate.provider.id === "openrouter" || baseUrl.includes("openrouter")) {
        const siteUrl = process.env.SITE_URL;
        if (siteUrl && !isLocalSiteUrl(siteUrl)) {
          headers["HTTP-Referer"] = siteUrl;
        }
        headers["X-Title"] = "Creepy Machine";
      }

      text = await requestGeneration({
        baseUrl,
        headers,
        modelId: candidate.model.id,
        userContent,
        intensity,
        user: user?.id || null,
      });
      usedProvider = candidate.provider;
      usedModel = candidate.model;
      break;
    } catch (err) {
      lastErr = err;
      const status = Number(err?.status || 0);
      const canTryNext = isRetriableProviderError(status) && candidate !== tryModels.at(-1);
      console.error("AI provider error:", candidate.provider.id, candidate.model.id, status || "n/a", err.message);
      if (!canTryNext) {
        const message = buildProviderErrorMessage(candidate.provider, candidate.model, status, err.message);
        const finalErr = new Error(message);
        finalErr.code = "AI_PROVIDER_ERROR";
        finalErr.status = status || 502;
        finalErr.providerId = candidate.provider.id;
        finalErr.model = candidate.model.id;
        throw finalErr;
      }
      console.warn(`AI fallback: retrying after ${candidate.model.id} returned ${status}`);
    }
  }

  if (!text) throw lastErr || new Error("GENERATION_FAILED");

  return {
    text,
    model: usedModel.id,
    modelName: usedModel.name,
    providerId: usedProvider.id,
    providerName: usedProvider.name,
  };
}
