/**
 * Generieke kern voor individueel adresseerbare blokken.
 *
 * De kern kent geen rendertechnologie. Een adapter bepaalt zelf hoe een blok
 * wordt gemount, opgeruimd en als snippet geëxporteerd.
 */

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

export function createBlocksSystem(options = {}) {
    const definitions = new Map();
    const adapters = new Map();
    const mounts = new WeakMap();
    const objects = new Map();
    const objectLayouts = new Map();
    const catalogUrl = options.catalogUrl ? new URL(options.catalogUrl) : null;
    let surface = null;
    let columns = 1;
    let rows = 1;
    let snapEnabled = false;
    let draggableEnabled = false;
    let dragState = null;
    let objectIndex = 0;
    let api;

    function register(definition, registerOptions = {}) {
        const block = normalizeBlock(definition);
        if (definitions.has(block.id) && !registerOptions.replace) {
            throw new Error(`Blok bestaat al: ${block.id}`);
        }
        definitions.set(block.id, block);
        return api;
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
        return api;
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

    function applySurfaceState() {
        if (!surface) return;
        surface.classList.add("blocks-system-surface");
        surface.setAttribute("data-blocks-system", "");
        surface.setAttribute("data-snap", String(snapEnabled));
        surface.setAttribute("data-draggable", String(draggableEnabled));
        surface.style.setProperty("--blocks-columns", String(columns));
        surface.style.setProperty("--blocks-rows", String(rows));
    }

    function stopDragging(pointerId) {
        if (!dragState || (pointerId !== undefined && dragState.pointerId !== pointerId)) return;
        const current = dragState;
        dragState = null;
        current.shell.classList.remove("is-dragging");
        if (surface) surface.removeAttribute("data-dragging");
        if (current.handle.hasPointerCapture?.(current.pointerId)) {
            current.handle.releasePointerCapture(current.pointerId);
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
        dragState = { pointerId: event.pointerId, shell, handle };
        shell.classList.add("is-dragging");
        surface.setAttribute("data-dragging", shell.getAttribute("data-block-object") || "");
        handle.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    }

    function moveDragging(event) {
        if (!dragState || dragState.pointerId !== event.pointerId || !surface) return;
        event.preventDefault();
        const pointedElement = document.elementFromPoint(event.clientX, event.clientY);
        const target = pointedElement?.closest?.(".blocks-system-object");
        if (!target || target === dragState.shell || target.parentElement !== surface) return;

        const bounds = target.getBoundingClientRect();
        const neighbours = [target.previousElementSibling, target.nextElementSibling].filter(Boolean);
        const horizontalFlow = neighbours.some((neighbour) => {
            const neighbourBounds = neighbour.getBoundingClientRect();
            return Math.abs(neighbourBounds.top - bounds.top) < Math.min(neighbourBounds.height, bounds.height) / 2;
        });
        const beforeTarget = horizontalFlow
            ? event.clientX < bounds.left + bounds.width / 2
            : event.clientY < bounds.top + bounds.height / 2;
        const reference = beforeTarget ? target : target.nextElementSibling;
        if (reference !== dragState.shell) surface.insertBefore(dragState.shell, reference);
    }

    function finishDragging(event) {
        stopDragging(event.pointerId);
    }

    function bindSurfaceEvents(target) {
        target.addEventListener("pointerdown", startDragging);
        target.addEventListener("pointermove", moveDragging);
        target.addEventListener("pointerup", finishDragging);
        target.addEventListener("pointercancel", finishDragging);
        target.addEventListener("lostpointercapture", finishDragging);
    }

    function unbindSurfaceEvents(target) {
        target.removeEventListener("pointerdown", startDragging);
        target.removeEventListener("pointermove", moveDragging);
        target.removeEventListener("pointerup", finishDragging);
        target.removeEventListener("pointercancel", finishDragging);
        target.removeEventListener("lostpointercapture", finishDragging);
    }

    function attach(target) {
        const nextSurface = resolveHost(target);
        if (surface && surface !== nextSurface && objects.size > 0) {
            throw new Error("Verwijder de bestaande blokken voordat blocks.system aan een ander veld wordt gekoppeld.");
        }
        if (surface && surface !== nextSurface) {
            stopDragging();
            unbindSurfaceEvents(surface);
            surface.classList.remove("blocks-system-surface");
            surface.removeAttribute("data-blocks-system");
            surface.removeAttribute("data-snap");
            surface.removeAttribute("data-draggable");
            surface.style.removeProperty("--blocks-columns");
            surface.style.removeProperty("--blocks-rows");
        }
        if (surface !== nextSurface) bindSurfaceEvents(nextSurface);
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
        const id = String(addOptions.id || `block-${++objectIndex}`);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new TypeError(`Ongeldig block-id: ${id}`);
        if (objects.has(id)) throw new Error(`Block bestaat al: ${id}`);

        const shell = document.createElement("section");
        shell.className = "blocks-system-object";
        shell.setAttribute("data-block-object", id);
        const contentNode = document.createElement("div");
        contentNode.className = "blocks-system-content";
        appendContent(contentNode, content);
        shell.appendChild(contentNode);
        surface.appendChild(shell);

        let menuNode = null;
        let titleNode = null;
        let closeNode = null;
        let colorValue = "";
        let spanColumns = 1;
        let spanRows = 1;
        let placeColumn = null;
        let placeRow = null;
        let block;

        function remove() {
            if (dragState?.shell === shell) stopDragging();
            objects.delete(id);
            objectLayouts.delete(id);
            shell.remove();
            return true;
        }

        function span(x, y) {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
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
            spanColumns = nextColumns;
            spanRows = nextRows;
            objectLayouts.set(id, nextLayout);
            shell.style.setProperty("--block-span-columns", String(spanColumns));
            shell.style.setProperty("--block-span-rows", String(spanRows));
            return block;
        }

        function place(x, y) {
            if (objects.get(id) !== block) throw new Error(`Block is verwijderd: ${id}`);
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
            placeColumn = nextColumn;
            placeRow = nextRow;
            objectLayouts.set(id, nextLayout);
            shell.style.setProperty("--block-column", String(placeColumn));
            shell.style.setProperty("--block-row", String(placeRow));
            return block;
        }

        function menu(name, close = false) {
            if (!menuNode) {
                menuNode = document.createElement("header");
                menuNode.className = "blocks-system-menu";
                titleNode = document.createElement("span");
                titleNode.className = "blocks-system-title";
                menuNode.appendChild(titleNode);
                shell.insertBefore(menuNode, contentNode);
            }
            titleNode.textContent = String(name || "");
            if (Boolean(close) && !closeNode) {
                closeNode = document.createElement("button");
                closeNode.type = "button";
                closeNode.className = "blocks-system-close";
                closeNode.setAttribute("aria-label", `${titleNode.textContent || id} sluiten`);
                closeNode.textContent = "×";
                closeNode.addEventListener("click", remove);
                menuNode.appendChild(closeNode);
            } else if (!Boolean(close) && closeNode) {
                closeNode.remove();
                closeNode = null;
            }
            return block;
        }

        const controller = {
            id,
            element: shell,
            content: contentNode,
            menu,
            span,
            place,
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
        block = Object.freeze(controller);
        objects.set(id, block);
        objectLayouts.set(id, {
            columns: spanColumns,
            rows: spanRows,
            column: placeColumn,
            row: placeRow
        });
        return block;
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
                if (!draggableEnabled) stopDragging();
                applySurfaceState();
            }
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
