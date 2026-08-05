import {
  createBlocksSystem,
  system,
  type BlockController,
  type BlocksChangeDetail,
  type BlocksReorderDetail,
  type BlocksSystem
} from "blocks.system";
import { createBlocksSystem as createMinBlocksSystem } from "blocks.system/min";

const blocks: BlocksSystem = createBlocksSystem({
  snap: true,
  draggable: true,
  margin: "1rem 2vw 3rem 4vw",
  blockDefaults: { menu: { minimize: true, close: true } }
});

blocks.attach(document.body).setGrid(6, 4);
const block: BlockController = blocks
  .add(document.createElement("article"), { id: "typed-block", title: "typed" })
  .span(2, 1)
  .place(1, 1)
  .menu("typed", { close: true });

const columns: number = blocks.columns;
const rows: number = blocks.rows;
blocks.margin = "clamp(8px, 2vw, 24px)";
const margin: string = blocks.margin;
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

// @ts-expect-error Grid dimensions are readable state, not writable settings.
blocks.columns = 9;

void [block, columns, rows, margin, minified, shared];
