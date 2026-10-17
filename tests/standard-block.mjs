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

      // 6. hydrate() activeert declaratieve HTML, extraheert voetnoot en chip-samenvatting, en bewaart persoonlijke volgorde.
      const declarativeHost = document.createElement("div");
      declarativeHost.innerHTML = \`
        <div class="pagina-veld" data-content-page="test-pagina" data-grid-columns="12" data-grid-rows="4">
          <article id="blok-a" data-content-block data-block-title="Contact" data-span-columns="6" data-span-rows="2">
            <h2>Contact</h2>
            <p>Bel of mail het secretariaat voor vragen.</p>
            <p><a href="mailto:info@example.test">info@example.test</a></p>
          </article>
          <article id="blok-b" data-content-block data-block-title="Uurrooster" data-span-columns="6" data-span-rows="2">
            <h2>Uurrooster</h2>
            <p>De lessen starten om half negen.</p>
          </article>
          <footer data-content-footnote><p>Colofon van de pagina.</p></footer>
        </div>
      \`;
      document.body.append(declarativeHost);
      window.localStorage.removeItem("blocks.system:block-posities:test-pagina");
      const hydratedSystem = mod.createBlocksSystem({ layout: "flow-grid", rowHeight: 40 });
      const hydratedField = hydratedSystem.hydrate(declarativeHost);
      await frame();
      const contactCtrl = hydratedField.blocksPage.controllers.find((c) => c.id === "blok-a");
      contactCtrl.dock(true);
      await frame();
      const savedAfterDock = JSON.parse(window.localStorage.getItem("blocks.system:block-posities:test-pagina") || "null");
      const resetBtn = declarativeHost.querySelector(".veld-terugzetten");
      const resetVisibleWhenDocked = Boolean(resetBtn);
      resetBtn?.click();
      await frame();
      const savedAfterReset = window.localStorage.getItem("blocks.system:block-posities:test-pagina");
      out.hydrate = {
        controllerCount: hydratedField.blocksPage.controllers.length,
        headingHidden: Boolean(declarativeHost.querySelector("#blok-a h2.block-heading-hidden")),
        copyButtonExists: Boolean(contactCtrl.element.querySelector(".blocks-system-copy")),
        colofonMoved: Boolean(declarativeHost.querySelector(".veld-colofon [data-content-footnote]")),
        savedDocked: Boolean(savedAfterDock?.docked?.includes("blok-a")),
        resetVisibleWhenDocked,
        restoredAfterReset: contactCtrl.docked === false && savedAfterReset === null
      };

      // 7. resolveAddress() wijst het gevraagde block aan.
      const addressed = hydratedSystem.resolveAddress({
        url: "https://example.test/pagina?block=blok-b",
        highlightDuration: 500
      });
      out.addressed = {
        id: addressed?.id ?? null,
        highlighted: addressed?.classList.contains("is-aangewezen") ?? false
      };

      // 8. bindSearch() filtert en rangschikt tegels diakriet-ongevoelig.
      const searchHost = document.createElement("div");
      searchHost.innerHTML = \`
        <div class="kaart-zoek" hidden>
          <input id="kaart-zoekveld" type="search">
          <p class="kaart-zoek__stand"></p>
        </div>
        <article class="content-block">
          <ul class="kaart-tegels">
            <li class="kaart-tegel" data-titel="Algemeen" data-zoek="algemene info voor elke élève"><a href="#a">Algemeen</a></li>
            <li class="kaart-tegel" data-titel="Élève begeleiding" data-zoek="élève begeleiding op maat"><a href="#b">Élève begeleiding</a></li>
          </ul>
        </article>
      \`;
      document.body.append(searchHost);
      const searchBound = hydratedSystem.bindSearch({ root: searchHost });
      const searchInput = searchHost.querySelector("#kaart-zoekveld");
      searchInput.value = "eleve";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      const orderedHrefs = [...searchHost.querySelectorAll(".kaart-treffers .kaart-tegel a")].map((el) => el.getAttribute("href"));
      out.search = {
        searchBound,
        orderedHrefs,
        statusText: searchHost.querySelector(".kaart-zoek__stand")?.textContent ?? ""
      };

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
  assert.deepEqual(v.placedLayout, { id: "placed", span: [2, 2], place: [3, 1], minimized: false, docked: false, pinned: false }, "span and place options apply in add()");
  assert.equal(v.gridRows, 2);
  assert.equal(v.badSpan, "TypeError", "an invalid span option fails like span()");
  assert.equal(v.spanInFree, "TypeError", "span in free layout fails like span()");
  assert.equal(v.defaultVariant, "regular", "the system default variant is regular");
  assert.equal(v.randomStillWorks, "random");
  assert.ok(v.minWidth >= 180, `free blocks keep a minimum width (${v.minWidth}px)`);
  assert.equal(v.minWidthToken, "180px", "the minimum width is a CSS token consumers can override");
  assert.deepEqual(v.hydrate, {
    controllerCount: 2,
    headingHidden: true,
    copyButtonExists: true,
    colofonMoved: true,
    savedDocked: true,
    resetVisibleWhenDocked: true,
    restoredAfterReset: true
  }, "hydrate() must turn declarative blocks into persistent, resettable blocks with footnotes and copy actions");
  assert.deepEqual(v.addressed, { id: "blok-b", highlighted: true }, "resolveAddress() must highlight the addressed block");
  assert.deepEqual(v.search, {
    searchBound: true,
    orderedHrefs: ["#b", "#a"],
    statusText: "2 van 2 blokken — beste treffer bovenaan"
  }, "bindSearch() must rank heading matches first and fold diacritics");
  browser.assertNoPageErrors();
  console.log("blocks.system standard block — automatisch veld, startBlock, span/place, regular, minimale breedte, hydrate, resolveAddress en bindSearch OK");
} finally {
  await browser.close();
}
