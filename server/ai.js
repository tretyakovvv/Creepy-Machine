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
      { id: "openai/gpt-oss-20b:free", name: "OpenAI GPT-OSS 20B", enabled: true },
      { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B Instruct", enabled: true },
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
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
]);

const ENV_API_KEYS = {
  openrouter: "OPENROUTER_API_KEY",
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
    .replace(/\s*\((?:free|бесплатно)\)\s*/gi, "")
    .replace(/\s*:\s*free\b/gi, "")
    .replace(/\bfree\s+models?\s+router\b/gi, "Model Router")
    .replace(/\bfree\s+router\b/gi, "Router")
    .replace(/\bfree\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
      if (m.enabled === false) continue;
      if (!isKnownFreeModel(m)) continue;
      const cleanModel = normalizeModel(m);
      models.push({
        id: cleanModel.id,
        name: cleanModel.name || cleanModel.id,
        providerId: p.id,
        providerName: p.name,
        isDefault: !!cleanModel.isDefault,
      });
    }
  }

  if (!models.some((m) => m.isDefault) && models[0]) models[0].isDefault = true;
  return models;
}

function resolveProviderAndModel(providerId, modelId) {
  const providers = getAiProviders();
  if (!providers.length) throw new Error("NO_AI_PROVIDERS");

  let provider = providers.find((p) => p.id === providerId) || providers[0];
  const models = (provider.models || []).filter((m) => m.enabled !== false && isKnownFreeModel(m));
  if (!models.length) throw new Error("NO_MODELS");

  let model =
    models.find((m) => m.id === modelId) ||
    models.find((m) => m.isDefault) ||
    models[0];

  return { provider, model };
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
    return `Model unavailable: ${model.id}. OpenRouter no longer serves this model.`;
  }
  if (status === 429 && provider.id === "openrouter") {
    return `OpenRouter rate limit or free model capacity reached for ${model.id}. Try another free model, or wait and retry.`;
  }
  return errText || `AI provider error: ${status}`;
}

function isRetriableProviderError(status) {
  return [404, 429, 500, 502, 503, 504].includes(Number(status));
}

async function requestGeneration({ baseUrl, headers, modelId, userContent, intensity }) {
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

export async function generateWithAi(prompt, lang, { providerId, modelId, intensity } = {}) {
  const { provider, model } = resolveProviderAndModel(providerId, modelId);
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const baseUrl = normalizeChatCompletionsUrl(
    provider.baseUrl || "https://openrouter.ai/api/v1/chat/completions"
  );

  let userContent = buildUserMessage(prompt, lang);
  if (intensity === "extreme") {
    userContent += "\n\n[Intensity: maximum horror, visceral dread, deeply unsettling.]";
  } else if (intensity === "subtle") {
    userContent += "\n\n[Intensity: slow-burn, subtle dread, ambiguous horror.]";
  }

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

  const providerModels = (provider.models || []).filter(
    (m) => m.enabled !== false && isKnownFreeModel(m)
  );
  const fallbackModels = providerModels.filter((m) => m.id !== model.id);
  const tryModels = [model, ...fallbackModels];

  let text = "";
  let usedModel = model;
  let lastErr = null;

  for (const candidate of tryModels) {
    try {
      text = await requestGeneration({
        baseUrl,
        headers,
        modelId: candidate.id,
        userContent,
        intensity,
      });
      usedModel = candidate;
      break;
    } catch (err) {
      lastErr = err;
      const status = Number(err?.status || 0);
      const canTryNext = isRetriableProviderError(status) && candidate.id !== tryModels.at(-1)?.id;
      console.error("AI provider error:", provider.id, candidate.id, status || "n/a", err.message);
      if (!canTryNext) {
        const message = buildProviderErrorMessage(provider, candidate, status, err.message);
        const finalErr = new Error(message);
        finalErr.code = "AI_PROVIDER_ERROR";
        finalErr.status = status || 502;
        finalErr.providerId = provider.id;
        finalErr.model = candidate.id;
        throw finalErr;
      }
      console.warn(`AI fallback: retrying after ${candidate.id} returned ${status}`);
    }
  }

  if (!text) throw lastErr || new Error("GENERATION_FAILED");

  return {
    text,
    model: usedModel.id,
    modelName: usedModel.name,
    providerId: provider.id,
    providerName: provider.name,
  };
}
