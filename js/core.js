(function () {
  let globalHeaderListenersBound = false;

  const LANGS = [
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
    { code: "uk", label: "UK" },
    { code: "de", label: "DE" },
    { code: "fr", label: "FR" },
    { code: "es", label: "ES" },
    { code: "it", label: "IT" },
    { code: "pt", label: "PT" },
    { code: "pl", label: "PL" },
    { code: "nl", label: "NL" },
    { code: "tr", label: "TR" },
    { code: "ja", label: "JA" },
    { code: "ko", label: "KO" },
    { code: "zh", label: "ZH" },
    { code: "ar", label: "AR" },
  ];

  const THEMES = window.CMStore?.SUPPORTED_THEMES || [
    "midnight", "blood", "pale", "void", "ember", "toxic", "frost",
  ];

  function localize(item, field) {
    const lang = window.CMStore.getLang();
    return item[field]?.[lang] || item[field]?.en || "";
  }

  function renderHeader() {
    const el = document.getElementById("site-header");
    if (!el) return;

    const lang = window.CMStore.getLang();
    const theme = window.CMStore.getTheme();
    const session = window.CMStore.getSession();
    const t = window.CMI18n.t;

    const langOptions = LANGS.map(
      (l) =>
        `<option value="${l.code}" ${l.code === lang ? "selected" : ""}>${l.label}</option>`
    ).join("");

    const themeOptions = THEMES.map(
      (th) =>
        `<option value="${th}" ${th === theme ? "selected" : ""}>${t(`themes.${th}`)}</option>`
    ).join("");

    const googleOn = window.CMAuth?.isGoogleEnabled?.();
    const devOn = window.CMAuth?.isDevAuthEnabled?.();

    const providerLabel = session?.provider === "google"
      ? "Google"
      : session?.provider === "guest"
        ? "Guest"
        : session?.provider === "dev"
          ? "Account"
          : "Account";

    const authBlock = session
      ? `<div class="header-auth is-signed-in">
          <div class="account-user-row">
            ${session.picture ? `<img src="${escapeAttr(session.picture)}" alt="" class="user-avatar" width="32" height="32">` : ""}
            <span class="user-greeting">${t("auth.greeting", { name: session.name || session.email })}</span>
            <span class="auth-provider-badge">${providerLabel}</span>
            <span id="account-usage-badge" class="account-usage-badge" hidden></span>
          </div>
          <div class="account-actions">
            <button type="button" class="btn-ghost" id="delete-account-btn">${t("auth.deleteAccount")}</button>
            <button type="button" class="btn-ghost" id="sign-out-btn">${t("auth.signOut")}</button>
          </div>
        </div>`
      : `<div class="header-auth">
          ${googleOn ? `<div id="google-signin-btn" class="google-btn-slot"></div>` : ""}
          <div class="account-actions">
            <button type="button" class="btn-ghost btn-primary--compact" id="guest-login-btn">${t("auth.guestLogin")}</button>
            ${devOn ? `<button type="button" class="btn-primary btn-primary--compact" id="dev-login-btn">${t("auth.devLogin")}</button>` : ""}
          </div>
        </div>`;

    el.innerHTML = `
      <div class="header-inner glass-panel">
        <a href="index.html" class="logo">
          <span class="logo-icon">☠</span>
          <span class="logo-text">Creepy Machine</span>
        </a>
        <nav class="nav" aria-label="Main">
          <a href="index.html#generator">${t("nav.home")}</a>
          <a href="index.html#fandoms">${t("nav.fandoms")}</a>
          <a href="index.html#genres">${t("nav.genres")}</a>
          <a href="subscription.html">${t("nav.subscription")}</a>
        </nav>
        <div class="header-actions">
          <div class="header-controls">
            <label class="control-label">
              <select id="lang-select" class="control-select" aria-label="Language">${langOptions}</select>
            </label>
            <label class="control-label">
              <select id="theme-select" class="control-select" aria-label="Theme">${themeOptions}</select>
            </label>
          </div>
          <button type="button" class="nav-account-btn" id="account-toggle">${t("nav.account")}</button>
        </div>
        <div class="account-panel" id="account-panel" hidden>
          ${authBlock}
        </div>
        <button type="button" class="nav-toggle" id="nav-toggle" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="mobile-nav" id="mobile-nav" hidden>
        <a href="index.html#generator">${t("nav.home")}</a>
        <a href="index.html#fandoms">${t("nav.fandoms")}</a>
        <a href="index.html#genres">${t("nav.genres")}</a>
        <a href="subscription.html">${t("nav.subscription")}</a>
        <button type="button" class="nav-account-btn nav-account-btn--mobile" id="account-toggle-mobile">${t("nav.account")}</button>
        <a href="privacy.html">${t("nav.privacy")}</a>
        <a href="terms.html">${t("nav.terms")}</a>
      </div>
    `;

    bindHeaderEvents();
    window.CMAuth.initGoogleAuth();
    refreshUsageBadge();
  }

  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const t = window.CMI18n.t;
    const settings = window.CMStore.getSettings();
    const lang = window.CMStore.getLang();
    const year = new Date().getFullYear();
    const requisites = settings.requisites || {};

    const title =
      requisites?.title && typeof requisites.title === "object"
        ? window.CMCore.localize(requisites, "title")
        : typeof requisites?.title === "string"
          ? requisites.title
          : "";

    const lines = Array.isArray(requisites?.lines)
      ? requisites.lines
          .map((line) =>
            typeof line === "string"
              ? line
              : line?.[lang] || line?.ru || line?.en || line?.text || ""
          )
          .filter(Boolean)
      : [];

    const requisitesHtml = [
      title ? `<p class="footer-requisites-title">${escapeHtml(title)}</p>` : "",
      ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    ]
      .filter(Boolean)
      .join("");

    el.innerHTML = `
      <div class="footer-inner glass-panel">
        <div class="footer-brand">
          <span class="footer-logo">☠ Creepy Machine</span>
          <p class="footer-tagline">${t("footer.madeWith")}</p>
        </div>
        <nav class="footer-nav">
          <a href="index.html">${t("nav.home")}</a>
          <a href="subscription.html">${t("nav.subscription")}</a>
          <a href="requisites.html">${t("footer.requisites")}</a>
          <a href="privacy.html">${t("nav.privacy")}</a>
          <a href="terms.html">${t("nav.terms")}</a>
          <button type="button" class="footer-nav-link footer-nav-toggle" id="footer-requisites-toggle" aria-expanded="false" aria-controls="footer-requisites-panel">
            ${t("footer.requisites")}
          </button>
        </nav>
        <div class="footer-legal">
          <p class="footer-copy">${t("footer.copyright", { year })}</p>
          <p class="footer-ai">${t("footer.ai")}</p>
          <div class="footer-requisites-panel" id="footer-requisites-panel" hidden>
            ${requisitesHtml || `<p>${t("footer.requisitesEmpty")}</p>`}
          </div>
        </div>
      </div>
    `;

    const toggle = document.getElementById("footer-requisites-toggle");
    const panel = document.getElementById("footer-requisites-panel");
    toggle?.addEventListener("click", () => {
      if (!panel) return;
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
    });
  }

  async function refreshUsageBadge() {
    const badge = document.getElementById("account-usage-badge");
    if (!badge) return;
    const session = window.CMStore.getSession();
    if (!session) {
      badge.hidden = true;
      badge.textContent = "";
      return;
    }

    try {
      const res = await fetch("/api/usage", { headers: window.CMAuth.authHeaders() });
      if (!res.ok) throw new Error("USAGE_FAILED");
      const data = await res.json();
      const t = window.CMI18n.t;
      if (data.subscription?.active) {
        const left = data.subscription.generationsLeft;
        badge.textContent =
          left == null ? t("account.usageUnlimited") : t("account.usagePaid", { n: left });
      } else {
        const remaining = Math.max(0, (data.limit ?? 0) - (data.count ?? 0));
        badge.textContent = t("account.usageFree", { n: remaining, limit: data.limit ?? 0 });
      }
      badge.hidden = false;
    } catch {
      badge.hidden = true;
      badge.textContent = "";
    }
  }

  function bindHeaderEvents() {
    const toggleAccountPanel = () => {
      const panel = document.getElementById("account-panel");
      if (!panel) return;
      panel.hidden = !panel.hidden;
    };

    const closeAccountPanel = () => {
      const panel = document.getElementById("account-panel");
      if (panel) panel.hidden = true;
    };

    document.getElementById("account-toggle")?.addEventListener("click", toggleAccountPanel);
    document.getElementById("account-toggle-mobile")?.addEventListener("click", () => {
      toggleAccountPanel();
      const nav = document.getElementById("mobile-nav");
      if (nav) nav.hidden = true;
    });

    if (!globalHeaderListenersBound) {
      document.addEventListener("click", (e) => {
        const panel = document.getElementById("account-panel");
        const btn = document.getElementById("account-toggle");
        const mobileBtn = document.getElementById("account-toggle-mobile");
        if (!panel || panel.hidden) return;
        if (panel.contains(e.target)) return;
        if (btn?.contains(e.target) || mobileBtn?.contains(e.target)) return;
        closeAccountPanel();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAccountPanel();
      });
      globalHeaderListenersBound = true;
    }

    document.getElementById("lang-select")?.addEventListener("change", (e) => {
      window.CMStore.setLang(e.target.value);
      applyPageTranslations();
      renderHeader();
      renderFooter();
      window.dispatchEvent(new CustomEvent("cm:retranslate"));
    });

    document.getElementById("theme-select")?.addEventListener("change", (e) => {
      window.CMStore.setTheme(e.target.value);
    });

    document.getElementById("dev-login-btn")?.addEventListener("click", async () => {
      try {
        await window.CMAuth.devLogin();
        renderHeader();
      } catch (err) {
        const key = err.message === "API_UNAVAILABLE" ? "auth.apiUnavailable" : "auth.failed";
        alert(window.CMI18n.t(key));
      }
    });

    document.getElementById("guest-login-btn")?.addEventListener("click", async () => {
      try {
        await window.CMAuth.guestLogin();
        renderHeader();
      } catch {
        alert(window.CMI18n.t("auth.failed"));
      }
    });

    document.getElementById("sign-out-btn")?.addEventListener("click", async () => {
      await window.CMAuth.signOut();
      renderHeader();
    });

    document.getElementById("delete-account-btn")?.addEventListener("click", async () => {
      if (!confirm(window.CMI18n.t("auth.deleteAccountConfirm"))) return;
      try {
        await window.CMAuth.deleteAccount();
        renderHeader();
      } catch {
        alert(window.CMI18n.t("auth.deleteAccountFailed"));
      }
    });

    document.getElementById("nav-toggle")?.addEventListener("click", () => {
      const nav = document.getElementById("mobile-nav");
      nav.hidden = !nav.hidden;
    });
  }

  function applyPageTranslations() {
    const t = window.CMI18n.t;
    document.title = t("meta.title");

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      const attr = node.getAttribute("data-i18n-attr");
      const text = t(key);
      if (attr) node.setAttribute(attr, text);
      else node.textContent = text;
    });

    const glitch = document.querySelector(".title.glitch");
    if (glitch) {
      const title = t("hero.title");
      glitch.textContent = title;
      glitch.setAttribute("data-text", title);
    }
  }

  async function fetchContent() {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) return;
      const data = await res.json();
      const settings = window.CMStore.getSettings();
      const patch = {};
      if (data.fandoms?.length) patch.fandoms = data.fandoms;
      if (data.genres?.length) patch.genres = data.genres;
      if (data.faq?.length) patch.faq = data.faq;
      if (data.requisites) patch.requisites = data.requisites;
      if (data.subscriptionPage) {
        patch.subscription = {
          ...settings.subscription,
          page: data.subscriptionPage,
        };
      }
      if (Object.keys(patch).length) window.CMStore.saveSettings(patch);
    } catch {
      /* static defaults */
    }
  }

  function bindCatalogCards(grid, type) {
    const settings = window.CMStore.getSettings();
    grid.querySelectorAll(".catalog-card").forEach((card) => {
      card.addEventListener("click", () => {
        const input = document.getElementById("prompt-input");
        if (!input) return;
        const prefix = input.value.trim() ? input.value.trim() + "\n\n" : "";
        if (type === "fandom") {
          const hint = card.dataset.prompt;
          const item = settings.fandoms.find((x) => x.promptHint === hint);
          input.value = `${prefix}[${localize(item || { names: { en: hint } }, "names")}] ${hint}`;
        } else {
          input.value = `${prefix}Genre: ${card.dataset.tags}. `;
        }
        input.focus();
        card.classList.add("is-picked");
        setTimeout(() => card.classList.remove("is-picked"), 600);
      });
    });
  }

  function renderFandoms() {
    const grid = document.getElementById("fandoms-grid");
    if (!grid) return;
    const settings = window.CMStore.getSettings();

    grid.innerHTML = settings.fandoms
      .map(
        (f) => `
      <button type="button" class="catalog-card" data-prompt="${escapeAttr(f.promptHint)}">
        <span class="card-icon">${f.icon}</span>
        <h3 class="card-title">${escapeHtml(localize(f, "names"))}</h3>
        <p class="card-desc">${escapeHtml(localize(f, "desc"))}</p>
      </button>
    `
      )
      .join("");

    bindCatalogCards(grid, "fandom");
    const wrap = grid.closest("[data-carousel]");
    if (wrap) window.CMCarousel?.initCarousel(wrap);
  }

  function renderGenres() {
    const grid = document.getElementById("genres-grid");
    if (!grid) return;
    const settings = window.CMStore.getSettings();

    grid.innerHTML = settings.genres
      .map(
        (g) => `
      <button type="button" class="catalog-card catalog-card--genre" data-tags="${escapeAttr((g.tags || []).join(", "))}">
        <span class="card-icon">${g.icon}</span>
        <h3 class="card-title">${escapeHtml(localize(g, "names"))}</h3>
        <p class="card-desc">${escapeHtml(localize(g, "desc"))}</p>
      </button>
    `
      )
      .join("");

    bindCatalogCards(grid, "genre");
    const wrap = grid.closest("[data-carousel]");
    if (wrap) window.CMCarousel?.initCarousel(wrap);
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  async function initCore() {
    document.documentElement.lang = window.CMStore.getLang();
    document.documentElement.setAttribute("data-theme", window.CMStore.getTheme());

    await window.CMAuth.fetchPublicConfig();
    await window.CMAuth.restoreSession();
    await fetchContent();

    if (window.CM_PUBLIC_CONFIG?.models) {
      window.CMModels?.populateModelSelect(window.CM_PUBLIC_CONFIG.models);
    }

    renderHeader();
    renderFooter();
    applyPageTranslations();
    renderFandoms();
    renderGenres();
    window.CMVideoLoop?.initSeamlessVideo();
    await window.CMAuth.initGoogleAuth();

    window.addEventListener("cm:settings-updated", () => {
      renderFandoms();
      renderGenres();
      renderFooter();
      window.CMAuth.fetchPublicConfig().then(() => {
        renderHeader();
      });
    });

    window.addEventListener("cm:lang-changed", () => {
      applyPageTranslations();
      renderFandoms();
      renderGenres();
      window.CMAuth.initGoogleAuth();
    });

    window.addEventListener("cm:session-changed", () => renderHeader());
  }

  window.CMCore = {
    initCore,
    applyPageTranslations,
    renderHeader,
    renderFooter,
    renderFandoms,
    renderGenres,
    localize,
    refreshUsageBadge,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCore);
  } else {
    initCore();
  }
})();
