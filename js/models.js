(function () {
  const MODEL_KEY = "cm_selected_model";

  function getSelectedModel() {
    try {
      return JSON.parse(localStorage.getItem(MODEL_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setSelectedModel(modelId, providerId) {
    localStorage.setItem(MODEL_KEY, JSON.stringify({ modelId, providerId }));
  }

  function populateModelSelect(models) {
    const sel = document.getElementById("model-select");
    if (!sel || !models?.length) return;

    const saved = getSelectedModel();
    const subscriptionActive = !!window.CMStore.getSubscription?.()?.active;
    let picked = false;
    sel.innerHTML = models
      .map((m) => {
        const val = JSON.stringify({ modelId: m.id, providerId: m.providerId });
        const isSaved = saved?.modelId === m.id && saved?.providerId === m.providerId;
        const requiresSubscription = !!m.requiresSubscription;
        const accessible = !requiresSubscription || subscriptionActive;
        const isDefault = !saved && m.isDefault && accessible;
        const selected = !picked && accessible && (isSaved || isDefault) ? ((picked = true), " selected") : "";
        const disabled = accessible ? "" : " disabled";
        const lockLabel = requiresSubscription && !subscriptionActive
          ? ` · ${escapeHtml(window.CMI18n?.t?.("subscription.premiumOnly") || "Subscription only")}`
          : "";
        return `<option value="${escapeAttr(val)}"${selected}${disabled}>${escapeHtml(m.providerName)} — ${escapeHtml(m.name)}${lockLabel}</option>`;
      })
      .join("");

    if (!picked) {
      const firstAvailable = sel.querySelector("option:not([disabled])");
      if (firstAvailable) firstAvailable.selected = true;
    }

    sel.onchange = () => {
      try {
        const v = JSON.parse(sel.value);
        setSelectedModel(v.modelId, v.providerId);
      } catch {
        /* ignore */
      }
    };
  }

  function getSelectionFromUI() {
    const sel = document.getElementById("model-select");
    if (!sel?.value) return {};
    try {
      return JSON.parse(sel.value);
    } catch {
      return {};
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  window.CMModels = {
    populateModelSelect,
    getSelectionFromUI,
    getSelectedModel,
    setSelectedModel,
  };
})();
