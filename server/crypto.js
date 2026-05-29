import crypto from "crypto";

const PREFIX = "cmenc1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

let _key = null;

function getKey() {
  if (_key) return _key;
  const raw = process.env.DB_ENCRYPTION_KEY;
  if (!raw) return null;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    _key = Buffer.from(raw, "hex");
    return _key;
  }

  _key = crypto.scryptSync(raw, "creepy-machine-salt-v1", KEY_LEN);
  return _key;
}

export function isEncryptionEnabled() {
  return !!getKey();
}

export function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  const str = String(plaintext);
  if (str.startsWith(PREFIX)) return str;

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(str, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, tag, enc]).toString("base64");
  return PREFIX + blob;
}

export function decrypt(value) {
  if (value == null || value === "") return value;
  const str = String(value);
  if (!str.startsWith(PREFIX)) return str;

  const key = getKey();
  if (!key) {
    console.warn("DB_ENCRYPTION_KEY missing — cannot decrypt stored data");
    return "";
  }

  try {
    const buf = Buffer.from(str.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("Decrypt failed:", err.message);
    return "";
  }
}

export function encryptJson(obj) {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson(value) {
  const raw = decrypt(value);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function encryptAiProviders(providers) {
  if (!Array.isArray(providers)) return providers;
  const key = getKey();
  if (!key) return providers;

  return providers.map((p) => ({
    ...p,
    apiKey: p.apiKey ? encrypt(p.apiKey) : "",
    models: p.models,
  }));
}

export function decryptAiProviders(providers) {
  if (!Array.isArray(providers)) return providers;
  return providers.map((p) => ({
    ...p,
    apiKey: p.apiKey ? decrypt(p.apiKey) : "",
  }));
}

export function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LEN).toString("hex");
}
