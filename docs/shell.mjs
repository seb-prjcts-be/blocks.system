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
