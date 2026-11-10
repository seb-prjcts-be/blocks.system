/** String content is treated as trusted HTML. For untrusted text, create a Node and set textContent. */
export type BlockContent = string | Node | (() => string | Node);

export interface BlocksFont {
  family: string;
  href?: string | null;
}

export interface BlocksLabels {
  move: string;
  resize: string;
  restore: string;
  minimize: string;
  dock: string;
  undock: string;
  pin: string;
  unpin: string;
  /** Explains the disabled dock button of a pinned block. */
  pinnedStaysVisible: string;
  close: string;
  copy: string;
  copied: string;
  copyFailed: string;
  /** Text of the button hydrate() shows while a visitor layout is stored. */
  reset: string;
  resetTitle: string;
  /** bindSearch() status without a query; {total} is filled in. */
  searchCount: string;
  /** bindSearch() status with hits; {hits} and {total} are filled in. */
  searchHits: string;
  /** bindSearch() status without hits; {query} is filled in. */
  searchNone: string;
}

export type BlocksLayoutMode = "free" | "fixed-grid" | "flow-grid";

export interface BlocksLayoutEntry {
  id: string;
  span: readonly [columns: number, rows: number];
  place: readonly [column: number, row: number] | null;
  minimized: boolean;
  docked: boolean;
  pinned: boolean;
}

export interface BlocksLayout {
  version: 1;
  layout: BlocksLayoutMode;
  /** The grid the snapshot was made for; rows is the setGrid() minimum. null in free layout. Pass it on as restoreLayout(layout, { grid: layout.grid }) to switch the grid together with the blocks. Optional when you build a snapshot by hand. */
  grid?: { columns: number; rows: number } | null;
  blocks: readonly BlocksLayoutEntry[];
}

/** What checkLayout() says about a snapshot without changing anything. */
export interface BlocksLayoutCheck {
  /** true when restoreLayout() would accept the snapshot. */
  ok: boolean;
  /** Error code of the refusal, or null. */
  code: BlocksErrorCode | null;
  message: string | null;
  /** Ids in the snapshot that are not in the field; restoreLayout() skips them. */
  unknownIds: readonly string[];
  /** Ids in the field that are not in the snapshot; restoreLayout() appends them. */
  missingIds: readonly string[];
}

export interface BlocksRestoreOptions {
  /** Switch the grid together with the saved spans, e.g. at a responsive breakpoint. Nothing changes when the target grid has too few columns or a saved place overlaps a fixed block. */
  grid?: { columns: number; rows: number };
}

/** Error code on the RangeError thrown when a span, place, grid or restored layout is wider than the grid. */
export type BlocksGridTooSmallCode = "BLOCKS_GRID_TOO_SMALL";

/** Every error blocks.system throws carries one of these on error.code. The message may change, the code does not. */
export type BlocksErrorCode =
  | BlocksGridTooSmallCode
  | "BLOCKS_INVALID_ARGUMENT"
  | "BLOCKS_INVALID_ID"
  | "BLOCKS_DUPLICATE_ID"
  | "BLOCKS_UNKNOWN_BLOCK"
  | "BLOCKS_UNKNOWN_ADAPTER"
  | "BLOCKS_ADAPTER_RESULT"
  | "BLOCKS_RETIRED_OPTION"
  | "BLOCKS_REMOVED"
  | "BLOCKS_WRONG_LAYOUT"
  | "BLOCKS_OVERLAP"
  | "BLOCKS_NO_FIELD"
  | "BLOCKS_FIELD_IN_USE"
  | "BLOCKS_LAYOUT_VERSION"
  | "BLOCKS_NO_CATALOG_URL"
  | "BLOCKS_NOT_MEASURABLE";

export interface BlocksError extends Error {
  code: BlocksErrorCode;
}

