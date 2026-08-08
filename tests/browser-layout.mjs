import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await startBrowserHarness(root);
const { pageUrl, protocol } = browser;

async function measureHome(width, height, dpr = 1) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false
  });
  const expression = `(async function () {
    for (let attempt = 0; attempt < 60 && !document.querySelector("#home-board")?.dataset.homeReady; attempt += 1) {
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
    }
    await document.fonts.ready;
    window.dispatchEvent(new Event("resize"));
    await new Promise(function (resolveFrame) {
      requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
    });
    window.scrollTo(0, 0);
    const field = document.querySelector("#home-board");
    const fieldRect = field.getBoundingClientRect();
    const objects = Array.from(field.querySelectorAll(":scope > .blocks-system-object"));
    const title = field.querySelector(".home-title");
    const titleContent = title.closest(".blocks-system-content");
    const titleRect = title.getBoundingClientRect();
    const titleContentRect = titleContent.getBoundingClientRect();
    const intro = field.querySelector(".home-intro");
    const introBlockRect = intro.closest(".blocks-system-object").getBoundingClientRect();
    const introObject = intro.querySelector(".home-intro-object");
    const introRect = intro.getBoundingClientRect();
    const introObjectRect = introObject.getBoundingClientRect();
    const introObjectStyle = getComputedStyle(introObject);
    const introMetricsContext = document.createElement("canvas").getContext("2d");
    introMetricsContext.font = introObjectStyle.font;
    const introTextMetrics = introMetricsContext.measureText(introObject.textContent);
    const introSequence = intro.querySelector(".home-intro-sequence");
    const titleBlockRect = title.closest(".blocks-system-object").getBoundingClientRect();
    const photoFrame = field.querySelector(".home-photo");
    const photoBlockRect = photoFrame.closest(".blocks-system-object").getBoundingClientRect();
    const photoImage = photoFrame.querySelector("img");
    const fieldStyle = getComputedStyle(field);
    return {
      blockCount: objects.length,
      columnCount: fieldStyle.gridTemplateColumns.split(" ").length,
      gridWidth: field.clientWidth - parseFloat(fieldStyle.paddingLeft) - parseFloat(fieldStyle.paddingRight),
      columnGap: parseFloat(fieldStyle.columnGap),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      backgroundImage: getComputedStyle(field).backgroundImage,
      draggable: field.dataset.draggable,
      devicePixelRatio: window.devicePixelRatio,
      nestedSurfaces: field.querySelectorAll(".blocks-system-surface").length,
      menuActionCount: field.querySelectorAll(".blocks-system-minimize, .blocks-system-close").length,
      outsideBoard: objects.filter(function (block) {
        const rect = block.getBoundingClientRect();
        return rect.left < fieldRect.left - 0.5 || rect.right > fieldRect.right + 0.5;
      }).map(function (block) { return block.dataset.blockObject; }),
      nonIntegerHorizontalGeometry: objects.filter(function (block) {
        const rect = block.getBoundingClientRect();
        return [rect.left - fieldRect.left, rect.right - fieldRect.left, rect.width].some(function (value) {
          return Math.abs(value - Math.round(value)) > 0.01;
        });
      }).map(function (block) { return block.dataset.blockObject; }),
      clippedContent: objects.filter(function (block) {
        const content = block.querySelector(".blocks-system-content");
        const child = content.firstElementChild;
        return child && (child.scrollWidth > content.clientWidth + 1 || child.scrollHeight > content.clientHeight + 1);
      }).map(function (block) { return block.dataset.blockObject; }),
      ids: objects.map(function (block) { return block.dataset.blockObject; }),
      menuTitles: objects.map(function (block) { return block.querySelector(".blocks-system-title").textContent; }),
      title: {
        text: title.textContent,
        fontFamily: getComputedStyle(title).fontFamily,
        whiteSpace: getComputedStyle(title).whiteSpace,
        leftOffset: titleRect.left - titleContentRect.left
      },
      photo: {
        blockLeft: photoBlockRect.left,
        blockTop: photoBlockRect.top,
        blockWidth: photoBlockRect.width,
        blockHeight: photoBlockRect.height,
        titleBlockRight: titleBlockRect.right,
        titleBlockTop: titleBlockRect.top,
        titleBlockHeight: titleBlockRect.height,
        source: new URL(photoImage.src).pathname,
        alt: photoImage.alt,
        fit: getComputedStyle(photoImage).objectFit
      },
      intro: {
        blockWidth: introBlockRect.width,
        text: intro.textContent.replace(/\\s+/g, " ").trim(),
        object: introObject.textContent,
        objectWhiteSpace: introObjectStyle.whiteSpace,
        objectTextBoxTrim: introObjectStyle.getPropertyValue("text-box-trim"),
        objectTextBoxEdge: introObjectStyle.getPropertyValue("text-box-edge"),
        objectLineBoxHeight: introObjectRect.height,
        objectInkHeight: introTextMetrics.actualBoundingBoxAscent + introTextMetrics.actualBoundingBoxDescent,
        objectBottomSpace: introRect.bottom - introObjectRect.bottom,
        objectPaintedBottomSpace: introRect.bottom - introObjectRect.bottom - Math.max(0, introObject.scrollHeight - introObject.clientHeight),
        sequence: introSequence.textContent,
        href: intro.querySelector("a").getAttribute("href")
      }
    };
  })()`;
  const result = await protocol.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureUserColor() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?user-color-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;inset:auto auto 0 0;width:200px;height:120px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({
          snap: true,
          draggable: false,
          colorArray: ["yellow"],
          colorVariation: 1,
          inversionVariation: 0,
          random: function () { return 0.5; }
        });
        blocks.attach(field);
        const content = document.createElement("span");
        content.textContent = "proof";
        const block = blocks.add(content, {
          id: "user-color-proof",
          title: "proof",
          menu: true
        });
        const lightDirect = blocks.add("light", {
          id: "light-direct-color-proof",
          title: "light",
          menu: true,
          variant: "regular"
        });
        lightDirect.color = "cyan";
        const darkDirect = blocks.add("dark", {
          id: "dark-direct-color-proof",
          title: "dark",
          menu: true,
          variant: "regular"
        });
        darkDirect.color = "#222";
        blocks.colorArray = ["#222"];
        const darkArray = blocks.add("dark array", {
          id: "dark-array-color-proof",
          title: "dark array",
          menu: true
        });
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const objectStyle = getComputedStyle(block.element);
        const menuStyle = getComputedStyle(block.element.querySelector(".blocks-system-menu"));
        const contentStyle = getComputedStyle(block.content);
        const lightDirectMenuColor = getComputedStyle(lightDirect.element.querySelector(".blocks-system-menu")).color;
        const darkDirectMenuColor = getComputedStyle(darkDirect.element.querySelector(".blocks-system-menu")).color;
        const darkArrayMenuColor = getComputedStyle(darkArray.element.querySelector(".blocks-system-menu")).color;
        lightDirect.color = "";
        return {
          variant: block.variant,
          dataBlockColor: block.element.getAttribute("data-block-color"),
          objectBackground: objectStyle.backgroundColor,
          objectColor: objectStyle.color,
          borderColor: objectStyle.borderColor,
          menuBackground: menuStyle.backgroundColor,
          menuColor: menuStyle.color,
          contentBackground: contentStyle.backgroundColor,
          contentColor: contentStyle.color,
          lightDirectMenuColor,
          lightDirectRestoredMenuColor: getComputedStyle(lightDirect.element.querySelector(".blocks-system-menu")).color,
          darkDirectMenuColor,
          darkArrayMenuColor
        };
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureCompactLayout() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?compact-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:120px;height:360px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({
          snap: true,
          draggable: false,
          variant: "regular"
        });
        const changes = [];
        field.addEventListener("blocks:change", function (event) {
          changes.push(event.detail);
        });
        blocks.attach(field).setGrid(1, 6);
        blocks.add("first", { id: "compact-first" }).place(1, 1);
        blocks.add("second", { id: "compact-second" }).place(1, 3);
        blocks.add("third", { id: "compact-third" }).span(1, 2).place(1, 5);
        blocks.compact();
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const objects = Array.from(field.querySelectorAll(":scope > .blocks-system-object"));
        return {
          rows: objects.map(function (block) { return block.style.getPropertyValue("--block-row"); }),
          columns: objects.map(function (block) { return block.style.getPropertyValue("--block-column"); }),
          gridRows: field.style.getPropertyValue("--blocks-rows"),
          change: changes[0],
          rects: objects.map(function (block) {
            const rect = block.getBoundingClientRect();
            return { left: rect.left, top: rect.top, height: rect.height };
          })
        };
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureCompactOrderPreservation() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?compact-order-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:120px;height:360px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({
          snap: true,
          draggable: false,
          variant: "regular"
        });
        blocks.attach(field).setGrid(1, 6);
        blocks.add("lower", { id: "compact-order-lower" }).place(1, 4);
        blocks.add("upper", { id: "compact-order-upper" }).place(1, 1);
        blocks.compact();
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const objects = Array.from(field.querySelectorAll(":scope > .blocks-system-object"));
        const rowsById = Object.fromEntries(objects.map(function (block) {
          return [block.dataset.blockObject, block.style.getPropertyValue("--block-row")];
        }));
        const rectsById = Object.fromEntries(objects.map(function (block) {
          const rect = block.getBoundingClientRect();
          return [block.dataset.blockObject, { top: rect.top, left: rect.left }];
        }));
        return {
          domOrder: objects.map(function (block) { return block.dataset.blockObject; }),
          rowsById,
          rectsById
        };
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureCompactSpanOrderPreservation() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?compact-span-order-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:240px;height:600px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({
          snap: true,
          draggable: false,
          variant: "regular"
        });
        blocks.attach(field).setGrid(2, 5);
        blocks.add("left blocker", { id: "compact-span-left-blocker" }).place(1, 1);
        blocks.add("wide", { id: "compact-span-wide" }).span(2, 1).place(1, 2);
        blocks.add("right lower", { id: "compact-span-right-lower" }).place(2, 3);
        blocks.compact();
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const objects = Array.from(field.querySelectorAll(":scope > .blocks-system-object"));
        return Object.fromEntries(objects.map(function (block) {
          return [block.dataset.blockObject, block.style.getPropertyValue("--block-row")];
        }));
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureCloseCollapse() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?close-collapse-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:120px;height:360px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({ snap: true, draggable: false, variant: "regular" });
        const changes = [];
        field.addEventListener("blocks:change", function (event) { changes.push(event.detail); });
        blocks.attach(field).setGrid(1, 6);
        blocks.add("top", { id: "close-collapse-top" }).place(1, 1);
        const gap = blocks.add("gap", { id: "close-collapse-gap", title: "gap", menu: { close: true } }).place(1, 2);
        blocks.add("lower", { id: "close-collapse-lower" }).place(1, 4);
        gap.element.querySelector(".blocks-system-close").click();
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const rows = Object.fromEntries(Array.from(field.querySelectorAll(":scope > .blocks-system-object")).map(function (block) {
          return [block.dataset.blockObject, block.style.getPropertyValue("--block-row")];
        }));
        return { rows, change: changes[0] };
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measurePointerCaptureFallback() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?pointer-capture-fallback-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:240px;height:240px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({ snap: false, variant: "regular" });
        blocks.attach(field);
        const block = blocks.add("drag", { id: "pointer-fallback-block", title: "drag", menu: true });
        const handle = block.element.querySelector(".blocks-system-title");
        Object.defineProperty(handle, "setPointerCapture", { configurable: true, value: undefined });
        const bounds = handle.getBoundingClientRect();
        const pointer = { bubbles: true, cancelable: true, button: 0, pointerId: 41, clientX: bounds.left + 4, clientY: bounds.top + 4 };
        handle.dispatchEvent(new PointerEvent("pointerdown", pointer));
        const afterDown = field.getAttribute("data-dragging");
        window.dispatchEvent(new PointerEvent("pointerup", pointer));
        return {
          afterDown,
          afterUpDragging: field.hasAttribute("data-dragging"),
          stillDragging: block.element.classList.contains("is-dragging")
        };
      } finally {
        field.remove();
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function hoverSignature() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(() => {
      const field = document.querySelector("#home-board");
      const block = document.querySelector('[data-block-object="home-title"]');
      const style = getComputedStyle(block);
      return {
        fieldHeight: field.getBoundingClientRect().height,
        gridTemplateRows: getComputedStyle(field).gridTemplateRows,
        blocks: Array.from(field.querySelectorAll(".blocks-system-object")).map(function (item) {
          const rect = item.getBoundingClientRect();
          return [item.dataset.blockObject, rect.left, rect.top, rect.width, rect.height];
        }),
        canvasVisual: {
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
          boxShadow: style.boxShadow,
          transform: style.transform
        }
      };
    })()`,
    returnByValue: true
  });
  return result.result.value;
}

async function navigateTo(url) {
  const loaded = protocol.once("Page.loadEventFired");
  await protocol.send("Page.navigate", { url });
  await loaded;
}

async function exerciseBlockActions(boardSelector) {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const board = document.querySelector(${JSON.stringify(boardSelector)});
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const block = objects[0];
      const content = block.querySelector(":scope > .blocks-system-content");
      const minimize = block.querySelector(":scope > .blocks-system-menu .blocks-system-minimize");
      const close = block.querySelector(":scope > .blocks-system-menu .blocks-system-close");
      const initial = {
        blockCount: objects.length,
        minimizeCount: board.querySelectorAll(".blocks-system-minimize").length,
        closeCount: board.querySelectorAll(".blocks-system-close").length,
        minimizeLabel: minimize?.getAttribute("aria-label") || null,
        closeLabel: close?.getAttribute("aria-label") || null
      };
      minimize.click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      const minimized = {
        state: block.getAttribute("data-block-minimized"),
        contentHidden: content.getAttribute("aria-hidden"),
        pressed: minimize.getAttribute("aria-pressed"),
        symbol: minimize.textContent
      };
      minimize.click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      const restored = {
        state: block.getAttribute("data-block-minimized"),
        contentHidden: content.getAttribute("aria-hidden"),
        pressed: minimize.getAttribute("aria-pressed"),
        symbol: minimize.textContent
      };
      const removedId = block.dataset.blockObject;
      close.click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      return {
        initial,
        minimized,
        restored,
        removedId,
        blockCountAfterClose: board.querySelectorAll(":scope > .blocks-system-object").length,
        removedFromDom: !board.querySelector('[data-block-object="' + removedId + '"]')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

function assertBlockActions(state, page, expectedBlockCount, expectedMinimizeCount = expectedBlockCount, expectedCloseCount = expectedBlockCount) {
  const { minimizeLabel, closeLabel, ...initialCounts } = state.initial;
  assert.deepEqual(initialCounts, {
    blockCount: expectedBlockCount,
    minimizeCount: expectedMinimizeCount,
    closeCount: expectedCloseCount
  }, `${page} toont niet op elk block beide toegankelijke acties`);
  assert.match(minimizeLabel, / minimize$/, `${page} benoemt de minimaliseeractie niet toegankelijk`);
  assert.match(closeLabel, / close$/, `${page} benoemt de sluitactie niet toegankelijk`);
  assert.deepEqual(state.minimized, {
    state: "true",
    contentHidden: "true",
    pressed: "true",
    symbol: "+"
  }, `${page} minimaliseert het block niet volledig`);
  assert.deepEqual(state.restored, {
    state: "false",
    contentHidden: "false",
    pressed: "false",
    symbol: "−"
  }, `${page} herstelt het block niet volledig`);
  assert.equal(state.blockCountAfterClose, expectedBlockCount - 1, `${page} verwijdert geen block met sluiten`);
  assert.equal(state.removedFromDom, true, `${page} laat het gesloten block in de DOM staan`);
}

async function measureMainNavigation() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(() => {
      const navbar = document.querySelector("#navbar");
      const toggle = navbar.querySelector(".nav-hamburger");
      const navigation = navbar.querySelector(".nav-links");
      const links = Array.from(navigation.querySelectorAll(":scope > li > a"));
      const topbar = document.querySelector(".example-topbar");
      return {
        labels: links.map(function (link) { return link.textContent.trim(); }),
        fragmentLinks: links.filter(function (link) { return link.getAttribute("href").includes("#"); }).map(function (link) { return link.getAttribute("href"); }),
        current: links.filter(function (link) { return link.getAttribute("aria-current") === "page"; }).map(function (link) { return link.textContent.trim(); }),
        navigationCount: document.querySelectorAll("nav").length,
        controlsTarget: document.getElementById(toggle.getAttribute("aria-controls")) === navigation,
        navbarBottom: navbar.getBoundingClientRect().bottom,
        contentTop: topbar ? topbar.getBoundingClientRect().top : null,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    })()`,
    returnByValue: true
  });
  return result.result.value;
}

