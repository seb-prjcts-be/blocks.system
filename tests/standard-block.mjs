import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

/* v0.5: minimale code geeft al een bruikbaar standaardblock, zoals
   Waves.wave(x) in p5.waves zonder opties al een bruikbare waarde geeft. */

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
      const mod = await import("/blocks.system.mjs?standard-block-test");
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const out = {};

      // 1. Eén aanroep zonder attach() geeft een block in een eigen veld.
      const hello = mod.system.add("<p>hallo</p>");
      await frame();
      const field = hello.element.parentElement;
      out.autoField = {
        inDocument: document.contains(hello.element),
        fieldClass: field.className,
        fieldInBody: field.parentElement === document.body,
        sameField: mod.system.field === field,
        variant: hello.variant,
        width: Math.round(hello.element.getBoundingClientRect().width),
        title: hello.element.querySelector(".blocks-system-title")?.textContent ?? null
      };
      const second = mod.system.add("<p>twee</p>");
      out.secondSharesField = second.element.parentElement === field;

      // 2. startBlock() is dezelfde ingang, ook via window.blocks.
      out.startBlock = typeof mod.startBlock;
      const started = mod.startBlock("<p>start</p>", { title: "Start" });
      out.startedInField = started.element.parentElement === field;
      out.startedTitle = started.element.querySelector(".blocks-system-title")?.textContent ?? null;
      out.windowStartBlock = typeof window.blocks?.startBlock;

      // 3. span en place kunnen mee in add(); een eigen systeem maakt ook zelf zijn veld.
      const grid = mod.createBlocksSystem({ layout: "fixed-grid" });
      grid.setGrid(4, 1);
      const placed = grid.add("<p>raster</p>", { id: "placed", span: [2, 2], place: [3, 1] });
      await frame();
      out.gridField = grid.field?.className ?? null;
      out.gridFieldSeparate = grid.field !== field;
      out.placedLayout = grid.exportLayout().blocks[0];
      out.gridRows = grid.rows;
      out.badSpan = (() => { try { grid.add("<p>x</p>", { span: [0, 1] }); return null; } catch (error) { return error.name; } })();
      out.spanInFree = (() => { try { mod.system.add("<p>x</p>", { span: [1, 1] }); return null; } catch (error) { return error.name; } })();

      // 4. De standaardvariant is regular; random blijft een bewuste keuze.
      out.defaultVariant = mod.createBlocksSystem().variant;
      out.randomStillWorks = mod.createBlocksSystem({ variant: "random" }).variant;

      // 5. Een kort block in de vrije layout is geen strookje van 48px.
      const free = mod.createBlocksSystem();
      const short = free.add("<p>x</p>");
      await frame();
      out.minWidth = Math.round(short.element.getBoundingClientRect().width);
      out.minWidthToken = getComputedStyle(free.field).getPropertyValue("--blocks-block-min-width").trim();

      return out;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  const v = result.result.value;
  assert.equal(v.autoField.inDocument, true, "add() without attach() must still render the block");
  assert.match(v.autoField.fieldClass, /\bblocks-system-field\b/, "the automatic field must be recognisable");
  assert.match(v.autoField.fieldClass, /\bblocks-system-surface\b/, "the automatic field must be a real attached surface");
  assert.equal(v.autoField.fieldInBody, true, "the automatic field lives at the end of the body");
  assert.equal(v.autoField.sameField, true, "blocks.field must report the automatic field");
  assert.equal(v.autoField.variant, "regular", "a zero-config block is regular, not a random draw");
  assert.ok(v.autoField.width >= 180, `a short block must not collapse to a sliver (${v.autoField.width}px)`);
  assert.equal(v.secondSharesField, true, "later blocks reuse the automatic field");
  assert.equal(v.startBlock, "function", "the module must export startBlock()");
  assert.equal(v.startedInField, true, "startBlock() adds to the shared system");
  assert.equal(v.startedTitle, "Start");
  assert.equal(v.windowStartBlock, "function", "window.blocks.startBlock must exist for script tags");
  assert.equal(v.gridField, "blocks-system-field blocks-system-surface", "an independent system creates its own field");
  assert.equal(v.gridFieldSeparate, true);
  assert.deepEqual(v.placedLayout, { id: "placed", span: [2, 2], place: [3, 1], minimized: false, docked: false }, "span and place options apply in add()");
  assert.equal(v.gridRows, 2);
  assert.equal(v.badSpan, "TypeError", "an invalid span option fails like span()");
  assert.equal(v.spanInFree, "TypeError", "span in free layout fails like span()");
  assert.equal(v.defaultVariant, "regular", "the system default variant is regular");
  assert.equal(v.randomStillWorks, "random");
  assert.ok(v.minWidth >= 180, `free blocks keep a minimum width (${v.minWidth}px)`);
  assert.equal(v.minWidthToken, "180px", "the minimum width is a CSS token consumers can override");
  browser.assertNoPageErrors();
  console.log("blocks.system standard block — automatisch veld, startBlock, span/place, regular en minimale breedte OK");
} finally {
  await browser.close();
}
