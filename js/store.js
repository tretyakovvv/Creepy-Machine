(function () {
  const STORAGE_KEY = "cm_settings";
  const SESSION_KEY = "cm_session";
  const LANG_KEY = "cm_lang";
  const THEME_KEY = "cm_theme";

  const SUPPORTED_LANGS = [
    "en", "ru", "pt", "de", "es", "fr", "it", "ja", "ko", "zh", "pl", "uk", "ar", "tr", "nl",
  ];

  const SUPPORTED_THEMES = [
    "midnight", "blood", "pale", "void", "ember", "toxic", "frost",
  ];

  function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source || {})) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === "object" &&
        !Array.isArray(target[key])
      ) {
        out[key] = deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        out[key] = source[key];
      }
    }
    return out;
  }

  function getDefaults() {
    return structuredClone(window.CM_CONFIG);
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return deepMerge(getDefaults(), saved);
    } catch {
      return getDefaults();
    }
  }

  function saveSettings(partial) {
    const current = getSettings();
    const merged = deepMerge(current, partial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("cm:settings-updated", { detail: merged }));
    return merged;
  }

  function resetSettings() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cm:settings-updated", { detail: getDefaults() }));
    return getDefaults();
  }

  function getLang() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browser = (navigator.language || "en").slice(0, 2);
    return SUPPORTED_LANGS.includes(browser) ? browser : "en";
  }

  function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent("cm:lang-changed", { detail: lang }));
  }

  function getTheme() {
    const t = localStorage.getItem(THEME_KEY) || "midnight";
    return SUPPORTED_THEMES.includes(t) ? t : "midnight";
  }

  function setTheme(theme) {
    if (!SUPPORTED_THEMES.includes(theme)) return;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent("cm:theme-changed", { detail: theme }));
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    if (!user) {
      clearSession();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: user }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: null }));
  }

  function getSubscription() {
    const session = getSession();
    return session?.subscription || { planId: null, active: false, generationsLeft: null };
  }

  function isAdminAuthenticated() {
    return sessionStorage.getItem("cm_admin") === "1";
  }

  function setAdminAuthenticated(value) {
    if (value) sessionStorage.setItem("cm_admin", "1");
    else sessionStorage.removeItem("cm_admin");
  }

  window.CMStore = {
    SUPPORTED_LANGS,
    SUPPORTED_THEMES,
    getSettings,
    saveSettings,
    resetSettings,
    getLang,
    setLang,
    getTheme,
    setTheme,
    getSession,
    setSession,
    clearSession,
    getSubscription,
    isAdminAuthenticated,
    setAdminAuthenticated,
  };
})();