/** Codes of what blocks.system refuses or skips without throwing; they reach onIssue. */
export type BlocksIssueCode =
  | "BLOCKS_UNKNOWN_OPTION"
  | "BLOCKS_UNKNOWN_BLOCK"
  | "BLOCKS_PINNED_STAYS_VISIBLE"
  | "BLOCKS_DOCKED_HAS_NO_PIN"
  | "BLOCKS_HYDRATE_NO_TARGET"
  | "BLOCKS_HYDRATE_NO_PAGE"
  | "BLOCKS_HYDRATE_NO_BLOCKS"
  | "BLOCKS_HYDRATE_ALREADY_DONE"
  | "BLOCKS_SEARCH_NO_INPUT"
  | "BLOCKS_SEARCH_NO_ITEMS";

export interface BlocksIssue {
  code: BlocksIssueCode;
  message: string;
  /** The block concerned, when there is one. */
  id?: string;
  /** The block ids concerned, when there are several. */
  ids?: readonly string[];
  /** The option name add() did not know. */
  option?: string;
}

export interface BlockDefinition {
  id: string;
  adapter: string;
  /** Page the block lives on; address() prefers it over the system catalogUrl. Relative urls resolve against catalogUrl or the current page. */
  url?: string;
  /** Trusted HTML for the built-in "html" adapter — the same trust boundary as add(content). */
  markup?: string;
  label?: string;
  medium?: string;
  category?: string;
  description?: string;
  defaults?: Record<string, unknown>;
  attributes?: readonly string[];
  requires?: readonly string[];
  [key: string]: unknown;
}

export interface BlockAdapterContext<TSettings = Record<string, unknown>> {
  block: Readonly<BlockDefinition>;
  host: Element;
  settings: TSettings;
  adapter: BlockAdapter<TSettings>;
}

export interface MountedBlock<TSettings = Record<string, unknown>> extends BlockAdapterContext<TSettings> {
  node: Element;
}

export interface BlockAdapter<TSettings = Record<string, unknown>> {
  ready?(context: BlockAdapterContext<TSettings>): void | Promise<void>;
  mount(context: BlockAdapterContext<TSettings>): Element | { node: Element } | Promise<Element | { node: Element }>;
  unmount?(mounted: MountedBlock<TSettings>): void;
  snippet?(context: Omit<BlockAdapterContext<TSettings>, "host" | "adapter">): string;
}

export interface RegisterOptions {
  replace?: boolean;
}

export interface AddBlockOptions {
  id?: string;
  /** Optional visible menu title. When omitted, id remains an accessible fallback but is not rendered. */
  title?: string;
  menu?: boolean | BlockMenuOptions;
  variant?: string;
  minimized?: boolean;
  /** Allow this block to move while the system remains draggable. Defaults to true. */
  draggable?: boolean;
  /** Initial span in whole grid units, applied like span(); rejected in free layout. */
  span?: readonly [columns: number, rows: number];
  /** Initial fixed-grid coordinates, applied like place(). */
  place?: readonly [column: number, row: number];
  /** Short content shown by the docked chip instead of the title alone; same trust boundary as content. */
  summary?: BlockContent | null;
}

export interface BlockMenuOptions {
  /** Show the reversible close-to-dock action. Defaults to true. */
  dock?: boolean;
  close?: boolean;
  minimize?: boolean;
  /** Show a button that copies the block's decoded visible text. Defaults to false. */
  copy?: boolean;
  /** Show the favorite toggle. A pinned block moves in front of the unpinned blocks and ignores dock(). Defaults to false. */
  pin?: boolean;
}

export interface BlockDefaults {
  menu?: boolean | BlockMenuOptions;
}

