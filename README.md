# blocks.system

**[Manual](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Examples](https://seb-prjcts-be.github.io/blocks.system/docs/#examples)**

`blocks.system` is a dependency-free ESM browser core for individually
addressable HTML, SVG, canvas, custom elements and adapter-driven content.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { system as blocks } from "./blocks.system.mjs";

  blocks.attach("#blocks-field");
  blocks.setGrid(4, 2);
  blocks.snap = true;
  blocks.draggable = true;

  const blockHello = blocks.add("<p>hello</p>", {
    id: "block-hello"
  });
  blockHello.menu("hello", { close: true });
  blockHello.span(2, 1);
  blockHello.place(1, 1);
</script>
```

Naming is deliberate: `blocks` is the shared system; every returned controller
starts with `block`. The browser-global equivalent is `window.blocks.system`.

## Middle

`blocks.add(content)` accepts trusted HTML, a DOM node or a factory returning
either form. Never pass untrusted text as HTML; create a node and set
`textContent`.

One `block…` controller owns one object's menu, span, position, variant,
minimized state and removal:

```js
const blockCanvas = blocks.add(document.createElement("canvas"), {
  id: "block-canvas"
});
blockCanvas.menu("canvas", { close: true, minimize: true });
blockCanvas.span(2, 1);
blockCanvas.place(2, 1);
blockCanvas.variant = "magenta";
blockCanvas.minimized = false;
blockCanvas.color = "rgb(255, 0, 255)";
blockCanvas.remove();
```

The documentation uses the print-like CMY family only, one accent per surface.
The older red, green and blue variant names remain available for compatibility.
Yellow always uses black ink on `#ffff00`.

## End

Use an adapter only when content needs a mount lifecycle, cleanup or a reusable
definition. The core never learns renderer-specific behaviour.

```js
blocks.registerAdapter("block-note", {
  mount({ host, settings }) {
    const blockNoteNode = document.createElement("p");
    blockNoteNode.textContent = settings.text;
    host.appendChild(blockNoteNode);
    return blockNoteNode;
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

- Shared system: `attach`, `setGrid`, `snap`, `draggable`, `font`, `variant`,
  `variants`, `add`.
- Definitions: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Lifecycle: `mount`, `unmount`, `remount`, `snippet`, `address`.
- One block: `menu`, `minimized`, `span`, `place`, `variant`, `color`, `remove`.

Dragging by a block's menu bar is enabled by default. Focus that same header and
use the arrow keys to reorder without a pointer; the surface emits
`blocks:reorder` after each keyboard move. Set `blocks.draggable = false` to
lock the layout.

See the [complete API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
for arguments and return values.

## Develop

```powershell
npm install
npm run check
```

`npm run check` rebuilds the minified module and manifest, then checks the API,
docs, examples, local links and the real showcase layout in headless Chrome.
Set `CHROME_PATH` when Chrome or Edge is not installed in a standard location.

MIT License. Developed by Sebastien Vanblaere.
