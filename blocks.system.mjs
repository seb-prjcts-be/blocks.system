/**
 * Generieke kern voor individueel adresseerbare blokken.
 *
 * De kern kent geen rendertechnologie. Een adapter bepaalt zelf hoe een blok
 * wordt gemount, opgeruimd en als snippet geëxporteerd.
 */

const BUILT_IN_VARIANTS = Object.freeze(["regular", "inverse"]);
const EMPTY_COLOR_ARRAY = Object.freeze([]);
const DEFAULT_INVERSION_VARIATION = 1 / 3;
const LAYOUT_VERSION = 1;
const DRAG_SETTLE_DURATION = 160;
const DRAG_SETTLE_EASING = "cubic-bezier(.2,.8,.2,1)";
const DEFAULT_MENU_OPTIONS = Object.freeze({ close: true, minimize: true });
const UI_LABELS = Object.freeze({
    en: Object.freeze({
        move: "move with the arrow keys",
        resize: "resize",
        restore: "restore",
        minimize: "minimize",
        close: "close"
    }),
    nl: Object.freeze({
        move: "verplaatsen met de pijltjestoetsen",
        resize: "formaat wijzigen",
        restore: "herstellen",
        minimize: "minimaliseren",
        close: "sluiten"
    })
});

function normalizeAutomaticMenu(value, inherited = null, path = "blocks.system.blockDefaults.menu") {
    if (value === undefined) return inherited;
    if (value === false) return null;
    const fallback = inherited || DEFAULT_MENU_OPTIONS;
    if (value === true) return fallback;
    if (!value || typeof value !== "object") {
        throw new TypeError(`${path} verwacht true, false of een object met close en minimize.`);
    }
    return Object.freeze({
        close: value.close === undefined ? fallback.close : Boolean(value.close),
        minimize: value.minimize === undefined ? fallback.minimize : Boolean(value.minimize)
    });
}

function normalizeBlockDefaults(value) {
    if (value === undefined) return Object.freeze({ menu: DEFAULT_MENU_OPTIONS });
    if (!value || typeof value !== "object") {
        throw new TypeError("blocks.system.blockDefaults verwacht een object.");
    }
    return Object.freeze({
        menu: normalizeAutomaticMenu(value.menu, DEFAULT_MENU_OPTIONS)
    });
}

function normalizeLabels(value) {
    if (value !== undefined && (!value || typeof value !== "object")) {
        throw new TypeError("blocks.system.labels verwacht een object met toegankelijke UI-labels.");
    }
    const documentLanguage = typeof document === "undefined"
        ? ""
        : String(document.documentElement?.lang || "").trim().toLowerCase();
    const defaults = documentLanguage === "nl" || documentLanguage.startsWith("nl-")
        ? UI_LABELS.nl
        : UI_LABELS.en;
    const labels = {};
    for (const name of Object.keys(defaults)) {
        const label = String(value?.[name] ?? defaults[name]).trim();
        if (!label) throw new TypeError(`blocks.system.labels.${name} mag niet leeg zijn.`);
        labels[name] = label;
    }
    return Object.freeze(labels);
}

function normalizeBlock(definition) {
    if (!definition || typeof definition !== "object") {
        throw new TypeError("Een blokdefinitie moet een object zijn.");
    }
    const id = String(definition.id || "");
    const adapter = String(definition.adapter || "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        throw new TypeError(`Ongeldig blok-id: ${id || "(leeg)"}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adapter)) {
        throw new TypeError(`Ongeldig adapter-id voor ${id}: ${adapter || "(leeg)"}`);
    }
    return Object.freeze({
        ...definition,
        id,
        adapter,
        defaults: Object.freeze({ ...(definition.defaults || {}) }),
        attributes: Object.freeze([...(definition.attributes || [])]),
        requires: Object.freeze([...(definition.requires || [])])
    });
}

function resolveHost(target) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!(host instanceof Element)) throw new TypeError("building blocks verwacht een geldig host-element.");
    return host;
}

function normalizeVariant(value) {
    const requested = String(value ?? "random").trim().toLowerCase();
    const name = requested === "default"
        ? "regular"
        : requested === "invert" ? "inverse" : requested;
    if (name === "random") return name;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
        throw new TypeError(`Ongeldige blockvariant: ${name || "(leeg)"}`);
    }
    return name;
}

function normalizePlacement(value) {
    const placement = String(value ?? "fixed").trim().toLowerCase();
    if (placement === "fixed" || placement === "flow") return placement;
    throw new TypeError("blocks.system.placement verwacht fixed of flow.");
}

function normalizeLayoutSnapshot(value) {
    if (!value || typeof value !== "object" || value.version !== LAYOUT_VERSION || !Array.isArray(value.blocks)) {
        throw new TypeError(`blocks.system.restoreLayout() verwacht layout version ${LAYOUT_VERSION}.`);
    }
    const seen = new Set();
    return value.blocks.map((entry) => {
        if (!entry || typeof entry !== "object") throw new TypeError("Elk opgeslagen block verwacht een layoutobject.");
        const id = String(entry.id || "");
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || seen.has(id)) {
            throw new TypeError(`Ongeldig of dubbel opgeslagen block-id: ${id || "(leeg)"}`);
        }
        seen.add(id);
        const span = Array.isArray(entry.span) ? entry.span.map(Number) : [];
        const place = entry.place === null ? null : Array.isArray(entry.place) ? entry.place.map(Number) : [];
        if (span.length !== 2 || span.some((unit) => !Number.isInteger(unit) || unit < 1)) {
            throw new TypeError(`Opgeslagen span van ${id} verwacht twee positieve gehele rastereenheden.`);
        }
        if (place !== null && (place.length !== 2 || place.some((unit) => !Number.isInteger(unit) || unit < 1))) {
            throw new TypeError(`Opgeslagen plaats van ${id} verwacht null of twee positieve gehele rastercoördinaten.`);
        }
        return Object.freeze({ id, span, place, minimized: Boolean(entry.minimized) });
    });
}

function normalizeColorArray(value) {
    const source = value === undefined ? EMPTY_COLOR_ARRAY : value;
    if (!Array.isArray(source)) {
        throw new TypeError("blocks.system.colorArray verwacht een array met CSS-kleuren.");
    }
    const colors = [];
    for (const value of source) {
        if (typeof value !== "string" || value.trim() === "") {
            throw new TypeError("blocks.system.colorArray verwacht niet-lege CSS-kleuren als strings.");
        }
        const color = value.trim();
        if (!colors.includes(color)) colors.push(color);
    }
    return Object.freeze(colors);
}

function resolveColorChannels(host, value) {
    if (typeof document === "undefined" || typeof globalThis.getComputedStyle !== "function") return null;
    const probe = document.createElement("span");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext?.("2d", { willReadFrequently: true });
    if (!context) return null;
    probe.hidden = true;
    probe.style.color = String(value);
    if (!probe.style.color) return null;
    host.appendChild(probe);
    const resolved = globalThis.getComputedStyle(probe).color;
    probe.remove();
    canvas.width = 1;
    canvas.height = 1;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = resolved;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    return { red, green, blue, alpha: alpha / 255 };
}

function compositeColor(foreground, background) {
    const alpha = foreground.alpha;
    return {
        red: foreground.red * alpha + background.red * (1 - alpha),
        green: foreground.green * alpha + background.green * (1 - alpha),
        blue: foreground.blue * alpha + background.blue * (1 - alpha),
        alpha: 1
    };
}

