# blocks.system

**[Open site](https://seb-prjcts-be.github.io/blocks.system/)** · **[Guide](https://seb-prjcts-be.github.io/blocks.system/docs/guide.html)** · **[Examples](https://seb-prjcts-be.github.io/blocks.system/docs/examples.html)**

`blocks.system` is a small ESM-first browser library for individually
addressable objects. A block can contain HTML, SVG, canvas, a custom element,
an iframe, native controls, or content mounted by your own adapter.

The core has no knowledge of p5.js, waves, frameworks, or renderers. Those can
be connected as optional adapters without changing the library.

## Install

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@main/blocks.system.css">

<script type="module">
  import { system } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@main/blocks.system.min.mjs";
</script>
```

Pin a release tag instead of `@main` when you need reproducible behaviour.

## Quick start

```html
<div id="field"></div>

<script type="module">
  import { system } from "./blocks.system.mjs";

  blocks.system.attach("#field");
  blocks.system.setGrid(4, 2);
  blocks.system.snap = true;
  blocks.system.draggable = true;

  const block = blocks.system.add("<p>hello</p>");
  block.menu("test", true);
  block.color = "red";
  block.span(2, 1);
  block.place(3, 2);
</script>
```

The import exports the same singleton as `window.blocks.system`. System-wide
properties live under `blocks.system`; properties of one object live under the
returned `block`.

## Content

`blocks.system.add(content)` accepts:

- an HTML string;
- a DOM node, including canvas, SVG, iframe and custom elements;
- a function returning an HTML string or DOM node.

HTML strings are intentionally interpreted as HTML. Only pass trusted content,
or construct a DOM node yourself.

## Grid

`setGrid(x, y)` uses column and row counts. `attach()` accepts a CSS selector or
a DOM element and never silently takes over `document.body`.

`block.span(x, y)` makes one object occupy whole grid units. The default is
`1, 1`; a span must fit inside the current grid.

`block.place(x, y)` uses one-based column and row coordinates. Unplaced blocks
keep normal grid auto-flow; explicitly placed blocks may not overlap. Leave a
block unplaced when draggable ordering should determine its position.

Blocks keep the original `6px` breathing room. Override `--blocks-gap` on the
attached field when a composition needs a different interval.

The stylesheet provides the complete out-of-the-box composition: black blocks,
warm paper and field colours, a `22px` menu and `7px` content inset. Consumers
own every deviation through CSS variables or more specific CSS.

```js
blocks.system.attach("#field");
blocks.system.setGrid(3, 2);
blocks.system.snap = true;
blocks.system.draggable = true;
```

With dragging enabled, the menu bar is the drag handle. Content controls keep
their normal pointer behaviour.

Every menu is minimizable by default. Minimizing hides the content but preserves
the configured span and position, so restoring cannot collide with another
block. Content scrolls internally when it no longer fits.

```js
block.menu("preview", { close: true, minimize: true });
block.minimized = true;
block.minimized = false;
```

The older `block.menu("preview", true)` form remains valid and means a
minimizable menu with a close button. Use `minimize: false` to omit the minimize
control. The base stylesheet contains no animation; motion belongs in a separate
optional stylesheet.

New blocks use a stable random monochrome variant. `regular` has twice the
chance of `inverse`, so the normal black-on-paper composition remains dominant.
Pure RGB/CMY variants are built in but explicit:

```js
blocks.system.variant = "random"; // default for new blocks

const automatic = blocks.system.add(content);
const inverse = blocks.system.add(content, { variant: "inverse" });
automatic.variant = "blue";
```

Built-ins are `regular`, `inverse`, `red`, `green`, `blue`, `cyan`, `magenta`
and `yellow`. Custom lowercase kebab-case names work through
`[data-block-variant="..."]` CSS. The original thicker inset line appears on
mouseover without changing the block size.

External fonts remain opt-in. Assign a stylesheet URL and its family; the same
URL is inserted only once. Set `font` back to `null` to use the CSS default and
system fallback again.

```js
blocks.system.font = {
  href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&display=swap",
  family: "Oswald"
};
```

## Adapters

An adapter needs a `mount()` function. `unmount()`, `ready()` and `snippet()`
are optional.

```js
blocks.system.registerAdapter("note", {
  mount({ host, block, settings }) {
    const node = document.createElement("p");
    node.textContent = `${block.label}: ${settings.text}`;
    host.appendChild(node);
    return node;
  }
});

blocks.system.register({
  id: "welcome",
  label: "welcome",
  adapter: "note",
  medium: "html",
  defaults: { text: "hello" }
});
```

## Public API

- `blocks.system.attach(target)`
- `blocks.system.setGrid(columns, rows)`
- `blocks.system.snap`
- `blocks.system.draggable`
- `blocks.system.font`
- `blocks.system.variant` / `blocks.system.variants`
- `blocks.system.add(content, options)`
- `blocks.system.register(definition)`
- `blocks.system.registerAdapter(id, adapter)`
- `blocks.system.list()` / `get()` / `listAdapters()`
- `blocks.system.mount()` / `unmount()` / `remount()`
- `blocks.system.snippet()` / `address()`
- `block.menu(name, options)` / `block.minimized` / `block.span(x, y)` / `block.place(x, y)` / `block.variant` / `block.color` / `block.remove()`

## Develop

```powershell
npm install
npm run check
```

`npm run check` rebuilds the minified ESM file, regenerates the manifest, and
runs the contract, source/min parity, documentation and link checks.

## Documentation contract

API changes must update `README.md`, `README_NL.md`, `docs/guide.html`,
`docs/api.html`, examples, tests and `docs/blocks.system.manifest.json` in the
same commit.

MIT License. Developed by Sebastien Vanblaere.
