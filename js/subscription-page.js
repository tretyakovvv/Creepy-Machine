(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function localizeText(value) {
    const lang = window.CMStore.getLang();
    if (typeof value === "string") return value;
    return value?.[lang] || value?.ru || value?.en || "";
  }

  function localizePlan(plan) {
    const lang = window.CMStore.getLang();
    const plans = window.CMI18n.translations[lang]?.plans || window.CMI18n.translations.en.plans;
    return plans[plan.id] || { name: plan.id, desc: "" };
  }

  function renderPlans() {
    const grid = document.getElementById("plans-grid");
    if (!grid) return;

    const settings = window.CMStore.getSettings();
    const t = window.CMI18n.t;
    const sub = window.CMStore.getSubscription();
    const session = window.CMStore.getSession();
    const canBuy = session?.provider === "google";

    grid.innerHTML = settings.subscription.plans
      .map((plan) => {
        const meta = localizePlan(plan);
        const isCurrent = sub.planId === plan.id && sub.active;
        const badge =
          plan.badge === "popular"
            ? `<span class="plan-badge">${t("subscription.popular")}</span>`
            : "";

        return `
        <article class="plan-card ${plan.badge === "popular" ? "plan-card--featured" : ""}">
          ${badge}
          <h3>${meta.name}</h3>
          <p class="plan-desc">${meta.desc}</p>
          <p class="plan-price">
            <span class="price-value">${plan.price}</span>
            <span class="price-currency">${plan.currency}</span>
            <span class="price-period">${t("subscription.perMonth")}</span>
          </p>
          <p class="plan-limit">${t("subscription.generations", { n: plan.generationsPerMonth })}</p>
          ${plan.features?.length ? `<ul class="plan-features">${plan.features.map((feature) => `<li>${localizeText(feature)}</li>`).join("")}</ul>` : ""}
          <button type="button" class="btn-primary plan-btn" data-plan="${plan.id}" ${isCurrent || !canBuy ? "disabled" : ""}>
            ${isCurrent ? t("subscription.currentPlan") : !canBuy ? t("subscription.googleRequired") : t("subscription.subscribe")}
          </button>
        </article>
      `;
      })
      .join("");

    grid.querySelectorAll(".plan-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const planId = btn.dataset.plan;
        if (!canBuy) {
          alert(window.CMI18n.t("subscription.googleRequired"));
          return;
        }
        btn.disabled = true;
        try {
          const result = await window.CMPayments.createYooKassaPayment(planId);
          if (result.confirmationUrl) {
            window.location.href = result.confirmationUrl;
          }
        } catch (e) {
          if (e.message === "AUTH_REQUIRED") {
            alert(window.CMI18n.t("auth.required"));
          } else {
            alert(e.message);
          }
          btn.disabled = false;
        }
      });
    });
  }

  function renderSubscriptionContent() {
    const settings = window.CMStore.getSettings();
    const page = settings.subscription.page || {};
    const langPage = page[window.CMStore.getLang()] || page.ru || page.en || page;
    const title = document.querySelector(".page-title");
    const lead = document.querySelector(".page-lead");
    const benefits = document.getElementById("subscription-benefits");
    const contact = document.getElementById("subscription-contact");

    if (title && langPage.headline) title.textContent = langPage.headline;
    if (lead && langPage.subtitle) lead.textContent = langPage.subtitle;
    if (benefits) {
      const list = langPage.benefits || [];
      benefits.innerHTML = list.map((item) => `<span>${item}</span>`).join("");
    }
    if (contact) {
      const email = typeof langPage.contact === "string"
        ? langPage.contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
        : null;
      if (email) {
        contact.innerHTML = `${escapeHtml(langPage.contact.replace(email, "").trim())} <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`;
      } else {
        contact.textContent = langPage.contact || "";
      }
      contact.hidden = !langPage.contact;
    }
  }

  function renderFaq() {
    const list = document.getElementById("faq-list");
    if (!list) return;
    const settings = window.CMStore.getSettings();
    list.innerHTML = (settings.faq || [])
      .map(
        (item) => `
          <details class="faq-item">
            <summary>${escapeHtml(localizeText(item.q))}</summary>
            <p>${escapeHtml(localizeText(item.a))}</p>
          </details>
        `
      )
      .join("");
  }

  async function showStatus() {
    const el = document.getElementById("payment-status");
    if (!el) return;
    const result = await window.CMPayments.handleReturnUrl();
    const t = window.CMI18n.t;
    if (result.success) {
      el.textContent = t("subscription.success");
      el.classList.add("is-success");
      el.hidden = false;
      window.CMCore.renderHeader();
    } else if (result.pending) {
      el.textContent = t("subscription.pending");
      el.classList.remove("is-success");
      el.hidden = false;
    }
  }

  function init() {
    renderSubscriptionContent();
    renderPlans();
    renderFaq();
    showStatus();
    window.addEventListener("cm:session-changed", () => {
      renderPlans();
    });
    window.addEventListener("cm:lang-changed", () => {
      renderSubscriptionContent();
      renderPlans();
      renderFaq();
    });
    window.addEventListener("cm:retranslate", () => {
      renderSubscriptionContent();
      renderPlans();
      renderFaq();
    });
    window.addEventListener("cm:settings-updated", () => {
      renderSubscriptionContent();
      renderPlans();
      renderFaq();
    });
  }

  if (document.getElementById("plans-grid")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
