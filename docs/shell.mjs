export function nodeFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function initNavigation() {
  const navbar = document.querySelector("#navbar");
  const toggle = navbar?.querySelector(".nav-hamburger");

  if (navbar && toggle) {
    toggle.addEventListener("click", () => {
      const open = navbar.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    navbar.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      navbar.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  for (const node of document.querySelectorAll("[data-year]")) {
    node.textContent = new Date().getFullYear();
  }
}

export function initSectionNavigation() {
  const navigation = document.querySelector("[data-section-navigation]");
  if (!navigation) return;
  const links = Array.from(navigation.querySelectorAll('a[href^="#"]'));
  const sections = links.map((link) => ({
    link,
    section: document.querySelector(link.getAttribute("href"))
  })).filter(({ section }) => section);

  function activate(id) {
    for (const { link, section } of sections) {
      const current = section.id === id;
      link.classList.toggle("active", current);
      if (current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  for (const { link, section } of sections) {
    link.addEventListener("click", () => activate(section.id));
  }
  window.addEventListener("hashchange", () => activate(location.hash.slice(1)));
  if (location.hash) activate(location.hash.slice(1));

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
    if (visible[0]) activate(visible[0].target.id);
  }, { rootMargin: "-18% 0px -68% 0px", threshold: 0 });
  sections.forEach(({ section }) => observer.observe(section));
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
