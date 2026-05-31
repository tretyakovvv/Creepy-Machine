(function () {
  const ADMIN_PASS_KEY = "cm_admin_password";

  const loginView = () => document.getElementById("admin-login");
  const panelView = () => document.getElementById("admin-panel");

  function getAdminPass() {
    return sessionStorage.getItem(ADMIN_PASS_KEY) || "";
  }

  function setAdminPass(pass) {
    if (pass) sessionStorage.setItem(ADMIN_PASS_KEY, pass);
    else sessionStorage.removeItem(ADMIN_PASS_KEY);
  }

  function adminHeaders() {
    const fallbackInput = document.getElementById("admin-password")?.value || "";
    const pass = getAdminPass() || fallbackInput;
    return {
      "Content-Type": "application/json",
      "X-Admin-Password": pass,
    };
  }

  function showPanel(show) {
    if (loginView()) loginView().hidden = show;
    if (panelView()) panelView().hidden = !show;
  }

  function checkAuth() {
    const ok = window.CMStore.isAdminAuthenticated() && !!getAdminPass();
    showPanel(ok);
    return ok;
  }

  function bindLogin() {
    document.getElementById("admin-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pass = document.getElementById("admin-password")?.value;
      const err = document.getElementById("admin-login-error");

      try {
        setAdminPass(pass || "");
        const res = await fetch("/api/admin/settings", {
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Password": pass || "",
          },
        });
        if (!res.ok) throw new Error("INVALID_PASSWORD");
        window.CMStore.setAdminAuthenticated(true);
        err.hidden = true;
        showPanel(true);
        loadForm();
      } catch {
        window.CMStore.setAdminAuthenticated(false);
        setAdminPass("");
        err.textContent = "Invalid admin password or backend unavailable";
        err.hidden = false;
      }
    });

    document.getElementById("admin-logout")?.addEventListener("click", () => {
      window.CMStore.setAdminAuthenticated(false);
      setAdminPass("");
      showPanel(false);
    });
  }

  async function loadFromServer() {
    try {
      const res = await fetch("/api/admin/settings", { headers: adminHeaders() });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async function loadDbStatus() {
    const el = document.getElementById("db-status");
    if (!el) return;

    el.textContent = "Loading…";
    try {
      const res = await fetch("/api/admin/db-status", { headers: adminHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "DB_STATUS_FAILED");
      el.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      el.textContent = `Failed to load database status: ${err.message}`;
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats", { headers: adminHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "STATS_FAILED");

      setText("stat-visits-today", String(data.visitsToday ?? 0));
      setText("stat-visits-total", String(data.visitsTotal ?? 0));
      setText("stat-generations-today", String(data.generationsToday ?? 0));
      setText("stat-generations-total", String(data.generationsTotal ?? 0));
      setText("stat-active-subscriptions", String(data.activeSubscriptions ?? 0));
      setText("stat-paid-left", String(data.paidGenerationsLeft ?? 0));

      const list = document.getElementById("stat-top-pages");
      if (list) {
        const pages = Array.isArray(data.topPages) ? data.topPages : [];
        list.innerHTML = pages.length
          ? pages
              .map(
                (item) => `
                  <li>
                    <span class="admin-top-page-path">${item.path || "/"}</span>
                    <span class="admin-top-page-count">${item.count ?? 0}</span>
                  </li>
                `
              )
              .join("")
          : `<li class="admin-top-pages-empty">No visits yet</li>`;
      }
    } catch (err) {
      setText("stat-visits-today", "—");
      setText("stat-visits-total", "—");
      setText("stat-generations-today", "—");
      setText("stat-generations-total", "—");
      setText("stat-active-subscriptions", "—");
      setText("stat-paid-left", "—");
      const list = document.getElementById("stat-top-pages");
      if (list) list.innerHTML = `<li class="admin-top-pages-empty">Failed to load stats: ${err.message}</li>`;
    }
  }

  async function loadForm() {
    const s = window.CMStore.getSettings();
    const remote = await loadFromServer();
    const remoteYooKassa = remote?.yookassa || {};

    setVal("cfg-use-mock", s.api.useMock ? "1" : "0");
    setVal("cfg-api-endpoint", s.api.generateEndpoint);
    setVal("cfg-free-limit", s.subscription.freeGenerationsPerDay);
    setVal("cfg-yk-enabled", (remoteYooKassa.enabled ?? s.yookassa.enabled) ? "1" : "0");
    setVal("cfg-yk-shop", remoteYooKassa.shopId || s.yookassa.shopId);
    setVal(
      "cfg-yk-secret",
      remoteYooKassa.secretKey === "[hidden]" ? s.yookassa.secretKey : remoteYooKassa.secretKey || s.yookassa.secretKey
    );
    setVal("cfg-yk-return", remoteYooKassa.returnUrl || s.yookassa.returnUrl);
    setVal("cfg-yk-webhook", remoteYooKassa.webhookUrl || s.yookassa.webhookUrl);
    setVal("cfg-yk-endpoint", remoteYooKassa.createPaymentEndpoint || s.yookassa.createPaymentEndpoint);
    const googleAuth = remote?.googleAuth || s.google || {};
    setVal("cfg-google-enabled", googleAuth.enabled ? "1" : "0");
    setVal("cfg-google-client", googleAuth.clientId || s.google.clientId);

    setJson("cfg-fandoms", remote?.fandoms || s.fandoms);
    setJson("cfg-genres", remote?.genres || s.genres);
    setJson("cfg-plans", remote?.subscriptionPlans || s.subscription.plans);
    setJson("cfg-subscription-page", remote?.subscriptionPage || s.subscription.page);
    setJson("cfg-faq", remote?.faq || s.faq);
    setJson("cfg-requisites", remote?.requisites || s.requisites);
    setJson("cfg-privacy-policy-ru", remote?.privacyPolicyRu || window.CMI18n?.legal?.privacy?.ru || getDefaultPrivacyRu());
    setJson("cfg-terms-ru", remote?.termsRu || window.CMI18n?.legal?.terms?.ru || getDefaultTermsRu());
    setJson("cfg-ai-providers", remote?.aiProviders || getDefaultProviders());
    loadDbStatus();
    loadStats();
  }

  function getDefaultPrivacyRu() {
    return {
      title: "Политика конфиденциальности",
      updated: "Обновлено: май 2026",
      sections: [
        { h: "1. Оператор персональных данных", p: "Самозанятый Ухвачев Максим Романович, ИНН: 501211523848, Email: tretyaaakov@gmail.com." },
        { h: "2. Какие данные мы собираем", p: "Мы собираем данные аккаунта, пользовательские промты, созданный текст, данные об использовании и технические данные." },
        { h: "3. Как мы используем данные", p: "Данные используются для работы сервиса, активации подписок, обработки платежей и улучшения продукта." },
        { h: "4. Контакты", p: "Для запросов по данным пишите на tretyaaakov@gmail.com." },
      ],
    };
  }

  function getDefaultTermsRu() {
    return {
      title: "Условия использования",
      updated: "Обновлено: май 2026",
      sections: [
        { h: "1. Описание сервиса", p: "Сервис предоставляет онлайн-платформу для генерации вымышленных хоррор-историй с помощью ИИ." },
        { h: "2. Платежи", p: "Платные планы оплачиваются через YooKassa. Цены и лимиты показаны на странице подписки." },
        { h: "3. Контакты", p: "Email: tretyaaakov@gmail.com" },
      ],
    };
  }

  function getDefaultProviders() {
    return [
      {
        id: "openrouter",
        name: "OpenRouter",
        type: "openai_chat",
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "",
        enabled: true,
        models: [
          {
            id: "deepseek/deepseek-v4-flash:free",
            name: "DeepSeek V4 Flash",
            enabled: true,
            isDefault: true,
          },
          { id: "openrouter/free", name: "OpenRouter Router", enabled: true },
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
      {
        id: "custom",
        name: "Custom OpenAI-compatible",
        type: "openai_chat",
        baseUrl: "https://api.example.com/v1/chat/completions",
        apiKey: "",
        enabled: false,
        models: [{ id: "custom-model", name: "Custom Model", enabled: true, isDefault: true }],
      },
    ];
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? "";
  }

  function setJson(id, obj) {
    const el = document.getElementById(id);
    if (el) el.value = JSON.stringify(obj, null, 2);
  }

  function getJson(id) {
    return JSON.parse(document.getElementById(id)?.value || "[]");
  }

  function bindSave() {
    document.getElementById("admin-save")?.addEventListener("click", async () => {
      const status = document.getElementById("admin-status");
      try {
        const fandoms = getJson("cfg-fandoms");
        const genres = getJson("cfg-genres");
        const aiProviders = getJson("cfg-ai-providers");
        const subscriptionPage = getJson("cfg-subscription-page");
        const faq = getJson("cfg-faq");
        const requisites = getJson("cfg-requisites");
        const googleAuth = {
          enabled: document.getElementById("cfg-google-enabled")?.value === "1",
          clientId: document.getElementById("cfg-google-client")?.value,
        };
        const privacyPolicyRu = getJson("cfg-privacy-policy-ru");
        const termsRu = getJson("cfg-terms-ru");

        const partial = {
          api: {
            useMock: document.getElementById("cfg-use-mock")?.value === "1",
            generateEndpoint: document.getElementById("cfg-api-endpoint")?.value,
          },
          subscription: {
            freeGenerationsPerDay: parseInt(document.getElementById("cfg-free-limit")?.value, 10) || 3,
            plans: getJson("cfg-plans"),
            page: subscriptionPage,
          },
          yookassa: {
            enabled: document.getElementById("cfg-yk-enabled")?.value === "1",
            shopId: document.getElementById("cfg-yk-shop")?.value,
            secretKey: document.getElementById("cfg-yk-secret")?.value,
            returnUrl: document.getElementById("cfg-yk-return")?.value,
            webhookUrl: document.getElementById("cfg-yk-webhook")?.value,
            createPaymentEndpoint: document.getElementById("cfg-yk-endpoint")?.value,
          },
          google: googleAuth,
          fandoms,
          genres,
          faq,
          requisites,
        };
        window.CMStore.saveSettings(partial);

        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({
            adminPassword: getAdminPass() || document.getElementById("admin-password")?.value || "",
            fandoms,
            genres,
            subscriptionPlans: partial.subscription.plans,
            subscriptionPage,
            faq,
            requisites,
            yookassa: partial.yookassa,
            googleAuth,
            privacyPolicyRu,
            termsRu,
            aiProviders,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        status.textContent = res.ok
          ? "Saved (browser + server database)"
          : `Saved locally; server sync failed: ${payload.error || res.status}`;
        status.className = res.ok ? "admin-status is-ok" : "admin-status is-error";
      } catch (e) {
        status.textContent = "Invalid JSON: " + e.message;
        status.className = "admin-status is-error";
      }
    });

    document.getElementById("admin-reset")?.addEventListener("click", () => {
      if (confirm("Reset all settings to defaults?")) {
        window.CMStore.resetSettings();
        loadForm();
        document.getElementById("admin-status").textContent = "Defaults restored";
      }
    });

    document.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
        document.querySelectorAll(".admin-panel-section").forEach((s) => s.classList.remove("is-active"));
        tab.classList.add("is-active");
        document.getElementById(tab.dataset.panel)?.classList.add("is-active");
        if (tab.dataset.panel === "panel-db") loadDbStatus();
        if (tab.dataset.panel === "panel-stats") loadStats();
      });
    });

    document.getElementById("admin-refresh-db")?.addEventListener("click", loadDbStatus);
    document.getElementById("admin-refresh-stats")?.addEventListener("click", loadStats);
  }

  function init() {
    if (!document.getElementById("admin-login")) return;
    bindLogin();
    bindSave();
    checkAuth();
    if (window.CMStore.isAdminAuthenticated() && getAdminPass()) loadForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
