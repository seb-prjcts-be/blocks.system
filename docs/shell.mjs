import { docsSourceLabel } from "./release.mjs?v=0.1.1";

const DOCS_CONTENT_SCHEMA = "blocks.system/docs-content@2";
let docsContentRequest;

async function readDocsContent() {
  if (!docsContentRequest) {
    docsContentRequest = fetch(new URL("./content.json?v=0.3.36", import.meta.url)).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load docs content (${response.status}).`);
      const content = await response.json();
      if (content.schema !== DOCS_CONTENT_SCHEMA) {
        throw new Error(`Unsupported docs content schema: ${content.schema || "missing"}.`);
      }
      return content;
    });
  }
  return docsContentRequest;
}

export async function loadDocsContent(sectionName, expectedIds) {
  if (typeof sectionName !== "string" || !sectionName) throw new TypeError("Docs content needs a section name.");
  if (!Array.isArray(expectedIds) || expectedIds.some((id) => typeof id !== "string" || !id)) {
    throw new TypeError("Docs content needs an array of expected block ids.");
  }

  const content = await readDocsContent();
  const section = content[sectionName];
  if (!section || Array.isArray(section) || typeof section !== "object") {
    throw new Error(`Docs content must contain one ${sectionName} object.`);
  }

  const actualIds = Object.keys(section);
  const missingIds = expectedIds.filter((id) => !Object.hasOwn(section, id));
  const unusedIds = actualIds.filter((id) => !expectedIds.includes(id));
  if (missingIds.length) throw new Error(`Missing ${sectionName} content: ${missingIds.join(", ")}.`);
  if (unusedIds.length) throw new Error(`Unused ${sectionName} content: ${unusedIds.join(", ")}.`);

  for (const id of expectedIds) {
    const block = section[id];
    if (!block || typeof block !== "object" || typeof block.title !== "string" || !block.title) {
      throw new Error(`Invalid ${sectionName} content: ${id}.`);
    }
  }
  return section;
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

  const sourceLabel = docsSourceLabel();
  for (const node of document.querySelectorAll("[data-docs-source-prefix]")) {
    node.textContent = `${node.textContent.trim()} · ${sourceLabel}`;
  }

  initCodeCopyButtons();
  initSyntaxHighlighting();
}

export function initCodeCopyButtons() {
  const codeBlocks = document.querySelectorAll("pre");
  for (const pre of codeBlocks) {
    if (pre.querySelector(".code-copy-btn") || !pre.querySelector("code")) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.setAttribute("aria-label", "Copy code");
    button.textContent = "copy";
    button.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.textContent || "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "copied!";
        setTimeout(() => { button.textContent = "copy"; }, 2000);
      } catch {
        button.textContent = "copied!";
        setTimeout(() => { button.textContent = "copy"; }, 2000);
      }
    });
    pre.appendChild(button);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function initSyntaxHighlighting() {
  const codeElements = document.querySelectorAll("pre code");
  for (const codeEl of codeElements) {
    if (codeEl.dataset.highlighted) continue;
    codeEl.dataset.highlighted = "true";
    const rawText = codeEl.textContent;
    if (!rawText || rawText.length > 5000) continue;
    const escaped = escapeHtml(rawText);
    const tokenized = escaped
      .replace(/(\/\/[^\n]*)/g, '<span class="tok-cm">$1</span>')
      .replace(/(&quot;.*?&quot;|'.*?'|`.*?`/g), '<span class="tok-str">$1</span>')
      .replace(/\b(import|export|const|let|var|function|return|await|async|from|if|else|true|false|null|undefined)\b/g, '<span class="tok-kw">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    codeEl.innerHTML = tokenized;
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
