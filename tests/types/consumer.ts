import {
  createBlocksSystem,
  system,
  type BlockController,
  type BlocksAddressOptions,
  type BlocksChangeDetail,
  type BlocksGridTooSmallCode,
  type BlocksHydratedField,
  type BlocksHydrateOptions,
  type BlocksLayout,
  type BlocksLayoutMode,
  type BlocksResizeDetail,
  type BlocksReorderDetail,
  type BlocksSearchOptions,
  type BlocksSystem
} from "blocks.system";
import { createBlocksStorage, createHttpStorage, createJsonStorage } from "blocks.system/storage";
import { createBlocksSystem as createMinBlocksSystem } from "blocks.system/min";

declare const projectDirectory: FileSystemDirectoryHandle;
const jsonStorage = createJsonStorage({ directory: projectDirectory, documents: { page: "content/page.json" } });
const httpStorage = createHttpStorage({ endpoint: "/beheer.php" });
const customStorage = createBlocksStorage({
  async load() { return { documents: {}, revision: null }; },
  async commit() { return { revision: null }; }
});
void Promise.all([jsonStorage.load(["page"]), httpStorage.load(["page"]), customStorage.load(["page"])]);

const blocks: BlocksSystem = createBlocksSystem({
  catalogUrl: null,
  layout: "flow-grid",
  draggable: true,
  resizable: true,
  dockPosition: "bottom",
  blockDefaults: { menu: { pin: true, minimize: true, close: true, copy: true } }
});

blocks.attach(document.body).setGrid(6, 4);
blocks.fitHeight();
blocks.fitHeight(new Set(["one"]));
const block: BlockController = blocks
  .add(document.createElement("article"), { id: "typed-block", title: "typed", draggable: false, summary: "<p>short</p>" })
  .span(2, 1)
  .summary(null)
  .menu("typed", { pin: true, close: true, copy: true });
block.draggable = true;
block.pin(true);
const blockPinned: boolean = block.pinned;
const blockDraggable: boolean = block.draggable;
const layoutMode: BlocksLayoutMode = blocks.layout;
const dockPosition: "top" | "bottom" = blocks.dockPosition;
blocks.saveBaseline();
const savedLayout: BlocksLayout = blocks.exportLayout();
blocks.restoreLayout(savedLayout);
blocks.restoreLayout(savedLayout, { grid: { columns: 4, rows: 12 } });
blocks.restoreLayout({
  version: 1,
  layout: "flow-grid",
  blocks: [{ id: "typed-block", docked: false, pinned: true }]
});
blocks.reset();
const hydrateOptions: BlocksHydrateOptions = {
  storagePrefix: "demo",
  breakpoints: [{ name: "wide", minWidth: 1080 }],
  viewportLead: (field) => field.id === "page-blocks",
  searchShortcutUrl: "kaart?focus=zoek"
};
const hydratedField: BlocksHydratedField | null = blocks.hydrate(document.body, hydrateOptions);
hydratedField?.blocksPage.fitContent();
const addressOptions: BlocksAddressOptions = { queryKey: "block", highlightClass: "is-aangewezen", highlightDuration: 2600 };
const resolvedTarget: HTMLElement | null = blocks.resolveAddress(addressOptions);
const searchOptions: BlocksSearchOptions = { root: document, focusParam: "zoek" };
const searchBound: boolean = blocks.bindSearch(searchOptions);
const gridCode: BlocksGridTooSmallCode = "BLOCKS_GRID_TOO_SMALL";
void [gridCode, blockPinned, dockPosition, hydratedField, resolvedTarget, searchBound];
// @ts-expect-error A grid switch needs both dimensions.
blocks.restoreLayout(savedLayout, { grid: { columns: 4 } });

blocks.register({ id: "typed-detail", adapter: "html", url: "detail.html", markup: "<p>typed</p>" });
const typedAddress: string = blocks.address("typed-detail");
const typedSnippet: string = blocks.snippet("typed-detail");
const described = block.describe({ url: "https://example.test/detail.html" });
const describedUrl: string | undefined = described.url;

const columns: number = blocks.columns;
const rows: number = blocks.rows;
const rowHeight: number | null = blocks.rowHeight;
blocks.rowHeight = 128;
void rowHeight;
createBlocksSystem({ layout: "fixed-grid", rowHeight: 128 });
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
  // The runtime emits dock and undock for the default close-to-dock action.
  if (detail.type === "dock" || detail.type === "undock") void detail.id;
});

// @ts-expect-error Grid dimensions are readable state, not writable settings.
blocks.columns = 9;

// @ts-expect-error Per-block dragging accepts booleans only.
blocks.add("invalid", { draggable: "no" });

// @ts-expect-error snap was replaced by one canonical layout mode.
createBlocksSystem({ snap: true });

void [block, blockDraggable, layoutMode, savedLayout, columns, rows, minified, shared, typedAddress, typedSnippet, describedUrl];