export interface BlockController {
  readonly id: string;
  readonly element: HTMLElement;
  readonly content: HTMLDivElement;
  /** Read or change the titlebar text. Setting it keeps the buttons as they are; on a block without a titlebar it adds one with the default menu. */
  title: string;
  /** The current span and place of this block, as exportLayout() writes them. */
  readonly layout: Readonly<{ span: readonly [columns: number, rows: number]; place: readonly [column: number, row: number] | null }>;
  color: string;
  variant: string;
  minimized: boolean;
  docked: boolean;
  /** A pinned block moves in front of the unpinned blocks and ignores dock(); a docked block ignores pin(). */
  pinned: boolean;
  draggable: boolean;
  menu(name: string, options?: boolean | BlockMenuOptions): BlockController;
  /** Move the block to or from the compact dock without deleting it. */
  dock(value?: boolean): void;
  /** Pin the block as a favorite, moving it in front of the unpinned blocks. */
  pin(value?: boolean): void;
  /** Set or remove (null) the short content the docked chip shows. */
  summary(content: BlockContent | null): BlockController;
  span(columns: number, rows: number): BlockController;
  /** Fit the row span to the block's rendered content at its current width. */
  fitHeight(): Readonly<{ columns: number; rows: number; changed: boolean }>;
  place(column: number, row: number): BlockController;
  /** Serialize this live block into a registerable definition for the built-in "html" adapter. */
  describe(options?: BlockDescribeOptions): BlockDefinition;
  remove(): true;
}

export interface BlockDescribeOptions {
  /** Page the definition should address; defaults to the current page without its block parameter. */
  url?: string | URL;
}

export interface BlocksReorderPosition {
  column: number;
  row: number;
}

export interface BlocksReorderDetail {
  id: string;
  input: "pointer" | "keyboard";
  mode: "grid" | "flow";
  key: string | null;
  fromIndex: number | null;
  toIndex: number | null;
  from: BlocksReorderPosition | null;
  to: BlocksReorderPosition | null;
  direction: "up" | "right" | "down" | "left" | "still";
}

export interface BlocksResizeSize {
  columns: number;
  rows: number;
}

export interface BlocksResizeDetail {
  id: string;
  input: "pointer" | "keyboard";
  axis: "inline" | "block";
  from: BlocksResizeSize;
  to: BlocksResizeSize;
}

/** layout: a span, place or fitHeight change of one block; grid: the columns or rows changed; add: a block joined the field; title: its titlebar text changed; batch: everything batch() collected. */
export type BlocksChangeType = "add" | "compact" | "dock" | "undock" | "pin" | "unpin" | "minimize" | "restore" | "remove" | "reset" | "layout" | "grid" | "title" | "batch";

/** One event batch() held back, in the order it happened. */
export interface BlocksBatchedEvent {
  event: "blocks:change" | "blocks:reorder" | "blocks:resize";
  detail: BlocksChangeDetail | BlocksReorderDetail | BlocksResizeDetail;
}

export interface BlocksChangeDetail {
  type: BlocksChangeType;
  id: string | null;
  ids: readonly string[];
  /** Only on type "batch": the events batch() held back. */
  changes?: readonly BlocksBatchedEvent[];
}

export interface BlocksSystemOptions {
  catalogUrl?: string | URL | null;
  random?: () => number;
  /** Called with a code and a message whenever blocks.system refuses or skips something without throwing: an unknown add() option, dock() on a pinned block, a hydrate() that finds nothing. Without it nothing is reported. Try onIssue: console.warn while building. */
  onIssue?: ((issue: Readonly<BlocksIssue>) => void) | null;
  /** Choose one complete layout model. Defaults to free. */
  layout?: BlocksLayoutMode;
  draggable?: boolean;
  /** Show resize lines in flow-grid. Defaults to false and is rejected in other layouts. */
  resizable?: boolean;
  /** Fixed row height in pixels; the field then follows its rows. Defaults to null: rows share the field height. Rejected in free layout. */
  rowHeight?: number | null;
  /** Where a filled dock rail lives: above (default) or below the grid. */
  dockPosition?: "top" | "bottom";
  font?: BlocksFont | null;
  labels?: Partial<BlocksLabels>;
  /** Appearance for new blocks. Defaults to "regular"; "random" draws from the chance settings. */
  variant?: string;
  /** User-owned CSS colors available to future random blocks. Defaults to an empty array. */
  colorArray?: readonly string[];
  /** Share of random blocks using colorArray. A positive value requires at least one color. */
  colorVariation?: number;
  inversionVariation?: number;
  blockDefaults?: BlockDefaults;
  blocks?: BlockDefinition[];
}

