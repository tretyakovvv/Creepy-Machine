(function () {
  let legalOverrides = null;

  async function loadOverrides() {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) return;
      legalOverrides = await res.json();
    } catch {
      legalOverrides = null;
    }
  }

  function resolveDoc(page) {
    const lang = window.CMStore.getLang();
    if (lang === "ru" && legalOverrides) {
      if (page === "privacy" && legalOverrides.privacyPolicyRu) return legalOverrides.privacyPolicyRu;
      if (page === "terms" && legalOverrides.termsRu) return legalOverrides.termsRu;
    }
    return window.CMI18n.getLegal(page);
  }

  function renderLegal(page) {
    const container = document.getElementById("legal-content");
    if (!container) return;

    const doc = resolveDoc(page);
    if (!doc) return;

    container.innerHTML = `
      <header class="legal-header">
        <h1>${doc.title}</h1>
        <p class="legal-updated">${doc.updated}</p>
      </header>
      ${doc.sections
        .map(
          (s) => `
        <section class="legal-section">
          <h2>${s.h}</h2>
          <p>${s.p}</p>
        </section>
      `
        )
        .join("")}
    `;
  }

  async function init() {
    const page = document.body.dataset.legalPage;
    await loadOverrides();
    if (page) renderLegal(page);

    window.addEventListener("cm:lang-changed", () => {
      renderLegal(page);
      document.title = (resolveDoc(page)?.title || "Creepy Machine") + " — Creepy Machine";
    });
    window.addEventListener("cm:retranslate", () => renderLegal(page));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
