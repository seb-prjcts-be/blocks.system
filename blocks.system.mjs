/**
 * Generieke kern voor individueel adresseerbare blokken.
 *
 * De kern kent geen rendertechnologie. Een adapter bepaalt zelf hoe een blok
 * wordt gemount, opgeruimd en als snippet geëxporteerd.
 */

const BUILT_IN_VARIANTS = Object.freeze([
    "regular",
    "inverse",
    "red",
    "green",
    "blue",
    "cyan",
    "magenta",
    "yellow"
]);
const RANDOM_VARIANTS = Object.freeze(["regular", "regular", "inverse"]);
const DRAG_SETTLE_DURATION = 160;
const DRAG_SETTLE_EASING = "cubic-bezier(.2,.8,.2,1)";
const DEFAULT_MENU_OPTIONS = Object.freeze({ close: false, minimize: true });
const UI_LABELS = Object.freeze({
    en: Object.freeze({
        move: "move with the arrow keys",
        restore: "restore",
        minimize: "minimize",
        close: "close"
    }),
    nl: Object.freeze({
        move: "verplaatsen met de pijltjestoetsen",
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
    if (value === undefined) return Object.freeze({ menu: null });
    if (!value || typeof value !== "object") {
        throw new TypeError("blocks.system.blockDefaults verwacht een object.");
    }
    return Object.freeze({
        menu: normalizeAutomaticMenu(value.menu)
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
        if (!(node instanceof Element) || !host.contains(node)) {
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
        if (!get(id)) throw new RangeError(`Onbekend blok: ${id}`);
        const fallbackUrl = typeof window !== "undefined" ? window.location.href : null;
        if (!catalogUrl && !fallbackUrl) throw new Error("Voor address() is een catalogUrl nodig.");
        const url = new URL(catalogUrl || fallbackUrl);
        url.searchParams.delete("component");
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
    const catalog = createBlockCatalog({ catalogUrl: options.catalogUrl });
    const { address, get, list, listAdapters, mount, remount, snippet, unmount } = catalog;
    const objects = new Map();
    const objectLayouts = new Map();
    const objectLayoutSetters = new Map();
    const menuInteractionSetters = new Map();
    const randomSource = typeof options.random === "function" ? options.random : Math.random;
    let surface = null;
    let columns = 1;
    let rows = 1;
    let snapEnabled = options.snap === undefined ? false : Boolean(options.snap);
    let draggableEnabled = options.draggable === undefined ? true : Boolean(options.draggable);
    let fontState = normalizeFont(options.font);
    const labels = normalizeLabels(options.labels);
    const blockDefaults = normalizeBlockDefaults(options.blockDefaults);
    let variantMode = normalizeVariant(options.variant);
    let objectIndex = 0;
    let api;

    function resolveVariant(value) {
        const name = normalizeVariant(value);
        if (name !== "random") return name;
        const raw = Number(randomSource());
        const unit = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999999, raw)) : 0;
        return RANDOM_VARIANTS[Math.floor(unit * RANDOM_VARIANTS.length)];
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
        surface.setAttribute("data-draggable", String(draggableEnabled));
        surface.style.setProperty("--blocks-columns", String(columns));
        surface.style.setProperty("--blocks-rows", String(rows));
        applyFontState();
        for (const syncMenuInteraction of menuInteractionSetters.values()) syncMenuInteraction();
    }

    function createDragController() {
        let dragState = null;
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

        function pixelTracks(value) {
            return Array.from(String(value || "").matchAll(/(-?\d*\.?\d+)px/g), (match) => Number(match[1]));
        }

        function gridMetrics() {
            // Meet de werkelijk gerenderde tracks, zodat responsive CSS leidend blijft.
            const style = getComputedStyle(surface);
            const bounds = surface.getBoundingClientRect();
            const columnTracks = pixelTracks(style.gridTemplateColumns);
            const rowTracks = pixelTracks(style.gridTemplateRows);
            const columnGap = Number.parseFloat(style.columnGap) || 0;
            const rowGap = Number.parseFloat(style.rowGap) || 0;
            const left =
                bounds.left +
                (Number.parseFloat(style.borderLeftWidth) || 0) +
                (Number.parseFloat(style.paddingLeft) || 0);
            const top =
                bounds.top +
                (Number.parseFloat(style.borderTopWidth) || 0) +
                (Number.parseFloat(style.paddingTop) || 0);
            const columnStep = (columnTracks[0] || bounds.width / Math.max(1, columns)) + columnGap;
            const rowStep = (rowTracks[0] || bounds.height / Math.max(1, rows)) + rowGap;
            return {
                left,
                top,
                columns: columnTracks.length || columns,
                columnStep,
                rowStep,
            };
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

        function startDragging(event) {
            if (!draggableEnabled || event.button !== 0 || !surface) return;
            if (!(event.target instanceof Element)) return;
            if (event.target.closest("button, a, input, select, textarea")) return;
            const handle = event.target.closest(".blocks-system-menu");
            const shell = handle?.closest(".blocks-system-object");
            if (!handle || !shell || shell.parentElement !== surface) return;

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
            if (snapEnabled) {
                // Snapmodus is ruimtelijk; zonder snap blijft de bestaande flowreorder actief.
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
            handle.setPointerCapture?.(event.pointerId);
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
            const handle = event.target.closest(".blocks-system-menu");
            const shell = handle?.closest(".blocks-system-object");
            if (!handle || event.target !== handle || !shell || shell.parentElement !== surface) return;

            if (snapEnabled) {
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
            surface.removeAttribute("data-draggable");
            surface.style.removeProperty("--blocks-columns");
            surface.style.removeProperty("--blocks-rows");
        }
        if (surface !== nextSurface) drag.bind(nextSurface);
        surface = nextSurface;
        applySurfaceState();
        return api;
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
            const overlaps = layout.column < other.column + other.columns &&
                layout.column + layout.columns > other.column &&
                layout.row < other.row + other.rows &&
                layout.row + layout.rows > other.row;
            if (overlaps) throw new RangeError(`Plaats van ${id} overlapt ${otherId}.`);
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
        const id = String(addOptions.id || `block-${++objectIndex}`);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new TypeError(`Ongeldig block-id: ${id}`);
        if (objects.has(id)) throw new Error(`Block bestaat al: ${id}`);
        const automaticMenu = normalizeAutomaticMenu(
            addOptions.menu,
            blockDefaults.menu,
            "blocks.system.add() options.menu"
        );
        const block = createBlockController(id, content, addOptions);
        if (automaticMenu) block.menu(addOptions.title ?? id, automaticMenu);
        return block;
    }

    function createBlockController(id, content, addOptions) {
        let variantValue = resolveVariant(addOptions.variant ?? variantMode);
        let minimizedValue = Boolean(addOptions.minimized);
        const shell = document.createElement("section");
        shell.className = "blocks-system-object";
        shell.setAttribute("data-block-object", id);
        shell.setAttribute("data-block-variant", variantValue);
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
        let colorValue = "";
        let spanColumns = 1;
        let spanRows = 1;
        let placeColumn = null;
        let placeRow = null;
        let block;

        function applyLayout(layout) {
            spanColumns = layout.columns;
            spanRows = layout.rows;
            placeColumn = layout.column;
            placeRow = layout.row;
            objectLayouts.set(id, { ...layout });
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
            if (!menuNode) return;
            menuNode.tabIndex = draggableEnabled ? 0 : -1;
            if (draggableEnabled) {
                menuNode.setAttribute("aria-label", `${titleNode?.textContent || id} ${labels.move}`);
            } else {
                menuNode.removeAttribute("aria-label");
            }
            if (closeNode) closeNode.setAttribute("aria-label", `${titleNode?.textContent || id} ${labels.close}`);
        }

        function setMinimized(value) {
            if (block && objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
            minimizedValue = Boolean(value);
            syncMinimizedState();
        }

        function remove() {
            drag.stop();
            objects.delete(id);
            objectLayouts.delete(id);
            objectLayoutSetters.delete(id);
            menuInteractionSetters.delete(id);
            shell.remove();
            return true;
        }

        function span(x, y) {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
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
            return block;
        }

        function place(x, y) {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
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
            return block;
        }

        function flow() {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
            drag.stop();
            const nextLayout = {
                columns: spanColumns,
                rows: spanRows,
                column: null,
                row: null
            };
            assertLayoutFits(id, nextLayout);
            applyLayout(nextLayout);
            return block;
        }

        function menu(name, close = false) {
            const menuOptions = close && typeof close === "object"
                ? { close: Boolean(close.close), minimize: close.minimize !== false }
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
            remove
        };
        Object.defineProperty(controller, "color", {
            enumerable: true,
            get: () => colorValue,
            set(value) {
                colorValue = String(value || "");
                if (colorValue) shell.style.setProperty("--block-color", colorValue);
                else shell.style.removeProperty("--block-color");
            }
        });
        Object.defineProperty(controller, "variant", {
            enumerable: true,
            get: () => variantValue,
            set(value) {
                variantValue = resolveVariant(value ?? variantMode);
                shell.setAttribute("data-block-variant", variantValue);
            }
        });
        Object.defineProperty(controller, "minimized", {
            enumerable: true,
            get: () => minimizedValue,
            set: setMinimized
        });
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
        add,
        mount,
        unmount,
        remount,
        snippet,
        address
    };
    Object.defineProperties(apiObject, {
        snap: {
            enumerable: true,
            get: () => snapEnabled,
            set(value) {
                snapEnabled = Boolean(value);
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
