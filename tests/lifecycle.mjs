import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

/* De functies die een toepassing of een agent nodig heeft om met levende
   blocks te werken zonder eigen boekhouding: blocks opvragen en lezen,
   foutcodes, onIssue, de momentopname met raster, checkLayout(), batch() en
   destroy(). Alles in een echte browser, want hydrate() en bindSearch() leunen
   op observers en echte DOM. */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const browser = await startBrowserHarness(root, { width: 900, height: 700 });

try {
  const result = await browser.protocol.send("Runtime.evaluate", {
    expression: `(async () => {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/blocks.system.css";
      document.head.append(stylesheet);
      await new Promise((done) => { stylesheet.onload = done; });
      const mod = await import("/blocks.system.mjs?lifecycle-test");
      const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const codeOf = (fn) => { try { fn(); return null; } catch (error) { return error.code ?? "(geen code)"; } };
      const out = { version: mod.version };

      // --- blocks opvragen en lezen
      const issues = [];
      const field = document.createElement("div");
      document.body.replaceChildren(field);
      const blocks = mod.createBlocksSystem({ layout: "fixed-grid", rowHeight: 40, onIssue: (issue) => issues.push(issue) });
      blocks.attach(field).setGrid(4, 2);
      const events = [];
      field.addEventListener("blocks:change", (event) => events.push(event.detail));
      const one = blocks.add("<p><b id='binnen'>een</b></p>", { id: "een", title: "Een", span: [2, 1], place: [1, 1], menu: { copy: true, pin: true } });
      const two = blocks.add("<p>twee</p>", { id: "twee", title: "Twee", span: [2, 1], place: [3, 1], kleur: "rood" });
      out.lookup = {
        byId: blocks.block("een") === one,
        unknown: blocks.block("bestaat-niet"),
        order: blocks.blocks().map((block) => block.id),
        ofChild: blocks.blockOf(document.getElementById("binnen")) === one,
        ofOutside: blocks.blockOf(document.body),
        definitionIsNotBlock: blocks.get("een")
      };
      out.addEvents = events.filter((detail) => detail.type === "add").map((detail) => detail.id);
      out.unknownOption = issues.find((issue) => issue.code === "BLOCKS_UNKNOWN_OPTION")?.option ?? null;

      const buttonsBefore = [...one.element.querySelectorAll(".blocks-system-actions button")].map((button) => button.className);
      one.title = "Eerste";
      out.title = {
        read: one.title,
        shown: one.element.querySelector(".blocks-system-title").textContent,
        buttonsKept: JSON.stringify(buttonsBefore) === JSON.stringify([...one.element.querySelectorAll(".blocks-system-actions button")].map((button) => button.className)),
        copyLabel: one.element.querySelector(".blocks-system-copy").getAttribute("aria-label"),
        event: events.some((detail) => detail.type === "title" && detail.id === "een")
      };
      out.layout = { one: one.layout, two: two.layout, frozen: Object.isFrozen(one.layout) };

      // --- stille weigeringen worden gemeld
      one.pin(true);
      one.dock(true);
      out.pinnedNotDocked = { docked: one.docked, issue: issues.some((issue) => issue.code === "BLOCKS_PINNED_STAYS_VISIBLE" && issue.id === "een") };
      one.pin(false);

      // --- foutcodes
      out.codes = {
        duplicate: codeOf(() => blocks.add("x", { id: "een" })),
        invalidId: codeOf(() => blocks.add("x", { id: "Niet Goed" })),
        tooSmall: codeOf(() => two.span(9, 1)),
        overlap: codeOf(() => two.place(1, 1)),
        argument: codeOf(() => blocks.setGrid(0, 1)),
        wrongLayout: codeOf(() => mod.createBlocksSystem().setGrid(2, 2)),
        unknownBlock: codeOf(() => blocks.snippet("bestaat-niet")),
        version: codeOf(() => blocks.restoreLayout({ version: 2, layout: "fixed-grid", blocks: [] }))
      };
      const removed = blocks.add("weg", { id: "weg", place: [1, 2] });
      removed.remove();
      out.codes.removed = codeOf(() => removed.span(1, 1));

      // --- momentopname met raster, en controleren zonder wijzigen
      const snapshot = blocks.exportLayout();
      out.snapshotGrid = snapshot.grid;
      out.freeGrid = mod.createBlocksSystem().exportLayout().grid;
      const withStranger = { ...snapshot, blocks: [...snapshot.blocks.filter((entry) => entry.id !== "twee"), { id: "vreemd", span: [1, 1], place: null, minimized: false, docked: false, pinned: false }] };
      const before = JSON.stringify(blocks.exportLayout());
      out.check = {
        ok: blocks.checkLayout(withStranger),
        tooSmall: blocks.checkLayout(snapshot, { grid: { columns: 1, rows: 1 } }),
        garbage: blocks.checkLayout("geen opname"),
        untouched: JSON.stringify(blocks.exportLayout()) === before
      };
      blocks.restoreLayout(withStranger);
      out.restoreReportsUnknown = issues.find((issue) => issue.code === "BLOCKS_UNKNOWN_BLOCK")?.ids ?? null;
      blocks.restoreLayout(snapshot, { grid: snapshot.grid });
      out.roundTrip = JSON.stringify(blocks.exportLayout()) === before;

      // --- batch: één melding voor veel wijzigingen
      events.length = 0;
      const returned = blocks.batch(() => {
        one.span(1, 1);
        two.minimized = true;
        blocks.batch(() => { two.minimized = false; });
        return "klaar";
      });
      out.batch = {
        returned,
        count: events.length,
        type: events[0]?.type,
        ids: events[0]?.ids,
        inner: events[0]?.changes?.map((change) => change.detail.type),
        applied: one.layout.span
      };
      events.length = 0;
      try { blocks.batch(() => { one.span(2, 1); throw new Error("stuk"); }); } catch { /* de fout hoort door te gaan */ }
      out.batchAfterThrow = events.map((detail) => detail.type);
      one.span(1, 1);
      out.eventsFlowAgain = events.at(-1)?.type;

      // --- destroy op een gewoon systeem
      events.length = 0;
      blocks.destroy();
      out.destroyPlain = {
        events: events.length,
        children: field.children.length,
        surfaceClass: field.classList.contains("blocks-system-surface"),
        marker: field.hasAttribute("data-blocks-system"),
        fieldGone: blocks.field,
        blocksLeft: blocks.blocks().length,
        controllerDead: codeOf(() => one.span(1, 1))
      };
      blocks.attach(field).setGrid(2, 1);
      out.reusable = blocks.add("opnieuw", { id: "opnieuw" }).element.parentElement === field;
      blocks.destroy();

      // --- destroy na hydrate() en bindSearch(): de pagina komt terug
      const host = document.createElement("main");
      host.innerHTML = \`
        <p><input id="zoek" type="search"></p>
        <ul><li data-search-item data-title="Een"><a href="#blok-a">Een</a></li><li data-search-item data-title="Twee"><a href="#blok-b">Twee</a></li></ul>
        <div id="pagina" data-content-page="lifecycle" data-grid-columns="4" data-grid-rows="1">
          <article id="blok-a" data-content-block data-block-title="Een" data-block-span="2 1"><h2>Een</h2><p>Eerste.</p></article>
          <article id="blok-b" data-content-block data-block-title="Twee" data-block-span="2 1"><h2>Twee</h2><p>Tweede.</p></article>
          <p data-content-footnote>Een voetnoot.</p>
        </div>\`;
      document.body.replaceChildren(host);
      const sourceHtml = host.querySelector("#pagina").outerHTML;
      const page = mod.createBlocksSystem({ layout: "fixed-grid", rowHeight: 40, onIssue: (issue) => issues.push(issue) });
      const hydrated = page.hydrate(host, { storage: false, address: false });
      const searchBound = page.bindSearch("#zoek", { root: host });
      await frame();
      const input = host.querySelector("#zoek");
      input.value = "twee";
      input.dispatchEvent(new Event("input"));
      out.hydrated = {
        field: hydrated?.classList.contains("blocks-system-page") ?? false,
        searchBound,
        results: host.querySelectorAll(".blocks-system-search-results").length,
        byId: page.block("blok-a")?.title
      };
      page.destroy();
      await frame();
      out.destroyHydrated = {
        sourceBack: host.querySelector("#pagina")?.outerHTML === sourceHtml,
        noField: host.querySelector(".blocks-system-page"),
        noFootnoteFooter: host.querySelector(".blocks-system-footnotes"),
        noResults: host.querySelectorAll(".blocks-system-search-results").length,
        itemsVisible: [...host.querySelectorAll("[data-search-item]")].every((item) => !item.hidden),
        notReady: host.dataset.blocksReady ?? null,
        inputFree: input.dataset.blocksSearch ?? null
      };
      const again = page.hydrate(host, { storage: false, address: false });
      out.rehydrated = { field: Boolean(again), blocks: page.blocks().map((block) => block.id) };
      page.destroy();

      // --- hydrate() zegt waarom het niets doet
      issues.length = 0;
      const emptyHost = document.createElement("div");
      emptyHost.innerHTML = '<div data-content-page="leeg"></div>';
      document.body.append(emptyHost);
      const nothing = page.hydrate(emptyHost);
      out.hydrateReason = { result: nothing, code: issues[0]?.code ?? null };
      issues.length = 0;
      out.searchReason = { result: page.bindSearch("#bestaat-niet"), code: issues[0]?.code ?? null };
      return out;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  const v = result.result.value;

  assert.equal(v.version, packageData.version, "the exported version must equal package.json");

  assert.equal(v.lookup.byId, true, "block(id) must return the live controller");
  assert.equal(v.lookup.unknown, null, "block(id) must return null for an unknown id");
  assert.deepEqual(v.lookup.order, ["een", "twee"], "blocks() must list the live controllers in field order");
  assert.equal(v.lookup.ofChild, true, "blockOf(element) must find the block around an element");
  assert.equal(v.lookup.ofOutside, null, "blockOf() must return null outside a block");
  assert.equal(v.lookup.definitionIsNotBlock, null, "get() keeps returning catalog definitions, not live blocks");
  assert.deepEqual(v.addEvents, ["een", "twee"], "add() must publish one add change per block");
  assert.equal(v.unknownOption, "kleur", "an unknown add() option must reach onIssue");

  assert.deepEqual(v.title, {
    read: "Eerste",
    shown: "Eerste",
    buttonsKept: true,
    copyLabel: "Eerste copy content",
    event: true
  }, "block.title must change the text, keep the buttons, refresh the labels and publish a title change");
  assert.deepEqual(v.layout, {
    one: { span: [2, 1], place: [1, 1] },
    two: { span: [2, 1], place: [3, 1] },
    frozen: true
  }, "block.layout must read the current span and place");

  assert.deepEqual(v.pinnedNotDocked, { docked: false, issue: true }, "dock() on a pinned block must stay a no-op and report why");

  assert.deepEqual(v.codes, {
    duplicate: "BLOCKS_DUPLICATE_ID",
    invalidId: "BLOCKS_INVALID_ID",
    tooSmall: "BLOCKS_GRID_TOO_SMALL",
    overlap: "BLOCKS_OVERLAP",
    argument: "BLOCKS_INVALID_ARGUMENT",
    wrongLayout: "BLOCKS_WRONG_LAYOUT",
    unknownBlock: "BLOCKS_UNKNOWN_BLOCK",
    version: "BLOCKS_LAYOUT_VERSION",
    removed: "BLOCKS_REMOVED"
  }, "every thrown error must carry its stable code");

  assert.deepEqual(v.snapshotGrid, { columns: 4, rows: 2 }, "exportLayout() must name the grid it was made for");
  assert.equal(v.freeGrid, null, "a free layout has no grid to export");
  assert.deepEqual(v.check.ok, { ok: true, code: null, message: null, unknownIds: ["vreemd"], missingIds: ["twee"] }, "checkLayout() must name skipped and appended ids");
  assert.equal(v.check.tooSmall.ok, false, "checkLayout() must refuse what restoreLayout() refuses");
  assert.equal(v.check.tooSmall.code, "BLOCKS_GRID_TOO_SMALL", "checkLayout() must give the refusal code");
  assert.equal(v.check.garbage.code, "BLOCKS_LAYOUT_VERSION", "checkLayout() must not throw on something that is no snapshot");
  assert.equal(v.check.untouched, true, "checkLayout() must not change the layout");
  assert.deepEqual(v.restoreReportsUnknown, ["vreemd"], "restoreLayout() must report the ids it skips");
  assert.equal(v.roundTrip, true, "exportLayout() must restore through restoreLayout(snapshot, { grid: snapshot.grid })");

  assert.deepEqual(v.batch, {
    returned: "klaar",
    count: 1,
    type: "batch",
    ids: ["een", "twee"],
    inner: ["layout", "minimize", "restore"],
    applied: [1, 1]
  }, "batch() must apply at once and publish one change that carries the held events");
  assert.deepEqual(v.batchAfterThrow, ["batch"], "a batch that throws must still publish what happened");
  assert.equal(v.eventsFlowAgain, "layout", "events must flow normally again after a batch");

  assert.deepEqual(v.destroyPlain, {
    events: 0,
    children: 0,
    surfaceClass: false,
    marker: false,
    fieldGone: null,
    blocksLeft: 0,
    controllerDead: "BLOCKS_REMOVED"
  }, "destroy() must remove the blocks, release the field and stay silent");
  assert.equal(v.reusable, true, "a destroyed system must be usable again");

  assert.deepEqual(v.hydrated, { field: true, searchBound: true, results: 1, byId: "Een" }, "the hydrated page must be live before destroy()");
  assert.deepEqual(v.destroyHydrated, {
    sourceBack: true,
    noField: null,
    noFootnoteFooter: null,
    noResults: 0,
    itemsVisible: true,
    notReady: null,
    inputFree: null
  }, "destroy() must give a hydrated page its original HTML back and undo bindSearch()");
  assert.deepEqual(v.rehydrated, { field: true, blocks: ["blok-a", "blok-b"] }, "a destroyed page must hydrate again");

  assert.deepEqual(v.hydrateReason, { result: null, code: "BLOCKS_HYDRATE_NO_BLOCKS" }, "hydrate() must say why it returns null");
  assert.deepEqual(v.searchReason, { result: false, code: "BLOCKS_SEARCH_NO_INPUT" }, "bindSearch() must say why it returns false");

  browser.assertNoPageErrors();
  console.log("blocks.system lifecycle — blocks opvragen, title en layout, foutcodes, onIssue, momentopname met raster, checkLayout, batch en destroy OK");
} finally {
  await browser.close();
}
