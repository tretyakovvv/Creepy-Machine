(function () {
  let gsiLoaded = false;
  let initDone = false;

  function getPublicConfig() {
    return window.CM_PUBLIC_CONFIG || {};
  }

  function getToken() {
    return localStorage.getItem("cm_auth_token");
  }

  function setToken(token) {
    if (token) localStorage.setItem("cm_auth_token", token);
    else localStorage.removeItem("cm_auth_token");
  }

  function authHeaders() {
    const token = getToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  async function fetchPublicConfig() {
    try {
      const res = await fetch("/api/config/public");
      if (res.ok) {
        window.CM_PUBLIC_CONFIG = await res.json();
        if (window.CM_PUBLIC_CONFIG.models?.length) {
          window.CMModels?.populateModelSelect(window.CM_PUBLIC_CONFIG.models);
        }
      }
    } catch {
      window.CM_PUBLIC_CONFIG = {
        configUnavailable: true,
        devAuthEnabled: false,
        tempGoogleAuthEnabled: false,
        googleEnabled: false,
      };
    }
    return window.CM_PUBLIC_CONFIG;
  }

  function getGoogleClientId() {
    const pub = getPublicConfig();
    if (pub.googleClientId) return pub.googleClientId;
    const settings = window.CMStore?.getSettings?.();
    return settings?.google?.clientId || "";
  }

  function isGoogleEnabled() {
    const pub = getPublicConfig();
    if (pub.googleEnabled !== undefined) return pub.googleEnabled;
    const id = getGoogleClientId();
    return !!id;
  }

  function isDevAuthEnabled() {
    const pub = getPublicConfig();
    return !!pub.devAuthEnabled;
  }

  function isTempGoogleAuthEnabled() {
    const pub = getPublicConfig();
    return !!pub.tempGoogleAuthEnabled;
  }

  async function devLogin() {
    let res;
    try {
      res = await fetch("/api/auth/dev", { method: "POST" });
    } catch {
      throw new Error("API_UNAVAILABLE");
    }
    if (!res.ok) throw new Error("DEV_AUTH_FAILED");
    const data = await res.json();
    setToken(data.token);
    window.CMStore.setSession({
      ...data.user,
      subscription: data.subscription,
    });
    window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: data.user }));
    return data.user;
  }

  async function guestLogin() {
    const res = await fetch("/api/auth/guest", { method: "POST" });
    if (!res.ok) throw new Error("GUEST_AUTH_FAILED");
    const data = await res.json();
    setToken(data.token);
    window.CMStore.setSession({
      ...data.user,
      subscription: data.subscription,
    });
    window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: data.user }));
    return data.user;
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", resolve);
        existing.addEventListener("error", reject);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function initGoogleAuth() {
    const clientId = getGoogleClientId();
    if (!clientId) return false;

    try {
      if (!gsiLoaded) {
        await loadGoogleScript();
        gsiLoaded = true;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      const slot = document.getElementById("google-signin-btn");
      if (slot) {
        slot.innerHTML = "";
        window.google.accounts.id.renderButton(slot, {
          theme: "filled_black",
          size: "medium",
          text: "signin_with",
          shape: "pill",
          locale: window.CMStore?.getLang?.() || "en",
        });
      }
      initDone = true;
      return true;
    } catch (e) {
      console.error("Google GSI init failed:", e);
      return false;
    }
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) return;

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AUTH_FAILED");
      }

      const data = await res.json();
      setToken(data.token);
      window.CMStore.setSession({
        ...data.user,
        subscription: data.subscription || data.user?.subscription,
      });

      if (window.location.pathname.includes("auth/callback")) {
        window.location.href = "/index.html";
      } else {
        window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: data.user }));
        window.CMCore?.renderHeader?.();
      }
    } catch (e) {
      console.error("Sign-in failed:", e);
      alert(window.CMI18n?.t?.("auth.failed") || "Sign-in failed. Try again.");
    }
  }

  async function restoreSession() {
    const token = getToken();
    if (!token) {
      window.CMStore.clearSession();
      return null;
    }

    try {
      const res = await fetch("/api/auth/me", { headers: authHeaders() });
      if (!res.ok) {
        setToken(null);
        window.CMStore.clearSession();
        return null;
      }
      const data = await res.json();
      const user = { ...data.user, subscription: data.subscription };
      window.CMStore.setSession(user);
      return user;
    } catch {
      return null;
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    } catch {
      /* ignore */
    }
    setToken(null);
    window.CMStore.clearSession();
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.revoke?.(getGoogleClientId(), () => {});
    }
    initDone = false;
    window.dispatchEvent(new CustomEvent("cm:session-changed", { detail: null }));
  }

  async function deleteAccount() {
    const res = await fetch("/api/auth/account", {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("ACCOUNT_DELETE_FAILED");
    await signOut();
  }

  window.CMAuth = {
    fetchPublicConfig,
    initGoogleAuth,
    restoreSession,
    signOut,
    devLogin,
    guestLogin,
    deleteAccount,
    handleGoogleCredential,
    getToken,
    authHeaders,
    isGoogleEnabled,
    isDevAuthEnabled,
    isTempGoogleAuthEnabled,
    getGoogleClientId,
  };
})();
