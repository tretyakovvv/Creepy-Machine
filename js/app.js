(function () {
  let typingTimer = null;
  let isGenerating = false;

  function getEl(id) {
    return document.getElementById(id);
  }

  async function fetchUsage() {
    try {
      const res = await fetch("/api/usage", { headers: window.CMAuth.authHeaders() });
      if (res.ok) return res.json();
    } catch {
      /* offline */
    }
    return null;
  }

  async function canGenerate() {
    const session = window.CMStore.getSession();
    if (!session) return { allowed: false, reason: "AUTH_REQUIRED" };

    const usage = await fetchUsage();
    if (usage) {
      if (usage.subscription?.active) {
        if (usage.subscription.generationsLeft != null && usage.subscription.generationsLeft <= 0) {
          return { allowed: false, reason: "SUBSCRIPTION_LIMIT" };
        }
        return { allowed: true };
      }
      if (usage.count >= usage.limit) {
        return { allowed: false, reason: "DAILY_LIMIT" };
      }
      return { allowed: true };
    }

    const sub = window.CMStore.getSubscription();
    if (sub.active) return { allowed: true };
    return { allowed: true };
  }

  async function generateCreepypasta(prompt) {
    const settings = window.CMStore.getSettings();
    const pub = window.CM_PUBLIC_CONFIG || {};
    const useMock = settings.api.useMock && pub.useMock !== false;

    if (useMock && !pub.openrouterConfigured) {
      await new Promise((r) => setTimeout(r, 1400));
      return {
        text:
          `[MOCK — set OPENROUTER_API_KEY in .env]\n\n` +
          `Subject: ${prompt}\n\n` +
          `The machine whispered your idea back as a story. Connect the server to OpenRouter for real generations.`,
      };
    }

    const modelSel = window.CMModels?.getSelectionFromUI?.() || {};
    const intensity = document.getElementById("intensity-select")?.value || "medium";

    const res = await fetch(settings.api.generateEndpoint || "/api/generate", {
      method: "POST",
      headers: window.CMAuth.authHeaders(),
      body: JSON.stringify({
        prompt,
        lang: window.CMStore.getLang(),
        modelId: modelSel.modelId,
        providerId: modelSel.providerId,
        intensity,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || "API error");
      err.code = data.error;
      throw err;
    }
    if (!data?.text) throw new Error("Invalid response");
    return {
      text: data.text,
      modelName: data.modelName,
      providerName: data.providerName,
    };
  }

  function showWarning(msg) {
    const el = getEl("warning");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function hideWarning() {
    const el = getEl("warning");
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function warningForReason(reason) {
    const t = window.CMI18n.t;
    if (reason === "AUTH_REQUIRED") return t("auth.required");
    if (reason === "DAILY_LIMIT" || reason === "SUBSCRIPTION_LIMIT") {
      return t("generator.subscriptionRequired");
    }
    return t("generator.warningError");
  }

  function setLoading(loading) {
    isGenerating = loading;
    const btn = getEl("generate-btn");
    const input = getEl("prompt-input");
    const t = window.CMI18n.t;
    if (btn) {
      btn.disabled = loading;
      btn.classList.toggle("is-loading", loading);
      const text = btn.querySelector(".btn-text");
      if (text) text.textContent = loading ? t("generator.loading") : t("generator.generate");
    }
    if (input) input.disabled = loading;
  }

  function clearTyping() {
    if (typingTimer) clearInterval(typingTimer);
    typingTimer = null;
    const resultText = getEl("result-text");
    if (resultText) {
      resultText.classList.remove("is-typing", "is-fade-in");
      resultText.textContent = "";
    }
  }

  function typeText(element, fullText, speed = 16) {
    return new Promise((resolve) => {
      clearTyping();
      element.classList.add("is-typing");
      let i = 0;
      element.textContent = "";
      typingTimer = setInterval(() => {
        if (i < fullText.length) {
          element.textContent += fullText.charAt(i++);
        } else {
          clearInterval(typingTimer);
          typingTimer = null;
          element.classList.remove("is-typing");
          resolve();
        }
      }, speed);
    });
  }

  function showResult(text, meta = {}) {
    const section = getEl("result-section");
    const resultText = getEl("result-text");
    const badge = getEl("result-model-badge");
    if (!section || !resultText) return;

    if (badge && meta.modelName) {
      badge.textContent = `${meta.providerName || "AI"} · ${meta.modelName}`;
      badge.hidden = false;
    } else if (badge) {
      badge.hidden = true;
    }

    section.hidden = false;
    section.classList.remove("is-visible");
    requestAnimationFrame(() => section.classList.add("is-visible"));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) typeText(resultText, text);
    else {
      resultText.textContent = text;
      resultText.classList.add("is-fade-in");
    }
  }

  async function handleGenerate() {
    if (isGenerating) return;
    const t = window.CMI18n.t;
    const input = getEl("prompt-input");
    const prompt = input?.value.trim() || "";

    hideWarning();
    clearTyping();

    if (!prompt) {
      showWarning(t("generator.warningEmpty"));
      input?.focus();
      return;
    }

    const check = await canGenerate();
    if (!check.allowed) {
      showWarning(warningForReason(check.reason));
      return;
    }

    setLoading(true);
    try {
      const data = await generateCreepypasta(prompt);
      showResult(data.text, {
        modelName: data.modelName,
        providerName: data.providerName,
      });
      await window.CMAuth.restoreSession();
      window.CMCore?.refreshUsageBadge?.();
    } catch (err) {
      console.error(err);
      showWarning(err.message || warningForReason(err.code) || t("generator.warningError"));
      const section = getEl("result-section");
      if (section) {
        section.hidden = true;
        section.classList.remove("is-visible");
      }
    } finally {
      setLoading(false);
    }
  }

  function initApp() {
    const btn = getEl("generate-btn");
    const input = getEl("prompt-input");
    const copyBtn = getEl("copy-result-btn");

    copyBtn?.addEventListener("click", async () => {
      const text = getEl("result-text")?.textContent;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = window.CMI18n.t("generator.copied");
        setTimeout(() => {
          copyBtn.textContent = window.CMI18n.t("generator.copy");
        }, 2000);
      } catch {
        /* ignore */
      }
    });

    btn?.addEventListener("click", handleGenerate);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleGenerate();
      }
    });

    window.addEventListener("cm:retranslate", () => {
      if (!isGenerating) {
        const text = btn?.querySelector(".btn-text");
        if (text) text.textContent = window.CMI18n.t("generator.generate");
      }
    });

    window.addEventListener("cm:session-changed", () => {
      window.CMCore?.refreshUsageBadge?.();
    });
  }

  if (document.getElementById("generate-btn")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initApp);
    } else {
      initApp();
    }
  }
})();
