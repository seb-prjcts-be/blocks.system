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

void [block, columns, rows, minified, shared];
