import {
  createBlocksSystem,
  system,
  version,
  type BlockController,
  type BlocksAddressOptions,
  type BlocksChangeDetail,
  type BlocksError,
  type BlocksErrorCode,
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
  storage: "demo",
  breakpoints: [{ name: "wide", minWidth: 1080 }],
  viewportLead: (field) => field.id === "page",
  address: true
};
const hydratedField: BlocksHydratedField | null = blocks.hydrate(document.body, hydrateOptions);
hydratedField?.blocksPage.fitContent();
blocks.hydrate("main", { storage: false });
const defaultHydratedField: BlocksHydratedField | null = blocks.hydrate();
const optionsOnlyHydratedField: BlocksHydratedField | null = blocks.hydrate({ storage: false });
void [defaultHydratedField, optionsOnlyHydratedField];
// @ts-expect-error Storage is a prefix or false, not true.
blocks.hydrate("main", { storage: true });
const addressOptions: BlocksAddressOptions = { queryKey: "block", highlightDuration: 2600 };
const resolvedTarget: HTMLElement | null = blocks.resolveAddress("https://example.test/?block=a", addressOptions);
const resolvedHere: HTMLElement | null = blocks.resolveAddress();
const searchOptions: BlocksSearchOptions = { items: ".tile", status: "#count", shortcut: false, focus: "search" };
const searchBound: boolean = blocks.bindSearch("#search", searchOptions);
const searchLazy: boolean = blocks.bindSearch(document.createElement("input"));
// @ts-expect-error The search input comes first.
blocks.bindSearch({ items: ".tile" });
const resetLabel: string = blocks.labels.reset;
const gridCode: BlocksGridTooSmallCode = "BLOCKS_GRID_TOO_SMALL";
void [gridCode, blockPinned, dockPosition, hydratedField, resolvedTarget, resolvedHere, searchBound, searchLazy, resetLabel];
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

// Live blocks, checks, batching and cleanup.
const reported: string[] = [];
const watched: BlocksSystem = createBlocksSystem({
  layout: "fixed-grid",
  onIssue(issue) {
    reported.push(`${issue.code}: ${issue.message} ${issue.id ?? ""} ${issue.option ?? ""}`);
  }
});
const found: BlockController | null = watched.block("notes");
const every: BlockController[] = watched.blocks();
const around: BlockController | null = watched.blockOf(document.body);
if (found) {
  found.title = "Notes";
  const [spanColumns, spanRows] = found.layout.span;
  const placed: readonly [number, number] | null = found.layout.place;
  void [spanColumns, spanRows, placed];
  // @ts-expect-error The layout of a block is read through span() and place().
  found.layout = { span: [1, 1], place: null };
}
const snapshot = watched.exportLayout();
const checked = watched.checkLayout(snapshot, snapshot.grid ? { grid: snapshot.grid } : undefined);
if (!checked.ok && checked.code === "BLOCKS_GRID_TOO_SMALL") void checked.message;
void [checked.unknownIds, checked.missingIds];
const batched: number = watched.batch((inside) => inside.blocks().length);
watched.field?.addEventListener("blocks:change", (event) => {
  if (event.detail.type === "batch") void event.detail.changes?.map((change) => change.event);
  if (event.detail.type === "add" || event.detail.type === "title") void event.detail.id;
});
try {
  watched.setGrid(0, 0);
} catch (error) {
  const code: BlocksErrorCode | undefined = (error as BlocksError).code;
  void code;
}
const destroyed: BlocksSystem = watched.destroy();
const moduleVersion: string = version;
void [every, around, batched, destroyed, moduleVersion, reported];

// @ts-expect-error Grid dimensions are readable state, not writable settings.
blocks.columns = 9;

// @ts-expect-error Per-block dragging accepts booleans only.
blocks.add("invalid", { draggable: "no" });

// @ts-expect-error snap was replaced by one canonical layout mode.
createBlocksSystem({ snap: true });

void [block, blockDraggable, layoutMode, savedLayout, columns, rows, minified, shared, typedAddress, typedSnippet, describedUrl];