function colorLuminance(color) {
    const channel = (value) => {
        const unit = value / 255;
        return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
}

function colorContrast(first, second) {
    const firstLuminance = colorLuminance(first);
    const secondLuminance = colorLuminance(second);
    return (Math.max(firstLuminance, secondLuminance) + 0.05) /
        (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function resolveReadableMenuColor(host, backgroundValue) {
    const background = resolveColorChannels(host, backgroundValue);
    const blockPaper = resolveColorChannels(host, "var(--block-paper-color)");
    const ink = resolveColorChannels(host, "var(--blocks-ink-color)");
    const paper = resolveColorChannels(host, "var(--blocks-paper-color)");
    if (!background || !blockPaper || !ink || !paper) return null;
    const opaqueBackground = compositeColor(background, blockPaper);
    return colorContrast(ink, opaqueBackground) >= colorContrast(paper, opaqueBackground)
        ? "var(--blocks-ink-color)"
        : "var(--blocks-paper-color)";
}

function normalizeVariation(value, property, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new TypeError(`blocks.system.${property} verwacht een getal van 0 tot en met 1.`);
    }
    return value;
}

function assertColorVariationHasColors(colors, variation) {
    if (variation > 0 && colors.length === 0) {
        throw new TypeError("blocks.system.colorVariation groter dan 0 verwacht minstens één CSS-kleur in colorArray.");
    }
}

function normalizeFont(value) {
    if (value === null || value === undefined) return null;
    if (!value || typeof value !== "object") {
        throw new TypeError("blocks.system.font verwacht null of een object met minstens family.");
    }
    const family = String(value.family || "").trim();
    if (!family) throw new TypeError("blocks.system.font.family mag niet leeg zijn.");

    const href = value.href === undefined || value.href === null
        ? null
        : String(value.href).trim();
    if (href) {
        let url;
        try {
            url = new URL(href);
        } catch {
            throw new TypeError("blocks.system.font.href verwacht een geldige absolute URL.");
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new TypeError("blocks.system.font.href ondersteunt alleen http- en https-URL's.");
        }
    }

    return Object.freeze({ href: href || null, family });
}

function quoteFontFamily(family) {
    return `"${family.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r\f]/g, " ")}"`;
}

function loadFontStylesheet(href) {
    if (!href || typeof document === "undefined" || !document.head) return;
    const links = document.head.querySelectorAll?.('link[rel="stylesheet"]') || [];
    const exists = Array.from(links).some((link) =>
        link.getAttribute?.("href") === href || link.href === href
    );
    if (exists) return;

    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", href);
    link.setAttribute("data-blocks-system-font", "");
    document.head.appendChild(link);
}

function createBlockCatalog(options = {}) {
    const definitions = new Map();
    const adapters = new Map();
    const mounts = new WeakMap();
    const catalogUrl = options.catalogUrl ? new URL(options.catalogUrl) : null;

    function requireMarkup(block) {
        if (typeof block.markup !== "string") {
            throw new TypeError(`De html-adapter verwacht een markup-string op ${block.id}.`);
        }
        return block.markup;
    }

    // Ingebouwde adapter voor kant-en-klare markup. markup is vertrouwde HTML
    // van de consument — dezelfde grens als add(content).
    adapters.set("html", Object.freeze({
        mount({ block, host }) {
            const node = document.createElement("div");
            node.innerHTML = requireMarkup(block);
            host.appendChild(node);
            return node;
        },
        snippet({ block }) {
            return requireMarkup(block);
        }
    }));

    function register(definition, registerOptions = {}) {
        const block = normalizeBlock(definition);
        if (definitions.has(block.id) && !registerOptions.replace) {
            throw new Error(`Blok bestaat al: ${block.id}`);
        }
        definitions.set(block.id, block);
    }

    function registerAdapter(id, adapter, registerOptions = {}) {
        const name = String(id || "");
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
            throw new TypeError(`Ongeldig adapter-id: ${name || "(leeg)"}`);
        }
        if (!adapter || typeof adapter.mount !== "function") {
            throw new TypeError(`Adapter ${name} heeft minstens een mount()-functie nodig.`);
        }
        if (adapters.has(name) && !registerOptions.replace) {
            throw new Error(`Adapter bestaat al: ${name}`);
        }
        adapters.set(name, Object.freeze({ ...adapter }));
    }

    function get(id) {
        return definitions.get(String(id)) || null;
    }

    function list(filters = {}) {
        const query = String(filters.query || "").trim().toLowerCase();
        return Array.from(definitions.values()).filter((block) => {
            if (filters.adapter && filters.adapter !== "all" && block.adapter !== filters.adapter) return false;
            if (filters.medium && filters.medium !== "all" && block.medium !== filters.medium) return false;
            if (filters.category && filters.category !== "all" && block.category !== filters.category) return false;
            if (!query) return true;
            return [block.id, block.label, block.adapter, block.medium, block.category, block.description]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }

    function unmount(target) {
        const host = resolveHost(target);
        const mounted = mounts.get(host);
        if (!mounted) return false;
        if (typeof mounted.adapter.unmount === "function") mounted.adapter.unmount(mounted);
        if (mounted.node.parentNode === host) host.removeChild(mounted.node);
        mounts.delete(host);
        host.removeAttribute("data-block-mounted");
        return true;
    }

    async function mount(id, target, overrides = {}) {
        const host = resolveHost(target);
        const block = get(id);
        if (!block) throw new RangeError(`Onbekend blok: ${id}`);
        const adapter = adapters.get(block.adapter);
        if (!adapter) throw new Error(`Geen adapter geregistreerd voor ${block.id}: ${block.adapter}`);
        const settings = { ...block.defaults, ...overrides };
        const context = { block, host, settings, adapter };
        if (typeof adapter.ready === "function") await adapter.ready(context);
        unmount(host);
        const result = await adapter.mount(context);
        const node = result && result.node ? result.node : result;
        if (!(node instanceof Element) || node.parentNode !== host) {
            throw new TypeError(`Adapter ${block.adapter} moet een gemount root-element teruggeven.`);
        }
        const mounted = { ...context, node };
        mounts.set(host, mounted);
        host.setAttribute("data-block-mounted", block.id);
        return node;
    }

    function remount(id, target, overrides = {}) {
        return mount(id, target, overrides);
    }

    function snippet(id, overrides = {}) {
        const block = get(id);
        if (!block) throw new RangeError(`Onbekend blok: ${id}`);
        const adapter = adapters.get(block.adapter);
        if (!adapter || typeof adapter.snippet !== "function") {
            throw new Error(`Adapter ${block.adapter} levert geen snippet voor ${block.id}.`);
        }
        return adapter.snippet({ block, settings: { ...block.defaults, ...overrides } });
    }

    function address(id) {
        const block = get(id);
        if (!block) throw new RangeError(`Onbekend blok: ${id}`);
        const fallbackUrl = typeof window !== "undefined" ? window.location.href : null;
        const base = catalogUrl || fallbackUrl;
        let url;
        if (block.url) {
            try {
                url = new URL(block.url, base || undefined);
            } catch {
                if (!base) throw new Error("Voor address() is een catalogUrl nodig.");
                throw new TypeError(`Ongeldige blok-url voor ${id}: ${block.url}`);
            }
        } else {
            if (!base) throw new Error("Voor address() is een catalogUrl nodig.");
            url = new URL(base);
            // Alleen op het catalogus-/paginapad is component een eigen
            // routeringsparameter; een consumer-eigen blok-url blijft intact.
            url.searchParams.delete("component");
        }
        url.searchParams.set("block", id);
        return url.href;
    }

    function listAdapters() {
        return Array.from(adapters.keys());
    }

    return Object.freeze({
        address,
        get,
        list,
        listAdapters,
        mount,
        register,
        registerAdapter,
        remount,
        snippet,
        unmount
    });
}

export function createBlocksSystem(options = {}) {
    if (Object.hasOwn(options, "colorVary")) {
        throw new TypeError("blocks.system.colorVary heet nu colorVariation.");
    }
    const catalog = createBlockCatalog({ catalogUrl: options.catalogUrl });
    const { address, get, list, listAdapters, mount, remount, snippet, unmount } = catalog;
    const objects = new Map();
    const objectLayouts = new Map();
    const objectLayoutSetters = new Map();
    const menuInteractionSetters = new Map();
    const resizeInteractionSetters = new Map();
    const randomSource = typeof options.random === "function" ? options.random : Math.random;
    let surface = null;
    let columns = 1;
    let rows = 1;
    let snapEnabled = options.snap === undefined ? false : Boolean(options.snap);
    let placementState = normalizePlacement(options.placement);
    let draggableEnabled = options.draggable === undefined ? true : Boolean(options.draggable);
    let resizableEnabled = options.resizable === undefined ? false : Boolean(options.resizable);
    let fontState = normalizeFont(options.font);
    const labels = normalizeLabels(options.labels);
    const blockDefaults = normalizeBlockDefaults(options.blockDefaults);
    let variantMode = normalizeVariant(options.variant);
    let colorArrayState = normalizeColorArray(options.colorArray);
    let colorVariationState = normalizeVariation(options.colorVariation, "colorVariation", 0);
    let inversionVariationState = normalizeVariation(options.inversionVariation, "inversionVariation", DEFAULT_INVERSION_VARIATION);
    assertColorVariationHasColors(colorArrayState, colorVariationState);
    let objectIndex = 0;
    let api;

    function resolveAppearance(value) {
        const name = normalizeVariant(value);
        if (name !== "random") return { variant: name, color: null };
        const raw = Number(randomSource());
        const unit = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999999, raw)) : 0;
        if (colorVariationState > 0 && unit < colorVariationState) {
            const colorUnit = unit / colorVariationState;
            return {
                variant: "color",
                color: colorArrayState[Math.floor(colorUnit * colorArrayState.length)]
            };
        }
        const monochromeUnit = colorVariationState === 0
            ? unit
            : (unit - colorVariationState) / (1 - colorVariationState);
        return {
            variant: monochromeUnit >= 1 - inversionVariationState ? "inverse" : "regular",
            color: null
        };
    }

    function register(definition, registerOptions = {}) {
        catalog.register(definition, registerOptions);
        return api;
    }

    function registerAdapter(id, adapter, registerOptions = {}) {
        catalog.registerAdapter(id, adapter, registerOptions);
        return api;
    }

    function applyFontState() {
        loadFontStylesheet(fontState?.href);
        if (!surface) return;
        if (fontState) {
            surface.style.setProperty("--blocks-font-family", quoteFontFamily(fontState.family));
        } else {
            surface.style.removeProperty("--blocks-font-family");
        }
    }

    function applySurfaceState() {
        if (!surface) return;
        surface.classList.add("blocks-system-surface");
        surface.setAttribute("data-blocks-system", "");
        surface.setAttribute("data-snap", String(snapEnabled));
        surface.setAttribute("data-placement", placementState);
        surface.setAttribute("data-draggable", String(draggableEnabled));
        surface.setAttribute("data-resizable", String(resizableEnabled));
        surface.style.setProperty("--blocks-columns", String(columns));
        surface.style.setProperty("--blocks-rows", String(rows));
        applyFontState();
        for (const syncMenuInteraction of menuInteractionSetters.values()) syncMenuInteraction();
        for (const syncResizeInteraction of resizeInteractionSetters.values()) syncResizeInteraction();
    }

    function gridMetrics() {
        const style = getComputedStyle(surface);
        const bounds = surface.getBoundingClientRect();
        const pixelTracks = (value) => Array.from(String(value || "").matchAll(/(-?\d*\.?\d+)px/g), (match) => Number(match[1]));
        const columnTracks = pixelTracks(style.gridTemplateColumns);
        const rowTracks = pixelTracks(style.gridTemplateRows);
        const columnGap = Number.parseFloat(style.columnGap) || 0;
        const rowGap = Number.parseFloat(style.rowGap) || 0;
        const left = bounds.left + (Number.parseFloat(style.borderLeftWidth) || 0) + (Number.parseFloat(style.paddingLeft) || 0);
        const top = bounds.top + (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.paddingTop) || 0);
        return {
            left,
            top,
            columns: columnTracks.length || columns,
            columnStep: (columnTracks[0] || bounds.width / Math.max(1, columns)) + columnGap,
            rowStep: (rowTracks[0] || bounds.height / Math.max(1, rows)) + rowGap,
        };
    }

    function createDragController() {
        let dragState = null;
        let pointerFallbackTarget = null;
        const dragAnimations = new Set();

        function directObjects() {
            if (!surface) return [];
            return Array.from(surface.children).filter((element) => element.matches?.(".blocks-system-object"));
        }

        function emitReorder(detail) {
            if (!surface) return;
            surface.dispatchEvent(
                new CustomEvent("blocks:reorder", {
                    detail: {
                        id: detail.id,
                        input: detail.input,
                        mode: detail.mode,
                        key: detail.key ?? null,
                        fromIndex: detail.fromIndex ?? null,
                        toIndex: detail.toIndex ?? null,
                        from: detail.from ?? null,
                        to: detail.to ?? null,
                        direction: detail.direction ?? "still",
                    },
                }),
            );
        }

        function gridLayoutSnapshot(elements, metrics) {
            return elements.map((element) => {
                const id = element.getAttribute("data-block-object");
                const layout = objectLayouts.get(id) || { columns: 1, rows: 1 };
                const bounds = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                    id,
                    element,
                    col: Math.max(0, Math.round((bounds.left - metrics.left) / metrics.columnStep)),
                    row: Math.max(0, Math.round((bounds.top - metrics.top) / metrics.rowStep)),
                    width: Number.parseInt(style.getPropertyValue("--block-span-columns"), 10) || layout.columns,
                    height: Number.parseInt(style.getPropertyValue("--block-span-rows"), 10) || layout.rows,
                };
            });
        }

        function gridLayoutsOverlap(first, second) {
            return (
                first.col < second.col + second.width &&
                first.col + first.width > second.col &&
                first.row < second.row + second.height &&
                first.row + first.height > second.row
            );
        }

        function pushedGridLayouts(priority, layouts) {
            // De drop blijft staan; botsingen zakken kolomvast en cascaderen omlaag.
            const placed = [priority];
            const rest = layouts
                .filter((layout) => layout !== priority)
                .sort((first, second) => first.row - second.row || first.col - second.col);
            for (const layout of rest) {
                while (placed.some((placedLayout) => gridLayoutsOverlap(layout, placedLayout))) layout.row += 1;
                placed.push(layout);
            }
            return placed;
        }

        function showGridLanding(current, col, row) {
            current.targetCol = Math.max(0, Math.min(current.metrics.columns - current.draggedLayout.width, col));
            current.targetRow = Math.max(0, row);
            const targetLeft = current.metrics.left + current.targetCol * current.metrics.columnStep;
            const targetTop = current.metrics.top + current.targetRow * current.metrics.rowStep;
            current.preview.style.setProperty("--blocks-preview-x", `${targetLeft - current.previewOrigin.left}px`);
            current.preview.style.setProperty("--blocks-preview-y", `${targetTop - current.previewOrigin.top}px`);
            const deltaX = current.targetCol - current.draggedLayout.col;
            const deltaY = current.targetRow - current.draggedLayout.row;
            current.previewDirection =
                Math.abs(deltaY) >= Math.abs(deltaX)
                    ? deltaY > 0
                        ? "down"
                        : deltaY < 0
                          ? "up"
                          : "still"
                    : deltaX > 0
                      ? "right"
                      : "left";
            current.preview.setAttribute("data-drop-direction", current.previewDirection);
            const target = {
                ...current.draggedLayout,
                col: current.targetCol,
                row: current.targetRow,
            };
            const pushes = current.gridLayouts.some(
                (layout) => layout !== current.draggedLayout && gridLayoutsOverlap(target, layout),
            );
            if (pushes) current.preview.setAttribute("data-drop-state", "push");
            else current.preview.removeAttribute("data-drop-state");
        }

        function commitGridDrop(current) {
            const moved =
                current.targetCol !== current.draggedLayout.col || current.targetRow !== current.draggedLayout.row;
            if (!moved) return false;
            current.draggedLayout.col = current.targetCol;
            current.draggedLayout.row = current.targetRow;
            const placed = pushedGridLayouts(current.draggedLayout, current.gridLayouts);
            rows = Math.max(rows, ...placed.map((layout) => layout.row + layout.height));
            for (const layout of placed) {
                objectLayoutSetters.get(layout.id)?.(layout.col + 1, layout.row + 1);
            }
            placed.sort((first, second) => first.row - second.row || first.col - second.col);
            for (const layout of placed) surface.appendChild(layout.element);
            applySurfaceState();
            current.targetIndex = placed.indexOf(current.draggedLayout);
            return true;
        }

        function moveGridWithKeyboard(shell, key) {
            finishDragAnimations();
            const elements = directObjects();
            const metrics = gridMetrics();
            const layouts = gridLayoutSnapshot(elements, metrics);
            const dragged = layouts.find((layout) => layout.element === shell);
            const from = { col: dragged.col, row: dragged.row };
            const fromIndex = elements.indexOf(shell);
            if (key === "ArrowLeft") dragged.col = Math.max(0, dragged.col - 1);
            if (key === "ArrowRight") dragged.col = Math.min(metrics.columns - dragged.width, dragged.col + 1);
            if (key === "ArrowUp") dragged.row = Math.max(0, dragged.row - 1);
            if (key === "ArrowDown") dragged.row += 1;
            if (dragged.col === from.col && dragged.row === from.row) return false;

            const before = new Map(elements.map((element) => [element, element.getBoundingClientRect()]));
            const placed = pushedGridLayouts(dragged, layouts);
            rows = Math.max(rows, ...placed.map((layout) => layout.row + layout.height));
            for (const layout of placed) objectLayoutSetters.get(layout.id)?.(layout.col + 1, layout.row + 1);
            placed.sort((first, second) => first.row - second.row || first.col - second.col);
            for (const layout of placed) surface.appendChild(layout.element);
            applySurfaceState();
            shell.querySelector(":scope > .blocks-system-menu > .blocks-system-title")?.focus({ preventScroll: true });
            animateDragSettlement(elements, before);
            emitReorder({
                id: shell.getAttribute("data-block-object"),
                input: "keyboard",
                mode: "grid",
                key,
                fromIndex,
                toIndex: placed.indexOf(dragged),
                from: { column: from.col + 1, row: from.row + 1 },
                to: { column: dragged.col + 1, row: dragged.row + 1 },
                direction: key.replace("Arrow", "").toLowerCase(),
            });
            return true;
        }

        function finishDragAnimations() {
            for (const animation of dragAnimations) {
                try {
                    animation.finish();
                } catch {
                    animation.cancel();
                }
            }
            dragAnimations.clear();
        }

        function animateDragSettlement(elements, before) {
            // FLIP zonder CSS-transition: alle betrokken blocks settelen als één drop.
            if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            for (const element of elements) {
                if (element.parentElement !== surface || typeof element.animate !== "function") continue;
                const from = before.get(element);
                const to = element.getBoundingClientRect();
                if (!from) continue;
                const deltaX = from.left - to.left;
                const deltaY = from.top - to.top;
                if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
                const animation = element.animate([{ translate: `${deltaX}px ${deltaY}px` }, { translate: "0 0" }], {
                    duration: DRAG_SETTLE_DURATION,
                    easing: DRAG_SETTLE_EASING,
                });
                dragAnimations.add(animation);
                animation.finished.catch(() => {}).finally(() => dragAnimations.delete(animation));
            }
        }

        function measureLandingSlots(preview, shell, objects) {
            const slots = [];
            for (let index = 0; index <= objects.length; index += 1) {
                const reference = objects[index] || null;
                surface.insertBefore(preview, reference);
                const bounds = preview.getBoundingClientRect();
                slots.push({ index, reference, left: bounds.left, top: bounds.top });
            }
            surface.insertBefore(preview, shell);
            return slots;
        }

        function closestLandingSlot(current, left, top) {
            const deltaX = left - current.startLeft;
            const deltaY = top - current.startTop;
            const vertical = Math.abs(deltaY) >= Math.abs(deltaX);
            const direction = Math.sign(vertical ? deltaY : deltaX);
            let best = current.slots[0];
            let bestDistance = Number.POSITIVE_INFINITY;
            for (const slot of current.slots) {
                const distance = Math.hypot(left - slot.left, top - slot.top);
                const directionalTie =
                    Math.abs(distance - bestDistance) <= 0.5 &&
                    direction !== 0 &&
                    direction * (slot.index - best.index) > 0;
                if (distance < bestDistance - 0.5 || directionalTie) {
                    best = slot;
                    bestDistance = distance;
                }
            }

            const active = current.slots[current.targetIndex];
            if (!active || active.index === best.index) return best;
            const activeDistance = Math.hypot(left - active.left, top - active.top);
            const hysteresis = Math.max(4, Math.min(12, Math.min(current.width, current.height) * 0.06));
            return bestDistance + hysteresis < activeDistance ? best : active;
        }

        function rectanglesOverlap(first, second) {
            return (
                first.left < second.right - 0.5 &&
                first.right > second.left + 0.5 &&
                first.top < second.bottom - 0.5 &&
                first.bottom > second.top + 0.5
            );
        }

        function showLandingSlot(current, slot) {
            current.targetIndex = slot.index;
            current.targetReference = slot.reference;
            current.preview.style.setProperty("--blocks-preview-x", `${slot.left - current.previewOrigin.left}px`);
            current.preview.style.setProperty("--blocks-preview-y", `${slot.top - current.previewOrigin.top}px`);

            const deltaX = slot.left - current.previewOrigin.left;
            const deltaY = slot.top - current.previewOrigin.top;
            const direction =
                Math.abs(deltaY) >= Math.abs(deltaX)
                    ? deltaY > 0.5
                        ? "down"
                        : deltaY < -0.5
                          ? "up"
                          : "still"
                    : deltaX > 0.5
                      ? "right"
                      : "left";
            current.preview.setAttribute("data-drop-direction", direction);
            const landing = {
                left: slot.left,
                top: slot.top,
                right: slot.left + current.width,
                bottom: slot.top + current.height,
            };
            const pushes =
                direction === "down" && current.occupied.some((bounds) => rectanglesOverlap(landing, bounds));
            if (pushes) current.preview.setAttribute("data-drop-state", "push");
            else current.preview.removeAttribute("data-drop-state");
        }

        function stopDragging(pointerId, commit = false) {
            if (!dragState || (pointerId !== undefined && dragState.pointerId !== pointerId)) return;
            const current = dragState;
            dragState = null;
            removePointerFallback();
            const animatedObjects = current.objects.filter((element) => element.parentElement === surface);
            const before = new Map(animatedObjects.map((element) => [element, element.getBoundingClientRect()]));
            let changed = false;
            if (commit && current.preview.parentElement === surface) {
                if (current.mode === "grid") {
                    changed = commitGridDrop(current);
                } else {
                    const reference =
                        current.targetReference?.parentElement === surface ? current.targetReference : null;
                    surface.insertBefore(current.shell, reference);
                    changed = current.targetIndex !== current.originalIndex;
                }
            }
            current.preview.remove();
            current.shell.classList.remove("is-dragging");
            for (const property of [
                "--blocks-drag-left",
                "--blocks-drag-top",
                "--blocks-drag-width",
                "--blocks-drag-height",
            ]) {
                current.shell.style.removeProperty(property);
            }
            if (surface) surface.removeAttribute("data-dragging");
            if (current.handle.hasPointerCapture?.(current.pointerId)) {
                current.handle.releasePointerCapture(current.pointerId);
            }
            animateDragSettlement(animatedObjects, before);
            if (commit && changed && surface) {
                emitReorder({
                    id: current.shell.getAttribute("data-block-object"),
                    input: "pointer",
                    mode: current.mode,
                    fromIndex: current.originalIndex,
                    toIndex: current.targetIndex,
                    from: current.fromPosition,
                    to: current.mode === "grid" ? { column: current.targetCol + 1, row: current.targetRow + 1 } : null,
                    direction: current.previewDirection,
                });
            }
        }

        function addPointerFallback() {
            if (pointerFallbackTarget || typeof window !== "object") return;
            pointerFallbackTarget = window;
            pointerFallbackTarget.addEventListener("pointermove", moveDragging);
            pointerFallbackTarget.addEventListener("pointerup", finishDragging);
            pointerFallbackTarget.addEventListener("pointercancel", finishDragging);
        }

        function removePointerFallback() {
            if (!pointerFallbackTarget) return;
            pointerFallbackTarget.removeEventListener("pointermove", moveDragging);
            pointerFallbackTarget.removeEventListener("pointerup", finishDragging);
            pointerFallbackTarget.removeEventListener("pointercancel", finishDragging);
            pointerFallbackTarget = null;
        }

        function startDragging(event) {
            if (!draggableEnabled || event.button !== 0 || !surface) return;
            if (!(event.target instanceof Element)) return;
            if (event.target.closest("button, a, input, select, textarea")) return;
            const handle = event.target.closest(".blocks-system-menu");
            const shell = handle?.closest(".blocks-system-object");
            if (!handle || !shell || shell.parentElement !== surface) return;
            if (shell.getAttribute("data-block-draggable") !== "true") return;

            stopDragging();
            finishDragAnimations();
            const bounds = shell.getBoundingClientRect();
            const computed = getComputedStyle(shell);
            const preview = document.createElement("div");
            preview.className = "blocks-system-drop-preview";
            preview.setAttribute("aria-hidden", "true");
            preview.style.setProperty(
                "--block-span-columns",
                computed.getPropertyValue("--block-span-columns").trim() || "1",
            );
            preview.style.setProperty(
                "--block-span-rows",
                computed.getPropertyValue("--block-span-rows").trim() || "1",
            );
            preview.style.setProperty("--block-column", computed.getPropertyValue("--block-column").trim() || "auto");
            preview.style.setProperty("--block-row", computed.getPropertyValue("--block-row").trim() || "auto");
            preview.style.width = `${bounds.width}px`;
            preview.style.height = `${bounds.height}px`;
            surface.insertBefore(preview, shell);

            shell.style.setProperty("--blocks-drag-left", `${bounds.left}px`);
            shell.style.setProperty("--blocks-drag-top", `${bounds.top}px`);
            shell.style.setProperty("--blocks-drag-width", `${bounds.width}px`);
            shell.style.setProperty("--blocks-drag-height", `${bounds.height}px`);
            shell.classList.add("is-dragging");

            const allObjects = directObjects();
            const originalIndex = allObjects.indexOf(shell);
            const otherObjects = allObjects.filter((element) => element !== shell);
            const previewBounds = preview.getBoundingClientRect();
            const commonState = {
                pointerId: event.pointerId,
                shell,
                handle,
                preview,
                offsetX: event.clientX - bounds.left,
                offsetY: event.clientY - bounds.top,
                startLeft: bounds.left,
                startTop: bounds.top,
                width: bounds.width,
                height: bounds.height,
                objects: allObjects,
                originalIndex,
                targetIndex: originalIndex,
                previewOrigin: { left: previewBounds.left, top: previewBounds.top },
                previewDirection: "still",
            };
            if (snapEnabled && placementState === "fixed") {
                // Vaste snapmodus is ruimtelijk; flowplaatsing bewaart alleen de DOM-volgorde.
                const metrics = gridMetrics();
                const gridLayouts = gridLayoutSnapshot(allObjects, metrics);
                const draggedLayout = gridLayouts.find((layout) => layout.element === shell);
                dragState = {
                    ...commonState,
                    mode: "grid",
                    metrics,
                    gridLayouts,
                    draggedLayout,
                    fromPosition: { column: draggedLayout.col + 1, row: draggedLayout.row + 1 },
                    targetCol: draggedLayout.col,
                    targetRow: draggedLayout.row,
                };
                showGridLanding(dragState, draggedLayout.col, draggedLayout.row);
            } else {
                const slots = measureLandingSlots(preview, shell, otherObjects);
                const restoredPreviewBounds = preview.getBoundingClientRect();
                dragState = {
                    ...commonState,
                    mode: "flow",
                    slots,
                    occupied: otherObjects.map((element) => element.getBoundingClientRect()),
                    targetReference: slots[originalIndex]?.reference || null,
                    previewOrigin: { left: restoredPreviewBounds.left, top: restoredPreviewBounds.top },
                };
                showLandingSlot(dragState, slots[originalIndex]);
            }
            surface.setAttribute("data-dragging", shell.getAttribute("data-block-object") || "");
            let pointerCaptured = false;
            if (typeof handle.setPointerCapture === "function") {
                try {
                    handle.setPointerCapture(event.pointerId);
                    pointerCaptured = handle.hasPointerCapture?.(event.pointerId) ?? true;
                } catch {
                    pointerCaptured = false;
                }
            }
            if (!pointerCaptured) addPointerFallback();
            event.preventDefault();
        }

        function moveDragging(event) {
            if (!dragState || dragState.pointerId !== event.pointerId || !surface) return;
            event.preventDefault();
            const left = event.clientX - dragState.offsetX;
            const top = event.clientY - dragState.offsetY;
            dragState.shell.style.setProperty("--blocks-drag-left", `${left}px`);
            dragState.shell.style.setProperty("--blocks-drag-top", `${top}px`);
            if (dragState.mode === "grid") {
                const col = Math.round((left - dragState.metrics.left) / dragState.metrics.columnStep);
                const row = Math.round((top - dragState.metrics.top) / dragState.metrics.rowStep);
                showGridLanding(dragState, col, row);
            } else {
                const slot = closestLandingSlot(dragState, left, top);
                showLandingSlot(dragState, slot);
                dragState.previewDirection = dragState.preview.getAttribute("data-drop-direction") || "still";
            }
        }

        function finishDragging(event) {
            stopDragging(event.pointerId, event.type === "pointerup");
        }

        function moveWithKeyboard(event) {
            if (!draggableEnabled || !surface || !(event.target instanceof Element)) return;
            if (!new Set(["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]).has(event.key)) return;
            const handle = event.target.closest(".blocks-system-title");
            const shell = handle?.closest(".blocks-system-object");
            if (!handle || event.target !== handle || !shell || shell.parentElement !== surface) return;
            if (shell.getAttribute("data-block-draggable") !== "true") return;

            if (snapEnabled && placementState === "fixed") {
                if (!moveGridWithKeyboard(shell, event.key)) return;
                event.preventDefault();
                return;
            }

            const previous = shell.previousElementSibling;
            const next = shell.nextElementSibling;
            const fromIndex = directObjects().indexOf(shell);
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                if (!previous) return;
                surface.insertBefore(shell, previous);
            } else {
                if (!next) return;
                surface.insertBefore(shell, next.nextElementSibling);
            }
            event.preventDefault();
            emitReorder({
                id: shell.getAttribute("data-block-object"),
                input: "keyboard",
                mode: "flow",
                key: event.key,
                fromIndex,
                toIndex: directObjects().indexOf(shell),
                direction: event.key.replace("Arrow", "").toLowerCase(),
            });
        }

        function bindSurfaceEvents(target) {
            target.addEventListener("pointerdown", startDragging);
            target.addEventListener("pointermove", moveDragging);
            target.addEventListener("pointerup", finishDragging);
            target.addEventListener("pointercancel", finishDragging);
            target.addEventListener("lostpointercapture", finishDragging);
            target.addEventListener("keydown", moveWithKeyboard);
        }

        function unbindSurfaceEvents(target) {
            removePointerFallback();
            target.removeEventListener("pointerdown", startDragging);
            target.removeEventListener("pointermove", moveDragging);
            target.removeEventListener("pointerup", finishDragging);
            target.removeEventListener("pointercancel", finishDragging);
            target.removeEventListener("lostpointercapture", finishDragging);
            target.removeEventListener("keydown", moveWithKeyboard);
        }

        return Object.freeze({
            bind: bindSurfaceEvents,
            stop: stopDragging,
            unbind: unbindSurfaceEvents,
        });
    }

    const drag = createDragController();

    function attach(target) {
        const nextSurface = resolveHost(target);
        if (surface && surface !== nextSurface && objects.size > 0) {
            throw new Error("Verwijder de bestaande blokken voordat blocks.system aan een ander veld wordt gekoppeld.");
        }
        if (surface && surface !== nextSurface) {
            drag.stop();
            drag.unbind(surface);
            surface.classList.remove("blocks-system-surface");
            surface.removeAttribute("data-blocks-system");
            surface.removeAttribute("data-snap");
            surface.removeAttribute("data-placement");
            surface.removeAttribute("data-draggable");
            surface.removeAttribute("data-resizable");
            surface.style.removeProperty("--blocks-columns");
            surface.style.removeProperty("--blocks-rows");
            surface.style.removeProperty("--blocks-font-family");
        }
        if (surface !== nextSurface) drag.bind(nextSurface);
        surface = nextSurface;
        applySurfaceState();
        return api;
    }

    function emitChange(detail) {
        if (!surface || typeof surface.dispatchEvent !== "function") return;
        surface.dispatchEvent(
            new CustomEvent("blocks:change", {
                detail: {
                    type: detail.type,
                    id: detail.id ?? null,
                    ids: detail.ids ?? (detail.id ? [detail.id] : []),
                },
            }),
        );
    }

    function emitResize(detail) {
        if (!surface || typeof surface.dispatchEvent !== "function") return;
        surface.dispatchEvent(new CustomEvent("blocks:resize", { detail }));
    }

    function directObjectElements() {
        if (!surface) return [];
        return Array.from(surface.children).filter((element) => element.matches?.(".blocks-system-object"));
    }

    function exportLayout() {
        return {
            version: LAYOUT_VERSION,
            blocks: directObjectElements().map((element) => {
                const id = element.getAttribute("data-block-object");
                const layout = objectLayouts.get(id);
                const block = objects.get(id);
                return {
                    id,
                    span: [layout.columns, layout.rows],
                    place: layout.column === null || layout.row === null ? null : [layout.column, layout.row],
                    minimized: block.minimized,
                };
            }),
        };
    }

    function restoreLayout(snapshot) {
        drag.stop();
        const entries = normalizeLayoutSnapshot(snapshot);
        const knownEntries = entries.filter((entry) => objects.has(entry.id));
        const targetLayouts = knownEntries.map((entry) => ({
            id: entry.id,
            columns: entry.span[0],
            rows: entry.span[1],
            column: entry.place?.[0] ?? null,
            row: entry.place?.[1] ?? null,
        }));
        for (const layout of targetLayouts) {
            const lastColumn = layout.column === null ? layout.columns : layout.column + layout.columns - 1;
            const lastRow = layout.row === null ? layout.rows : layout.row + layout.rows - 1;
            if (lastColumn > columns || lastRow > rows) {
                throw new RangeError(`Opgeslagen layout van ${layout.id} past niet in raster ${columns}×${rows}.`);
            }
        }
        const placedTargets = targetLayouts.filter((layout) => layout.column !== null && layout.row !== null);
        for (let index = 0; index < placedTargets.length; index += 1) {
            for (let otherIndex = index + 1; otherIndex < placedTargets.length; otherIndex += 1) {
                if (layoutsOverlap(placedTargets[index], placedTargets[otherIndex])) {
                    throw new RangeError(`Opgeslagen layouts van ${placedTargets[index].id} en ${placedTargets[otherIndex].id} overlappen.`);
                }
            }
        }

        const savedIds = new Set(knownEntries.map((entry) => entry.id));
        const ordered = [
            ...knownEntries.map((entry) => objects.get(entry.id).element),
            ...directObjectElements().filter((element) => !savedIds.has(element.getAttribute("data-block-object"))),
        ];
        for (const element of ordered) surface.insertBefore(element, null);
        for (const block of objects.values()) block.flow();
        for (const entry of knownEntries) objects.get(entry.id).span(...entry.span);
        for (const entry of knownEntries) {
            const block = objects.get(entry.id);
            if (entry.place) block.place(...entry.place);
            block.minimized = entry.minimized;
        }
        return api;
    }

    function layoutsOverlap(first, second) {
        return first.column < second.column + second.columns &&
            first.column + first.columns > second.column &&
            first.row < second.row + second.rows &&
            first.row + first.rows > second.row;
    }

    function assertLayoutFits(id, layout, gridColumns = columns, gridRows = rows) {
        const lastColumn = layout.column === null
            ? layout.columns
            : layout.column + layout.columns - 1;
        const lastRow = layout.row === null
            ? layout.rows
            : layout.row + layout.rows - 1;
        if (lastColumn > gridColumns || lastRow > gridRows) {
            throw new RangeError(`Layout van ${id} past niet in raster ${gridColumns}×${gridRows}.`);
        }
        if (layout.column === null || layout.row === null) return;
        for (const [otherId, other] of objectLayouts) {
            if (otherId === id || other.column === null || other.row === null) continue;
            if (layoutsOverlap(layout, other)) throw new RangeError(`Plaats van ${id} overlapt ${otherId}.`);
        }
    }

    function setGrid(x, y) {
        drag.stop();
        const nextColumns = Number(x);
        const nextRows = Number(y);
        if (!Number.isInteger(nextColumns) || nextColumns < 1 ||
            !Number.isInteger(nextRows) || nextRows < 1) {
            throw new TypeError("setGrid(x, y) verwacht positieve gehele aantallen kolommen en rijen.");
        }
        for (const [id, layout] of objectLayouts) assertLayoutFits(id, layout, nextColumns, nextRows);
        columns = nextColumns;
        rows = nextRows;
        applySurfaceState();
        return api;
    }

    function compact() {
        drag.stop();
        const placed = [];
        const movedIds = [];
        const orderedLayouts = directObjectElements()
            .map((element, index) => {
                const id = element.getAttribute("data-block-object");
                return { id, index, layout: objectLayouts.get(id) };
            })
            .filter((item) => item.layout && item.layout.column !== null && item.layout.row !== null)
            .sort((first, second) =>
                first.layout.row - second.layout.row ||
                first.layout.column - second.layout.column ||
                first.index - second.index);
        for (const { id, layout } of orderedLayouts) {
            const originalLayout = { ...layout };
            const nextLayout = { ...layout, row: 1 };
            for (const other of placed) {
                const sharesColumn =
                    originalLayout.column < other.original.column + other.original.columns &&
                    originalLayout.column + originalLayout.columns > other.original.column;
                if (sharesColumn && other.original.row < originalLayout.row) {
                    nextLayout.row = Math.max(nextLayout.row, other.layout.row + other.layout.rows);
                }
            }
            while (placed.some((other) => layoutsOverlap(nextLayout, other.layout))) nextLayout.row += 1;
            placed.push({ original: originalLayout, layout: nextLayout });
            if (nextLayout.row === layout.row) continue;
            objectLayoutSetters.get(id)?.(nextLayout.column, nextLayout.row);
            movedIds.push(id);
        }
        if (movedIds.length > 0) {
            applySurfaceState();
            emitChange({ type: "compact", ids: movedIds });
        }
        return api;
    }

    function collapseReleasedLayout(releasedLayout) {
        if (!snapEnabled || releasedLayout.column === null || releasedLayout.row === null) return [];
        const releasedCells = new Set();
        const cellKey = (column, row) => `${column}:${row}`;
        const markReleased = (layout) => {
            for (let row = layout.row; row < layout.row + layout.rows; row += 1) {
                for (let column = layout.column; column < layout.column + layout.columns; column += 1) {
                    releasedCells.add(cellKey(column, row));
                }
            }
        };
        const canFillAt = (layout, row) => {
            for (let cellRow = row; cellRow < row + layout.rows; cellRow += 1) {
                for (let column = layout.column; column < layout.column + layout.columns; column += 1) {
                    if (!releasedCells.has(cellKey(column, cellRow))) return false;
                }
            }
            return true;
        };
        const occupy = (layout, row) => {
            for (let cellRow = row; cellRow < row + layout.rows; cellRow += 1) {
                for (let column = layout.column; column < layout.column + layout.columns; column += 1) {
                    releasedCells.delete(cellKey(column, cellRow));
                }
            }
        };

        markReleased(releasedLayout);
        for (let row = releasedLayout.row; row < releasedLayout.row + releasedLayout.rows; row += 1) {
            const rowStillOccupied = Array.from(objectLayouts.values()).some((layout) =>
                layout.column !== null &&
                layout.row !== null &&
                layout.row <= row &&
                layout.row + layout.rows > row);
            if (rowStillOccupied) continue;
            // A row made completely empty by this removal can accept any later block width.
            for (let column = 1; column <= columns; column += 1) releasedCells.add(cellKey(column, row));
        }
        const movedIds = [];
        const orderedLayouts = directObjectElements()
            .map((element, index) => {
                const id = element.getAttribute("data-block-object");
                return { id, index, layout: objectLayouts.get(id) };
            })
            .filter((item) => item.layout && item.layout.column !== null && item.layout.row !== null)
            .sort((first, second) =>
                first.layout.row - second.layout.row ||
                first.layout.column - second.layout.column ||
                first.index - second.index);

        for (const { id, layout } of orderedLayouts) {
            let nextRow = null;
            for (let row = 1; row < layout.row; row += 1) {
                if (!canFillAt(layout, row)) continue;
                nextRow = row;
                break;
            }
            if (nextRow === null) continue;
            occupy(layout, nextRow);
            markReleased(layout);
            objectLayoutSetters.get(id)?.(layout.column, nextRow);
            movedIds.push(id);
        }
        if (movedIds.length > 0) applySurfaceState();
        return movedIds;
    }

    function appendContent(container, content) {
        const resolved = typeof content === "function" ? content() : content;
        if (typeof resolved === "string") {
            container.innerHTML = resolved;
            return;
        }
        if (resolved instanceof Node) {
            container.appendChild(resolved);
            return;
        }
        throw new TypeError("blocks.system.add(content) verwacht HTML als string, een DOM-node of een functie die een van beide teruggeeft.");
    }

    function add(content, addOptions = {}) {
        if (!surface) throw new Error("Roep eerst blocks.system.attach(target) aan.");
        drag.stop();
        let id;
        if (addOptions.id !== undefined) {
            if (typeof addOptions.id !== "string") throw new TypeError(`Ongeldig block-id: ${addOptions.id}`);
            id = addOptions.id;
        } else {
            do {
                id = `block-${++objectIndex}`;
            } while (objects.has(id));
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new TypeError(`Ongeldig block-id: ${id}`);
        if (objects.has(id)) throw new Error(`Block bestaat al: ${id}`);
        const automaticMenu = normalizeAutomaticMenu(
            addOptions.menu,
            blockDefaults.menu,
            "blocks.system.add() options.menu"
        );
        const block = createBlockController(id, content, addOptions);
        if (automaticMenu) block.menu(addOptions.title ?? "", automaticMenu);
        return block;
    }

    function createBlockController(id, content, addOptions) {
        let appearanceValue = resolveAppearance(addOptions.variant ?? variantMode);
        let variantValue = appearanceValue.variant;
        let minimizedValue = Boolean(addOptions.minimized);
        let draggableValue = addOptions.draggable === undefined ? true : Boolean(addOptions.draggable);
        let resizableValue = addOptions.resizable === undefined ? true : Boolean(addOptions.resizable);
        const shell = document.createElement("section");
        shell.className = "blocks-system-object";
        shell.setAttribute("data-block-object", id);
        shell.setAttribute("data-block-minimized", String(minimizedValue));
        const contentNode = document.createElement("div");
        contentNode.className = "blocks-system-content";
        appendContent(contentNode, content);
        shell.appendChild(contentNode);
        surface.appendChild(shell);

        let menuNode = null;
        let titleNode = null;
        let actionsNode = null;
        let minimizeNode = null;
        let closeNode = null;
        const resizeHandles = new Map();
        let resizeState = null;
        let resizeFallbackTarget = null;
        let colorValue = "";
        let spanColumns = 1;
        let spanRows = 1;
        let placeColumn = null;
        let placeRow = null;
        let block;

        function syncMenuContrast() {
            const customColor = colorValue || appearanceValue.color;
            if (!customColor) {
                shell.style.removeProperty("--block-menu-color");
                return;
            }
            const fallback = variantValue === "inverse"
                ? "var(--blocks-paper-color)"
                : "var(--blocks-ink-color)";
            shell.style.setProperty("--block-menu-color", resolveReadableMenuColor(shell, customColor) || fallback);
        }

        function syncAppearance() {
            variantValue = appearanceValue.variant;
            shell.setAttribute("data-block-variant", variantValue);
            if (appearanceValue.color === null) {
                shell.removeAttribute("data-block-color");
                shell.style.removeProperty("--block-array-color");
                syncMenuContrast();
                return;
            }
            shell.setAttribute("data-block-color", appearanceValue.color);
            shell.style.setProperty("--block-array-color", appearanceValue.color);
            syncMenuContrast();
        }

        function applyLayout(layout) {
            spanColumns = layout.columns;
            spanRows = layout.rows;
            placeColumn = layout.column;
            placeRow = layout.row;
            objectLayouts.set(id, { ...layout });
            shell.setAttribute("data-block-flow", String(layout.column === null || layout.row === null));
            shell.style.setProperty("--block-span-columns", String(spanColumns));
            shell.style.setProperty("--block-span-rows", String(spanRows));
            if (placeColumn === null || placeRow === null) {
                shell.style.removeProperty("--block-column");
                shell.style.removeProperty("--block-row");
            } else {
                shell.style.setProperty("--block-column", String(placeColumn));
                shell.style.setProperty("--block-row", String(placeRow));
            }
        }

        function syncMinimizedState() {
            shell.setAttribute("data-block-minimized", String(minimizedValue));
            contentNode.setAttribute("aria-hidden", String(minimizedValue));
            if (!minimizeNode) return;
            minimizeNode.textContent = minimizedValue ? "+" : "−";
            minimizeNode.setAttribute("aria-label", `${titleNode?.textContent || id} ${minimizedValue ? labels.restore : labels.minimize}`);
            minimizeNode.setAttribute("aria-pressed", String(minimizedValue));
        }

        function syncMenuInteractionState() {
            const effectiveDraggable = draggableEnabled && draggableValue;
            shell.setAttribute("data-block-draggable", String(effectiveDraggable));
            if (!menuNode || !titleNode) return;
            menuNode.removeAttribute("tabindex");
            menuNode.removeAttribute("aria-label");
            titleNode.tabIndex = effectiveDraggable ? 0 : -1;
            if (effectiveDraggable) {
                titleNode.setAttribute("role", "button");
                titleNode.setAttribute("aria-label", `${titleNode.textContent || id} ${labels.move}`);
                titleNode.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowUp ArrowRight ArrowDown");
            } else {
                titleNode.removeAttribute("role");
                titleNode.removeAttribute("aria-label");
                titleNode.removeAttribute("aria-keyshortcuts");
            }
            if (closeNode) closeNode.setAttribute("aria-label", `${titleNode.textContent || id} ${labels.close}`);
        }

        function removeResizeFallback() {
            if (!resizeFallbackTarget) return;
            resizeFallbackTarget.removeEventListener("pointermove", moveResize);
            resizeFallbackTarget.removeEventListener("pointerup", finishResize);
            resizeFallbackTarget.removeEventListener("pointercancel", finishResize);
            resizeFallbackTarget = null;
        }

        function stopResize(pointerId, commit = false) {
            if (!resizeState || (pointerId !== undefined && resizeState.pointerId !== pointerId)) return;
            const current = resizeState;
            resizeState = null;
            removeResizeFallback();
            if (!commit && (spanColumns !== current.from.columns || spanRows !== current.from.rows)) {
                applyLayout({ columns: current.from.columns, rows: current.from.rows, column: placeColumn, row: placeRow });
            }
            shell.removeAttribute("data-block-resizing");
            if (current.handle.hasPointerCapture?.(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
            if (commit && (spanColumns !== current.from.columns || spanRows !== current.from.rows)) {
                emitResize({
                    id,
                    input: "pointer",
                    axis: current.axis,
                    from: current.from,
                    to: { columns: spanColumns, rows: spanRows },
                });
            }
        }

        function moveResize(event) {
            if (!resizeState || resizeState.pointerId !== event.pointerId) return;
            event.preventDefault();
            const columnDelta = resizeState.axis === "inline"
                ? Math.round((event.clientX - resizeState.startX) / resizeState.metrics.columnStep)
                : 0;
            const rowDelta = resizeState.axis === "block"
                ? Math.round((event.clientY - resizeState.startY) / resizeState.metrics.rowStep)
                : 0;
            const nextColumns = Math.max(1, Math.min(columns, resizeState.from.columns + columnDelta));
            const nextRows = Math.max(1, Math.min(rows, resizeState.from.rows + rowDelta));
            if (nextColumns === spanColumns && nextRows === spanRows) return;
            applyLayout({ columns: nextColumns, rows: nextRows, column: placeColumn, row: placeRow });
        }

        function finishResize(event) {
            stopResize(event.pointerId, event.type === "pointerup");
        }

        function startResize(event, axis, handle) {
            if (event.button !== 0 || shell.getAttribute("data-block-resizable") !== "true") return;
            drag.stop();
            stopResize();
            resizeState = {
                pointerId: event.pointerId,
                axis,
                handle,
                startX: event.clientX,
                startY: event.clientY,
                metrics: gridMetrics(),
                from: { columns: spanColumns, rows: spanRows },
            };
            shell.setAttribute("data-block-resizing", axis);
            let pointerCaptured = false;
            if (typeof handle.setPointerCapture === "function") {
                try {
                    handle.setPointerCapture(event.pointerId);
                    pointerCaptured = handle.hasPointerCapture?.(event.pointerId) ?? true;
                } catch {
                    pointerCaptured = false;
                }
            }
            if (!pointerCaptured && typeof window === "object") {
                resizeFallbackTarget = window;
                window.addEventListener("pointermove", moveResize);
                window.addEventListener("pointerup", finishResize);
                window.addEventListener("pointercancel", finishResize);
            }
            event.preventDefault();
            event.stopPropagation();
        }

        function resizeWithKeyboard(event, axis) {
            const deltas = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            };
            const delta = deltas[event.key];
            if (!delta || (axis === "inline" && delta[1] !== 0) || (axis === "block" && delta[0] !== 0)) return;
            const from = { columns: spanColumns, rows: spanRows };
            const nextColumns = Math.max(1, Math.min(columns, spanColumns + delta[0]));
            const nextRows = Math.max(1, Math.min(rows, spanRows + delta[1]));
            if (nextColumns === spanColumns && nextRows === spanRows) return;
            event.preventDefault();
            applyLayout({ columns: nextColumns, rows: nextRows, column: placeColumn, row: placeRow });
            emitResize({ id, input: "keyboard", axis, from, to: { columns: spanColumns, rows: spanRows } });
        }

        function createResizeHandle(axis) {
            const handle = document.createElement("button");
            handle.type = "button";
            handle.className = `blocks-system-resize blocks-system-resize--${axis}`;
            handle.setAttribute("aria-label", `${titleNode?.textContent || addOptions.title || id}: ${labels.resize} ${axis === "inline" ? "← →" : "↑ ↓"}`);
            handle.setAttribute("aria-keyshortcuts", axis === "inline" ? "ArrowLeft ArrowRight" : "ArrowUp ArrowDown");
            handle.addEventListener("pointerdown", (event) => startResize(event, axis, handle));
            handle.addEventListener("pointermove", moveResize);
            handle.addEventListener("pointerup", finishResize);
            handle.addEventListener("pointercancel", finishResize);
            handle.addEventListener("lostpointercapture", finishResize);
            handle.addEventListener("keydown", (event) => resizeWithKeyboard(event, axis));
            shell.appendChild(handle);
            resizeHandles.set(axis, handle);
        }

        function syncResizeInteractionState() {
            const effectiveResizable =
                resizableEnabled &&
                resizableValue &&
                snapEnabled &&
                placementState === "flow" &&
                placeColumn === null &&
                placeRow === null &&
                !minimizedValue;
            shell.setAttribute("data-block-resizable", String(effectiveResizable));
            if (effectiveResizable) {
                for (const axis of ["inline", "block"]) {
                    if (!resizeHandles.has(axis)) createResizeHandle(axis);
                }
                for (const [axis, handle] of resizeHandles) {
                    handle.setAttribute("aria-label", `${titleNode?.textContent || addOptions.title || id}: ${labels.resize} ${axis === "inline" ? "← →" : "↑ ↓"}`);
                }
            } else {
                stopResize();
                for (const handle of resizeHandles.values()) handle.remove();
                resizeHandles.clear();
            }
        }

        function assertActive() {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
        }

        function describe(describeOptions = {}) {
            assertActive();
            const definition = {
                id,
                adapter: "html",
                label: String(titleNode?.textContent || addOptions.title || id),
                markup: String(contentNode.innerHTML ?? "")
            };
            let url = describeOptions.url === undefined || describeOptions.url === null
                ? null
                : String(describeOptions.url) || null;
            if (url === null && typeof window !== "undefined") {
                const pageUrl = new URL(window.location.href);
                pageUrl.searchParams.delete("component");
                pageUrl.searchParams.delete("block");
                url = pageUrl.href;
            }
            if (url !== null) definition.url = url;
            return definition;
        }

        function setMinimized(value) {
            assertActive();
            const nextValue = Boolean(value);
            if (minimizedValue === nextValue) return;
            minimizedValue = nextValue;
            syncMinimizedState();
            syncResizeInteractionState();
            emitChange({ type: minimizedValue ? "minimize" : "restore", id });
        }

        function remove() {
            assertActive();
            drag.stop();
            stopResize();
            const releasedLayout = objectLayouts.get(id);
            objects.delete(id);
            objectLayouts.delete(id);
            objectLayoutSetters.delete(id);
            menuInteractionSetters.delete(id);
            resizeInteractionSetters.delete(id);
            shell.remove();
            const movedIds = releasedLayout ? collapseReleasedLayout(releasedLayout) : [];
            emitChange({ type: "remove", id, ids: [id, ...movedIds] });
            return true;
        }

        function span(x, y) {
            assertActive();
            drag.stop();
            const nextColumns = Number(x);
            const nextRows = Number(y);
            if (!Number.isInteger(nextColumns) || nextColumns < 1 ||
                !Number.isInteger(nextRows) || nextRows < 1) {
                throw new TypeError("block.span(x, y) verwacht positieve gehele rastereenheden.");
            }
            const nextLayout = {
                columns: nextColumns,
                rows: nextRows,
                column: placeColumn,
                row: placeRow
            };
            assertLayoutFits(id, nextLayout);
            applyLayout(nextLayout);
            syncResizeInteractionState();
            return block;
        }

        function place(x, y) {
            assertActive();
            drag.stop();
            const nextColumn = Number(x);
            const nextRow = Number(y);
            if (!Number.isInteger(nextColumn) || nextColumn < 1 ||
                !Number.isInteger(nextRow) || nextRow < 1) {
                throw new TypeError("block.place(x, y) verwacht positieve gehele rastercoördinaten.");
            }
            const nextLayout = {
                columns: spanColumns,
                rows: spanRows,
                column: nextColumn,
                row: nextRow
            };
            assertLayoutFits(id, nextLayout);
            applyLayout(nextLayout);
            syncResizeInteractionState();
            return block;
        }

        function flow() {
            assertActive();
            drag.stop();
            const nextLayout = {
                columns: spanColumns,
                rows: spanRows,
                column: null,
                row: null
            };
            assertLayoutFits(id, nextLayout);
            applyLayout(nextLayout);
            syncResizeInteractionState();
            return block;
        }

        function menu(name, close = true) {
            assertActive();
            const menuOptions = close && typeof close === "object"
                ? {
                    close: close.close === undefined ? DEFAULT_MENU_OPTIONS.close : Boolean(close.close),
                    minimize: close.minimize === undefined ? DEFAULT_MENU_OPTIONS.minimize : Boolean(close.minimize)
                }
                : { close: Boolean(close), minimize: true };
            if (!menuNode) {
                menuNode = document.createElement("header");
                menuNode.className = "blocks-system-menu";
                titleNode = document.createElement("span");
                titleNode.className = "blocks-system-title";
                actionsNode = document.createElement("span");
                actionsNode.className = "blocks-system-actions";
                menuNode.appendChild(titleNode);
                menuNode.appendChild(actionsNode);
                shell.insertBefore(menuNode, contentNode);
            }
            titleNode.textContent = String(name || "");
            if (menuOptions.minimize && !minimizeNode) {
                minimizeNode = document.createElement("button");
                minimizeNode.type = "button";
                minimizeNode.className = "blocks-system-minimize";
                minimizeNode.addEventListener("click", () => setMinimized(!minimizedValue));
                actionsNode.appendChild(minimizeNode);
            } else if (!menuOptions.minimize && minimizeNode) {
                minimizeNode.remove();
                minimizeNode = null;
            }
            if (menuOptions.close && !closeNode) {
                closeNode = document.createElement("button");
                closeNode.type = "button";
                closeNode.className = "blocks-system-close";
                closeNode.textContent = "×";
                closeNode.addEventListener("click", remove);
                actionsNode.appendChild(closeNode);
            } else if (!menuOptions.close && closeNode) {
                closeNode.remove();
                closeNode = null;
            }
            syncMinimizedState();
            syncMenuInteractionState();
            syncResizeInteractionState();
            return block;
        }

        const controller = {
            id,
            element: shell,
            content: contentNode,
            menu,
            span,
            place,
            flow,
            describe,
            remove
        };
        Object.defineProperty(controller, "color", {
            enumerable: true,
            get: () => colorValue,
            set(value) {
                colorValue = String(value || "");
                if (colorValue) shell.style.setProperty("--block-color", colorValue);
                else shell.style.removeProperty("--block-color");
                syncMenuContrast();
            }
        });
        Object.defineProperty(controller, "variant", {
            enumerable: true,
            get: () => variantValue,
            set(value) {
                appearanceValue = resolveAppearance(value ?? variantMode);
                syncAppearance();
            }
        });
        Object.defineProperty(controller, "minimized", {
            enumerable: true,
            get: () => minimizedValue,
            set: setMinimized
        });
        Object.defineProperty(controller, "draggable", {
            enumerable: true,
            get: () => draggableValue,
            set(value) {
                assertActive();
                draggableValue = Boolean(value);
                if (!draggableValue) drag.stop();
                syncMenuInteractionState();
            }
        });
        Object.defineProperty(controller, "resizable", {
            enumerable: true,
            get: () => resizableValue,
            set(value) {
                assertActive();
                resizableValue = Boolean(value);
                syncResizeInteractionState();
            }
        });
        syncAppearance();
        syncMinimizedState();
        block = Object.freeze(controller);
        objects.set(id, block);
        applyLayout({
            columns: spanColumns,
            rows: spanRows,
            column: placeColumn,
            row: placeRow
        });
        objectLayoutSetters.set(id, (column, row) => applyLayout({
            columns: spanColumns,
            rows: spanRows,
            column,
            row
        }));
        menuInteractionSetters.set(id, syncMenuInteractionState);
        resizeInteractionSetters.set(id, syncResizeInteractionState);
        syncMenuInteractionState();
        syncResizeInteractionState();
        return block;
    }

    const apiObject = {
        register,
        registerAdapter,
        listAdapters,
        list,
        get,
        attach,
        setGrid,
        compact,
        add,
        exportLayout,
        restoreLayout,
        mount,
        unmount,
        remount,
        snippet,
        address
    };
    Object.defineProperties(apiObject, {
        columns: {
            enumerable: true,
            get: () => columns
        },
        rows: {
            enumerable: true,
            get: () => rows
        },
        snap: {
            enumerable: true,
            get: () => snapEnabled,
            set(value) {
                snapEnabled = Boolean(value);
                applySurfaceState();
            }
        },
        placement: {
            enumerable: true,
            get: () => placementState,
            set(value) {
                placementState = normalizePlacement(value);
                drag.stop();
                applySurfaceState();
            }
        },
        draggable: {
            enumerable: true,
            get: () => draggableEnabled,
            set(value) {
                draggableEnabled = Boolean(value);
                if (!draggableEnabled) drag.stop();
                applySurfaceState();
            }
        },
        resizable: {
            enumerable: true,
            get: () => resizableEnabled,
            set(value) {
                resizableEnabled = Boolean(value);
                applySurfaceState();
            }
        },
        font: {
            enumerable: true,
            get: () => fontState,
            set(value) {
                fontState = normalizeFont(value);
                applyFontState();
            }
        },
        variant: {
            enumerable: true,
            get: () => variantMode,
            set(value) {
                variantMode = normalizeVariant(value);
            }
        },
        variants: {
            enumerable: true,
            get: () => BUILT_IN_VARIANTS
        },
        colorArray: {
            enumerable: true,
            get: () => colorArrayState,
            set(value) {
                const nextColors = normalizeColorArray(value);
                assertColorVariationHasColors(nextColors, colorVariationState);
                colorArrayState = nextColors;
            }
        },
        colorVariation: {
            enumerable: true,
            get: () => colorVariationState,
            set(value) {
                const nextVariation = normalizeVariation(value, "colorVariation", 0);
                assertColorVariationHasColors(colorArrayState, nextVariation);
                colorVariationState = nextVariation;
            }
        },
        inversionVariation: {
            enumerable: true,
            get: () => inversionVariationState,
            set(value) {
                inversionVariationState = normalizeVariation(value, "inversionVariation", DEFAULT_INVERSION_VARIATION);
            }
        },
        labels: {
            enumerable: true,
            get: () => labels
        },
        field: {
            enumerable: true,
            get: () => surface
        }
    });
    api = Object.freeze(apiObject);

    (options.blocks || []).forEach((block) => register(block));
    return api;
}

export const system = createBlocksSystem();

if (typeof window !== "undefined") {
    window.blocks = window.blocks && typeof window.blocks === "object" ? window.blocks : {};
    window.blocks.system = system;
}