export interface BlocksHydrateBreakpoint {
  name: string;
  minWidth: number;
}

export interface BlocksHydrateOptions {
  /** localStorage key prefix for the visitor's order, docked and pinned blocks; the page name follows it. false stores nothing. Defaults to "blocks.system:layout". */
  storage?: string | false;
  /** Width modes for data-grid-{name}-columns/rows and data-block-span-{name}. Defaults to wide 1080, medium 680, compact 0. */
  breakpoints?: readonly BlocksHydrateBreakpoint[];
  /** Blocks containing a match keep their span instead of fitting their content. Defaults to "[data-block-fixed-height]". */
  fixedMediaSelector?: string;
  /** Let the [data-block-role="lead"] block fill the viewport height. */
  viewportLead?: boolean | ((field: Element, source: Element) => boolean);
  /** Call resolveAddress() after hydration. Defaults to true. */
  address?: boolean;
}

export interface BlocksAddressOptions {
  /** Query parameter that names the block. Defaults to "block". */
  queryKey?: string;
  /** Milliseconds data-block-addressed stays on the block. Defaults to 2600. */
  highlightDuration?: number;
}

export interface BlocksSearchOptions {
  /** Where the input selector, items and status are looked up. Defaults to document. */
  root?: Document | Element;
  /** Items to search. Defaults to "[data-search-item]". */
  items?: string;
  /** Element or selector that shows the hit count. */
  status?: string | Element | null;
  /** Key that focuses the input from anywhere on the page; false turns it off. Defaults to "/". */
  shortcut?: string | false;
  /** Value of ?focus= that focuses the input on load. Defaults to "search". */
  focus?: string;
}

export interface BlocksHydratedPage {
  readonly blocks: BlocksSystem;
  readonly controllers: readonly BlockController[];
  currentLayout(): {
    mode: string;
    grid: { columns: number; rows: number };
    blocks: readonly BlocksLayoutEntry[];
  };
  applyComposition(pageLayout: {
    grid?: Record<string, { columns: number; rows: number }>;
    blocks?: Record<string, { span?: Record<string, readonly [number, number]> }>;
  } | null): void;
  fitContent(): void;
}

export interface BlocksHydratedField extends HTMLElement {
  readonly blocksPage: Readonly<BlocksHydratedPage>;
}