function assertMainNavigation(state, page, current = null) {
  assert.deepEqual(state.labels, ["home", "manual", "reference", "source"], `${page} gebruikt niet dezelfde menuvolgorde als index`);
  assert.deepEqual(state.fragmentLinks, [], `${page} gebruikt nog fragmentlinks in het hoofdmenu`);
  assert.deepEqual(state.current, current ? [current] : [], `${page} markeert niet exact de echte huidige pagina`);
  assert.equal(state.navigationCount, 1, `${page} bevat meer dan één navigatielandmark`);
  assert.equal(state.controlsTarget, true, `${page} koppelt de hamburger niet aan het gedeelde menu`);
  assert.ok(state.horizontalOverflow <= 0.5, `${page} krijgt horizontale overflow door het gedeelde menu`);
}

async function measureManual(width, height, dpr = 1) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false
  });
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && (!document.querySelector("#manual-board")?.dataset.manualReady || !document.querySelector("#eli10-schema canvas")); attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      window.dispatchEvent(new Event("resize"));
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      window.scrollTo(0, 0);
      const board = document.querySelector("#manual-board");
      const boardRect = board.getBoundingClientRect();
      const mastheadRect = document.querySelector(".manual-masthead").getBoundingClientRect();
      const mastheadTitle = document.querySelector(".manual-masthead h1");
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const eli10Block = board.querySelector('[data-block-object="manual-eli10"]');
      const eli10 = eli10Block.querySelector(".manual-eli10");
      const eli10BlockRect = eli10Block.getBoundingClientRect();
      const eli10Canvas = eli10.querySelector("canvas");
      const eli10CanvasRect = eli10Canvas.getBoundingClientRect();
      const contentOptions = ["manual-content-html", "manual-content-object", "manual-content-factory"].map(function (id) {
        const blockRect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
        return {
          id,
          blockTop: blockRect.top,
          blockWidth: blockRect.width
        };
      });
      const startBlockRect = board.querySelector('[data-block-object="manual-start"]').getBoundingClientRect();
      const finishBlockRect = board.querySelector('[data-block-object="manual-finish"]').getBoundingClientRect();
      const trustedDemo = board.querySelector(".manual-content-html-demo");
      const imageDemo = board.querySelector(".manual-content-image-demo");
      const image = imageDemo.querySelector("img");
      const factoryDemo = board.querySelector(".manual-content-factory-demo");
      const factoryButton = factoryDemo.querySelector("button");
      const chapterIds = ["start", "content", "menu", "layout", "appearance", "colors", "chance", "next"];
      const chapterGaps = chapterIds.map(function (id) {
        const block = document.getElementById(id);
        const previous = block.previousElementSibling;
        return {
          id,
          gap: block.getBoundingClientRect().top - previous.getBoundingClientRect().bottom,
          marginTop: parseFloat(getComputedStyle(block).marginTop)
        };
      });
      const codeBlockWidths = Array.from(board.querySelectorAll(":scope > .manual-code-block"), function (block) {
        return { id: block.dataset.blockObject, width: block.getBoundingClientRect().width };
      });
      const colorBlockStyles = ["manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random-color-50", "manual-random-color-100", "manual-random-mix-1", "manual-random-mix-2"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const objectStyle = getComputedStyle(block);
        const menuStyle = getComputedStyle(block.querySelector(":scope > .blocks-system-menu"));
        const contentStyle = getComputedStyle(block.querySelector(":scope > .blocks-system-content"));
        return {
          border: objectStyle.borderColor,
          objectBackground: objectStyle.backgroundColor,
          menuBackground: menuStyle.backgroundColor,
          menuColor: menuStyle.color,
          contentBackground: contentStyle.backgroundColor,
          contentColor: contentStyle.color
        };
      });
      const randomExamples = [
        "manual-random-color-0", "manual-random-color-50", "manual-random-color-100",
        "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100",
        "manual-random-mix-1", "manual-random-mix-2", "manual-random-mix-3", "manual-random-mix-4"
      ].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const lesson = block.querySelector(":scope > .blocks-system-content > .manual-chance-cell");
        return {
          statement: lesson.querySelector("strong").textContent
        };
      });
      function measureMiniGrid(ids) {
        return ids.map(function (id) {
          const rect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
          return { id, left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height };
        });
      }
      const randomMiniGrids = {
        color: measureMiniGrid(["manual-random-color-0", "manual-random-color-50", "manual-random-color-100"]),
        inverse: measureMiniGrid(["manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100"]),
        combined: measureMiniGrid(["manual-random-mix-1", "manual-random-mix-2", "manual-random-mix-3", "manual-random-mix-4"])
      };
      const menuExamples = ["manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        return {
          id,
          actions: Array.from(block.querySelectorAll(":scope > .blocks-system-menu button"), function (button) {
            return button.classList.contains("blocks-system-minimize") ? "minimize" : "close";
          })
        };
      });
      const textOverlaps = objects.flatMap(function (block) {
        const lesson = block.querySelector(":scope > .blocks-system-content > .manual-lesson");
        if (!lesson) return [];
        const children = Array.from(lesson.children).filter(function (child) {
          const style = getComputedStyle(child);
          return style.display !== "none" && style.visibility !== "hidden";
        });
        const overlaps = [];
        for (let firstIndex = 0; firstIndex < children.length; firstIndex += 1) {
          const first = children[firstIndex].getBoundingClientRect();
          for (let secondIndex = firstIndex + 1; secondIndex < children.length; secondIndex += 1) {
            const second = children[secondIndex].getBoundingClientRect();
            const overlapX = Math.min(first.right, second.right) - Math.max(first.left, second.left);
            const overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
            if (overlapX > 1 && overlapY > 1) overlaps.push(block.dataset.blockObject);
          }
        }
        return overlaps;
      });
      const firstHandle = objects[0].querySelector(":scope > .blocks-system-menu > .blocks-system-title");
      return {
        blockCount: objects.length,
        ids: objects.map(function (block) { return block.dataset.blockObject; }),
        menuTitles: Object.fromEntries(objects.map(function (block) {
          return [block.dataset.blockObject, block.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent];
        })),
        untitledIds: objects.filter(function (block) {
          return block.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent === "";
        }).map(function (block) { return block.dataset.blockObject; }),
        variants: objects.map(function (block) { return block.dataset.blockVariant; }),
        colors: objects.map(function (block) { return block.getAttribute("data-block-color"); }),
        columnCount: getComputedStyle(board).gridTemplateColumns.split(" ").length,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        documentHeight: document.documentElement.scrollHeight,
        pageScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        boardOverflowY: getComputedStyle(board).overflowY,
        boardBackgroundImage: getComputedStyle(board).backgroundImage,
        quantized: board.dataset.quantized,
        trackWidth: Number(board.dataset.trackWidth),
        nonIntegerHorizontalGeometry: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          const values = [rect.left - boardRect.left, rect.right - boardRect.left, rect.width];
          return values.some(function (value) { return Math.abs(value - Math.round(value)) > 0.01; });
        }).map(function (block) { return block.dataset.blockObject; }),
        outsideBoard: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          return rect.left < boardRect.left - 0.5 || rect.right > boardRect.right + 0.5;
        }).map(function (block) { return block.dataset.blockObject; }),
        clippedContent: objects.filter(function (block) {
          if (block.dataset.blockObject === "manual-start") return false;
          const content = block.querySelector(":scope > .blocks-system-content");
          const child = content.firstElementChild;
          return child && (child.scrollWidth > content.clientWidth + 1 || child.scrollHeight > content.clientHeight + 1);
        }).map(function (block) { return block.dataset.blockObject; }),
        nestedSurfaces: board.querySelectorAll(".blocks-system-surface").length,
        pageSurfaceCount: document.querySelectorAll(".blocks-system-surface").length,
        navigationCount: document.querySelectorAll("nav").length,
        draggable: board.dataset.draggable,
        lockedHandleState: {
          tabIndex: firstHandle.tabIndex,
          role: firstHandle.getAttribute("role"),
          ariaLabel: firstHandle.getAttribute("aria-label"),
          shortcuts: firstHandle.getAttribute("aria-keyshortcuts")
        },
        menuActionCount: board.querySelectorAll(".blocks-system-minimize, .blocks-system-close").length,
        devicePixelRatio: window.devicePixelRatio,
        codeOverflow: getComputedStyle(code).overflowX,
        scrollbarWidth: rootStyle.scrollbarWidth,
        scrollbarColor: rootStyle.scrollbarColor,
        boardWidth: boardRect.width,
        mastheadTitle: mastheadTitle.textContent,
        mastheadGap: boardRect.top - mastheadRect.bottom,
        rowHeight: parseFloat(getComputedStyle(board).gridAutoRows),
        rowGap: parseFloat(getComputedStyle(board).rowGap),
        columnGap: parseFloat(getComputedStyle(board).columnGap),
        eli10: {
          blockWidth: eli10BlockRect.width,
          blockTop: eli10BlockRect.top,
          blockRight: eli10BlockRect.right,
          blockHeight: eli10BlockRect.height,
          border: getComputedStyle(eli10Block).borderColor,
          menuBackground: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-menu")).backgroundColor,
          menuColor: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-menu")).color,
          contentBackground: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-content")).backgroundColor,
          title: eli10Block.querySelector(".blocks-system-title").textContent,
          visual: {
            role: eli10Canvas.getAttribute("role"),
            label: eli10Canvas.getAttribute("aria-label"),
            width: eli10CanvasRect.width,
            height: eli10CanvasRect.height,
            naturalWidth: eli10Canvas.width,
            naturalHeight: eli10Canvas.height,
            hostWidth: eli10.clientWidth,
            hostHeight: eli10.clientHeight
          }
        },
        startBlockBottom: startBlockRect.bottom,
        finishBlockTop: finishBlockRect.top,
        finishBlockBottom: finishBlockRect.bottom,
        contentOptions,
        contentExamples: {
          trusted: {
            tag: trustedDemo.tagName,
            text: trustedDemo.textContent.replace(/\\s+/g, " ").trim()
          },
          object: {
            tag: imageDemo.tagName,
            source: new URL(image.src).pathname,
            alt: image.alt,
            fit: getComputedStyle(image).objectFit
          },
          factory: {
            tag: factoryDemo.tagName,
            state: factoryDemo.dataset.state,
            index: factoryDemo.querySelector(".manual-factory-index").textContent,
            button: factoryButton.textContent
          }
        },
        chapterGaps,
        codeBlockWidths,
        colorBlockStyles,
        randomExamples,
        randomMiniGrids,
        menuExamples,
        textOverlaps
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseManualFactory() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(function () {
      const factory = document.querySelector(".manual-content-factory-demo");
      const index = factory.querySelector(".manual-factory-index");
      const button = factory.querySelector(".manual-factory-action");
      const beforeState = factory.dataset.state;
      const beforeIndex = index.textContent;
      button.click();
      return { beforeState, beforeIndex, afterState: factory.dataset.state, afterIndex: index.textContent };
    })()`,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseManualMenuLesson() {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateTo(`${pageUrl}docs/`);
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const board = document.querySelector("#manual-board");
      const minimizeBlock = board.querySelector('[data-block-object="manual-menu-minimize"]');
      const minimize = minimizeBlock.querySelector(".blocks-system-minimize");
      minimize.click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      const minimized = {
        state: minimizeBlock.dataset.blockMinimized,
        hidden: minimizeBlock.querySelector(":scope > .blocks-system-content").getAttribute("aria-hidden")
      };
      minimize.click();
      const restored = minimizeBlock.dataset.blockMinimized;

      const closeBlock = board.querySelector('[data-block-object="manual-menu-close"]');
      closeBlock.querySelector(".blocks-system-close").click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      return {
        minimized,
        restored,
        closeRemoved: !board.querySelector('[data-block-object="manual-menu-close"]'),
        remainingBlocks: board.querySelectorAll(":scope > .blocks-system-object").length
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function manualHoverSignature(blockId = "manual-color-cyan") {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(function () {
      const block = document.querySelector(${JSON.stringify(`[data-block-object="${blockId}"]`)});
      const handle = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
      const rect = block.getBoundingClientRect();
      const style = getComputedStyle(block);
      return {
        variant: block.dataset.blockVariant,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        borderColor: style.borderColor,
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        cursor: getComputedStyle(handle).cursor
      };
    })()`,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseManualKeyboardReorder() {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateTo(`${pageUrl}docs/`);
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const board = document.querySelector("#manual-board");
      const block = board.querySelector('[data-block-object="manual-layout-wide"]');
      const handle = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
      const beforeRow = getComputedStyle(block).getPropertyValue("--block-row").trim();
      const reorderDetails = [];
      board.addEventListener("blocks:reorder", function (event) { reorderDetails.push(event.detail); });
      handle.focus();
      const focusAcquired = document.activeElement === handle;
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      const focusAfterFirstMove = document.activeElement === handle;
      const afterFirstRow = getComputedStyle(block).getPropertyValue("--block-row").trim();
      document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      return {
        beforeRow,
        afterFirstRow,
        afterSecondRow: getComputedStyle(block).getPropertyValue("--block-row").trim(),
        focusAcquired,
        focusAfterFirstMove,
        events: reorderDetails.map(function (detail) {
          return { id: detail.id, input: detail.input, direction: detail.direction };
        })
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureReference(width, height, dpr = 1) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false
  });
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#reference-board")?.dataset.referenceReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      window.scrollTo(0, 0);
      const board = document.querySelector("#reference-board");
      const boardRect = board.getBoundingClientRect();
      const mastheadRect = document.querySelector(".reference-masthead").getBoundingClientRect();
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const firstHandle = objects[0].querySelector(":scope > .blocks-system-menu > .blocks-system-title");
      const firstTable = board.querySelector(".reference-table");
      const firstTableRow = firstTable.querySelector("tbody tr");
      const firstPurpose = firstTableRow.querySelector("td:last-child");
      return {
        blockCount: objects.length,
        ids: objects.map(function (block) { return block.dataset.blockObject; }),
        columnCount: getComputedStyle(board).gridTemplateColumns.split(" ").length,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        boardBackgroundImage: getComputedStyle(board).backgroundImage,
        quantized: board.dataset.quantized,
        trackWidth: Number(board.dataset.trackWidth),
        draggable: board.dataset.draggable,
        devicePixelRatio: window.devicePixelRatio,
        nestedSurfaces: board.querySelectorAll(".blocks-system-surface").length,
        menuActionCount: board.querySelectorAll(".blocks-system-minimize, .blocks-system-close").length,
        mastheadGap: boardRect.top - mastheadRect.bottom,
        chapterGaps: objects.slice(1).map(function (block, index) {
          return block.getBoundingClientRect().top - objects[index].getBoundingClientRect().bottom;
        }),
        outsideBoard: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          return rect.left < boardRect.left - 0.5 || rect.right > boardRect.right + 0.5;
        }).map(function (block) { return block.dataset.blockObject; }),
        nonIntegerHorizontalGeometry: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          return [rect.left - boardRect.left, rect.right - boardRect.left, rect.width].some(function (value) {
            return Math.abs(value - Math.round(value)) > 0.01;
          });
        }).map(function (block) { return block.dataset.blockObject; }),
        missingAnchors: ["exports", "options", "system-state", "system-methods", "block-controller", "add-options", "adapters", "reorder-event", "css-hooks", "errors"].filter(function (id) {
          return !document.getElementById(id);
        }),
        lockedHandleState: {
          tabIndex: firstHandle.tabIndex,
          role: firstHandle.getAttribute("role"),
          ariaLabel: firstHandle.getAttribute("aria-label"),
          shortcuts: firstHandle.getAttribute("aria-keyshortcuts")
        },
        tableOverflowModes: Array.from(board.querySelectorAll(".reference-table-wrap"))
          .map(function (node) { return getComputedStyle(node).overflow; }),
        localOverflowModes: Array.from(board.querySelectorAll(".reference-code"))
          .map(function (node) { return getComputedStyle(node).overflow; }),
        fullWidthDifferences: objects.map(function (block) {
          const style = getComputedStyle(board);
          return Math.abs(block.getBoundingClientRect().width - (boardRect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)));
        }),
        table: {
          fontSize: getComputedStyle(firstTable).fontSize,
          rowDisplay: getComputedStyle(firstTableRow).display,
          purposeFontSize: getComputedStyle(firstPurpose).fontSize
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseMobileNavigation() {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateTo(`${pageUrl}docs/`);
  const mobileResult = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const navbar = document.querySelector("#navbar");
      const toggle = navbar.querySelector(".nav-hamburger");
      const navigation = navbar.querySelector(".nav-links");
      const state = function () {
        return {
          open: navbar.classList.contains("nav-open"),
          expanded: toggle.getAttribute("aria-expanded"),
          label: toggle.getAttribute("aria-label")
        };
      };

      toggle.click();
      const opened = state();
      const controlsTarget = document.getElementById(toggle.getAttribute("aria-controls")) === navigation;

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      const escaped = { ...state(), focusReturned: document.activeElement === toggle };

      toggle.click();
      document.querySelector(".manual-main").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const outside = state();

      toggle.click();
      return { opened, controlsTarget, escaped, outside, beforeResize: state() };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false
  });
  const desktopResult = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      const navbar = document.querySelector("#navbar");
      const toggle = navbar.querySelector(".nav-hamburger");
      return {
        open: navbar.classList.contains("nav-open"),
        expanded: toggle.getAttribute("aria-expanded"),
        label: toggle.getAttribute("aria-label")
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  return { ...mobileResult.result.value, afterResize: desktopResult.result.value };
}

