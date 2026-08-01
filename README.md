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

Blocks keep the original `6px` breathing room. Override `--blocks-gap` on the
attached field when a composition needs a different interval.

```js
blocks.system.attach("#field");
blocks.system.setGrid(3, 2);
blocks.system.snap = true;
blocks.system.draggable = true;
```

With dragging enabled, the menu bar is the drag handle. Content controls keep
their normal pointer behaviour.

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
- `blocks.system.add(content, options)`
- `blocks.system.register(definition)`
- `blocks.system.registerAdapter(id, adapter)`
- `blocks.system.list()` / `get()` / `listAdapters()`
- `blocks.system.mount()` / `unmount()` / `remount()`
- `blocks.system.snippet()` / `address()`
- `block.menu(name, close)` / `block.span(x, y)` / `block.color` / `block.remove()`

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
