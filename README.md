# blocks.system

**[Home](https://seb-prjcts-be.github.io/blocks.system/)** ·
**[Manual](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Examples](https://seb-prjcts-be.github.io/blocks.system/docs/#next)**

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
    inversionVariation: 0.5,
    blockDefaults: { menu: { minimize: true, close: true } }
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
blockCanvas.place(2, 1);
blockCanvas.variant = "inverse";
blockCanvas.minimized = false;
blockCanvas.color = "#222";
blockCanvas.remove();
```

The built-in variants are `regular` and `inverse`. A colour selected from your
array uses one generic `color` state: the chosen colour draws the block frame
and menu bar, while the block paper and rendered content stay neutral. The menu
automatically uses whichever system neutral—ink or paper—has the stronger
contrast against the chosen colour. On draggable blocks, the hover frame reuses
the current block frame colour, including inverse and user-selected colours.
Other explicit variant names remain available as hooks for your own CSS, but
the library does not style them as named colours.

## End

Use an adapter only when content needs a mount lifecycle, cleanup or a reusable
definition. The core never learns renderer-specific behaviour.

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

- Creation: `createBlocksSystem({ snap, draggable, margin, variant, colorArray, colorVariation, inversionVariation, blockDefaults })`.
- Shared system: `attach`, `setGrid`, `compact`, `columns`, `rows`, `snap`, `draggable`, `margin`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definitions: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Lifecycle: `mount`, `unmount`, `remount`, `snippet`, `address`.
- One block: `menu`, `minimized`, `span`, `place`, `flow`, `variant`, `color`, `remove`.

Accessible menu labels follow the document language (`nl` or English) and can
be overridden with `createBlocksSystem({ labels: { move, minimize, restore,
close } })`. A locked layout removes menu headers from the keyboard tab order;
their minimize and close buttons remain available.

`blockDefaults.menu` applies the same menu controls to every new block. `title`
is optional: when omitted, the menu has no visible title while the block `id`
remains the accessible fallback name for its controls. Use `menu: false` to
remove the whole menu, or a local `menu` object for an exception.

`margin` reserves empty space inside the field border and around the grid. It
uses CSS padding shorthand, so one value applies everywhere and four values run
top, right, bottom and left. CSS lengths stay responsive:

```js
blocks.margin = "clamp(12px, 2vw, 32px) 3vw";
```

Dragging by a block's menu bar is enabled by default. During pointer dragging,
a magnetic preview marks the block's landing position while the other blocks
stay still. With `snap = true`, a free cell stays dashed; an occupied downward
target becomes solid with a `↓`, and the colliding blocks keep their columns
while settling downward together on drop. `flow()` returns a spatially moved
block to CSS auto-flow. Focus the same header and use the arrow keys for the
same grid movement without a pointer. The surface emits `blocks:reorder` after
pointer and keyboard moves with one stable detail shape: `id`, `input`, `mode`,
`key`, indices, grid positions and direction. Set `blocks.draggable = false` to
lock the layout.

Use `blocks.compact()` only when you explicitly want gap filling. It keeps each
placed block in its column and preserves the vertical order of blocks whose
columns overlap; it does not shrink the configured grid. `block.minimized`
remains collapse-in-place.
The field emits `blocks:change` for `compact`, `minimize`, `restore` and
`remove`.
Trackpad and wheel input over ordinary block content continues scrolling the
page; only genuinely overflowing inner content scrolls locally first.
The measured mechanics and boundaries are recorded in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

See the [complete API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
for arguments and return values.

## Verified status

As checked on 2026-08-07, the entire documented public surface is implemented
in this `main` working tree: block creation and lifecycle, menus, grid layout,
snap/keyboard movement, `compact()`, margin, variants and random colour,
adapters, events, TypeScript declarations, the homepage, manual, reference and
three runnable examples.

The following checks passed locally:

- `npm run check`: minified ESM, manifest, contracts, TypeScript, pages, links,
  examples and responsive browser-layout checks.
- `npm run test:presentation`: presentation and public-page structure checks.
- Apache/XAMPP: `/`, `/docs/` and `/examples/` each returned HTTP 200.

This describes the released `v0.2.0` source, available through its immutable
GitHub release tag.

## Develop

```powershell
npm install
npm run check
```

`npm run check` rebuilds the minified module and manifest, then checks the API,
docs, examples, local links and the real showcase layout in headless Chrome.
Set `CHROME_PATH` when Chrome or Edge is not installed in a standard location.

MIT License. Developed by Sebastien Vanblaere.
