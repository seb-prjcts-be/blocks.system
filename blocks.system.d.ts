/** String content is treated as trusted HTML. For untrusted text, create a Node and set textContent. */
export type BlockContent = string | Node | (() => string | Node);

export interface BlocksFont {
  family: string;
  href?: string | null;
}

export interface BlocksLabels {
  move: string;
  restore: string;
  minimize: string;
  close: string;
}

export interface BlockDefinition {
  id: string;
  adapter: string;
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
  title?: string;
  menu?: boolean | BlockMenuOptions;
  variant?: string;
  minimized?: boolean;
}

export interface BlockMenuOptions {
  close?: boolean;
  minimize?: boolean;
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
  menu(name: string, options?: boolean | BlockMenuOptions): BlockController;
  span(columns: number, rows: number): BlockController;
  place(column: number, row: number): BlockController;
  flow(): BlockController;
  remove(): true;
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

export type BlocksChangeType = "compact" | "minimize" | "restore" | "remove";

export interface BlocksChangeDetail {
  type: BlocksChangeType;
  id: string | null;
  ids: readonly string[];
}

export interface BlocksSystemOptions {
  catalogUrl?: string | URL;
  random?: () => number;
  snap?: boolean;
  draggable?: boolean;
  /** Empty space inside the field border, using CSS padding shorthand order. */
  margin?: string;
  font?: BlocksFont | null;
  labels?: Partial<BlocksLabels>;
  variant?: string;
  /** User-owned CSS colors available to future random blocks. Defaults to an empty array. */
  colorArray?: readonly string[];
  /** Share of random blocks using colorArray. A positive value requires at least one color. */
  colorVariation?: number;
  inversionVariation?: number;
  blockDefaults?: BlockDefaults;
  blocks?: BlockDefinition[];
}

export interface BlocksSystem {
  readonly columns: number;
  readonly rows: number;
  snap: boolean;
  draggable: boolean;
  /** Empty space inside the field border, using CSS padding shorthand order. */
  margin: string;
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
  setGrid(columns: number, rows: number): BlocksSystem;
  compact(): BlocksSystem;
  add(content: BlockContent, options?: AddBlockOptions): BlockController;
  mount(id: string, target: string | Element, overrides?: Record<string, unknown>): Promise<Element>;
  unmount(target: string | Element): boolean;
  remount(id: string, target: string | Element, overrides?: Record<string, unknown>): Promise<Element>;
  snippet(id: string, overrides?: Record<string, unknown>): string;
  address(id: string): string;
}

export function createBlocksSystem(options?: BlocksSystemOptions): BlocksSystem;
export const system: BlocksSystem;

declare global {
  interface Window {
    blocks: { system: BlocksSystem; [key: string]: unknown };
  }

  interface HTMLElementEventMap {
    "blocks:reorder": CustomEvent<BlocksReorderDetail>;
    "blocks:change": CustomEvent<BlocksChangeDetail>;
  }
}
