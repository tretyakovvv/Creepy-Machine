(function () {
  function initCarousel(wrap) {
    const track = wrap.querySelector(".catalog-track");
    const prev = wrap.querySelector(".carousel-btn--prev");
    const next = wrap.querySelector(".carousel-btn--next");
    const dotsEl = wrap.querySelector(".carousel-dots");
    if (!track) return;

    const gap = 16;
    let page = 0;

    function cardsPerPage() {
      const w = wrap.querySelector(".catalog-track-wrap")?.clientWidth || track.clientWidth;
      const card = track.querySelector(".catalog-card");
      if (!card) return 1;
      return Math.max(1, Math.floor(w / (card.offsetWidth + gap)));
    }

    function pageCount() {
      const cards = track.querySelectorAll(".catalog-card").length;
      return Math.max(1, Math.ceil(cards / cardsPerPage()));
    }

    function renderDots() {
      if (!dotsEl) return;
      const total = pageCount();
      dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
        `<button type="button" class="carousel-dot${i === page ? " is-active" : ""}" data-page="${i}"></button>`
      ).join("");
      dotsEl.querySelectorAll(".carousel-dot").forEach((dot) => {
        dot.addEventListener("click", () => goTo(parseInt(dot.dataset.page, 10)));
      });
    }

    function goTo(p) {
      const total = pageCount();
      page = Math.min(Math.max(0, p), total - 1);
      const per = cardsPerPage();
      const card = track.querySelector(".catalog-card");
      const cardW = card ? card.offsetWidth + gap : 276;
      track.style.transform = `translateX(-${page * per * cardW}px)`;
      renderDots();
      if (prev) prev.disabled = page === 0;
      if (next) next.disabled = page >= total - 1;
    }

    if (wrap._cmCarousel) {
      wrap._cmCarousel.goTo(0);
      return;
    }

    prev?.addEventListener("click", () => goTo(page - 1));
    next?.addEventListener("click", () => goTo(page + 1));

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(page - 1);
      if (e.key === "ArrowRight") goTo(page + 1);
    });

    let touchX = 0;
    track.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) goTo(dx < 0 ? page + 1 : page - 1);
    }, { passive: true });

    const onResize = () => goTo(page);
    window.addEventListener("resize", onResize);

    wrap._cmCarousel = { goTo, refresh: () => goTo(0) };
    goTo(0);
  }

  function initAll() {
    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
  }

  window.CMCarousel = { initAll, initCarousel };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
