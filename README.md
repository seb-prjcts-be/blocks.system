# blocks.system

**[Home](https://seb-prjcts-be.github.io/blocks.system/)** ·
**[Manual](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)**

`blocks.system` is a dependency-free ESM browser core for individually
addressable HTML, SVG, canvas, custom elements and adapter-driven content.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { createBlocksSystem } from "./blocks.system.mjs";

  const blocks = createBlocksSystem({
    layout: "fixed-grid",
    colorArray: ["cyan", "magenta", "yellow"],
    colorVariation: 0.2,
    inversionVariation: 0.5
  });

  blocks.attach("#blocks-field");
  blocks.setGrid(4, 2);

  const blockHello = blocks.add("<p>hello</p>", {
    id: "block-hello",
    title: "hello"
  });
  blockHello.span(2, 1);
  blockHello.place(1, 1);
</script>
```

Naming is deliberate: `blocks` is the configured system; every returned
controller starts with `block`. For zero-config use, the module also exports the
shared `system` and exposes it as `window.blocks.system`.

`colorVariation` applies only to new blocks whose variant resolves from
`random`: `0.2` gives the CSS colours in `colorArray` twenty percent of the range.
`inversionVariation: 0.5` makes half of the remaining monochrome blocks
`inverse`; the other half stays `regular`. The defaults are `0` for colour and
`1 / 3` for inversion, preserving the earlier monochrome distribution.
Explicit block variants always win, and existing blocks never recolour.

`colorArray` belongs entirely to the consumer. It accepts CSS colour strings
such as names, hex values, `rgb()` or `var()` and defaults to `[]`; therefore a
positive `colorVariation` requires you to supply at least one colour. The CMY
array above is only this example's choice. The library owns no RGB/CMY palette.

## Middle

`blocks.add(content)` accepts trusted HTML, an element object or a factory returning
either form. Never pass untrusted text as HTML; create an element and set
`textContent`.

One `block…` controller owns one object's menu, span, position, variant,
minimized state and removal:

```js
const blockCanvas = blocks.add(document.createElement("canvas"), {
  id: "block-canvas",
  title: "canvas"
});
blockCanvas.span(2, 1);
blockCanvas.place(3, 1);
blockCanvas.variant = "inverse";
blockCanvas.minimized = false;
blockCanvas.color = "#222";
blockCanvas.remove();
```

### Automatic flow and personal layout

Use `layout: "flow-grid"` when blocks need a starting size but no fixed address.
The browser then lays them out in DOM order without dense backfilling. Add them
in the wanted initial order—sorting by title remains an application decision:

```js
const blocks = createBlocksSystem({
  layout: "flow-grid",
  resizable: true,
  variant: "regular"
});

blocks.attach("#blocks-field").setGrid(4, 6);

const collator = new Intl.Collator(document.documentElement.lang, {
  numeric: true,
  sensitivity: "base"
});

for (const item of [...items].sort((a, b) => collator.compare(a.title, b.title))) {
  blocks.add(item.content, { id: item.id, title: item.title }).span(...item.span);
}
```

In this mode, dragging changes order. Dragging the thin right or bottom edge
changes the span in whole grid units; the same controls work with arrow keys
when focused. Minimizing keeps the titlebar and releases the block's extra rows,
so later blocks move up automatically.

`exportLayout()` returns only layout state—the selected mode, ids, order, spans,
fixed positions where applicable and minimized state, never block content. That makes `localStorage`
the simple fit for a personal layout on one browser. Keep role defaults in the
application, then restore the local override with a role-specific key:

```js
const role = document.body.dataset.role || "student";
const storageKey = `blocks.system:dashboard:${role}`;

try {
  const storedLayout = localStorage.getItem(storageKey);
  if (storedLayout) blocks.restoreLayout(JSON.parse(storedLayout));
} catch (error) {
  console.warn("Stored block layout was ignored.", error);
}

function saveLayout() {
  localStorage.setItem(storageKey, JSON.stringify(blocks.exportLayout()));
}

for (const eventName of ["blocks:reorder", "blocks:resize", "blocks:change"]) {
  blocks.field.addEventListener(eventName, saveLayout);
}
```

`localStorage` is browser/profile-specific, not an account database. Use a
server store such as SQLite only when layouts or content must follow authenticated
people across devices or be shared and administered centrally. The core stays
storage-agnostic in both cases.

### Optional content storage

The separate `blocks.system/storage` entry point keeps content out of the block
core while giving local JSON and HTTP backends one contract. `load(keys)`
returns documents with an opaque revision; `commit()` writes documents and new
assets against that revision. A stale revision throws
`BlocksStorageConflictError` instead of overwriting newer editorial work.

```js
import { createJsonStorage } from "blocks.system/storage";

const directory = await showDirectoryPicker({ mode: "readwrite" });
const storage = createJsonStorage({
  directory,
  documents: {
    page: "content/pages/contact.json",
    composition: "content/composition.json"
  }
});

const snapshot = await storage.load(["page", "composition"]);
await storage.commit({
  revision: snapshot.revision,
  documents: snapshot.documents,
  assets: [{ path: "images/editor/photo.jpg", file }]
});
```

`createHttpStorage({ endpoint })` exposes the same browser contract using JSON
for reads and multipart for documents plus files. A server can implement it
transactionally with PHP and SQLite; authentication, authorization, schema
validation and document meaning remain application concerns.
`createBlocksStorage(adapter)` supports additional backends.

The built-in variants are `regular` and `inverse`; inverse exchanges paper and
ink across the content surface. A colour selected from your array uses one
generic `color` state and fills only the titlebar, while the block paper and
rendered content stay neutral. The menu automatically uses whichever system
neutral—ink or paper—has the stronger contrast against the chosen colour.
Every block keeps the same thin black boundary and gains the same stronger
black frame on hover or keyboard focus. Other explicit variant names remain
available as hooks for your own CSS, but the library does not style them as
named colours.

## End

Use an adapter only when content needs a mount lifecycle, cleanup or a reusable
definition. The core never learns renderer-specific behaviour.

A built-in `html` adapter mounts and snippets definitions that carry trusted
`markup` — the same trust boundary as `add(content)`. A definition may also
carry the `url` of the page it lives on; `address(id)` then deep-links to that
page instead of the shared `catalogUrl`. A live `add()` block serializes into
such a definition with `block.describe({ url })`, so another page can register
it (for example via `createBlocksSystem({ blocks })`) and show the real content
instead of a paraphrase. Register only definitions from sources you trust:
a definition's `markup` is injected as HTML wherever it mounts, so never
register stored or user-supplied definitions unchecked.

```js
blocks.registerAdapter("block-note", {
  mount({ host, settings }) {
    const blockNoteObject = document.createElement("p");
    blockNoteObject.textContent = settings.text;
    host.appendChild(blockNoteObject);
    return blockNoteObject;
  }
});

blocks.register({
  id: "block-welcome",
  label: "welcome",
  adapter: "block-note",
  medium: "html",
  defaults: { text: "hello" }
});
```

## API map

- Creation: `createBlocksSystem({ layout, draggable, resizable, variant, colorArray, colorVariation, inversionVariation, blockDefaults })`.
- Shared system: `attach`, `setGrid`, `compact`, `fitHeight`, `exportLayout`, `restoreLayout`, `columns`, `rows`, `layout`, `draggable`, `resizable`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definitions: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Lifecycle: `mount`, `unmount`, `remount`, `snippet`, `address`.
- One block: `menu`, `minimized`, `draggable`, `span`, `fitHeight`, `place`, `describe`, `variant`, `color`, `remove`.

Accessible menu labels follow the document language (`nl` or English) and can
be overridden with `createBlocksSystem({ labels: { move, resize, minimize, restore,
close, copy, copied, copyFailed } })`. A locked layout removes menu headers from
the keyboard tab order; their action buttons remain available.

Every new block starts with minimize and close controls. `title` is optional:
when omitted, the titlebar has no visible text while the block `id` remains the
accessible fallback name for its controls. Use `menu: false` to remove the whole
titlebar, or `blockDefaults.menu` and a local `menu` object for exceptions.
Set `menu.copy: true` to add an opt-in button that copies the block's decoded,
visible text and briefly confirms success or failure in the button.

Dragging by a block's menu bar is enabled by default. During pointer dragging,
a magnetic preview marks the block's landing position while the other blocks
stay still. In `fixed-grid`, a free cell stays dashed; an occupied downward
target becomes solid with a `↓`, and the colliding blocks keep their columns
while settling downward together on drop. In `flow-grid`, dragging changes DOM
order and blocks never gain fixed addresses. Focus the same header and use the arrow keys for the
same grid movement without a pointer. The surface emits `blocks:reorder` after
pointer and keyboard moves with one stable detail shape: `id`, `input`, `mode`,
`key`, indices, grid positions and direction. Set `blocks.draggable = false` to
lock the whole layout, or `block.draggable = false` to lock one block.

Use `blocks.compact()` only when you explicitly want gap filling in
`fixed-grid`. It keeps each
placed block in its column and preserves the vertical order of blocks whose
columns overlap; it does not shrink the configured grid. `block.minimized`
remains collapse-in-place there. In `flow-grid` it keeps one titlebar row
and lets later blocks reflow upward.
Removing a placed block never changes another fixed address; the gap remains
intentional until the application calls `compact()`. Removing a flow-grid block
reflows naturally because DOM order is the layout.
The field emits `blocks:change` for `compact`, `minimize`, `restore` and
`remove`.
Use `block.fitHeight()` after content changes to measure its real rendered
height at the current width and apply the smallest whole-row span. Use
`blocks.fitHeight()` to fit all live blocks, or pass an iterable of live block
IDs to `blocks.fitHeight(ids)` in a mixed composition. The consumer remains
responsible for repacking or resizing the total grid afterwards. Measure only
content-driven blocks: media that deliberately fills an application-owned span
must keep that span instead of being included in the selected measurement.
Trackpad and wheel input over ordinary block content continues scrolling the
page; only genuinely overflowing inner content scrolls locally first.
The measured mechanics and boundaries are recorded in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

See the [API reference](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
for arguments and return values. Public installation snippets are pinned to
immutable `v0.4.2`, the same source identified by the released documentation.

## Verified status

As checked on 2026-08-17, release `v0.4.2` implements the documented public
surface: one immutable layout model, fixed- and flow-grid movement, flow-grid
resizing, layout persistence, minimization, `compact()`, adapters, events,
TypeScript declarations, the homepage, manual and reference.

The following checks passed locally:

- Minified ESM, runtime contracts, TypeScript, docs/API contracts, presentation,
  generated fallback and package contents.
- Apache/XAMPP: home, manual, reference and the flow-grid proof each returned
  HTTP 200.
- Targeted browser checks covered fixed-grid documentation and flow-grid order,
  resize, minimize and layout restore.

`v0.4.2` is the latest immutable public release. Its release-boundary correction
is recorded in [`docs/releases/v0.4.2.md`](docs/releases/v0.4.2.md); the
documentation fixes are recorded in
[`docs/releases/v0.4.1.md`](docs/releases/v0.4.1.md), while the preceding
breaking changes and migration notes remain in
[`docs/releases/v0.4.0.md`](docs/releases/v0.4.0.md).
The `v0.4.0` line replaced `snap` plus `placement` with one immutable `layout`:
`free`, `fixed-grid` or `flow-grid`. Retired options fail early with their exact
replacement instead of creating a hybrid layout.

## Develop

```powershell
npm install
npm run check
```

`npm run check` rebuilds the minified module, then checks the API,
docs, local links and the real showcase layout in headless Chrome.
Set `CHROME_PATH` when Chrome or Edge is not installed in a standard location.

MIT License. Developed by Sebastien Vanblaere.
