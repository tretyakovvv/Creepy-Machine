(function () {
  const PENDING_PAYMENT_KEY = "cm_pending_payment";

  function savePendingPayment(payment) {
    sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payment));
  }

  function getPendingPayment() {
    try {
      const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearPendingPayment() {
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
  }

  async function createYooKassaPayment(planId) {
    const session = window.CMStore.getSession();
    if (!session) throw new Error("AUTH_REQUIRED");
    if (session.provider !== "google") throw new Error("GOOGLE_REQUIRED");

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: window.CMAuth.authHeaders(),
      body: JSON.stringify({ planId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "PAYMENT_CREATE_FAILED");
    }

    const data = await res.json();
    if (data.paymentId) {
      savePendingPayment({
        paymentId: data.paymentId,
        planId,
        createdAt: new Date().toISOString(),
      });
    }
    return data;
  }

  async function confirmPayment(paymentId) {
    const session = window.CMStore.getSession();
    if (!session) throw new Error("AUTH_REQUIRED");
    if (session.provider !== "google") throw new Error("GOOGLE_REQUIRED");

    const res = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: window.CMAuth.authHeaders(),
      body: JSON.stringify({ paymentId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "PAYMENT_CONFIRM_FAILED");
    }

    const data = await res.json();
    if (data.user) {
      window.CMStore.setSession({
        ...data.user,
        subscription: data.subscription,
      });
    }
    if (data.status === "succeeded" && data.paid) {
      clearPendingPayment();
    }
    return data;
  }

  async function handleReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      try {
        const pending = getPendingPayment();
        let confirmed = null;
        if (!pending?.paymentId) {
          const session = await window.CMAuth.restoreSession();
          return {
            success: !!session?.subscription?.active,
            pending: !session?.subscription?.active,
            planId: session?.subscription?.planId || null,
          };
        }
        confirmed = await confirmPayment(pending.paymentId);
        const session = await window.CMAuth.restoreSession();
        const isActive = !!session?.subscription?.active || (confirmed.status === "succeeded" && !!confirmed.paid);
        return {
          success: isActive,
          pending: !isActive,
          status: confirmed.status,
          planId: pending.planId,
        };
      } catch (e) {
        console.error(e);
        return { success: false, pending: false, error: e.message };
      }
    }
    return { success: false };
  }

  window.CMPayments = {
    createYooKassaPayment,
    confirmPayment,
    handleReturnUrl,
  };
})();