export interface BlocksSystem {
  readonly columns: number;
  /** Current row count: the setGrid() minimum or more when the content needs it. */
  readonly rows: number;
  /** Fixed row height in pixels, or null when rows share the field height. */
  rowHeight: number | null;
  /** Read or move the dock rail: "top" (default) or "bottom". */
  dockPosition: "top" | "bottom";
  readonly layout: BlocksLayoutMode;
  draggable: boolean;
  resizable: boolean;
  font: Readonly<BlocksFont> | null;
  variant: string;
  readonly variants: readonly string[];
  /** User-owned CSS colors available to future random blocks. */
  colorArray: readonly string[];
  /** Share of random blocks using colorArray. A positive value requires at least one color. */
  colorVariation: number;
  inversionVariation: number;
  readonly labels: Readonly<BlocksLabels>;
  readonly field: Element | null;
  register(definition: BlockDefinition, options?: RegisterOptions): BlocksSystem;
  registerAdapter(id: string, adapter: BlockAdapter, options?: RegisterOptions): BlocksSystem;
  listAdapters(): string[];
  list(filters?: { query?: string; adapter?: string; medium?: string; category?: string }): Readonly<BlockDefinition>[];
  get(id: string): Readonly<BlockDefinition> | null;
  /** The live block with this id, or null. get() and list() return catalog definitions instead. */
  block(id: string): BlockController | null;
  /** Every live block in its current order, docked blocks at the place they return to. */
  blocks(): BlockController[];
  /** The live block that contains this element, or null. */
  blockOf(target: Element | null): BlockController | null;
  /** Run fn and publish everything it changes as one blocks:change of type "batch". The changes themselves happen at once. Returns what fn returns. */
  batch<T>(fn: (blocks: BlocksSystem) => T): T;
  /** Tell whether restoreLayout() would accept this snapshot, and which ids it would skip or append, without changing anything. */
  checkLayout(layout: unknown, options?: BlocksRestoreOptions): Readonly<BlocksLayoutCheck>;
  /** Remove every block, release the field and undo hydrate() and bindSearch(): observers and listeners stop and a hydrated page gets its original HTML back. Publishes no events. The system can start again afterwards. */
  destroy(): BlocksSystem;
  attach(target: string | Element): BlocksSystem;
  /** Hydrate declarative HTML blocks in a field with responsive spans, auto-fit, deep-link resolution and optional visitor persistence. */
  /** Without a target, the first [data-content-page] on the page is hydrated; an options object may take the place of the target. */
  hydrate(target?: string | Element | BlocksHydrateOptions, options?: BlocksHydrateOptions): BlocksHydratedField | null;
  /** Undock, scroll to and mark the block named by ?block= or #hash in url (defaults to the current location). */
  resolveAddress(url?: string | URL, options?: BlocksAddressOptions): HTMLElement | null;
  /** Bind diacritic-insensitive live filtering and relevance ranking to a search input and its items. */
  bindSearch(input: string | Element, options?: BlocksSearchOptions): boolean;
  /** Fix the columns and set the minimum rows; rows grow and shrink with the content. */
  setGrid(columns: number, minRows: number): BlocksSystem;
  compact(): BlocksSystem;
  /** Fit every live block's row span to its rendered content at the current widths. */
  fitHeight(ids?: Iterable<string>): ReadonlyArray<Readonly<{ id: string; columns: number; rows: number; changed: boolean }>>;
  add(content: BlockContent, options?: AddBlockOptions): BlockController;
  /** Export content-free layout state in current DOM order. */
  exportLayout(): BlocksLayout;
  /** Restore known block order, spans (or keep current spans when omitted), optional fixed positions, minimized, docked and pinned state. */
  restoreLayout(layout: BlocksLayout | { version: 1; layout: BlocksLayoutMode; blocks: ReadonlyArray<{ id: string } & Partial<BlocksLayoutEntry>> }, options?: BlocksRestoreOptions): BlocksSystem;
  /** Make the current order, spans, places, minimized, docked and pinned state the target of reset(); blocks added later join at the end. */
  saveBaseline(): BlocksSystem;
  /** Return every block to the saved baseline (by default its add() order, span, place and initial minimized state, undocked and unpinned); publishes one "reset" change. */
  reset(): BlocksSystem;
  mount(id: string, target: string | Element, overrides?: Record<string, unknown>): Promise<Element>;
  unmount(target: string | Element): boolean;
  remount(id: string, target: string | Element, overrides?: Record<string, unknown>): Promise<Element>;
  snippet(id: string, overrides?: Record<string, unknown>): string;
  address(id: string): string;
}

/** Version of this source, equal to package.json. */
export const version: string;
export function createBlocksSystem(options?: BlocksSystemOptions): BlocksSystem;
export const system: BlocksSystem;
/** Add one block to the shared system; without attach() the system creates its own field at the end of the body. */
export function startBlock(content: BlockContent, options?: AddBlockOptions): BlockController;

declare global {
  interface Window {
    blocks: { system: BlocksSystem; startBlock: typeof startBlock; [key: string]: unknown };
  }

  interface HTMLElementEventMap {
    "blocks:reorder": CustomEvent<BlocksReorderDetail>;
    "blocks:resize": CustomEvent<BlocksResizeDetail>;
    "blocks:change": CustomEvent<BlocksChangeDetail>;
  }

  interface ElementEventMap {
    "blocks:reorder": CustomEvent<BlocksReorderDetail>;
    "blocks:resize": CustomEvent<BlocksResizeDetail>;
    "blocks:change": CustomEvent<BlocksChangeDetail>;
  }
}
