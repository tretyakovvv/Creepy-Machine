import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import {
  encrypt,
  decrypt,
  encryptJson,
  decryptJson,
  encryptAiProviders,
  decryptAiProviders,
  isEncryptionEnabled,
} from "./crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "creepy-machine.db");
const require = createRequire(import.meta.url);

const SENSITIVE_SETTING_KEYS = new Set(["ai_providers"]);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

function loadDatabaseDriver() {
  try {
    return require("better-sqlite3");
  } catch (err) {
    console.warn(`better-sqlite3 unavailable, falling back to node:sqlite: ${err.message}`);
    return null;
  }
}

class NodeSqliteStatement {
  constructor(statement) {
    this.statement = statement;
  }

  run(...params) {
    return this.statement.run(...params);
  }

  get(...params) {
    return this.statement.get(...params);
  }

  all(...params) {
    return this.statement.all(...params);
  }
}

class NodeSqliteDatabase {
  constructor(filename, DatabaseSync) {
    this.db = new DatabaseSync(filename);
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  prepare(sql) {
    return new NodeSqliteStatement(this.db.prepare(sql));
  }

  pragma(sql, options = {}) {
    const rows = this.db.prepare(`PRAGMA ${sql}`).all();
    if (!options.simple) return rows;
    const first = rows[0];
    return first ? first[Object.keys(first)[0]] : undefined;
  }
}

async function createDatabase(filename) {
  const BetterSqliteDatabase = loadDatabaseDriver();
  if (BetterSqliteDatabase) {
    try {
      return new BetterSqliteDatabase(filename);
    } catch (err) {
      console.warn(`better-sqlite3 failed to open database, falling back to node:sqlite: ${err.message}`);
    }
  }

  const { DatabaseSync } = await import("node:sqlite");
  return new NodeSqliteDatabase(filename, DatabaseSync);
}

const db = await createDatabase(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    provider TEXT NOT NULL DEFAULT 'google',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guest_access (
    ip_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage_daily (
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT,
    active INTEGER NOT NULL DEFAULT 0,
    generations_left INTEGER,
    activated_at TEXT,
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    lang TEXT,
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS page_views (
    path TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (path, date)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount TEXT,
    currency TEXT,
    generations INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_guest_access_user ON guest_access(user_id);
  CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
  CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(date);
`);

function encField(value) {
  return value != null && value !== "" ? encrypt(String(value)) : value;
}

function decField(value) {
  return value != null ? decrypt(String(value)) : value;
}

export function upsertUser({ id, email, name, picture, provider = "google" }) {
  db.prepare(
    `INSERT INTO users (id, email, name, picture, provider, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       picture = excluded.picture,
       updated_at = datetime('now')`
  ).run(id, encField(email), encField(name), picture || null, provider);
  return getUserById(id);
}

export function getUserById(id) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) return null;
  return {
    ...row,
    email: decField(row.email),
    name: decField(row.name),
  };
}

export function createSession(token, userId, expiresAt) {
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
}

export function getSession(token) {
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.email, u.name, u.picture, u.provider
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token);
  if (!row) return null;

  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(row.id);
  return {
    token: row.token,
    user: {
      id: row.id,
      email: decField(row.email),
      name: decField(row.name),
      picture: row.picture,
      provider: row.provider,
      subscription: sub
        ? {
            planId: sub.plan_id,
            active: !!sub.active,
            generationsLeft: sub.generations_left,
            activatedAt: sub.activated_at,
            expiresAt: sub.expires_at,
          }
        : { planId: null, active: false, generationsLeft: null },
    },
  };
}

export function getGuestUserIdByIpHash(ipHash) {
  const row = db.prepare("SELECT user_id FROM guest_access WHERE ip_hash = ?").get(ipHash);
  return row?.user_id || null;
}

export function upsertGuestAccess(ipHash, userId) {
  db.prepare(
    `INSERT INTO guest_access (ip_hash, user_id, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(ip_hash) DO UPDATE SET
       user_id = excluded.user_id,
       updated_at = datetime('now')`
  ).run(ipHash, userId);
}

export function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteExpiredSessions() {
  return db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run().changes;
}

export function deleteUserAccount(userId) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM usage_daily WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM generations WHERE user_id = ?").run(userId);
  return db.prepare("DELETE FROM users WHERE id = ?").run(userId).changes > 0;
}

export function getDailyUsage(userId, date) {
  const row = db
    .prepare("SELECT count FROM usage_daily WHERE user_id = ? AND date = ?")
    .get(userId, date);
  return row?.count ?? 0;
}

export function incrementDailyUsage(userId, date) {
  db.prepare(
    `INSERT INTO usage_daily (user_id, date, count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1`
  ).run(userId, date);
}

export function recordPageView(pagePath, date) {
  db.prepare(
    `INSERT INTO page_views (path, date, count) VALUES (?, ?, 1)
     ON CONFLICT(path, date) DO UPDATE SET count = count + 1`
  ).run(pagePath, date);
}

export function saveGeneration({ userId, prompt, result, lang, model }) {
  const info = db
    .prepare(
      `INSERT INTO generations (user_id, prompt, result, lang, model) VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId || null, encField(prompt), encField(result), lang || null, model || null);
  return info.lastInsertRowid;
}

export function activateSubscription(userId, planId, generationsLeft) {
  db.prepare(
    `INSERT INTO subscriptions (user_id, plan_id, active, generations_left, activated_at)
     VALUES (?, ?, 1, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       plan_id = excluded.plan_id,
       active = 1,
       generations_left = excluded.generations_left,
       activated_at = datetime('now')`
  ).run(userId, planId, generationsLeft);
}

export function savePayment({ id, userId, planId, status, amount, currency, generations }) {
  db.prepare(
    `INSERT INTO payments (id, user_id, plan_id, status, amount, currency, generations, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       amount = excluded.amount,
       currency = excluded.currency,
       generations = excluded.generations,
       updated_at = datetime('now')`
  ).run(id, userId, planId, status || "pending", amount || null, currency || null, generations || null);
}

export function getPayment(id) {
  return db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
}

export function markPaymentStatus(id, status) {
  db.prepare("UPDATE payments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    id
  );
}

export function decrementSubscriptionGenerations(userId) {
  db.prepare(
    `UPDATE subscriptions SET generations_left = generations_left - 1
     WHERE user_id = ? AND active = 1 AND generations_left IS NOT NULL AND generations_left > 0`
  ).run(userId);
}

export function runTransaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  }
}

export function getSetting(key) {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
  if (!row) return null;

  if (SENSITIVE_SETTING_KEYS.has(key)) {
    const parsed = decryptJson(row.value);
    if (key === "ai_providers" && parsed) return decryptAiProviders(parsed);
    return parsed;
  }

  try {
    const raw = decrypt(row.value);
    return JSON.parse(raw);
  } catch {
    return decrypt(row.value);
  }
}

export function setSetting(key, value) {
  let stored;

  if (SENSITIVE_SETTING_KEYS.has(key)) {
    const payload = key === "ai_providers" ? encryptAiProviders(value) : value;
    stored = encryptJson(payload);
  } else if (typeof value === "object") {
    stored = encryptJson(value);
  } else {
    stored = encrypt(String(value));
  }

  db.prepare(
    `INSERT INTO site_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, stored);
}

/** Re-encrypt legacy plaintext rows when encryption key is set */
export function migrateEncryption() {
  if (!isEncryptionEnabled()) return { migrated: 0 };

  let count = 0;

  for (const row of db.prepare("SELECT id, email, name FROM users").all()) {
    if (row.email && !String(row.email).startsWith("cmenc1:")) {
      db.prepare("UPDATE users SET email = ?, name = ? WHERE id = ?").run(
        encField(row.email),
        encField(row.name),
        row.id
      );
      count++;
    }
  }

  for (const row of db.prepare("SELECT id, prompt, result FROM generations").all()) {
    const needs =
      (row.prompt && !String(row.prompt).startsWith("cmenc1:")) ||
      (row.result && !String(row.result).startsWith("cmenc1:"));
    if (needs) {
      db.prepare("UPDATE generations SET prompt = ?, result = ? WHERE id = ?").run(
        encField(row.prompt),
        encField(row.result),
        row.id
      );
      count++;
    }
  }

  for (const row of db.prepare("SELECT key, value FROM site_settings").all()) {
    if (row.value && !String(row.value).startsWith("cmenc1:")) {
      try {
        const parsed = JSON.parse(row.value);
        if (row.key === "ai_providers") {
          setSetting(row.key, parsed);
        } else {
          setSetting(row.key, parsed);
        }
        count++;
      } catch {
        setSetting(row.key, row.value);
        count++;
      }
    }
  }

  return { migrated: count };
}

export function getDatabaseStatus() {
  const counts = {};
  for (const table of [
    "users",
    "sessions",
    "guest_access",
    "usage_daily",
    "subscriptions",
    "generations",
    "page_views",
    "site_settings",
  ]) {
    counts[table] = db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count;
  }

  const encryptedRows = {
    usersEmail: db
      .prepare("SELECT count(*) AS count FROM users WHERE email LIKE 'cmenc1:%'")
      .get().count,
    usersName: db
      .prepare("SELECT count(*) AS count FROM users WHERE name LIKE 'cmenc1:%'")
      .get().count,
    generationPrompts: db
      .prepare("SELECT count(*) AS count FROM generations WHERE prompt LIKE 'cmenc1:%'")
      .get().count,
    generationResults: db
      .prepare("SELECT count(*) AS count FROM generations WHERE result LIKE 'cmenc1:%'")
      .get().count,
    pageViewsToday: db
      .prepare("SELECT COALESCE(sum(count), 0) AS count FROM page_views WHERE date = date('now')")
      .get().count,
    sensitiveSettings: db
      .prepare(
        "SELECT count(*) AS count FROM site_settings WHERE key IN ('ai_providers') AND value LIKE 'cmenc1:%'"
      )
      .get().count,
  };

  return {
    path: dbPath,
    journalMode: db.pragma("journal_mode", { simple: true }),
    integrity: db.pragma("integrity_check", { simple: true }),
    encryptionEnabled: isEncryptionEnabled(),
    counts,
    encryptedRows,
  };
}

export function getAdminStats() {
  const today = new Date().toISOString().slice(0, 10);
  const visitsTotal = db
    .prepare("SELECT COALESCE(sum(count), 0) AS count FROM page_views")
    .get().count;
  const visitsToday = db
    .prepare("SELECT COALESCE(sum(count), 0) AS count FROM page_views WHERE date = ?")
    .get(today).count;
  const topPages = db
    .prepare(
      `SELECT path, COALESCE(sum(count), 0) AS count
       FROM page_views
       GROUP BY path
       ORDER BY count DESC, path ASC
       LIMIT 5`
    )
    .all();
  const generationsTotal = db
    .prepare("SELECT count(*) AS count FROM generations")
    .get().count;
  const generationsToday = db
    .prepare("SELECT count(*) AS count FROM generations WHERE date(created_at) = ?")
    .get(today).count;
  const activeSubscriptions = db
    .prepare("SELECT count(*) AS count FROM subscriptions WHERE active = 1")
    .get().count;
  const paidGenerationsLeft = db
    .prepare(
      "SELECT COALESCE(sum(CASE WHEN active = 1 AND generations_left IS NOT NULL THEN generations_left ELSE 0 END), 0) AS count FROM subscriptions"
    )
    .get().count;

  return {
    today,
    visitsTotal,
    visitsToday,
    generationsTotal,
    generationsToday,
    activeSubscriptions,
    paidGenerationsLeft,
    topPages,
  };
}

export { isEncryptionEnabled };
export default db;