try {
  const viewportMatrix = [
    [1440, 1000, 6, 6],
    [1280, 900, 6, 6],
    [1024, 900, 6, 6],
    [800, 900, 3, 3],
    [390, 844, 3, 1],
    [320, 720, 3, 1]
  ];
  const manualViewportMatrix = [[1920, 1080, 6, 6], ...viewportMatrix];
  assertMainNavigation(await measureMainNavigation(), "home", "home");
  for (const [width, height, homeColumns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const home = await measureHome(width, height, dpr);
      assert.equal(home.blockCount, 3, `home toont ${home.blockCount} in plaats van drie directe blocks op ${width}px @${dpr}x`);
      assert.equal(home.columnCount, homeColumns, `home gebruikt ${home.columnCount} in plaats van ${homeColumns} kolommen op ${width}px @${dpr}x`);
      assert.equal(home.devicePixelRatio, dpr, `home test niet werkelijk op DPR ${dpr}`);
      assert.ok(home.horizontalOverflow <= 0.5, `home heeft ${home.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.match(home.backgroundImage, /linear-gradient/, `home toont zijn constructieve raster niet op ${width}px @${dpr}x`);
      assert.equal(home.draggable, "true", `home start niet versleepbaar op ${width}px @${dpr}x`);
      assert.equal(home.nestedSurfaces, 0, `home bevat ${home.nestedSurfaces} geneste blocks-grids op ${width}px @${dpr}x`);
      assert.equal(home.menuActionCount, 6, `home toont niet op elk block minimaliseren en sluiten op ${width}px @${dpr}x`);
      assert.deepEqual(home.outsideBoard, [], `home plaatst blocks buiten het board op ${width}px @${dpr}x: ${home.outsideBoard.join(", ")}`);
      assert.deepEqual(home.clippedContent, [], `home knipt inhoud af op ${width}px @${dpr}x: ${home.clippedContent.join(", ")}`);
      assert.deepEqual(home.ids, ["home-title", "home-photo", "home-intro"], `home bewaart titel, foto en actie niet in leesvolgorde op ${width}px @${dpr}x`);
      assert.deepEqual(home.menuTitles, ["", "", ""], `home toont nog zichtbare blocktitels op ${width}px @${dpr}x`);
      assert.equal(home.title.text.trim(), "blocks.\nsystem.", `home verliest zijn canonieke titel op ${width}px @${dpr}x`);
      assert.match(home.title.fontFamily, /Instrument Sans/, `home gebruikt Instrument Sans niet voor de hoofdboodschap op ${width}px @${dpr}x`);
      assert.equal(home.title.whiteSpace, "pre-line", `home bewaart de titelregeleinde niet op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.title.leftOffset) <= 0.5, `home lijnt de hero-titel niet links uit op ${width}px @${dpr}x: ${home.title.leftOffset}px`);
      assert.equal(home.columnGap, 6, `home erft niet de standaardafstand van 6px op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.photo.blockLeft - home.photo.titleBlockRight - home.columnGap) <= 0.5, `home bewaart de standaardafstand niet tussen titel en foto op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.photo.blockTop - home.photo.titleBlockTop) <= 0.5, `home lijnt titel- en fotoblock niet bovenaan uit op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.photo.blockHeight - home.photo.titleBlockHeight) <= 0.5, `home maakt het fotoblock niet dezelfde drie rijen hoog als de hero op ${width}px @${dpr}x`);
      const expectedColumnWidth = (home.gridWidth - (homeColumns - 1) * home.columnGap) / homeColumns;
      assert.ok(Math.abs(home.photo.blockWidth - expectedColumnWidth) <= 1, `home geeft de foto niet exact één rasterkolom op ${width}px @${dpr}x`);
      assert.ok(home.photo.source.endsWith("/docs/img/pexels-peter-dyllong-2158803154-37466849.jpg"), `home laadt niet de gekozen foto op ${width}px @${dpr}x`);
      assert.equal(home.photo.alt, "Black-and-white landscape with a solitary tree beneath large clouds.", `home foto mist bruikbare alttekst op ${width}px @${dpr}x`);
      assert.equal(home.photo.fit, "cover", `home foto vult zijn block niet op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.intro.blockWidth - (expectedColumnWidth * 2 + home.columnGap)) <= 1, `home geeft de objectboodschap niet twee rasterkolommen op ${width}px @${dpr}x`);
      assert.equal(home.intro.object, "object.", `home maakt object niet tot de visuele hoofdboodschap op ${width}px @${dpr}x`);
      assert.equal(home.intro.objectWhiteSpace, "nowrap", `home kan object. afbreken op ${width}px @${dpr}x`);
      if (home.intro.objectTextBoxTrim === "trim-both") {
        assert.equal(home.intro.objectTextBoxEdge, "cap alphabetic", `home gebruikt niet de gevraagde text-box-rand voor object. op ${width}px @${dpr}x`);
        assert.ok(home.intro.objectLineBoxHeight > 0, `home verliest de getrimde typografische box van object. op ${width}px @${dpr}x`);
      } else {
        assert.ok(home.intro.objectLineBoxHeight + 1 >= home.intro.objectInkHeight, `home geeft object. geen volledige regelbox op ${width}px @${dpr}x: ${home.intro.objectLineBoxHeight}px voor ${home.intro.objectInkHeight}px inkt`);
      }
      const minimumObjectBottomSpace = home.intro.objectTextBoxTrim === "trim-both" ? 4 : 8;
      assert.ok(home.intro.objectPaintedBottomSpace >= minimumObjectBottomSpace, `home geeft de zichtbare inkt van object. minder dan ${minimumObjectBottomSpace}px onderruimte op ${width}px @${dpr}x: ${home.intro.objectPaintedBottomSpace}px`);
      assert.equal(home.intro.sequence, "add · span · place", `home spreekt de werkwoordentaal van het systeem niet op ${width}px @${dpr}x`);
      assert.match(home.intro.text, /your content becomes an object\./, `home legt de overgang van inhoud naar object niet uit op ${width}px @${dpr}x`);
      assert.equal(home.intro.href, "docs/", `home verwijst niet rechtstreeks naar de manual op ${width}px @${dpr}x`);
    }
  }

  const shortHome = await measureHome(826, 395);
  assert.equal(shortHome.clippedContent.includes("home-intro"), false, "object / start mag op de aangeleverde lage probleemmaat geen inhoud afsnijden");
  assert.equal(shortHome.intro.objectWhiteSpace, "nowrap", "object. moet op de aangeleverde lage probleemmaat één woord blijven");
  const minimumShortObjectBottomSpace = shortHome.intro.objectTextBoxTrim === "trim-both" ? 4 : 8;
  assert.ok(shortHome.intro.objectPaintedBottomSpace >= minimumShortObjectBottomSpace, `object. heeft op de aangeleverde lage probleemmaat maar ${shortHome.intro.objectPaintedBottomSpace}px zichtbare onderruimte`);

  const userColor = await measureUserColor();
  assert.deepEqual(userColor, {
    variant: "color",
    dataBlockColor: "yellow",
    objectBackground: "rgb(239, 238, 232)",
    objectColor: "rgb(20, 20, 15)",
    borderColor: "rgb(255, 255, 0)",
    menuBackground: "rgb(255, 255, 0)",
    menuColor: "rgb(0, 0, 0)",
    contentBackground: "rgba(0, 0, 0, 0)",
    contentColor: "rgb(20, 20, 15)",
    lightDirectMenuColor: "rgb(0, 0, 0)",
    lightDirectRestoredMenuColor: "rgb(239, 238, 232)",
    darkDirectMenuColor: "rgb(239, 238, 232)",
    darkArrayMenuColor: "rgb(239, 238, 232)"
  }, "een kleur uit de gebruikersarray moet alleen het blockkader en menu kleuren en de inhoud neutraal laten");

  const compactLayout = await measureCompactLayout();
  assert.deepEqual(compactLayout.rows, ["1", "2", "3"], "compact() vult verticale gaten niet in echte Chromium-layout");
  assert.deepEqual(compactLayout.columns, ["1", "1", "1"], "compact() mag blocks niet naar een andere kolom verplaatsen");
  assert.equal(compactLayout.gridRows, "6", "compact() mag de ingestelde gridhoogte niet stilzwijgend verkleinen");
  assert.deepEqual(compactLayout.change, {
    type: "compact",
    id: null,
    ids: ["compact-second", "compact-third"]
  }, "compact() publiceert niet welke blocks verplaatst zijn");
  assert.ok(compactLayout.rects[0].top < compactLayout.rects[1].top && compactLayout.rects[1].top < compactLayout.rects[2].top, "compact() levert geen oplopende visuele rijvolgorde op");
  assert.ok(compactLayout.rects.every(function (rect) { return Math.abs(rect.left - compactLayout.rects[0].left) <= 0.5; }), "compact() bewaart geen vaste kolom in de echte layout");
  assert.ok(compactLayout.rects[2].height > compactLayout.rects[1].height, "compact() bewaart de spanhoogte niet in de echte layout");

  const compactOrder = await measureCompactOrderPreservation();
  assert.deepEqual(compactOrder.domOrder, ["compact-order-lower", "compact-order-upper"], "de regressieprobe moet het lagere block eerst in DOM-volgorde zetten");
  assert.deepEqual(compactOrder.rowsById, {
    "compact-order-lower": "2",
    "compact-order-upper": "1"
  }, "compact() mag de bestaande visuele volgorde in dezelfde kolom niet omdraaien");
  assert.ok(
    compactOrder.rectsById["compact-order-upper"].top < compactOrder.rectsById["compact-order-lower"].top,
    "compact() moet het oorspronkelijk bovenste block ook visueel boven houden"
  );
  assert.ok(
    Math.abs(compactOrder.rectsById["compact-order-upper"].left - compactOrder.rectsById["compact-order-lower"].left) <= 0.5,
    "compact() moet de kolom behouden terwijl de volgorde behouden blijft"
  );

  assert.deepEqual(await measureCompactSpanOrderPreservation(), {
    "compact-span-left-blocker": "1",
    "compact-span-wide": "2",
    "compact-span-right-lower": "3"
  }, "compact() mag een lager block niet boven een ouder breed block in een gedeelde kolom zetten");

  const closeCollapse = await measureCloseCollapse();
  assert.deepEqual(closeCollapse.rows, {
    "close-collapse-top": "1",
    "close-collapse-lower": "2"
  }, "de ×-knop moet een later block in de vrijgekomen rasterplaats laten klappen");
  assert.deepEqual(closeCollapse.change, {
    type: "remove",
    id: "close-collapse-gap",
    ids: ["close-collapse-gap", "close-collapse-lower"]
  }, "een close-event moet ook melden welk block in de vrijgekomen plaats is geklapt");

  assert.deepEqual(await measurePointerCaptureFallback(), {
    afterDown: "pointer-fallback-block",
    afterUpDragging: false,
    stillDragging: false
  }, "een drag zonder pointer capture moet op een pointerup buiten het veld stoppen");

  await measureHome(1280, 900);
  const beforeHover = await hoverSignature();
  const documentNode = await protocol.send("DOM.getDocument");
  const titleNode = await protocol.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: '[data-block-object="home-title"]'
  });
  await protocol.send("CSS.forcePseudoState", {
    nodeId: titleNode.nodeId,
    forcedPseudoClasses: ["hover"]
  });
  const afterHover = await hoverSignature();
  assert.equal(afterHover.fieldHeight, beforeHover.fieldHeight, "hover mag de veldhoogte niet veranderen");
  assert.equal(afterHover.gridTemplateRows, beforeHover.gridTemplateRows, "hover mag het zichtbare grid niet veranderen");
  assert.deepEqual(afterHover.blocks, beforeHover.blocks, "hover mag blockmaten of -posities niet veranderen");
  assert.equal(afterHover.canvasVisual.outlineColor, "rgb(0, 0, 0)", "hover gebruikt niet het zwarte volledige kader");
  assert.equal(afterHover.canvasVisual.outlineStyle, "solid", "hover toont geen volledig kader");
  assert.equal(afterHover.canvasVisual.outlineWidth, "3px", "hoverkader heeft niet dezelfde kracht als het referentievoorbeeld");
  assert.equal(afterHover.canvasVisual.outlineOffset, "-3px", "hoverkader moet binnen het block blijven");
  assert.equal(afterHover.canvasVisual.boxShadow, beforeHover.canvasVisual.boxShadow, "hover mag geen onverwachte schaduw toevoegen");
  assert.equal(afterHover.canvasVisual.transform, beforeHover.canvasVisual.transform, "hover mag het block niet verplaatsen");
  assertBlockActions(await exerciseBlockActions("#home-board"), "home", 3);

  await navigateTo(`${pageUrl}docs/`);
  assertMainNavigation(await measureMainNavigation(), "manual", "manual");
  await measureManual(1280, 900);
  const beforeManualHover = await manualHoverSignature();
  const manualDocumentNode = await protocol.send("DOM.getDocument");
  const manualRandomNode = await protocol.send("DOM.querySelector", {
    nodeId: manualDocumentNode.root.nodeId,
    selector: '[data-block-object="manual-color-cyan"]'
  });
  await protocol.send("CSS.forcePseudoState", {
    nodeId: manualRandomNode.nodeId,
    forcedPseudoClasses: ["hover"]
  });
  const afterManualHover = await manualHoverSignature();
  assert.deepEqual(afterManualHover.rect, beforeManualHover.rect, "manual-hover mag het block niet verplaatsen of vergroten");
  assert.equal(afterManualHover.borderColor, "rgb(0, 255, 255)", "de hoverrepro gebruikt geen block met gekozen cyaankleur");
  assert.equal(afterManualHover.outlineColor, afterManualHover.borderColor, "manual-hover gebruikt niet exact de gekozen kleur van het blockkader");
  assert.equal(afterManualHover.outlineStyle, "solid", "manual-hover toont geen volledig librarykader");
  assert.equal(afterManualHover.outlineWidth, "3px", "manual-hover heeft niet de kracht van het librarykader");
  assert.equal(afterManualHover.outlineOffset, "-3px", "manual-hover moet binnen het block blijven");
  assert.equal(afterManualHover.cursor, "grab", "de manualheader toont geen echte dragcursor");
  await protocol.send("CSS.forcePseudoState", { nodeId: manualRandomNode.nodeId, forcedPseudoClasses: [] });

  const inverseNode = await protocol.send("DOM.querySelector", {
    nodeId: manualDocumentNode.root.nodeId,
    selector: '[data-block-object="manual-appearance-inverse"]'
  });
  await protocol.send("CSS.forcePseudoState", {
    nodeId: inverseNode.nodeId,
    forcedPseudoClasses: ["hover"]
  });
  const inverseHover = await manualHoverSignature("manual-appearance-inverse");
  assert.equal(inverseHover.variant, "inverse", "de inverse-hoverrepro gebruikt geen inverse block");
  assert.equal(inverseHover.borderColor, "rgb(239, 238, 232)", "het inverse block gebruikt niet zijn lichte randkleur");
  assert.equal(inverseHover.outlineColor, inverseHover.borderColor, "inverse-hover gebruikt niet exact de lichte kleur van het blockkader");
  assert.equal(inverseHover.outlineWidth, "3px", "inverse-hover verliest de volledige kadersterkte");
  await protocol.send("CSS.forcePseudoState", { nodeId: inverseNode.nodeId, forcedPseudoClasses: [] });
  for (const [width, height, , documentColumns] of manualViewportMatrix) {
    for (const dpr of [1, 2]) {
    const manual = await measureManual(width, height, dpr);
    assert.equal(manual.blockCount, 36, `manual mist een block uit de volledige beginnersroute op ${width}px @${dpr}x`);
    assert.deepEqual(manual.ids, [
      "manual-eli10", "manual-start", "manual-finish", "manual-content-html", "manual-content-object", "manual-content-factory",
      "manual-menu", "manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none", "manual-menu-title",
      "manual-layout", "manual-layout-wide", "manual-layout-small",
      "manual-compact",
      "manual-appearance", "manual-appearance-regular", "manual-appearance-inverse",
      "manual-colors", "manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random",
      "manual-random-color-0", "manual-random-color-50", "manual-random-color-100",
      "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100", "manual-random-combined",
      "manual-random-mix-1", "manual-random-mix-2", "manual-random-mix-3", "manual-random-mix-4", "manual-next"
    ], `manual bewaart zijn beginnersroute niet op ${width}px @${dpr}x`);
    assert.deepEqual(manual.untitledIds, [
      "manual-content-html", "manual-content-object", "manual-content-factory",
      "manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none", "manual-menu-title",
      "manual-layout-wide", "manual-layout-small",
      "manual-appearance-regular", "manual-appearance-inverse",
      "manual-color-cyan", "manual-color-magenta", "manual-color-yellow"
    ], `manual laat dubbele menuteksten niet weg op ${width}px @${dpr}x`);
    assert.equal(manual.menuTitles["manual-random-combined"], "color + inverse / 0.5 + 0.5", `het gecombineerde kansblock benoemt beide kansen niet op ${width}px @${dpr}x`);
    assert.deepEqual(manual.variants, [
      ...Array(18).fill("regular"), "inverse",
      ...Array(6).fill("regular"), "color", "color", "regular", "inverse", "inverse", "regular", "color", "color", "inverse", "regular", "regular"
    ], `manual beperkt kleur en omkering niet tot de bedoelde resultaten op ${width}px @${dpr}x`);
    assert.deepEqual(manual.colors, [
      ...Array(25).fill(null), "cyan", "magenta", null, null, null, null, "cyan", "yellow", null, null, null
    ], `manual bewaart de gekozen gebruikerskleuren niet afzonderlijk op ${width}px @${dpr}x`);
    assert.equal(manual.devicePixelRatio, dpr, `manual test niet werkelijk op DPR ${dpr}`);
    assert.equal(manual.columnCount, documentColumns, `manual gebruikt ${manual.columnCount} in plaats van ${documentColumns} kolommen op ${width}px`);
    assert.ok(manual.horizontalOverflow <= 0.5, `manual heeft ${manual.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(manual.outsideBoard, [], `manual plaatst blocks buiten het board op ${width}px: ${manual.outsideBoard.join(", ")}`);
    assert.deepEqual(manual.clippedContent, [], `manual knipt inhoud af op ${width}px: ${manual.clippedContent.join(", ")}`);
    assert.deepEqual(manual.textOverlaps, [], `manual laat tekst overlappen op ${width}px: ${manual.textOverlaps.join(", ")}`);
    assert.equal(manual.nestedSurfaces, 0, `manual bevat ${manual.nestedSurfaces} geneste blocks-grids op ${width}px`);
    assert.equal(manual.pageSurfaceCount, 1, `manual bevat ${manual.pageSurfaceCount} systemen op ${width}px`);
    assert.equal(manual.navigationCount, 1, `manual bevat ${manual.navigationCount} menu's op ${width}px`);
    assert.equal(manual.draggable, "true", `manual schakelt het echte librarygedrag uit op ${width}px`);
    assert.equal(manual.lockedHandleState.tabIndex, 0, `manual maakt de dragheader niet toetsenbordbereikbaar op ${width}px`);
    assert.equal(manual.lockedHandleState.role, "button", `manual kondigt de draghandle niet als bediening aan op ${width}px`);
    assert.match(manual.lockedHandleState.ariaLabel, /arrow keys/i, `manual legt de toetsenbordverplaatsing niet toegankelijk uit op ${width}px`);
    assert.equal(manual.lockedHandleState.shortcuts, "ArrowLeft ArrowUp ArrowRight ArrowDown", `manual publiceert de ondersteunde dragtoetsen niet op ${width}px`);
    assert.equal(manual.menuActionCount, 68, `manual toont niet de volledige menu-aan/uitreeks op ${width}px`);
    assert.match(manual.boardBackgroundImage, /linear-gradient/, `manual toont het tijdelijke achtergrondgrid niet op ${width}px`);
    assert.equal(manual.quantized, "true", `manual quantiseert het grid niet op ${width}px`);
    assert.ok(Number.isInteger(manual.trackWidth) && manual.trackWidth > 0, `manual gebruikt geen hele trackbreedte op ${width}px`);
    assert.deepEqual(manual.nonIntegerHorizontalGeometry, [], `manual laat fractionele blockgeometrie achter op ${width}px: ${manual.nonIntegerHorizontalGeometry.join(", ")}`);
    assert.equal(manual.codeOverflow, "auto", `manual code scrollt niet intern op ${width}px`);
    assert.equal(manual.eli10.title, "00 / ELI10", `manual begint niet met ELI10 op ${width}px`);
    assert.equal(manual.mastheadTitle, "Container. Blocks. Block.", `manual mist zijn nieuwe hoofdtitel op ${width}px`);
    assert.equal(manual.eli10.visual.role, "img", `ELI10 publiceert zijn canvas niet als toegankelijke visual op ${width}px`);
    assert.match(manual.eli10.visual.label, /container div[\s\S]*blocks system[\s\S]*block inside/i, `ELI10 beschrijft container, systeem en block niet in zijn visual op ${width}px`);
    assert.ok(manual.eli10.visual.width > 0 && manual.eli10.visual.height > 0, `ELI10 rendert geen zichtbaar schema op ${width}px`);
    assert.ok(Math.abs(manual.eli10.visual.width / manual.eli10.visual.height - 3.6) <= 0.05, `ELI10 bewaart zijn leesbare brede schemaformaat niet op ${width}px`);
    assert.ok(manual.eli10.visual.width <= manual.eli10.visual.hostWidth + 1, `ELI10 loopt buiten zijn host op ${width}px`);
    assert.ok(manual.eli10.visual.height <= manual.eli10.visual.hostHeight + 1, `ELI10 loopt verticaal buiten zijn host op ${width}px`);
    assert.ok(manual.finishBlockTop > manual.startBlockBottom, `manual 02 staat niet onder 01 op ${width}px @${dpr}x`);
    assert.ok(manual.contentOptions.every(function (option) { return option.blockTop > manual.finishBlockBottom; }), `manual 02 staat niet boven alle drie contentvoorbeelden op ${width}px @${dpr}x`);
    assert.equal(manual.eli10.border, "rgb(0, 0, 0)", `ELI10 gebruikt niet de standaard zwarte rand op ${width}px`);
    assert.equal(manual.eli10.menuBackground, "rgb(0, 0, 0)", `ELI10 gebruikt niet de standaard zwarte titelbalk op ${width}px`);
    assert.equal(manual.eli10.menuColor, "rgb(239, 238, 232)", `ELI10 gebruikt geen leesbare lichte inkt op de zwarte titelbalk op ${width}px`);
    assert.equal(manual.eli10.contentBackground, "rgb(239, 238, 232)", `ELI10 bewaart zijn neutrale inhoudsvlak niet op ${width}px`);
    assert.ok(manual.codeBlockWidths.every(function (item) { return Math.abs(item.width - manual.boardWidth) <= 2; }), `manual gebruikt niet de volledige boardbreedte voor lescode op ${width}px`);
    assert.ok(manual.chapterGaps.every(function (item) { return item.gap >= 15; }), `manual geeft een hoofdstuk geen ademruimte op ${width}px: ${JSON.stringify(manual.chapterGaps)}`);
    assert.ok(manual.chapterGaps.every(function (item) { return Math.abs(item.gap - manual.mastheadGap) <= 0.5; }), `manual gebruikt na de masthead niet exact hetzelfde interval als tussen hoofdstukken op ${width}px: ${manual.mastheadGap}px versus ${JSON.stringify(manual.chapterGaps)}`);
    if (width > 900) {
      const openRowInterval = manual.rowHeight + 2 * manual.rowGap;
      const firstContentTop = Math.min(...manual.contentOptions.map(function (option) { return option.blockTop; }));
      assert.ok(Math.abs(manual.finishBlockTop - manual.startBlockBottom - openRowInterval) <= 0.5, `manual laat boven 02 niet exact één open rasterrij op ${width}px @${dpr}x`);
      assert.ok(Math.abs(firstContentTop - manual.finishBlockBottom - manual.rowGap) <= 0.5, `de drie voorbeelden sluiten niet direct onder 02 aan op ${width}px @${dpr}x`);
      const expectedEli10Width = manual.trackWidth * 3 + manual.columnGap * 2;
      assert.ok(Math.abs(manual.eli10.blockWidth - expectedEli10Width) <= 2, `de ELI10-visual gebruikt niet exact de linker drie kolommen op ${width}px`);
      assert.ok(manual.chapterGaps.every(function (item) { return item.marginTop === 0; }), `manual gebruikt nog marge binnen een desktop-gridcel op ${width}px: ${JSON.stringify(manual.chapterGaps)}`);
      assert.ok(manual.chapterGaps.every(function (item) { return Math.abs(item.gap - openRowInterval) <= 0.5; }), `manual gebruikt niet exact één open desktop-gridrij op ${width}px: ${openRowInterval}px versus ${JSON.stringify(manual.chapterGaps)}`);
      assert.equal(new Set([...manual.randomMiniGrids.color, ...manual.randomMiniGrids.inverse].map((item) => item.top)).size, 1, `de twee afzonderlijke random-mini-grids delen geen rij op ${width}px`);
      assert.ok(Math.abs(manual.randomMiniGrids.inverse[0].left - manual.randomMiniGrids.color[2].right - manual.columnGap) <= 0.5, `de color- en inverse-mini-grid sluiten niet als twee rasterhelften op elkaar aan op ${width}px`);
      assert.equal(new Set(manual.randomMiniGrids.combined.map((item) => item.top)).size, 1, `de gecombineerde randomproef vormt geen eigen rij op ${width}px`);
      assert.ok(Math.abs(manual.randomMiniGrids.combined[0].left - manual.randomMiniGrids.color[0].left) <= 0.5 && Math.abs(manual.randomMiniGrids.combined[3].right - manual.randomMiniGrids.inverse[0].right) <= 0.5, `de gecombineerde vierdelige proef start niet aan de linker rasterlijn op ${width}px`);
      assert.ok([...manual.randomMiniGrids.color, ...manual.randomMiniGrids.inverse, ...manual.randomMiniGrids.combined].every(function (item) { return Math.abs(item.height - manual.rowHeight) <= 0.5; }), `de chance-resultaten zijn geen echte 1×1-gridcellen op ${width}px`);
    }
    const expectedShellColors = ["rgb(0, 255, 255)", "rgb(255, 0, 255)", "rgb(255, 255, 0)", "rgb(0, 255, 255)", "rgb(255, 0, 255)", "rgb(0, 255, 255)", "rgb(255, 255, 0)"];
    assert.deepEqual(manual.colorBlockStyles.map((style) => style.border), expectedShellColors, `manual zet de gebruikerskleur niet op het blockkader op ${width}px`);
    assert.deepEqual(manual.colorBlockStyles.map((style) => style.menuBackground), expectedShellColors, `manual zet de gebruikerskleur niet op de blockheader op ${width}px`);
    assert.ok(manual.colorBlockStyles.every((style) => style.objectBackground === "rgb(239, 238, 232)" && style.contentBackground === "rgb(239, 238, 232)"), `manual laat gebruikerskleur in het inhoudsvlak lekken op ${width}px`);
    assert.ok(manual.colorBlockStyles.every((style) => style.menuColor === "rgb(0, 0, 0)" && style.contentColor === "rgb(20, 20, 15)"), `manual bewaart geen neutrale inkt in gekleurde blocks op ${width}px`);
    assert.equal(new Set(manual.randomExamples.map((example) => JSON.stringify(example))).size, 1, `manual verandert de random-inhoud in plaats van het block op ${width}px`);
    assert.deepEqual(manual.menuExamples, [
      { id: "manual-menu-both", actions: ["minimize", "close"] },
      { id: "manual-menu-minimize", actions: ["minimize"] },
      { id: "manual-menu-close", actions: ["close"] },
      { id: "manual-menu-none", actions: [] }
    ], `manual toont de vier menu-aan/uitcombinaties niet letterlijk op ${width}px`);
    assert.ok(Object.values(manual.randomExamples[0]).every((value) => typeof value === "string" && value.trim() !== ""), `manual toont geen volledig vast random-object op ${width}px`);
    assert.equal(manual.contentExamples.trusted.tag, "ARTICLE", `manual toont trusted HTML niet als echte inhoud op ${width}px`);
    assert.match(manual.contentExamples.trusted.text, /Structure makes movement visible\./, `manual mist de typografische HTML-inhoud op ${width}px`);
    assert.equal(manual.contentExamples.object.tag, "FIGURE", `manual toont de foto niet als echt object op ${width}px`);
    assert.match(manual.contentExamples.object.source, /\/docs\/img\/pexels-peter-dyllong-2158803154-37352130\.jpg$/, `manual gebruikt niet de opgegeven foto op ${width}px`);
    assert.equal(manual.contentExamples.object.alt, "Black-and-white skatepark with converging concrete ramps, painted lines and a metal rail.", `manual mist de beschrijvende foto-alttekst op ${width}px`);
    assert.equal(manual.contentExamples.object.fit, "cover", `manual plaatst de foto niet beeldvullend op ${width}px`);
    assert.deepEqual(manual.contentExamples.factory, {
      tag: "ARTICLE",
      state: "structure",
      index: "01",
      button: "next state"
    }, `manual start niet met een vers interactief factory-element op ${width}px`);
    assert.equal(manual.scrollbarWidth, "thin", `manual gebruikt geen dunne OS-scrollbar op ${width}px`);
    assert.match(manual.scrollbarColor, /rgba\(17, 17, 17, 0\.58\)/, `manual gebruikt geen neutrale scrollbar op ${width}px`);
    if (width > 560) {
      assert.ok(Math.max(...manual.contentOptions.map(function (item) { return item.blockTop; })) - Math.min(...manual.contentOptions.map(function (item) { return item.blockTop; })) <= 0.5, `manual zet de drie inhoudsvormen niet op één rij op ${width}px`);
      assert.ok(Math.max(...manual.contentOptions.map(function (item) { return item.blockWidth; })) - Math.min(...manual.contentOptions.map(function (item) { return item.blockWidth; })) <= 0.5, `manual geeft de drie inhoudsvormen geen gelijke breedte op ${width}px`);
    }
    assert.ok(manual.pageScrollable && manual.documentHeight > height, `manual gebruikt geen natuurlijke paginascroll op ${width}px`);
    assert.notEqual(manual.boardOverflowY, "scroll", `manual maakt het volledige board scrollbaar op ${width}px`);
    }
  }

  assert.deepEqual(await exerciseManualFactory(), {
    beforeState: "structure",
    beforeIndex: "01",
    afterState: "contrast",
    afterIndex: "02"
  }, "de factory-inhoud moet zichtbaar naar haar volgende state schakelen");

  assert.deepEqual(await exerciseManualKeyboardReorder(), {
    beforeRow: "27",
    afterFirstRow: "28",
    afterSecondRow: "29",
    focusAcquired: true,
    focusAfterFirstMove: true,
    events: [
      { id: "manual-layout-wide", input: "keyboard", direction: "down" },
      { id: "manual-layout-wide", input: "keyboard", direction: "down" }
    ]
  }, "een manualblock moet via zijn echte libraryheader verplaatsbaar zijn");

  const mobileNavigation = await exerciseMobileNavigation();
  assert.deepEqual(mobileNavigation.opened, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie publiceert haar open toestand niet volledig");
  assert.equal(mobileNavigation.controlsTarget, true, "mobiele navigatie koppelt de hamburger niet aan het bediende menu");
  assert.deepEqual(mobileNavigation.escaped, { open: false, expanded: "false", label: "open navigation", focusReturned: true }, "Escape sluit de mobiele navigatie niet met herstelde focus");
  assert.deepEqual(mobileNavigation.outside, { open: false, expanded: "false", label: "open navigation" }, "een buitenklik sluit de mobiele navigatie niet");
  assert.deepEqual(mobileNavigation.beforeResize, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie staat niet open vóór de breakpointtest");
  assert.deepEqual(mobileNavigation.afterResize, { open: false, expanded: "false", label: "open navigation" }, "desktopresize ruimt de mobiele navigatiestate niet op");
  assertBlockActions(await exerciseBlockActions("#manual-board"), "manual", 36, 34, 34);
  assert.deepEqual(await exerciseManualMenuLesson(), {
    minimized: { state: "true", hidden: "true" },
    restored: "false",
    closeRemoved: true,
    remainingBlocks: 35
  }, "de menu-aan/uitles moet de overblijvende actie echt uitvoerbaar houden");

  await navigateTo(`${pageUrl}docs/api.html`);
  assertMainNavigation(await measureMainNavigation(), "reference", "reference");
  for (const [width, height, , documentColumns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const reference = await measureReference(width, height, dpr);
      assert.equal(reference.blockCount, 10, `reference mist opzoekhoofdstukken op ${width}px @${dpr}x`);
      assert.deepEqual(reference.ids, [
        "reference-exports", "reference-options", "reference-state", "reference-methods", "reference-block",
        "reference-add-options", "reference-adapters", "reference-event", "reference-hooks", "reference-errors"
      ], `reference bewaart zijn volledige opzoekvolgorde niet op ${width}px @${dpr}x`);
      assert.equal(reference.columnCount, documentColumns, `reference gebruikt ${reference.columnCount} in plaats van ${documentColumns} kolommen op ${width}px @${dpr}x`);
      assert.equal(reference.devicePixelRatio, dpr, `reference test niet werkelijk op DPR ${dpr}`);
      assert.ok(reference.horizontalOverflow <= 0.5, `reference heeft ${reference.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.match(reference.boardBackgroundImage, /linear-gradient/, `reference toont het tijdelijke achtergrondgrid niet op ${width}px @${dpr}x`);
      assert.equal(reference.quantized, "true", `reference quantiseert het grid niet op ${width}px @${dpr}x`);
      assert.ok(Number.isInteger(reference.trackWidth) && reference.trackWidth > 0, `reference gebruikt geen hele trackbreedte op ${width}px @${dpr}x`);
      assert.equal(reference.draggable, "false", `reference bewaart zijn leesvolgorde niet op ${width}px @${dpr}x`);
      assert.deepEqual(reference.lockedHandleState, { tabIndex: -1, role: null, ariaLabel: null, shortcuts: null }, `reference zet een niet-werkende verplaatsheader in de tabvolgorde op ${width}px @${dpr}x`);
      assert.equal(reference.menuActionCount, 20, `reference toont niet op elk block minimaliseren en sluiten op ${width}px @${dpr}x`);
      assert.equal(reference.nestedSurfaces, 0, `reference bevat ${reference.nestedSurfaces} geneste grids op ${width}px @${dpr}x`);
      assert.ok(reference.chapterGaps.every((gap) => Math.abs(gap - reference.mastheadGap) <= 0.5), `reference gebruikt na de masthead niet exact hetzelfde interval als tussen hoofdstukken op ${width}px @${dpr}x: ${reference.mastheadGap}px versus ${reference.chapterGaps.join(", ")}`);
      assert.deepEqual(reference.outsideBoard, [], `reference plaatst blocks buiten het board op ${width}px @${dpr}x: ${reference.outsideBoard.join(", ")}`);
      assert.deepEqual(reference.nonIntegerHorizontalGeometry, [], `reference laat fractionele geometrie achter op ${width}px @${dpr}x: ${reference.nonIntegerHorizontalGeometry.join(", ")}`);
      assert.deepEqual(reference.missingAnchors, [], `reference mist anchors op ${width}px @${dpr}x: ${reference.missingAnchors.join(", ")}`);
      assert.ok(reference.fullWidthDifferences.every(function (difference) { return difference <= 2; }), `reference gebruikt niet voor elk hoofdstuk de volledige breedte op ${width}px @${dpr}x`);
      assert.ok(reference.localOverflowModes.every((mode) => mode === "auto"), `reference code gebruikt geen lokale overflow op ${width}px @${dpr}x`);
      if (width <= 560) {
        assert.ok(reference.tableOverflowModes.every((mode) => mode === "visible"), `reference laat gestapelde tabellen niet natuurlijk groeien op ${width}px @${dpr}x`);
        assert.equal(reference.table.rowDisplay, "grid", `reference stapelt tabelrijen niet op ${width}px @${dpr}x`);
        assert.equal(reference.table.purposeFontSize, "13px", `reference maakt de inhoudshiërarchie niet leesbaar op ${width}px @${dpr}x`);
      } else {
        assert.ok(reference.tableOverflowModes.every((mode) => mode === "auto"), `reference bewaart geen lokale tabeloverflow op ${width}px @${dpr}x`);
        assert.equal(reference.table.fontSize, "11px", `reference gebruikt niet de leesbare tabelmaat op ${width}px @${dpr}x`);
      }
      assert.equal(reference.pageScrollable, true, `reference gebruikt geen natuurlijke paginascroll op ${width}px @${dpr}x`);
    }
  }
  assertBlockActions(await exerciseBlockActions("#reference-board"), "reference", 10);

  for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
    for (const [width, height] of [[1280, 900], [390, 844]]) {
      await protocol.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false
      });
      await navigateTo(`${pageUrl}examples/${example}/?navigation-test=${width}`);
      const navigation = await measureMainNavigation();
      assertMainNavigation(navigation, `${example} op ${width}px`);
      assert.ok(navigation.contentTop >= navigation.navbarBottom - 0.5, `${example} schuift onder het vaste menu op ${width}px`);
      const styleResult = await protocol.send("Runtime.evaluate", {
        expression: `(async function () {
          await document.fonts.ready;
          for (let attempt = 0; attempt < 60 && !document.querySelector(".blocks-system-menu"); attempt += 1) {
            await new Promise(function (done) { requestAnimationFrame(done); });
          }
          const field = document.querySelector("#field");
          return {
            stylesheets: Array.from(document.styleSheets).map(function (sheet) {
              return new URL(sheet.href).pathname;
            }),
            bodyFont: getComputedStyle(document.body).fontFamily,
            headingFont: getComputedStyle(document.querySelector("h1")).fontFamily,
            navigationFont: getComputedStyle(document.querySelector(".nav-logo")).fontFamily,
            blockFont: getComputedStyle(field.querySelector(".blocks-system-menu")).fontFamily,
            configuredBlockFont: getComputedStyle(field).getPropertyValue("--blocks-font-family").trim(),
            variants: Array.from(field.querySelectorAll(":scope > .blocks-system-object"), function (block) {
              return block.dataset.blockVariant;
            }),
            colors: Array.from(field.querySelectorAll(":scope > .blocks-system-object"), function (block) {
              return block.getAttribute("data-block-color");
            }),
            minimizeCount: field.querySelectorAll(".blocks-system-minimize").length,
            closeCount: field.querySelectorAll(".blocks-system-close").length
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      const exampleStyle = styleResult.result.value;
      assert.deepEqual(exampleStyle.stylesheets, ["/blocks.system.css", "/docs/style.css"], `${example} laadt niet exact library-CSS en de canonieke sitecascade`);
      for (const [part, font] of Object.entries({
        body: exampleStyle.bodyFont,
        heading: exampleStyle.headingFont,
        navigation: exampleStyle.navigationFont,
        block: exampleStyle.blockFont
      })) {
        assert.match(font, /Instrument Sans/, `${example} gebruikt Instrument Sans niet voor ${part} op ${width}px`);
      }
      assert.equal(exampleStyle.configuredBlockFont, '"Instrument Sans"', `${example} configureert de librarytypografie niet via haar publieke CSS-hook`);
      assert.equal(exampleStyle.minimizeCount, exampleStyle.variants.length, `${example} toont niet op elk block minimaliseren op ${width}px`);
      assert.equal(exampleStyle.closeCount, exampleStyle.variants.length, `${example} toont niet op elk block sluiten op ${width}px`);
      if (example === "basic-grid") {
        assert.deepEqual(exampleStyle.variants, ["regular", "inverse", "color", "regular"], `basic-grid gebruikt niet de generieke variant voor de gebruikerskleur op ${width}px`);
        assert.deepEqual(exampleStyle.colors, [null, null, "magenta", null], `basic-grid bewaart de geselecteerde gebruikerskleur niet afzonderlijk op ${width}px`);
      }
      assertBlockActions(await exerciseBlockActions("#field"), `${example} op ${width}px`, exampleStyle.variants.length);
    }
  }

  const aliases = {
    "manual.html": "start",
    "system.html": "start",
    "examples.html": "next",
    "guide.html": "start",
    "guide-blocks.html": "content",
    "guide-finish.html": "next",
    "about.html": "next"
  };
  for (const [file, anchor] of Object.entries(aliases)) {
    await navigateTo(`${pageUrl}docs/${file}?legacy=1`);
    await new Promise(function (resolveAlias) { setTimeout(resolveAlias, 60); });
    const aliasResult = await protocol.send("Runtime.evaluate", {
      expression: `({ pathname: location.pathname, hash: location.hash, search: location.search })`,
      returnByValue: true
    });
    assert.equal(aliasResult.result.value.pathname, "/docs/", `${file} komt niet op de canonieke /docs/ route uit`);
    assert.equal(aliasResult.result.value.hash, `#${anchor}`, `${file} komt niet op #${anchor} uit`);
    assert.equal(aliasResult.result.value.search, "", `${file} laat de legacy query in de canonieke URL staan`);
  }

  console.log("browser-layout: gedeelde cascade, drie examples, routes op 1440–320px @1x/@2x en zeven legacy aliases — OK");
} finally {
  await browser.close();
}
