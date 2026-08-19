import {
  createBlocksSystem,
  system,
  type BlockController,
  type BlocksChangeDetail,
  type BlocksLayout,
  type BlocksLayoutMode,
  type BlocksResizeDetail,
  type BlocksReorderDetail,
  type BlocksSystem
} from "blocks.system";
import { createBlocksSystem as createMinBlocksSystem } from "blocks.system/min";

const blocks: BlocksSystem = createBlocksSystem({
  catalogUrl: null,
  layout: "flow-grid",
  draggable: true,
  resizable: true,
  blockDefaults: { menu: { minimize: true, close: true, link: true } }
});

blocks.attach(document.body).setGrid(6, 4);
const block: BlockController = blocks
  .add(document.createElement("article"), { id: "typed-block", title: "typed", draggable: false })
  .span(2, 1)
  .menu("typed", { close: true, link: true });
block.draggable = true;
const blockDraggable: boolean = block.draggable;
const layoutMode: BlocksLayoutMode = blocks.layout;
const savedLayout: BlocksLayout = blocks.exportLayout();
blocks.restoreLayout(savedLayout);

blocks.register({ id: "typed-detail", adapter: "html", url: "detail.html", markup: "<p>typed</p>" });
const typedAddress: string = blocks.address("typed-detail");
const typedSnippet: string = blocks.snippet("typed-detail");
const described = block.describe({ url: "https://example.test/detail.html" });
const describedUrl: string | undefined = described.url;

const columns: number = blocks.columns;
const rows: number = blocks.rows;
const minified: BlocksSystem = createMinBlocksSystem({ variant: "regular" });
const shared: BlocksSystem = system;

document.body.addEventListener("blocks:reorder", (event) => {
  const detail: BlocksReorderDetail = event.detail;
  void detail.direction;
});

document.body.addEventListener("blocks:change", (event) => {
  const detail: BlocksChangeDetail = event.detail;
  void detail.ids;
});

document.body.addEventListener("blocks:resize", (event) => {
  const detail: BlocksResizeDetail = event.detail;
  void detail.to.columns;
});

blocks.field?.addEventListener("blocks:change", (event) => {
  const detail: BlocksChangeDetail = event.detail;
  void detail.type;
});

// @ts-expect-error Grid dimensions are readable state, not writable settings.
blocks.columns = 9;

// @ts-expect-error Per-block dragging accepts booleans only.
blocks.add("invalid", { draggable: "no" });

// @ts-expect-error snap was replaced by one canonical layout mode.
createBlocksSystem({ snap: true });

void [block, blockDraggable, layoutMode, savedLayout, columns, rows, minified, shared, typedAddress, typedSnippet, describedUrl];
