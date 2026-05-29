(function () {
  const FADE_SEC = 1.4;
  const LOOP_MARGIN = 1.8;

  function initSeamlessVideo() {
    const container = document.querySelector(".video-bg");
    if (!container) return;

    const primary = document.getElementById("bg-video");
    if (!primary) return;

    const src = primary.querySelector("source")?.src || primary.currentSrc;
    if (!src) return;

    primary.removeAttribute("loop");
    primary.classList.add("video-layer", "is-active");

    const secondary = primary.cloneNode(true);
    secondary.removeAttribute("id");
    secondary.classList.remove("is-active");
    secondary.classList.add("video-layer");
    container.insertBefore(secondary, primary.nextSibling);

    let active = primary;
    let idle = secondary;
    let fading = false;

    function prepare(el) {
      el.muted = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.currentTime = 0;
    }

    function swap() {
      if (fading) return;
      const dur = active.duration;
      if (!dur || !isFinite(dur)) return;

      fading = true;
      prepare(idle);
      idle.play().catch(() => {});

      active.classList.remove("is-active");
      idle.classList.add("is-active");

      const tmp = active;
      active = idle;
      idle = tmp;

      setTimeout(() => {
        idle.pause();
        idle.classList.remove("is-active");
        fading = false;
      }, FADE_SEC * 1000 + 80);
    }

    function onTimeUpdate() {
      const dur = active.duration;
      if (!dur || !isFinite(dur) || fading) return;
      if (active.currentTime >= dur - LOOP_MARGIN) swap();
    }

    [primary, secondary].forEach(prepare);
    primary.play().catch(() => {});

    primary.addEventListener("timeupdate", onTimeUpdate);
    secondary.addEventListener("timeupdate", onTimeUpdate);

    primary.addEventListener("ended", swap);
    secondary.addEventListener("ended", swap);
  }

  if (document.querySelector(".video-bg video")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSeamlessVideo);
    } else {
      initSeamlessVideo();
    }
  }

  window.CMVideoLoop = { initSeamlessVideo };
})();
