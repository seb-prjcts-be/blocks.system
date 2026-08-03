import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.2";
import { nodeFromHtml, quantizeSurface } from "./shell.mjs?v=0.1.2";

const board = document.querySelector("#reference-board");
const blocks = createBlocksSystem({ variant: "regular" });

blocks.attach(board);
blocks.setGrid(6, 20);
blocks.snap = true;
blocks.draggable = false;
quantizeSurface(board);

function addReference({ id, title, anchor, span, content }) {
  const block = blocks.add(content, { id });
  block.menu(title, { minimize: true });
  block.span(...span);
  block.element.id = anchor;
  block.element.classList.add("reference-anchor");
  return block;
}

function table(rows) {
  return `
    <div class="reference-table-wrap">
      <table class="reference-table">
        <thead><tr><th>member</th><th>returns</th><th>purpose</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

addReference({
  id: "reference-system",
  title: "01 / blocks · shared system",
  anchor: "shared-system",
  span: [3, 3],
  content: nodeFromHtml(table(`
    <tr id="api-attach"><td>attach(target)</td><td>blocks</td><td>Attach to a selector or DOM element.</td></tr>
    <tr id="api-set-grid"><td>setGrid(x, y)</td><td>blocks</td><td>Set positive integer columns and rows.</td></tr>
    <tr id="api-snap"><td>snap</td><td>boolean</td><td>Read or change grid snapping.</td></tr>
    <tr id="api-draggable"><td>draggable</td><td>boolean</td><td>Move by pointer or arrow keys on the menu header; snapped collisions push downward on drop.</td></tr>
    <tr id="api-font"><td>font</td><td>object|null</td><td>Load one font stylesheet and set its family.</td></tr>
    <tr id="api-variant"><td>variant</td><td>string</td><td>Variant for new blocks; default <code>random</code>.</td></tr>
    <tr id="api-variants"><td>variants</td><td>array</td><td>Regular and inverse plus CMY for current work; RGB names remain compatibility variants.</td></tr>
    <tr id="api-field"><td>field</td><td>element|null</td><td>Read the attached field.</td></tr>
    <tr id="api-add"><td>add(content, options)</td><td>block</td><td>Add trusted HTML, a DOM node or factory.</td></tr>
  `))
});

addReference({
  id: "reference-block",
  title: "02 / block… · one controller",
  anchor: "block-controller",
  span: [3, 3],
  content: nodeFromHtml(table(`
    <tr id="api-block-id"><td>id</td><td>string</td><td>Stable lowercase kebab-case id.</td></tr>
    <tr id="api-element"><td>element</td><td>section</td><td>Outer block element.</td></tr>
    <tr id="api-content"><td>content</td><td>div</td><td>Content host inside the block.</td></tr>
    <tr id="api-menu"><td>menu(name, options)</td><td>block</td><td>Title bar with minimize and optional close.</td></tr>
    <tr id="api-span"><td>span(x, y)</td><td>block</td><td>Occupy whole grid units.</td></tr>
    <tr id="api-place"><td>place(x, y)</td><td>block</td><td>Use one-based coordinates without overlap.</td></tr>
    <tr id="api-flow"><td>flow()</td><td>block</td><td>Clear fixed coordinates and return to CSS auto-flow.</td></tr>
    <tr id="api-minimized"><td>minimized</td><td>boolean</td><td>Show only the menu while preserving layout.</td></tr>
    <tr id="api-block-variant"><td>variant</td><td>string</td><td>Read or set the resolved variant.</td></tr>
    <tr id="api-color"><td>color</td><td>string</td><td>Read or set the block CSS colour.</td></tr>
    <tr id="api-remove"><td>remove()</td><td>true</td><td>Remove the block and release its layout.</td></tr>
  `))
});

addReference({
  id: "reference-adapters",
  title: "03 / definitions and adapters",
  anchor: "adapters",
  span: [4, 4],
  content: nodeFromHtml(table(`
    <tr id="api-register"><td>register(definition)</td><td>blocks</td><td>Register a reusable definition.</td></tr>
    <tr id="api-register-adapter"><td>registerAdapter(id, adapter)</td><td>blocks</td><td>Register a lifecycle adapter with <code>mount()</code>.</td></tr>
    <tr id="api-list"><td>list(filters)</td><td>array</td><td>Filter by query, adapter, medium or category.</td></tr>
    <tr id="api-get"><td>get(id)</td><td>definition|null</td><td>Read one registered definition.</td></tr>
    <tr id="api-list-adapters"><td>listAdapters()</td><td>array</td><td>List registered adapter ids.</td></tr>
    <tr id="api-mount"><td>mount(id, target, overrides)</td><td>promise&lt;element&gt;</td><td>Mount through the registered adapter.</td></tr>
    <tr id="api-unmount"><td>unmount(target)</td><td>boolean</td><td>Run optional cleanup and remove mounted content.</td></tr>
    <tr id="api-remount"><td>remount(id, target, overrides)</td><td>promise&lt;element&gt;</td><td>Mount again with new settings.</td></tr>
    <tr id="api-snippet"><td>snippet(id, overrides)</td><td>string</td><td>Ask the adapter for a reusable snippet.</td></tr>
    <tr id="api-address"><td>address(id)</td><td>url</td><td>Create a catalog URL with <code>?block=id</code>.</td></tr>
  `))
});

addReference({
  id: "reference-definition",
  title: "04 / definition shape",
  anchor: "definition",
  span: [2, 2],
  content: nodeFromHtml(`
    <pre class="reference-code"><code>{
  id: "block-welcome",
  label: "welcome",
  adapter: "block-note",
  medium: "html",
  category: "text",
  description: "a small note",
  defaults: { text: "hello" },
  attributes: [],
  requires: []
}</code></pre>
  `)
});

addReference({
  id: "reference-hooks",
  title: "05 / stable css hooks",
  anchor: "css-hooks",
  span: [3, 2],
  content: nodeFromHtml(`
    <div class="reference-hooks">
      <p><code>.blocks-system-surface</code><span>surface tokens and layout</span></p>
      <p><code>.blocks-system-object</code><span>one outer block</span></p>
      <p><code>.blocks-system-menu</code><span>header and drag handle</span></p>
      <p><code>.blocks-system-content</code><span>content host and overflow</span></p>
      <p><code>.blocks-system-drop-preview</code><span>magnetic landing cell; solid ↓ means downward displacement</span></p>
      <p><code>[data-block-object]</code><span>one stable object id</span></p>
      <p><code>[data-block-variant]</code><span>resolved visual variant</span></p>
      <p><code>[data-block-minimized]</code><span>restored or minimized state</span></p>
      <p><code>[data-draggable]</code><span>surface drag state</span></p>
      <p><code>blocks:reorder</code><span>pointer or keyboard movement event on the surface</span></p>
    </div>
  `)
});

addReference({
  id: "reference-errors",
  title: "06 / errors and defaults",
  anchor: "errors",
  span: [3, 2],
  content: nodeFromHtml(`
    <div class="reference-errors">
      <small>fail early / catch only recoverable errors</small>
      <strong>invalid ids, missing fields, grid overflow, overlap, duplicate registration, unknown definitions and incomplete adapters throw.</strong>
      <p>Defaults: drag on · snap off · 1 × 1 grid · random monochrome variant · no attached field.</p>
    </div>
  `)
});

board.dataset.referenceReady = "true";
