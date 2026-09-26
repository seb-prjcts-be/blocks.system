import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

/* v0.5: de library is eigenaar van de rijen. setGrid() zet een minimum, de
   inhoud bepaalt het werkelijke aantal, en dat groeit én krimpt mee. */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await startBrowserHarness(root, { width: 900, height: 700 });

try {
  const result = await browser.protocol.send("Runtime.evaluate", {
    expression: `(async () => {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/blocks.system.css";
      document.head.append(stylesheet);
      await new Promise((done) => { stylesheet.onload = done; });
      const { createBlocksSystem } = await import("/blocks.system.mjs?height-model-test");
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const menu = { dock: true, minimize: true, close: false };
      const failure = (call) => { try { call(); return null; } catch (error) { return { name: error.name, code: error.code ?? null }; } };
      const makeField = (height) => {
        const field = document.createElement("main");
        field.style.width = "600px";
        if (height) field.style.height = height;
        document.body.append(field);
        return field;
      };
      const out = {};

      // 1. Rijen groeien en krimpen met de spans; kolommen blijven hard.
      const grow = createBlocksSystem({ layout: "fixed-grid", blockDefaults: { menu } });
      grow.attach(makeField("600px")).setGrid(2, 2);
      const tall = grow.add("<p>A</p>", { id: "a", title: "A" });
      grow.add("<p>B</p>", { id: "b", title: "B" });
      out.spanGrow = failure(() => tall.span(1, 3));
      out.rowsAfterGrow = grow.rows;
      tall.span(1, 1);
      out.rowsAfterShrink = grow.rows;
      out.columnsStillHard = failure(() => tall.span(3, 1));
      out.placeGrow = failure(() => tall.place(1, 5));
      out.rowsAfterPlace = grow.rows;
      tall.place(1, 1);
      out.rowsAfterPlaceBack = grow.rows;

      // 2. Toetsenbord omlaag en weer omhoog: rijen volgen.
      const title = tall.element.querySelector(".blocks-system-title");
      title.focus();
      const key = (name) => title.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
      key("ArrowDown"); key("ArrowDown");
      out.rowsAfterDown = grow.rows;
      key("ArrowUp"); key("ArrowUp");
      out.rowsAfterUp = grow.rows;

      // 3. Minimaliseren geeft rijen vrij, ook in fixed-grid.
      const column = createBlocksSystem({ layout: "fixed-grid", blockDefaults: { menu } });
      column.attach(makeField("600px")).setGrid(1, 1);
      const first = column.add("<p>A</p>", { id: "a", title: "A" }).span(1, 3);
      const second = column.add("<p>B</p>", { id: "b", title: "B" }).span(1, 2);
      await frame();
      const secondTopBefore = second.element.getBoundingClientRect().top;
      out.rowsColumn = column.rows;
      first.minimized = true;
      await frame();
      out.rowsMinimized = column.rows;
      out.secondMovedUp = second.element.getBoundingClientRect().top < secondTopBefore;
      first.minimized = false;
      await frame();
      out.rowsRestored = column.rows;
      out.exportKeepsSpan = column.exportLayout().blocks[0].span.join("x");

      // 4. rowHeight maakt de library eigenaar van de veldhoogte.
      const fixedRows = createBlocksSystem({ layout: "fixed-grid", rowHeight: 128, blockDefaults: { menu } });
      const rowField = makeField(null);
      fixedRows.attach(rowField).setGrid(2, 1);
      const measured = fixedRows.add("<p>M</p>", { id: "m", title: "M" }).span(1, 2);
      await frame();
      const gap = Number.parseFloat(getComputedStyle(rowField).rowGap) || 0;
      out.rowHeight = fixedRows.rowHeight;
      out.rowHeightRows = fixedRows.rows;
      out.blockHeight = Math.round(measured.element.getBoundingClientRect().height);
      out.expectedBlockHeight = 128 * 2 + gap;
      out.fieldHeight = Math.round(rowField.getBoundingClientRect().height);
      out.expectedFieldHeight = 128 * 2 + gap + 2;
      out.badRowHeight = failure(() => createBlocksSystem({ layout: "fixed-grid", rowHeight: -1 }));

      // 5. De dockrail krijgt eigen ruimte boven het raster.
      const docking = createBlocksSystem({ layout: "fixed-grid", blockDefaults: { menu } });
      const dockField = makeField("400px");
      docking.attach(dockField).setGrid(2, 2);
      const parked = docking.add("<p>P</p>", { id: "p", title: "P" }).span(1, 1);
      const stays = docking.add("<p>S</p>", { id: "s", title: "S" }).span(1, 1);
      parked.dock(true);
      await frame();
      const rail = dockField.querySelector(".blocks-system-dock").getBoundingClientRect();
      const staysRect = stays.element.getBoundingClientRect();
      out.railAboveBlocks = rail.bottom <= staysRect.top + 0.5;
      out.dockSpace = dockField.getAttribute("data-blocks-dock");
      parked.dock(false);
      await frame();
      out.dockSpaceReleased = dockField.getAttribute("data-blocks-dock");

      // 5b. Een rail onder het raster reserveert ruimte onderaan en toont de samenvatting.
      const below = createBlocksSystem({ layout: "fixed-grid", dockPosition: "bottom", blockDefaults: { menu } });
      const belowField = makeField("400px");
      below.attach(belowField).setGrid(2, 1);
      const parkedBelow = below.add("<p>Lang verhaal</p>", { id: "pb", title: "PB", summary: "kort" }).span(1, 1);
      const staysBelow = below.add("<p>S</p>", { id: "sb", title: "SB" }).span(1, 1);
      parkedBelow.dock(true);
      await frame();
      const railBelow = belowField.querySelector(".blocks-system-dock").getBoundingClientRect();
      const staysBelowRect = staysBelow.element.getBoundingClientRect();
      const belowFieldRect = belowField.getBoundingClientRect();
      out.railBelowBlocks = railBelow.top >= staysBelowRect.bottom - 0.5;
      out.railInsideField = railBelow.bottom <= belowFieldRect.bottom + 0.5;
      out.bottomPadding = getComputedStyle(belowField).paddingBlockEnd;
      out.topPadding = getComputedStyle(belowField).paddingBlockStart;
      const summaryEl = parkedBelow.element.querySelector(".blocks-system-summary");
      out.summaryVisible = summaryEl ? getComputedStyle(summaryEl).display !== "none" : null;
      out.contentHidden = getComputedStyle(parkedBelow.content).display === "none";
      parkedBelow.dock(false);
      await frame();
      out.summaryHiddenAgain = getComputedStyle(summaryEl).display === "none";

      // 6. flow-grid leidt zijn rijen op dezelfde manier af.
      const flow = createBlocksSystem({ layout: "flow-grid", blockDefaults: { menu } });
      flow.attach(makeField("600px")).setGrid(1, 1);
      flow.add("<p>A</p>", { id: "a", title: "A" }).span(1, 3);
      flow.add("<p>B</p>", { id: "b", title: "B" }).span(1, 2);
      out.flowRows = flow.rows;

      return out;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  const v = result.result.value;
  assert.equal(v.spanGrow, null, "a span taller than the minimum grid must grow the rows instead of throwing");
  assert.equal(v.rowsAfterGrow, 3);
  assert.equal(v.rowsAfterShrink, 2, "rows must shrink back to the minimum");
  assert.deepEqual(v.columnsStillHard, { name: "RangeError", code: "BLOCKS_GRID_TOO_SMALL" }, "columns remain a hard limit");
  assert.equal(v.placeGrow, null, "placing below the minimum rows must grow the grid");
  assert.equal(v.rowsAfterPlace, 5);
  assert.equal(v.rowsAfterPlaceBack, 2);
  assert.equal(v.rowsAfterDown, 3, "two keyboard steps down move the block to row 3 and grow the rows");
  assert.equal(v.rowsAfterUp, 2, "two keyboard steps up shrink them again");
  assert.equal(v.rowsColumn, 5);
  assert.equal(v.rowsMinimized, 3, "a minimized block occupies one row");
  assert.equal(v.secondMovedUp, true, "the block below a minimized block moves up");
  assert.equal(v.rowsRestored, 5);
  assert.equal(v.exportKeepsSpan, "1x3", "minimizing must not change the exported span");
  assert.equal(v.rowHeight, 128);
  assert.equal(v.rowHeightRows, 2);
  assert.equal(v.blockHeight, v.expectedBlockHeight, "rowHeight sets the row track in pixels");
  assert.equal(v.fieldHeight, v.expectedFieldHeight, "with rowHeight the field height follows the rows");
  assert.equal(v.badRowHeight?.name, "TypeError", "rowHeight must be a positive number or null");
  assert.equal(v.railAboveBlocks, true, "the dock rail must not cover the first block");
  assert.equal(v.dockSpace, "true");
  assert.equal(v.dockSpaceReleased, null, "an empty dock releases its space");
  assert.equal(v.railBelowBlocks, true, "a bottom rail must sit below the last block");
  assert.equal(v.railInsideField, true, "the bottom rail must stay inside the field");
  assert.notEqual(v.bottomPadding, "0px", "a filled bottom rail reserves space at the end of the field");
  assert.equal(v.topPadding, "0px", "a bottom rail reserves no space at the start");
  assert.equal(v.summaryVisible, true, "a docked chip shows its summary");
  assert.equal(v.contentHidden, true, "the full content stays hidden in the chip");
  assert.equal(v.summaryHiddenAgain, true, "an undocked block hides its summary again");
  assert.equal(v.flowRows, 5, "flow-grid derives rows from its content too");
  browser.assertNoPageErrors();
  console.log("blocks.system height model — rijen groeien en krimpen, rowHeight, minimize en dockrail OK");
} finally {
  await browser.close();
}
