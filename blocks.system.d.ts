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
  blocks: readonly BlocksLayoutEntry[];
}

export interface BlocksRestoreOptions {
  /** Switch the grid together with the saved spans, e.g. at a responsive breakpoint. Nothing changes when the target grid has too few columns or a saved place overlaps a fixed block. */
  grid?: { columns: number; rows: number };
}

/** Error code on the RangeError thrown when a span, place, grid or restored layout is wider than the grid. */
export type BlocksGridTooSmallCode = "BLOCKS_GRID_TOO_SMALL";

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

/** layout: a span, place or fitHeight change of one block; grid: the columns or rows changed. */
export type BlocksChangeType = "compact" | "dock" | "undock" | "pin" | "unpin" | "minimize" | "restore" | "remove" | "reset" | "layout" | "grid";

export interface BlocksChangeDetail {
  type: BlocksChangeType;
  id: string | null;
  ids: readonly string[];
}

export interface BlocksSystemOptions {
  catalogUrl?: string | URL | null;
  random?: () => number;
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
