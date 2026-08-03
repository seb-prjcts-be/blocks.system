export function nodeFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function initNavigation() {
  const navbar = document.querySelector("#navbar");
  const toggle = navbar?.querySelector(".nav-hamburger");
  const navigation = navbar?.querySelector(".nav-links");

  if (navbar && toggle && navigation) {
    const mobileNavigation = window.matchMedia("(max-width: 900px)");

    function setNavigationOpen(open, { restoreFocus = false } = {}) {
      navbar.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "close navigation" : "open navigation");
      if (!open && restoreFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => {
      setNavigationOpen(!navbar.classList.contains("nav-open"));
    });

    navbar.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      setNavigationOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!navbar.classList.contains("nav-open") || navbar.contains(event.target)) return;
      setNavigationOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !navbar.classList.contains("nav-open")) return;
      event.preventDefault();
      setNavigationOpen(false, { restoreFocus: true });
    });

    mobileNavigation.addEventListener("change", () => setNavigationOpen(false));
  }

  for (const node of document.querySelectorAll("[data-year]")) {
    node.textContent = new Date().getFullYear();
  }
}

export function initSectionNavigation() {
  const navigation = document.querySelector("[data-section-navigation]");
  if (!navigation) return;
  const links = Array.from(navigation.querySelectorAll('a[href^="#"]'));

  function activate(hash = location.hash) {
    for (const link of links) {
      const current = Boolean(hash) && link.hash === hash;
      link.classList.toggle("active", current);
      if (current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  for (const link of links) {
    link.addEventListener("click", () => activate(link.hash));
  }
  window.addEventListener("hashchange", () => activate());
  activate();
}

export function quantizeSurface(surface, { maxWidth = 1440 } = {}) {
  const container = surface.parentElement;
  if (!container) throw new TypeError("quantizeSurface verwacht een surface met een parent.");

  function update() {
    const style = getComputedStyle(surface);
    const columns = Math.max(1, Number.parseInt(style.getPropertyValue("--blocks-columns"), 10) || 1);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const borders = (Number.parseFloat(style.borderLeftWidth) || 0) +
      (Number.parseFloat(style.borderRightWidth) || 0);
    const available = Math.min(maxWidth, container.getBoundingClientRect().width);
    const track = Math.max(1, Math.floor((available - borders - gap * (columns - 1)) / columns));
    const width = track * columns + gap * (columns - 1) + borders;

    surface.style.width = `${width}px`;
    surface.dataset.quantized = "true";
    surface.dataset.trackWidth = String(track);
  }

  const observer = new ResizeObserver(update);
  observer.observe(container);
  update();
  return Object.freeze({ disconnect: () => observer.disconnect(), update });
}

initNavigation();
initSectionNavigation();
