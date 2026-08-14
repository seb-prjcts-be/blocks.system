# blocks.system

**[Home](https://seb-prjcts-be.github.io/blocks.system/)** ·
**[Manual](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Examples](https://seb-prjcts-be.github.io/blocks.system/examples/)**

`blocks.system` is a dependency-free ESM browser core for individually
addressable HTML, SVG, canvas, custom elements and adapter-driven content.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { createBlocksSystem } from "./blocks.system.mjs";

  const blocks = createBlocksSystem({
    snap: true,
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

The built-in variants are `regular` and `inverse`. A colour selected from your
array uses one generic `color` state: the chosen colour draws the block frame
and menu bar, while the block paper and rendered content stay neutral. The menu
automatically uses whichever system neutral—ink or paper—has the stronger
contrast against the chosen colour. On every block, the hover frame reuses
the current block frame colour, including inverse and user-selected colours.
Other explicit variant names remain available as hooks for your own CSS, but
the library does not style them as named colours.

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

- Creation: `createBlocksSystem({ snap, draggable, variant, colorArray, colorVariation, inversionVariation, blockDefaults })`.
- Shared system: `attach`, `setGrid`, `compact`, `columns`, `rows`, `snap`, `draggable`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definitions: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Lifecycle: `mount`, `unmount`, `remount`, `snippet`, `address`.
- One block: `menu`, `minimized`, `draggable`, `span`, `place`, `flow`, `describe`, `variant`, `color`, `remove`.

Accessible menu labels follow the document language (`nl` or English) and can
be overridden with `createBlocksSystem({ labels: { move, minimize, restore,
close } })`. A locked layout removes menu headers from the keyboard tab order;
their minimize and close buttons remain available.

Every new block starts with minimize and close controls. `title` is optional:
when omitted, the titlebar has no visible text while the block `id` remains the
accessible fallback name for its controls. Use `menu: false` to remove the whole
titlebar, or `blockDefaults.menu` and a local `menu` object for exceptions.

Dragging by a block's menu bar is enabled by default. During pointer dragging,
a magnetic preview marks the block's landing position while the other blocks
stay still. With `snap = true`, a free cell stays dashed; an occupied downward
target becomes solid with a `↓`, and the colliding blocks keep their columns
while settling downward together on drop. `flow()` returns a spatially moved
block to CSS auto-flow. Focus the same header and use the arrow keys for the
same grid movement without a pointer. The surface emits `blocks:reorder` after
pointer and keyboard moves with one stable detail shape: `id`, `input`, `mode`,
`key`, indices, grid positions and direction. Set `blocks.draggable = false` to
lock the whole layout, or `block.draggable = false` to lock one block.

Use `blocks.compact()` only when you explicitly want gap filling. It keeps each
placed block in its column and preserves the vertical order of blocks whose
columns overlap; it does not shrink the configured grid. `block.minimized`
remains collapse-in-place.
Removing a placed block releases its former grid area. If that leaves a row
entirely unoccupied, a later block that fits may move into that row; deliberately
empty composition space remains untouched. Use `compact()` when you explicitly
want to close other remaining vertical gaps.
The field emits `blocks:change` for `compact`, `minimize`, `restore` and
`remove`.
Trackpad and wheel input over ordinary block content continues scrolling the
page; only genuinely overflowing inner content scrolls locally first.
The measured mechanics and boundaries are recorded in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

See the [API reference](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
for arguments and return values. Public installation snippets remain pinned to
immutable `v0.3.0`; the current `main` runtime, types and reference are explicitly
marked unreleased while they move beyond that tag.

## Verified status

As checked on 2026-08-10, release `v0.3.0` implements the
documented public surface: block creation and lifecycle, menus, grid layout,
snap/keyboard movement, `compact()`, variants and random colour,
adapters, events, TypeScript declarations, the homepage, manual, reference and
three runnable examples.

The following checks passed locally:

- `npm run check`: minified ESM, contracts, TypeScript, pages, links,
  examples and responsive browser-layout checks.
- `npm run test:presentation`: presentation and public-page structure checks.
- Apache/XAMPP: `/`, `/docs/` and `/examples/` each returned HTTP 200.

`v0.3.0` is the latest immutable public release. Its breaking changes and
migration notes are recorded in [`docs/releases/v0.3.0.md`](docs/releases/v0.3.0.md).
Current `main` is identified as unreleased because it has diverged from this tag.

## Develop

```powershell
npm install
npm run check
```

`npm run check` rebuilds the minified module, then checks the API,
docs, examples, local links and the real showcase layout in headless Chrome.
Set `CHROME_PATH` when Chrome or Edge is not installed in a standard location.

MIT License. Developed by Sebastien Vanblaere.
