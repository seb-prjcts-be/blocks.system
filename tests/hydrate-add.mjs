import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

/* Een block dat na hydrate() met add() in hetzelfde veld komt, heeft geen
   bronelement in de pagina. De responsieve herindeling van hydrate() mag daar
   niet over struikelen: zo'n block houdt zijn eigen span, begrensd op het
   raster, en krijgt geen plaats, net als de andere blocks bij een wissel. */

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
      const mod = await import("/blocks.system.mjs?hydrate-add-test");
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

      const host = document.createElement("div");
      host.innerHTML = \`
        <div id="pagina" data-content-page="hydrate-add" data-grid-compact-columns="2" data-grid-compact-rows="2" data-grid-medium-columns="4" data-grid-medium-rows="2" data-grid-wide-columns="6" data-grid-wide-rows="2">
          <article id="blok-a" data-content-block data-block-title="Een" data-block-span-compact="2 1" data-block-span-medium="2 1" data-block-span-wide="3 1">
            <h2>Een</h2><p>Eerste block uit de pagina.</p>
          </article>
          <article id="blok-b" data-content-block data-block-title="Twee" data-block-span-compact="2 1" data-block-span-medium="2 1" data-block-span-wide="3 1">
            <h2>Twee</h2><p>Tweede block uit de pagina.</p>
          </article>
        </div>
      \`;
      document.body.replaceChildren(host);
      const blocks = mod.createBlocksSystem({ layout: "fixed-grid", rowHeight: 40 });
      const field = blocks.hydrate(host, { storage: false, address: false });
      await frame();

      const img = document.createElement("img");
      img.alt = "";
      const added = blocks.add(img, { id: "tegel-1", menu: false });
      added.span(2, 2);
      await frame();

      const out = {
        addedInField: added.element.parentElement === field,
        menu: Boolean(added.element.querySelector(".blocks-system-menu")),
        before: blocks.exportLayout().blocks.find((b) => b.id === "tegel-1")
      };
      // Dezelfde weg als een breedtewissel: hydrate() legt alle blocks opnieuw.
      try {
        field.blocksPage.applyComposition({});
        out.relayoutError = null;
      } catch (error) {
        out.relayoutError = String(error);
      }
      await frame();
      out.after = blocks.exportLayout().blocks.find((b) => b.id === "tegel-1");
      // Breedte 900 is de medium-modus: de paginablocks nemen hun medium-span
      // van twee kolommen; hun rijen meet fitHeightAll() uit de inhoud.
      out.pageColumns = blocks.exportLayout().blocks.filter((b) => b.id !== "tegel-1").map((b) => b.span[0]);
      return out;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  const v = result.result.value;
  assert.equal(v.addedInField, true, "add() after hydrate() must land in the hydrated field");
  assert.equal(v.menu, false, "menu: false must leave the added block without a titlebar");
  assert.deepEqual(v.before.span, [2, 2]);
  assert.equal(v.relayoutError, null, `hydrate()'s relayout must survive a block without source node: ${v.relayoutError}`);
  assert.deepEqual(v.after.span, [2, 2], "a block added after hydrate() must keep its own span on relayout");
  assert.equal(v.after.place, null, "on relayout the added block is placed like the others: without a fixed place");
  assert.deepEqual(v.pageColumns, [2, 2], "page blocks still take their responsive span");
  browser.assertNoPageErrors();
  console.log("blocks.system hydrate + add — een later toegevoegd block zonder bronelement overleeft de responsieve herindeling OK");
} finally {
  await browser.close();
}
