(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function loadContent() {
    try {
      const res = await fetch("/api/content");
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  function renderRequisites(content) {
    const container = document.getElementById("requisites-content");
    if (!container) return;

    const requisites = content?.requisites || window.CMStore.getSettings().requisites || {};
    const title =
      requisites?.title && typeof requisites.title === "object"
        ? window.CMCore?.localize?.(requisites, "title") || requisites.title.en || requisites.title.ru || ""
        : typeof requisites?.title === "string"
          ? requisites.title
          : "";

    const lang = window.CMStore.getLang();
    const lines = Array.isArray(requisites?.lines)
      ? requisites.lines
          .map((line) =>
            typeof line === "string"
              ? line
              : line?.[lang] || line?.ru || line?.en || line?.text || ""
          )
          .filter(Boolean)
      : [];

    container.innerHTML = `
      <header class="legal-header">
        <h1>${escapeHtml(title || "Business Details")}</h1>
      </header>
      <section class="legal-section">
        ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("") || "<p>No business details available.</p>"}
      </section>
    `;
  }

  async function init() {
    const content = await loadContent();
    renderRequisites(content);
    window.addEventListener("cm:lang-changed", () => renderRequisites(content));
    window.addEventListener("cm:retranslate", () => renderRequisites(content));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
