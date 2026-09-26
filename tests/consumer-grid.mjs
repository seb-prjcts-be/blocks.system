import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

/* Contracts found in a real consumer (lucasgent_clone_blocks): a responsive
   page switches spans and grid together, grows a measurement grid on a stable
   error signal, and filters blocks with the native hidden attribute. */

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

      const { createBlocksSystem } = await import("/blocks.system.mjs?consumer-grid-test");
      const field = document.createElement("main");
      field.style.width = "600px";
      field.style.height = "400px";
      document.body.replaceChildren(field);

      const blocks = createBlocksSystem({ layout: "fixed-grid", draggable: false });
      blocks.attach(field).setGrid(12, 2);
      const menu = { dock: false, close: false, minimize: false };
      const wide = blocks.add("<p>Breed</p>", { id: "wide", title: "Breed", menu }).span(8, 1);
      const narrow = blocks.add("<p>Smal</p>", { id: "narrow", title: "Smal", menu }).span(4, 1);

      const failure = (call) => {
        try { call(); return null; } catch (error) {
          return { name: error.name, code: error.code ?? null };
        }
      };

      // Growing a measurement grid needs a signal that is not the message text.
      const compact = {
        version: 1,
        layout: "fixed-grid",
        blocks: [
          { id: "wide", span: [4, 3], place: null, minimized: false, docked: false },
          { id: "narrow", span: [4, 1], place: null, minimized: false, docked: false }
        ]
      };
      const spanOverflow = failure(() => wide.span(4, 9));
      const gridOverflow = failure(() => blocks.setGrid(4, 2));
      const restoreOverflow = failure(() => blocks.restoreLayout(compact));

      // A wide-to-compact switch: the target spans only fit the target grid,
      // and the current spans only fit the current grid.
      const switched = failure(() => blocks.restoreLayout(compact, { grid: { columns: 4, rows: 4 } }));
      const afterSwitch = {
        grid: [blocks.columns, blocks.rows],
        spans: blocks.exportLayout().blocks.map((entry) => entry.span)
      };

      // A target grid that cannot hold the saved spans changes nothing.
      const tooSmall = failure(() => blocks.restoreLayout(compact, { grid: { columns: 4, rows: 2 } }));
      const afterRejected = {
        grid: [blocks.columns, blocks.rows],
        spans: blocks.exportLayout().blocks.map((entry) => entry.span)
      };

      // The native hidden attribute removes a block from the rendered grid.
      narrow.element.hidden = true;
      const hiddenDisplay = getComputedStyle(narrow.element).display;
      narrow.element.hidden = false;
      const shownDisplay = getComputedStyle(narrow.element).display;

      // A saved place that overlaps an unsaved fixed block changes nothing.
      const placedField = document.createElement("section");
      placedField.style.width = "600px";
      placedField.style.height = "300px";
      document.body.append(placedField);
      const placedBlocks = createBlocksSystem({ layout: "fixed-grid", draggable: true });
      placedBlocks.attach(placedField).setGrid(4, 2);
      const first = placedBlocks.add("<p>A</p>", { id: "first", title: "A", menu }).span(1, 1).place(3, 1);
      placedBlocks.add("<p>B</p>", { id: "second", title: "B", menu }).span(1, 1).place(4, 2);
      const beforeOverlap = JSON.stringify([placedBlocks.columns, placedBlocks.rows, placedBlocks.exportLayout()]);
      const overlap = failure(() => placedBlocks.restoreLayout({
        version: 1,
        layout: "fixed-grid",
        blocks: [{ id: "first", span: [1, 1], place: [4, 2], minimized: false, docked: false }]
      }, { grid: { columns: 4, rows: 3 } }));
      const overlapUnchanged = JSON.stringify([placedBlocks.columns, placedBlocks.rows, placedBlocks.exportLayout()]) === beforeOverlap;

      // A hidden block keeps its place when a visible block moves by keyboard.
      const second = placedBlocks.exportLayout().blocks.find((entry) => entry.id === "second");
      placedField.querySelector('[data-block-object="second"]').hidden = true;
      const title = first.element.querySelector(".blocks-system-title");
      title.focus();
      title.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
      const hiddenAfterMove = placedBlocks.exportLayout().blocks.find((entry) => entry.id === "second");
      const movedPlace = placedBlocks.exportLayout().blocks.find((entry) => entry.id === "first").place;

      // Undocking onto a cell that another block took meanwhile must not overlap.
      const overlapField = document.createElement("section");
      overlapField.style.width = "600px";
      overlapField.style.height = "300px";
      document.body.append(overlapField);
      const dockBlocks = createBlocksSystem({ layout: "fixed-grid", draggable: true });
      dockBlocks.attach(overlapField).setGrid(2, 2);
      const left = dockBlocks.add("<p>L</p>", { id: "left", title: "L", menu }).span(1, 1).place(1, 1);
      const right = dockBlocks.add("<p>R</p>", { id: "right", title: "R", menu }).span(1, 1).place(2, 1);
      left.dock(true);
      const rightTitle = right.element.querySelector(".blocks-system-title");
      rightTitle.focus();
      rightTitle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
      left.dock(false);
      const undockEntries = Object.fromEntries(dockBlocks.exportLayout().blocks.map((entry) => [entry.id, entry.place]));
      const undockOverlap = String(undockEntries.left) === String(undockEntries.right);
      const undockPlaces = JSON.stringify(undockEntries);

      // The resize outline must show while a flow-grid block is being resized.
      const resizeField = document.createElement("section");
      resizeField.style.width = "600px";
      resizeField.style.height = "300px";
      document.body.append(resizeField);
      const resizeBlocks = createBlocksSystem({ layout: "flow-grid", resizable: true });
      resizeBlocks.attach(resizeField).setGrid(2, 2);
      const resizing = resizeBlocks.add("<p>S</p>", { id: "sized", title: "S", menu }).span(1, 1);
      // Hover from the harness pointer can also draw the outline, so check which
      // outline rules match instead of the computed width.
      const outlineRules = () => [...document.styleSheets]
        .flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } })
        .filter((rule) => rule.selectorText && rule.style?.outline && resizing.element.matches(rule.selectorText))
        .map((rule) => rule.selectorText);
      const outlineIdle = outlineRules();
      const handle = resizing.element.querySelector(".blocks-system-resize--block");
      handle.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, clientX: 10, clientY: 10, bubbles: true, isPrimary: true, button: 0 }));
      const resizingAttribute = resizing.element.getAttribute("data-block-resizing");
      const outlineActive = outlineRules();
      handle.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, clientX: 10, clientY: 10, bubbles: true, isPrimary: true, button: 0 }));

      // Measuring a hidden block must not collapse its span to one row.
      const hiddenBlock = blocks.add("<p>Verborgen</p>", { id: "hidden-fit", title: "Verborgen", menu }).span(1, 2);
      hiddenBlock.element.hidden = true;
      const hiddenFit = hiddenBlock.fitHeight();

      return {
        undockOverlap, undockPlaces, resizingAttribute, outlineIdle, outlineActive,
        overlap, overlapUnchanged, placeBefore: second.place, hiddenAfterMove: hiddenAfterMove.place, movedPlace,
        hiddenFit: { rows: hiddenFit.rows, changed: hiddenFit.changed },
        switched, afterSwitch, tooSmall, afterRejected,
        spanOverflow, gridOverflow, restoreOverflow,
        hiddenDisplay, shownDisplay
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  const value = result.result.value;
  assert.equal(value.switched, null, "restoreLayout(layout, { grid }) must switch spans and grid in one call");
  assert.deepEqual(value.afterSwitch, { grid: [4, 4], spans: [[4, 3], [4, 1]] });
  assert.deepEqual(value.tooSmall, { name: "RangeError", code: "BLOCKS_GRID_TOO_SMALL" });
  assert.deepEqual(value.afterRejected, value.afterSwitch, "a rejected grid switch must leave grid and spans untouched");
  for (const name of ["spanOverflow", "gridOverflow", "restoreOverflow"]) {
    assert.deepEqual(value[name], { name: "RangeError", code: "BLOCKS_GRID_TOO_SMALL" }, `${name} must carry the stable grid-size code`);
  }
  assert.equal(value.undockOverlap, false, `undocking must not land on an occupied cell (${value.undockPlaces})`);
  assert.equal(value.resizingAttribute, "block", "a pointer resize must expose its axis while active");
  assert.equal(value.outlineIdle.some((selector) => selector.includes("data-block-resizing")), false, "the resize outline rule must not match an idle block");
  assert.equal(value.outlineActive.some((selector) => selector.includes("data-block-resizing")), true, `the resize outline rule must match while resizing (${value.outlineActive})`);
  assert.equal(value.overlap?.name, "RangeError", "an overlapping saved place must still be rejected");
  assert.equal(value.overlapUnchanged, true, "a rejected overlap must leave grid, order, spans and places untouched");
  assert.deepEqual(value.movedPlace, [2, 1], "the visible block must still move by keyboard");
  assert.deepEqual(value.hiddenAfterMove, value.placeBefore, "a hidden block must not be moved by another block's drag");
  assert.deepEqual(value.hiddenFit, { rows: 2, changed: false }, "a hidden block keeps its span when measured");
  assert.equal(value.hiddenDisplay, "none", "a hidden block must leave the rendered grid");
  assert.equal(value.shownDisplay, "flex", "removing hidden must restore the normal block display");
  browser.assertNoPageErrors();
  console.log("blocks.system consumer grid — atomaire rasterwissel, stabiele rastercode en hidden OK");
} finally {
  await browser.close();
}
