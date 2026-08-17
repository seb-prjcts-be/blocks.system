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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
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
          layout: "fixed-grid",
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
          layout: "fixed-grid",
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
          layout: "fixed-grid",
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
          layout: "fixed-grid",
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
        const blocks = createBlocksSystem({ layout: "fixed-grid", draggable: false, variant: "regular" });
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

async function measureCloseRowCollapse() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const { createBlocksSystem } = await import("./blocks.system.mjs?close-row-collapse-proof");
      const field = document.createElement("div");
      field.style.cssText = "position:fixed;left:0;top:0;width:360px;height:360px";
      document.body.append(field);
      try {
        const blocks = createBlocksSystem({ layout: "fixed-grid", draggable: false, variant: "regular" });
        const changes = [];
        field.addEventListener("blocks:change", function (event) { changes.push(event.detail); });
        blocks.attach(field).setGrid(3, 6);
        blocks.add("top", { id: "close-row-top" }).span(3, 1).place(1, 1);
        const gap = blocks.add("gap", { id: "close-row-gap", title: "gap", menu: { close: true } }).span(2, 1).place(1, 2);
        blocks.add("lower", { id: "close-row-lower" }).span(3, 1).place(1, 4);
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
        const blocks = createBlocksSystem({ layout: "free", variant: "regular" });
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
  const currentLocation = await protocol.send("Runtime.evaluate", {
    expression: "location.href",
    returnByValue: true
  });
  const currentUrl = new URL(currentLocation.result.value);
  const targetUrl = new URL(url);
  const sameDocument = currentUrl.origin === targetUrl.origin
    && currentUrl.pathname === targetUrl.pathname
    && currentUrl.search === targetUrl.search;

  if (currentUrl.href === targetUrl.href) {
    const loaded = protocol.once("Page.loadEventFired");
    await protocol.send("Page.reload", { ignoreCache: true });
    await loaded;
  } else if (sameDocument) {
    await protocol.send("Page.navigate", { url: targetUrl.href });
  } else {
    const loaded = protocol.once("Page.loadEventFired");
    await protocol.send("Page.navigate", { url: targetUrl.href });
    await loaded;
  }
  await protocol.send("Runtime.evaluate", {
    expression: "document.fonts ? document.fonts.ready : Promise.resolve()",
    awaitPromise: true
  });
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
      const credit = document.querySelector("footer .site-credit");
      return {
        labels: links.map(function (link) { return link.textContent.trim(); }),
        fragmentLinks: links.filter(function (link) { return link.getAttribute("href").includes("#"); }).map(function (link) { return link.getAttribute("href"); }),
        current: links.filter(function (link) { return link.getAttribute("aria-current") === "page"; }).map(function (link) { return link.textContent.trim(); }),
        navigationCount: document.querySelectorAll("nav").length,
        controlsTarget: document.getElementById(toggle.getAttribute("aria-controls")) === navigation,
        navbarBottom: navbar.getBoundingClientRect().bottom,
        contentTop: topbar ? topbar.getBoundingClientRect().top : null,
        footerCredit: credit ? {
          text: credit.textContent.trim(),
          href: credit.href,
          displayed: getComputedStyle(credit).display !== "none" && getComputedStyle(credit).visibility !== "hidden"
        } : null,
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
  assert.deepEqual(state.footerCredit, {
    text: "blocks.system by Sebastien Vanblaere",
    href: "https://sebastienvanblaere.be/",
    displayed: true
  }, `${page} toont geen werkende auteurslink in zijn footer`);
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
      for (let attempt = 0; attempt < 60 && (!document.querySelector("#manual-board")?.dataset.manualReady || !document.querySelector("#eli10-schema canvas") || !document.querySelector(".manual-content-waves-demo pre")); attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const wavesBlockForRender = document.querySelector('[data-block-object="manual-content-waves"]');
      const wavesPreForRender = wavesBlockForRender?.querySelector("pre");
      const inlineScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      for (let attempt = 0; attempt < 12 && wavesPreForRender && !wavesPreForRender.textContent; attempt += 1) {
        wavesBlockForRender.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 80); });
      }
      window.dispatchEvent(new Event("resize"));
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      window.scrollTo(0, 0);
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      document.documentElement.style.scrollBehavior = inlineScrollBehavior;
      const board = document.querySelector("#manual-board");
      const boardRect = board.getBoundingClientRect();
      const mastheadRect = document.querySelector(".manual-masthead").getBoundingClientRect();
      const mastheadTitle = document.querySelector(".manual-masthead h1");
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const codeOrResultTitles = objects
        .map(function (block) { return block.querySelector(":scope > .blocks-system-menu > .blocks-system-title")?.textContent.trim() || ""; })
        .filter(function (title) { return /\\b(?:code|result)\\b/i.test(title); });
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const eli10Block = board.querySelector('[data-block-object="manual-eli10"]');
      const eli10 = eli10Block.querySelector(".manual-eli10");
      const eli10Content = eli10Block.querySelector(":scope > .blocks-system-content");
      const eli10BlockRect = eli10Block.getBoundingClientRect();
      const eli10Canvas = eli10.querySelector("canvas");
      const eli10CanvasRect = eli10Canvas.getBoundingClientRect();
      const layoutInvite = ["manual-play-prompt", "manual-reset-block"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        return {
          id,
          column: block.style.getPropertyValue("--block-column"),
          row: block.style.getPropertyValue("--block-row"),
          spanColumns: block.style.getPropertyValue("--block-span-columns"),
          spanRows: block.style.getPropertyValue("--block-span-rows"),
          variant: block.dataset.blockVariant,
          title: block.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent,
          text: block.querySelector(":scope > .blocks-system-content").textContent.replace(/\\s+/g, " ").trim()
        };
      });
      const resetContent = board.querySelector('[data-block-object="manual-reset-block"] > .blocks-system-content');
      const resetButton = resetContent.querySelector(".manual-reset-trigger");
      const contentOptions = ["manual-content-html", "manual-content-object", "manual-content-factory", "manual-content-waves"].map(function (id) {
        const blockRect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
        return {
          id,
          blockTop: blockRect.top,
          blockWidth: blockRect.width
        };
      });
      const contentPairs = ["html", "object", "factory", "waves"].map(function (name) {
        const introBlock = board.querySelector('[data-block-object="manual-content-' + name + '-intro"]');
        const codeBlock = board.querySelector('[data-block-object="manual-content-' + name + '-code"]');
        const resultBlock = board.querySelector('[data-block-object="manual-content-' + name + '"]');
        const introRect = introBlock.getBoundingClientRect();
        const codeRect = codeBlock.getBoundingClientRect();
        const resultRect = resultBlock.getBoundingClientRect();
        return {
          name,
          introTop: introRect.top,
          codeTop: codeRect.top,
          resultTop: resultRect.top,
          introWidth: introRect.width,
          codeWidth: codeRect.width,
          resultWidth: resultRect.width,
          introColumn: introBlock.style.getPropertyValue("--block-column"),
          introSpan: introBlock.style.getPropertyValue("--block-span-columns"),
          introRowSpan: introBlock.style.getPropertyValue("--block-span-rows"),
          codeColumn: codeBlock.style.getPropertyValue("--block-column"),
          codeSpan: codeBlock.style.getPropertyValue("--block-span-columns"),
          codeRowSpan: codeBlock.style.getPropertyValue("--block-span-rows"),
          resultColumn: resultBlock.style.getPropertyValue("--block-column"),
          resultSpan: resultBlock.style.getPropertyValue("--block-span-columns"),
          resultRowSpan: resultBlock.style.getPropertyValue("--block-span-rows"),
          codeTitle: codeBlock.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent,
          resultTitle: resultBlock.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent
        };
      });
      const startABlock = board.querySelector('[data-block-object="manual-start-a"]');
      const startBBlock = board.querySelector('[data-block-object="manual-start-b"]');
      const startDivBlock = board.querySelector('[data-block-object="manual-start-div"]');
      const cdnBody = startABlock.querySelector(".manual-explanation-card > p");
      const cdnCode = startABlock.querySelector(".manual-cdn-code");
      const startSteps = ["manual-start-div", "manual-start-blocks", "manual-start-grid", "manual-layout"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        return {
          id,
          title: block.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent,
          column: block.style.getPropertyValue("--block-column"),
          row: block.style.getPropertyValue("--block-row"),
          spanColumns: block.style.getPropertyValue("--block-span-columns"),
          spanRows: block.style.getPropertyValue("--block-span-rows")
        };
      });
      const startABlockRect = startABlock.getBoundingClientRect();
      const startBBlockRect = startBBlock.getBoundingClientRect();
      const startDivBlockRect = startDivBlock.getBoundingClientRect();
      const finishBlockRect = board.querySelector('[data-block-object="manual-finish"]').getBoundingClientRect();
      const contentStatement = board.querySelector(".manual-content-statement");
      const menuLessonBlock = board.querySelector('[data-block-object="manual-menu"]');
      const menuCodeBlock = board.querySelector('[data-block-object="manual-menu-code"]');
      const layoutLessonBlock = board.querySelector('[data-block-object="manual-layout"]');
      const dragLessonBlock = board.querySelector('[data-block-object="manual-drag"]');
      const dragCodeBlock = board.querySelector('[data-block-object="manual-drag-code"]');
      const dragResultBlock = board.querySelector('[data-block-object="manual-drag-locked"]');
      const baseColorsLessonBlock = board.querySelector('[data-block-object="manual-base-colors"]');
      const baseColorsCodeBlock = board.querySelector('[data-block-object="manual-base-colors-code"]');
      const appearanceLessonBlock = board.querySelector('[data-block-object="manual-appearance"]');
      const appearanceCodeBlock = board.querySelector('[data-block-object="manual-appearance-code"]');
      const colorsLessonBlock = board.querySelector('[data-block-object="manual-colors"]');
      const colorsCodeBlock = board.querySelector('[data-block-object="manual-colors-code"]');
      const randomLessonBlock = board.querySelector('[data-block-object="manual-random"]');
      const randomCodeBlock = board.querySelector('[data-block-object="manual-random-code"]');
      const randomActionBlock = board.querySelector('[data-block-object="manual-random-action"]');
      const nextStatement = board.querySelector('[data-block-object="manual-next"] .manual-content-statement strong');
      const nextStatementRange = document.createRange();
      nextStatementRange.selectNodeContents(nextStatement);
      const dragPatternBlocks = [
        "manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3",
        "manual-drag-fixed-4", "manual-drag-fixed-5", "manual-drag-movable", "manual-drag-locked"
      ].map(function (id) { return board.querySelector('[data-block-object="' + id + '"]'); });
      const trustedDemo = board.querySelector(".manual-content-html-demo");
      const imageDemo = board.querySelector(".manual-content-image-demo");
      const image = imageDemo.querySelector("img");
      const factoryDemo = board.querySelector(".manual-content-factory-demo");
      const factoryButton = factoryDemo;
      const wavesDemo = board.querySelector(".manual-content-waves-demo");
      const wavesPre = wavesDemo.querySelector("pre");
      const wavesText = wavesPre.textContent.endsWith("\\n") ? wavesPre.textContent.slice(0, -1) : wavesPre.textContent;
      const wavesLines = wavesText.split("\\n");
      const wavesBlock = board.querySelector('[data-block-object="manual-content-waves"]');
      const wavesContent = wavesBlock.querySelector(":scope > .blocks-system-content");
      const chapterIds = ["content", "menu", "dragging", "base-colors", "appearance", "colors", "chance", "next"];
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
      const contentCodeOverflow = ["html", "object", "factory", "waves"].map(function (name) {
        const code = board.querySelector('[data-block-object="manual-content-' + name + '-code"] .manual-code');
        return { name, overflow: code.scrollHeight - code.clientHeight };
      });
      const colorBlockStyles = ["manual-color-cyan", "manual-color-magenta", "manual-color-yellow"].map(function (id) {
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
        "manual-random-mix-1", "manual-random-mix-2", "manual-random-mix-3",
        "manual-random-mix-4", "manual-random-mix-5", "manual-random-mix-6",
        "manual-random-mix-7", "manual-random-mix-8", "manual-random-mix-9",
        "manual-random-mix-10", "manual-random-mix-11", "manual-random-mix-12"
      ].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const lesson = block.querySelector(":scope > .blocks-system-content > .manual-chance-cell");
        return {
          marker: lesson.querySelector("strong").textContent,
          childCount: lesson.children.length,
          title: block.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent
        };
      });
      function measureMiniGrid(ids) {
        return ids.map(function (id) {
          const rect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
          const block = board.querySelector('[data-block-object="' + id + '"]');
          return {
            id, left: rect.left, right: rect.right, top: rect.top, width: rect.width, height: rect.height,
            column: block.style.getPropertyValue("--block-column"),
            row: block.style.getPropertyValue("--block-row")
          };
        });
      }
      const randomMiniGrids = {
        color: [],
        inverse: [],
        combined: measureMiniGrid(Array.from({ length: 12 }, function (_, index) { return "manual-random-mix-" + (index + 1); }))
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
      const menuExampleGeometry = ["manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        return {
          id,
          column: block.style.getPropertyValue("--block-column"),
          row: block.style.getPropertyValue("--block-row"),
          spanColumns: block.style.getPropertyValue("--block-span-columns"),
          spanRows: block.style.getPropertyValue("--block-span-rows")
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
      const protectedBlocks = objects.map(function (block) {
        const title = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
        return {
          id: block.dataset.blockObject,
          actions: block.querySelectorAll(":scope > .blocks-system-menu button").length,
          draggable: block.dataset.blockDraggable,
          tabIndex: title?.tabIndex ?? null,
          role: title?.getAttribute("role") ?? null,
          ariaLabel: title?.getAttribute("aria-label") ?? null
        };
      });
      const reader = document.querySelector("#manual-reader");
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
          if (["manual-start-b", "manual-eli10"].includes(block.dataset.blockObject)) return false;
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
        protectedBlocks,
        reader: {
          tag: reader.tagName,
          headings: Array.from(reader.querySelectorAll("h2"), function (heading) { return heading.textContent; }),
          subheadings: Array.from(reader.querySelectorAll("h3"), function (heading) { return heading.textContent; }),
          text: reader.textContent.replace(/\\s+/g, " ").trim()
        },
        dragLessonPair: {
          explanation: {
            column: dragLessonBlock.style.getPropertyValue("--block-column"),
            row: dragLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: dragLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: dragLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: dragCodeBlock.style.getPropertyValue("--block-column"),
            row: dragCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: dragCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: dragCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        dragResult: {
          column: dragResultBlock.style.getPropertyValue("--block-column"),
          row: dragResultBlock.style.getPropertyValue("--block-row"),
          spanColumns: dragResultBlock.style.getPropertyValue("--block-span-columns"),
          spanRows: dragResultBlock.style.getPropertyValue("--block-span-rows"),
          title: dragResultBlock.querySelector(".blocks-system-title").textContent,
          statement: dragResultBlock.querySelector(".manual-result strong")?.textContent ?? null
        },
        dragPattern: dragPatternBlocks.map(function (block) {
          return {
            id: block.dataset.blockObject,
            column: block.style.getPropertyValue("--block-column"),
            row: block.style.getPropertyValue("--block-row"),
            spanColumns: block.style.getPropertyValue("--block-span-columns"),
            spanRows: block.style.getPropertyValue("--block-span-rows")
          };
        }),
        baseColorsLessonPair: {
          explanation: {
            column: baseColorsLessonBlock.style.getPropertyValue("--block-column"),
            row: baseColorsLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: baseColorsLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: baseColorsLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: baseColorsCodeBlock.style.getPropertyValue("--block-column"),
            row: baseColorsCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: baseColorsCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: baseColorsCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        appearanceLessonPair: {
          explanation: {
            column: appearanceLessonBlock.style.getPropertyValue("--block-column"),
            row: appearanceLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: appearanceLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: appearanceLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: appearanceCodeBlock.style.getPropertyValue("--block-column"),
            row: appearanceCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: appearanceCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: appearanceCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        colorsLessonPair: {
          explanation: {
            column: colorsLessonBlock.style.getPropertyValue("--block-column"),
            row: colorsLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: colorsLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: colorsLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: colorsCodeBlock.style.getPropertyValue("--block-column"),
            row: colorsCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: colorsCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: colorsCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        randomLessonPair: {
          explanation: {
            column: randomLessonBlock.style.getPropertyValue("--block-column"),
            row: randomLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: randomLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: randomLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: randomCodeBlock.style.getPropertyValue("--block-column"),
            row: randomCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: randomCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: randomCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        randomAction: {
          column: randomActionBlock.style.getPropertyValue("--block-column"),
          row: randomActionBlock.style.getPropertyValue("--block-row"),
          spanColumns: randomActionBlock.style.getPropertyValue("--block-span-columns"),
          spanRows: randomActionBlock.style.getPropertyValue("--block-span-rows"),
          title: randomActionBlock.querySelector(":scope > .blocks-system-menu > .blocks-system-title").textContent
        },
        nextStatementLines: nextStatementRange.getClientRects().length,
        devicePixelRatio: window.devicePixelRatio,
        codeOverflow: getComputedStyle(code).overflowX,
        scrollbarWidth: rootStyle.scrollbarWidth,
        scrollbarColor: rootStyle.scrollbarColor,
        boardWidth: boardRect.width,
        boardTop: boardRect.top,
        mastheadTitle: mastheadTitle.textContent,
        mastheadSourceLabel: document.querySelector(".manual-masthead [data-docs-source-prefix]")?.textContent.trim() ?? null,
        mastheadMetrics: {
          top: mastheadRect.top,
          bottom: mastheadRect.bottom,
          height: mastheadRect.height,
          titleHeight: mastheadTitle.getBoundingClientRect().height,
          titleWidth: mastheadTitle.getBoundingClientRect().width,
          titleFont: getComputedStyle(mastheadTitle).font,
          titleLetterSpacing: getComputedStyle(mastheadTitle).letterSpacing
        },
        introCount: document.querySelectorAll("#manual-convention").length,
        mastheadBorderBottomWidth: getComputedStyle(document.querySelector(".manual-masthead")).borderBottomWidth,
        mastheadGap: boardRect.top - mastheadRect.bottom,
        rowHeight: parseFloat(getComputedStyle(board).gridAutoRows),
        rowGap: parseFloat(getComputedStyle(board).rowGap),
        columnGap: parseFloat(getComputedStyle(board).columnGap),
        eli10: {
          column: eli10Block.style.getPropertyValue("--block-column"),
          row: eli10Block.style.getPropertyValue("--block-row"),
          spanColumns: eli10Block.style.getPropertyValue("--block-span-columns"),
          spanRows: eli10Block.style.getPropertyValue("--block-span-rows"),
          blockWidth: eli10BlockRect.width,
          blockTop: eli10BlockRect.top,
          blockRight: eli10BlockRect.right,
          blockHeight: eli10BlockRect.height,
          border: getComputedStyle(eli10Block).borderColor,
          menuBackground: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-menu")).backgroundColor,
          menuColor: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-menu")).color,
          contentBackground: getComputedStyle(eli10Block.querySelector(":scope > .blocks-system-content")).backgroundColor,
          contentPadding: getComputedStyle(eli10Content).padding,
          contentWidth: eli10Content.clientWidth,
          contentHeight: eli10Content.clientHeight,
          visualPadding: getComputedStyle(eli10).padding,
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
        layoutInvite,
        resetFill: {
          contentWidth: resetContent.getBoundingClientRect().width,
          buttonWidth: resetButton.getBoundingClientRect().width
        },
        startBlockBottom: Math.max(startABlockRect.bottom, startBBlockRect.bottom),
        startPair: {
          cdn: {
            bodyWhiteSpace: getComputedStyle(cdnBody).whiteSpace,
            bodyFits: cdnBody.scrollWidth <= cdnBody.clientWidth + 1,
            urls: cdnCode.textContent.split("\\n")
          },
          steps: startSteps,
          a: {
            column: startABlock.style.getPropertyValue("--block-column"),
            row: startABlock.style.getPropertyValue("--block-row"),
            spanColumns: startABlock.style.getPropertyValue("--block-span-columns"),
            spanRows: startABlock.style.getPropertyValue("--block-span-rows")
          },
          b: {
            column: startBBlock.style.getPropertyValue("--block-column"),
            row: startBBlock.style.getPropertyValue("--block-row"),
            spanColumns: startBBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: startBBlock.style.getPropertyValue("--block-span-rows")
          },
          horizontalGap: startBBlockRect.left - startDivBlockRect.right,
          verticalGapAfterEli10: startABlockRect.top - eli10BlockRect.bottom
        },
        finishBlockTop: finishBlockRect.top,
        finishBlockBottom: finishBlockRect.bottom,
        codeOrResultTitles,
        contentOptions,
        contentPairs,
        contentOverview: {
          intro: contentStatement.querySelector("strong").textContent
        },
        menuLessonPair: {
          explanation: {
            column: menuLessonBlock.style.getPropertyValue("--block-column"),
            row: menuLessonBlock.style.getPropertyValue("--block-row"),
            spanColumns: menuLessonBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: menuLessonBlock.style.getPropertyValue("--block-span-rows")
          },
          code: {
            column: menuCodeBlock.style.getPropertyValue("--block-column"),
            row: menuCodeBlock.style.getPropertyValue("--block-row"),
            spanColumns: menuCodeBlock.style.getPropertyValue("--block-span-columns"),
            spanRows: menuCodeBlock.style.getPropertyValue("--block-span-rows")
          }
        },
        layoutLesson: {
          column: layoutLessonBlock.style.getPropertyValue("--block-column"),
          row: layoutLessonBlock.style.getPropertyValue("--block-row"),
          spanColumns: layoutLessonBlock.style.getPropertyValue("--block-span-columns"),
          spanRows: layoutLessonBlock.style.getPropertyValue("--block-span-rows")
        },
        contentExamples: {
          trusted: {
            tag: trustedDemo.tagName,
            text: trustedDemo.textContent.replace(/\\s+/g, " ").trim()
          },
          object: {
            tag: imageDemo.tagName,
            source: new URL(image.src).pathname,
            alt: image.alt,
            caption: imageDemo.querySelector("figcaption")?.textContent ?? null,
            fit: getComputedStyle(image).objectFit
          },
          factory: {
            tag: factoryDemo.tagName,
            state: factoryDemo.dataset.state,
            text: factoryButton.textContent
          },
          waves: {
            mounted: wavesDemo.dataset.wavesMounted,
            ready: wavesDemo.classList.contains("wv--ready"),
            role: wavesPre.getAttribute("role"),
            label: wavesPre.getAttribute("aria-label"),
            rows: wavesLines.length,
            columns: wavesLines.map(function (line) { return line.length; }),
            overflowX: wavesPre.scrollWidth - wavesDemo.clientWidth,
            overflowY: wavesPre.scrollHeight - wavesDemo.clientHeight,
            contentPadding: getComputedStyle(wavesContent).padding,
            width: wavesPre.getBoundingClientRect().width,
            height: wavesPre.getBoundingClientRect().height,
            hostWidth: wavesDemo.clientWidth,
            hostHeight: wavesDemo.clientHeight
          }
        },
        chapterGaps,
        codeBlockWidths,
        contentCodeOverflow,
        colorBlockStyles,
        randomExamples,
        randomMiniGrids,
        menuExamples,
        menuExampleGeometry,
        textOverlaps
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function measureManualMatrix(width, height, dpr = 1) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false
  });
  await navigateTo(`${pageUrl}docs/`);
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      window.dispatchEvent(new Event("resize"));
      await new Promise(function (resolveFrame) { requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); }); });
      const board = document.querySelector("#manual-board");
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const box = function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const rect = block.getBoundingClientRect();
        const title = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
        return {
          id,
          column: block.style.getPropertyValue("--block-column"),
          row: block.style.getPropertyValue("--block-row"),
          spanColumns: block.style.getPropertyValue("--block-span-columns"),
          spanRows: block.style.getPropertyValue("--block-span-rows"),
          top: rect.top,
          left: rect.left,
          width: rect.width,
          title: title?.textContent ?? "",
          actions: block.querySelectorAll(":scope > .blocks-system-menu button").length,
          kind: block.dataset.manualKind,
          tabIndex: title?.tabIndex ?? null,
          role: title?.getAttribute("role") ?? null,
          ariaLabel: title?.getAttribute("aria-label") ?? null
        };
      };
      const protectedBlocks = objects.filter(function (block) { return block.dataset.manualKind === "lesson"; }).map(function (block) {
        const title = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
        return {
          id: block.dataset.blockObject,
          actions: block.querySelectorAll(":scope > .blocks-system-menu button").length,
          tabIndex: title?.tabIndex ?? null,
          role: title?.getAttribute("role") ?? null,
          ariaLabel: title?.getAttribute("aria-label") ?? null
        };
      });
      const reader = document.querySelector("#manual-reader");
      const sandbox = document.querySelector("#manual-layout-sandbox");
      return {
        ready: board.dataset.manualReady,
        devicePixelRatio: window.devicePixelRatio,
        columns: getComputedStyle(board).gridTemplateColumns.split(" ").length,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageSurfaceCount: document.querySelectorAll(".blocks-system-surface").length,
        boardObjectCount: objects.length,
        protectedBlocks,
        tocCount: document.querySelectorAll(".docs-chapters").length,
        mastheadTitle: document.querySelector(".manual-masthead h1").textContent,
        reader: {
          tag: reader.tagName,
          headings: Array.from(reader.querySelectorAll("h2"), function (heading) { return heading.textContent; }),
          subheadings: Array.from(reader.querySelectorAll("h3"), function (heading) { return heading.textContent; }),
          text: reader.textContent.replace(/\\s+/g, " ").trim()
        },
        introCount: document.querySelectorAll("#manual-convention").length,
        start: box("manual-start"),
        startCode: box("manual-start-code"),
        startResult: box("manual-start-result"),
        contentPairs: ["html", "object", "factory"].map(function (name) { return { code: box("manual-content-" + name + "-code"), result: box("manual-content-" + name) }; }),
        chance: [
          box("manual-random-column-0"), box("manual-random-column-50"), box("manual-random-column-100"),
          box("manual-random-color-0"), box("manual-random-color-50"), box("manual-random-color-100"),
          box("manual-random-inverse-0"), box("manual-random-inverse-50"), box("manual-random-inverse-100")
        ],
        sandbox: {
          columns: getComputedStyle(sandbox).gridTemplateColumns.split(" ").length,
          objects: Array.from(sandbox.querySelectorAll(":scope > .blocks-system-object"), function (block) { return {
            id: block.dataset.blockObject,
            row: block.style.getPropertyValue("--block-row"),
            title: block.querySelector(".blocks-system-title").textContent
          }; })
        },
        humanTitles: [box("manual-menu-both"), box("manual-color-cyan"), box("manual-random-combined")]
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(`manual matrix probe: ${result.exceptionDetails.text}`);
  return result.result.value;
}

async function exerciseManualReset() {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await navigateTo(`${pageUrl}docs/`);
  const beforeReset = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const sandbox = document.querySelector("#manual-layout-sandbox");
      const draggable = sandbox.querySelector('[data-block-object="manual-layout-wide"]');
      const title = draggable.querySelector(".blocks-system-title");
      title.focus();
      title.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      document.querySelector('[data-block-object="manual-menu-both"] .blocks-system-close').click();
      return {
        movedRow: draggable.style.getPropertyValue("--block-row"),
        closed: !document.querySelector('[data-block-object="manual-menu-both"]')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (beforeReset.exceptionDetails) throw new Error(`manual reset before: ${beforeReset.exceptionDetails.exception?.description ?? beforeReset.exceptionDetails.text}`);
  const loaded = protocol.once("Page.loadEventFired");
  await protocol.send("Runtime.evaluate", {
    expression: `document.querySelector(".manual-reset-trigger").click()`
  });
  await loaded;
  const afterReset = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      return {
        restored: Boolean(document.querySelector('[data-block-object="manual-menu-both"]')),
        resetRow: document.querySelector('#manual-layout-sandbox [data-block-object="manual-layout-wide"]').style.getPropertyValue("--block-row")
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (afterReset.exceptionDetails) throw new Error(`manual reset after: ${afterReset.exceptionDetails.exception?.description ?? afterReset.exceptionDetails.text}`);
  if (!beforeReset.result.value || !afterReset.result.value) {
    throw new Error(`manual reset values missing: before=${JSON.stringify(beforeReset.result)} after=${JSON.stringify(afterReset.result)}`);
  }
  return { ...beforeReset.result.value, ...afterReset.result.value };
}

async function exerciseManualFactory() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(function () {
      const factory = document.querySelector(".manual-content-factory-demo");
      const beforeState = factory.dataset.state;
      const beforeText = factory.textContent;
      factory.click();
      return { beforeState, beforeText, afterState: factory.dataset.state, afterText: factory.textContent };
    })()`,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseManualVanillaWaves() {
  await navigateTo(`${pageUrl}docs/`);
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 120 && !document.querySelector(".manual-content-waves-demo pre"); attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      const host = document.querySelector(".manual-content-waves-demo");
      const block = host.closest(".blocks-system-object");
      const field = host.querySelector("pre");
      document.documentElement.style.scrollBehavior = "auto";
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const rect = block.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) break;
        block.scrollIntoView({ block: "center", behavior: "instant" });
        await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 80); });
      }
      await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 250); });
      const before = field.textContent;
      let after = before;
      for (let attempt = 0; attempt < 20 && after === before; attempt += 1) {
        await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 100); });
        after = field.textContent;
      }
      block.querySelector(".blocks-system-close").click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); }); });
      return {
        changed: before !== after,
        removed: !document.querySelector('[data-block-object="manual-content-waves"]'),
        destroyed: host.dataset.wavesMounted === "false",
        textDisconnected: !field.isConnected
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(`manual vanilla waves: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
  return result.result.value;
}

async function exerciseManualRandomness() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(function () {
      const ids = Array.from({ length: 12 }, function (_, index) { return "manual-random-mix-" + (index + 1); });
      const blocks = function () { return ids.map(function (id) { return document.querySelector('[data-block-object="' + id + '"]'); }); };
      const variants = function () { return blocks().map(function (block) { return block.dataset.blockVariant; }); };
      const color = document.querySelector("#manual-colorVariation");
      const inverse = document.querySelector("#manual-inversionVariation");
      const code = document.querySelector('[data-block-object="manual-random-code"] code');
      const button = document.querySelector(".manual-random-trigger");
      const outputs = Array.from(document.querySelectorAll(".manual-random-field output"));
      const initialNodes = blocks();
      const initialValues = outputs.map(function (output) { return output.value; });

      color.value = "1";
      inverse.value = "0";
      color.dispatchEvent(new Event("input", { bubbles: true }));
      const colorNodes = blocks();
      const colorCode = code.textContent;
      const colorVariants = variants();

      color.value = "0";
      inverse.value = "1";
      inverse.dispatchEvent(new Event("input", { bubbles: true }));
      const inverseNodes = blocks();
      const inverseCode = code.textContent;
      const inverseVariants = variants();

      const nativeRandom = Math.random;
      const randomSettings = [0.2, 0.8];
      Math.random = function () { return randomSettings.shift(); };
      button.click();
      Math.random = nativeRandom;
      return {
        label: button.textContent.trim(),
        sliderLabels: Array.from(document.querySelectorAll(".manual-random-label > span"), function (label) { return label.textContent; }),
        hasRunCounter: Boolean(document.querySelector(".manual-random-status")),
        initialValues,
        currentValues: outputs.map(function (output) { return output.value; }),
        colorCode,
        inverseCode,
        randomCode: code.textContent,
        colorVariants,
        inverseVariants,
        initialDetached: initialNodes.every(function (block) { return !block.isConnected; }),
        colorDetached: colorNodes.every(function (block) { return !block.isConnected; }),
        inverseDetached: inverseNodes.every(function (block) { return !block.isConnected; }),
        count: ids.filter(function (id) { return document.querySelector('[data-block-object="' + id + '"]'); }).length,
        markers: ids.map(function (id) { return document.querySelector('[data-block-object="' + id + '"] .manual-chance-cell strong').textContent; })
      };
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
      const reorderDetails = [];
      board.addEventListener("blocks:reorder", function (event) { reorderDetails.push(event.detail); });
      const move = async function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const handle = block.querySelector(":scope > .blocks-system-menu > .blocks-system-title");
        const beforeColumn = getComputedStyle(block).getPropertyValue("--block-column").trim();
        const beforeRow = getComputedStyle(block).getPropertyValue("--block-row").trim();
        handle.focus();
        const focusAcquired = document.activeElement === handle;
        handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
        await new Promise(function (resolveFrame) {
          requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
        });
        return {
          beforeColumn,
          beforeRow,
          afterColumn: getComputedStyle(block).getPropertyValue("--block-column").trim(),
          afterRow: getComputedStyle(block).getPropertyValue("--block-row").trim(),
          focusAcquired,
          focusAfterMove: document.activeElement === handle
        };
      };
      const movable = await move("manual-drag-movable");
      const locked = await move("manual-drag-locked");
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      return {
        movable,
        locked,
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
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const contentObjects = objects.filter(function (block) { return block.classList.contains("reference-cell"); });
      const axisObjects = objects.filter(function (block) { return block.classList.contains("reference-axis-block"); });
      const firstHandle = contentObjects[0].querySelector(":scope > .blocks-system-menu > .blocks-system-title");
      const firstTable = contentObjects[0].querySelector(".reference-table");
      const firstTableRow = firstTable.querySelector("tbody tr");
      const firstPurpose = firstTableRow.querySelector("td:last-child");
      const matrixLayout = function (block) {
        const style = getComputedStyle(block);
        return {
          id: block.dataset.blockObject,
          column: block.dataset.referenceColumn || null,
          aspect: block.dataset.referenceAspect || null,
          gridColumn: style.getPropertyValue("--block-column").trim(),
          gridRow: style.getPropertyValue("--block-row").trim(),
          spanColumns: style.getPropertyValue("--block-span-columns").trim(),
          spanRows: style.getPropertyValue("--block-span-rows").trim(),
          variant: block.dataset.blockVariant,
          color: block.dataset.blockColor || null
        };
      };
      return {
        blockCount: objects.length,
        contentBlockCount: contentObjects.length,
        axisBlockCount: axisObjects.length,
        ids: contentObjects.map(function (block) { return block.dataset.blockObject; }),
        matrix: contentObjects.map(matrixLayout),
        axes: axisObjects.map(matrixLayout),
        mapCells: Array.from(document.querySelectorAll(".reference-map-cell")).map(function (cell) {
          const target = document.querySelector(cell.getAttribute("href"));
          return {
            column: cell.dataset.referenceColumn,
            aspect: cell.dataset.referenceAspect,
            target: cell.getAttribute("href").slice(1),
            targetColumn: target?.dataset.referenceColumn || null,
            targetAspect: target?.dataset.referenceAspect || null,
            targetGridColumn: target ? getComputedStyle(target).getPropertyValue("--block-column").trim() : null,
            targetGridRow: target ? getComputedStyle(target).getPropertyValue("--block-row").trim() : null
          };
        }),
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
        axisMenuCount: axisObjects.reduce(function (count, block) {
          return count + block.querySelectorAll(".blocks-system-menu").length;
        }, 0),
        outsideBoard: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          return rect.left < boardRect.left - 0.5 || rect.right > boardRect.right + 0.5;
        }).map(function (block) { return block.dataset.blockObject; }),
        nonIntegerHorizontalGeometry: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
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
        focusHidden: document.querySelector("#reference-focus")?.hidden,
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

async function exerciseReferenceFocus() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const board = document.querySelector("#reference-board");
      const objectStates = function () {
        return Array.from(board.querySelectorAll(":scope > .reference-cell"), function (block) {
          return { id: block.dataset.blockObject, column: block.dataset.referenceColumn, minimized: block.dataset.blockMinimized };
        });
      };
      document.querySelector('[data-reference-focus="blocks"]').click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      const focused = {
        boardFocus: board.dataset.referenceFocus,
        objects: objectStates(),
        pressed: Array.from(document.querySelectorAll("#reference-focus [data-reference-focus]"), function (control) {
          return [control.dataset.referenceFocus, control.getAttribute("aria-pressed")];
        })
      };
      document.querySelector('[data-reference-focus="all"]').click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      return {
        focused,
        restored: {
          boardFocus: board.dataset.referenceFocus,
          objects: objectStates(),
          pressed: Array.from(document.querySelectorAll("#reference-focus [data-reference-focus]"), function (control) {
            return [control.dataset.referenceFocus, control.getAttribute("aria-pressed")];
          })
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureReferenceWithoutJavaScript() {
  await protocol.send("Emulation.setScriptExecutionDisabled", { value: true });
  try {
    await navigateTo(`${pageUrl}docs/api.html`);
    const entry = await protocol.send("Runtime.evaluate", {
      expression: `(() => {
        const fallback = document.querySelector(".reference-nojs");
        return {
          boardChildren: document.querySelector("#reference-board")?.children.length,
          fallbackVisible: Boolean(fallback) && getComputedStyle(fallback).display !== "none",
          fallbackHref: fallback?.querySelector("a")?.getAttribute("href") || null
        };
      })()`,
      returnByValue: true
    });
    await navigateTo(`${pageUrl}docs/reference-fallback.html`);
    const fallback = await protocol.send("Runtime.evaluate", {
      expression: `(() => Array.from(document.querySelectorAll(".reference-fallback-entry"), function (entry) {
        return { id: entry.id, title: entry.querySelector("h2")?.textContent };
      }))()`,
      returnByValue: true
    });
    return { entry: entry.result.value, fallback: fallback.result.value };
  } finally {
    await protocol.send("Emulation.setScriptExecutionDisabled", { value: false });
    await navigateTo(`${pageUrl}docs/api.html`);
  }
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
  const manualViewportMatrix = [];
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
    borderColor: "rgb(0, 0, 0)",
    menuBackground: "rgb(255, 255, 0)",
    menuColor: "rgb(0, 0, 0)",
    contentBackground: "rgba(0, 0, 0, 0)",
    contentColor: "rgb(20, 20, 15)",
    lightDirectMenuColor: "rgb(0, 0, 0)",
    lightDirectRestoredMenuColor: "rgb(239, 238, 232)",
    darkDirectMenuColor: "rgb(239, 238, 232)",
    darkArrayMenuColor: "rgb(239, 238, 232)"
  }, "een kleur uit de gebruikersarray moet alleen de titelbalk kleuren en de inhoud neutraal laten");

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
    "close-collapse-lower": "4"
  }, "de ×-knop moet vaste adressen van resterende blocks behouden");
  assert.deepEqual(closeCollapse.change, {
    type: "remove",
    id: "close-collapse-gap",
    ids: ["close-collapse-gap"]
  }, "een close-event mag geen impliciete compactie melden");

  const closeRowCollapse = await measureCloseRowCollapse();
  assert.deepEqual(closeRowCollapse.rows, {
    "close-row-top": "1",
    "close-row-lower": "4"
  }, "ook een volledig vrijgekomen vaste rij moet bewust leeg blijven");
  assert.deepEqual(closeRowCollapse.change, {
    type: "remove",
    id: "close-row-gap",
    ids: ["close-row-gap"]
  }, "de verwijdering moet zonder verborgen rijverschuiving in het change-event staan");

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
  assert.equal(afterHover.canvasVisual.outlineOffset, "0px", "hoverkader moet de dunne buitenrand zichtbaar versterken");
  assert.equal(afterHover.canvasVisual.boxShadow, beforeHover.canvasVisual.boxShadow, "hover mag geen onverwachte schaduw toevoegen");
  assert.equal(afterHover.canvasVisual.transform, beforeHover.canvasVisual.transform, "hover mag het block niet verplaatsen");
  assertBlockActions(await exerciseBlockActions("#home-board"), "home", 3);

  await navigateTo(`${pageUrl}docs/`);
  assertMainNavigation(await measureMainNavigation(), "manual", "manual");
  const desktopManual = await measureManual(1280, 900, 2);
  assert.equal(desktopManual.mastheadSourceLabel, "manual / ELI10 + nine steps · main · unreleased", "manual mag de gedeelde bronmetadata maar één keer in de masthead zetten");
  if (desktopManual.blockCount === 64) {
    assert.equal(desktopManual.devicePixelRatio, 2, "manual test niet werkelijk op DPR 2");
    assert.equal(desktopManual.columnCount, 6, "manual herstelt de zes-koloms documentgrid niet");
    assert.ok(desktopManual.horizontalOverflow <= 0.5, "manual krijgt horizontale overflow op desktop");
    assert.deepEqual(desktopManual.outsideBoard, [], "manual plaatst inhoud buiten zijn board");
    assert.deepEqual(desktopManual.clippedContent, [], "manual knipt inhoud af");
    assert.deepEqual(desktopManual.textOverlaps, [], "manual laat tekst overlappen");
    assert.ok(desktopManual.contentCodeOverflow.every(function (item) { return item.overflow <= 1; }), `manual contentcode krijgt interne verticale scroll: ${JSON.stringify(desktopManual.contentCodeOverflow)}`);
    assert.equal(desktopManual.pageSurfaceCount, 1, "manual moet één echt library-veld gebruiken");
    assert.equal(desktopManual.nestedSurfaces, 0, "manual mag geen geneste mini-app bevatten");
    assert.equal(desktopManual.draggable, "true", "manual moet de echte library-interactie behouden");
    assert.equal(desktopManual.mastheadTitle, "Container. Blocks. Grid. Block.", "manual mist de volledige systeemvolgorde in zijn hoofdtitel");
    assert.equal(desktopManual.introCount, 0, "manual legt bovenaan zijn zichtbare leerroute nog eens uit");
    assert.equal(desktopManual.mastheadBorderBottomWidth, "0px", "manual toont nog een horizontale lijn onder de titel");
    assert.deepEqual(desktopManual.codeOrResultTitles, [], "manual toont nog titeltekst met code of result");
    assert.deepEqual(
      { column: desktopManual.eli10.column, row: desktopManual.eli10.row, spanColumns: desktopManual.eli10.spanColumns, spanRows: desktopManual.eli10.spanRows },
      { column: "2", row: "1", spanColumns: "3", spanRows: "2" },
      "ELI10 moet één gridkolom naar rechts staan zonder van maat of rij te veranderen"
    );
    assert.equal(desktopManual.eli10.contentPadding, "0px", "ELI10 gebruikt nog library-binnenruimte rond de animatie");
    assert.equal(desktopManual.eli10.visualPadding, "0px", "ELI10 voegt zelf nog binnenruimte rond de animatie toe");
    assert.ok(Math.abs(desktopManual.eli10.visual.width - desktopManual.eli10.visual.hostWidth) <= 1, "ELI10 vult de beschikbare breedte niet");
    assert.ok(Math.abs(desktopManual.eli10.visual.height - desktopManual.eli10.visual.hostHeight) <= 1, "ELI10 vult de beschikbare hoogte niet");
    assert.ok(desktopManual.eli10.visual.hostWidth <= desktopManual.eli10.contentWidth + 1, "ELI10-host groeit buiten het inhoudsvlak");
    assert.ok(desktopManual.eli10.visual.hostHeight <= desktopManual.eli10.contentHeight + 1, "ELI10-host groeit verticaal buiten het inhoudsvlak");
    assert.deepEqual(desktopManual.layoutInvite, [
      {
        id: "manual-play-prompt",
        column: "6",
        row: "1",
        spanColumns: "1",
        spanRows: "1",
        variant: "regular",
        title: "",
        text: "Feel free to mess up this layout. You can just..."
      },
      {
        id: "manual-reset-block",
        column: "6",
        row: "2",
        spanColumns: "1",
        spanRows: "1",
        variant: "inverse",
        title: "",
        text: "Reset it!"
      }
    ], "de speeluitnodiging en werkende reset moeten exact op 6,1 en 6,2 staan");
    assert.ok(Math.abs(desktopManual.resetFill.contentWidth - desktopManual.resetFill.buttonWidth) <= 1, "Reset it! moet het volledige inhoudsvlak van zijn block vullen");
    assert.deepEqual(desktopManual.startPair.a, { column: "3", row: "4", spanColumns: "4", spanRows: "1" }, "de CDN-stap moet vier kolommen breed en rechts uitgelijnd zijn");
    assert.deepEqual(desktopManual.startPair.cdn, {
      bodyWhiteSpace: "nowrap",
      bodyFits: true,
      urls: [
        "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.1/blocks.system.css",
        "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.1/blocks.system.mjs"
      ]
    }, "de CDN-uitleg staat niet op één regel met beide echte release-URL's");
    assert.deepEqual(desktopManual.startPair.steps, [
      { id: "manual-start-div", title: "div", column: "1", row: "5", spanColumns: "2", spanRows: "1" },
      { id: "manual-start-blocks", title: "blocks", column: "1", row: "6", spanColumns: "2", spanRows: "1" },
      { id: "manual-start-grid", title: "grid", column: "1", row: "7", spanColumns: "2", spanRows: "1" },
      { id: "manual-layout", title: "block size and position", column: "1", row: "8", spanColumns: "2", spanRows: "1" }
    ], "manual setup volgt niet de vier ELI10-stappen");
    assert.deepEqual(desktopManual.startPair.b, { column: "3", row: "5", spanColumns: "4", spanRows: "4" }, "setup code staat niet naast de vier visuele stappen");
    assert.equal(desktopManual.columnGap, 6, "manual erft niet de standaardafstand van 6px uit de library");
    assert.equal(desktopManual.startPair.horizontalGap, desktopManual.columnGap, "setupstappen en setupcode gebruiken niet de standaard library-tussenruimte");
    assert.equal(desktopManual.startPair.verticalGapAfterEli10, desktopManual.rowHeight + 2 * desktopManual.rowGap, "manual 01 laat niet exact één rasterrij open na ELI10");
    const factoryPair = desktopManual.contentPairs.find(function (pair) { return pair.name === "factory"; });
    assert.deepEqual({
      introColumn: factoryPair.introColumn,
      introSpan: factoryPair.introSpan,
      codeColumn: factoryPair.codeColumn,
      codeSpan: factoryPair.codeSpan,
      resultColumn: factoryPair.resultColumn,
      resultSpan: factoryPair.resultSpan
    }, {
      introColumn: "1", introSpan: "1", codeColumn: "2", codeSpan: "3", resultColumn: "5", resultSpan: "2"
    }, "factory gebruikt niet de verhouding uitleg 1 + code 3 + resultaat 2");
    const wavesPair = desktopManual.contentPairs.find(function (pair) { return pair.name === "waves"; });
    assert.deepEqual({
      introColumn: wavesPair.introColumn,
      introSpan: wavesPair.introSpan,
      codeColumn: wavesPair.codeColumn,
      codeSpan: wavesPair.codeSpan,
      resultColumn: wavesPair.resultColumn,
      resultSpan: wavesPair.resultSpan
    }, {
      introColumn: "1", introSpan: "1", codeColumn: "2", codeSpan: "3", resultColumn: "5", resultSpan: "2"
    }, "vanilla.waves gebruikt niet de verhouding uitleg 1 + code 3 + resultaat 2");
    assert.deepEqual({
      intro: wavesPair.introRowSpan,
      code: wavesPair.codeRowSpan,
      result: wavesPair.resultRowSpan
    }, { intro: "2", code: "2", result: "2" }, "de compacte ASCII-les gebruikt niet twee rasterrijen");
    assert.equal(desktopManual.contentExamples.waves.mounted, "true", "de vanilla.waves-demo is niet gemount");
    assert.equal(desktopManual.contentExamples.waves.ready, true, "de gedeelde vanilla.waves-engine heeft het ASCII-veld niet geïnitialiseerd");
    assert.equal(desktopManual.contentExamples.waves.role, "img", "het ASCII-veld mist zijn toegankelijke rol");
    assert.match(desktopManual.contentExamples.waves.label, /ASCII content[\s\S]*vanilla\.waves/i, "het ASCII-contentblock legt zijn toegankelijke rol niet uit");
    assert.equal(desktopManual.contentExamples.waves.rows, 12, "het ASCII-veld heeft niet de twaalf aangeleverde tekstregels");
    assert.deepEqual(desktopManual.contentExamples.waves.columns, Array(12).fill(34), "het ASCII-veld heeft niet 34 tekens per rij");
    assert.ok(desktopManual.contentExamples.waves.overflowX <= 1 && desktopManual.contentExamples.waves.overflowY <= 1, "het ASCII-veld past niet in zijn resultaatblock");
    assert.equal(desktopManual.contentExamples.waves.contentPadding, "0px", "het ASCII-resultaat gebruikt nog binnenruimte van het block");
    assert.ok(Math.abs(desktopManual.contentExamples.waves.width - desktopManual.contentExamples.waves.hostWidth) <= 1, "het ASCII-veld vult de blockbreedte niet");
    assert.ok(Math.abs(desktopManual.contentExamples.waves.height - desktopManual.contentExamples.waves.hostHeight) <= 1, "het ASCII-veld vult de blockhoogte niet");
    assert.deepEqual(desktopManual.menuLessonPair, {
      explanation: { column: "1", row: "21", spanColumns: "2", spanRows: "2" },
      code: { column: "3", row: "21", spanColumns: "4", spanRows: "2" }
    }, "manual 03 is niet opgesplitst in uitleg 2×2 en code 4×2");
    assert.deepEqual(desktopManual.menuExampleGeometry, [
      { id: "manual-menu-both", column: "1", row: "23", spanColumns: "3", spanRows: "1" },
      { id: "manual-menu-minimize", column: "4", row: "23", spanColumns: "3", spanRows: "1" },
      { id: "manual-menu-close", column: "1", row: "24", spanColumns: "3", spanRows: "1" },
      { id: "manual-menu-none", column: "4", row: "24", spanColumns: "3", spanRows: "1" }
    ], "manual 03 gebruikt niet vier compacte 3×1-vensters in twee rijen");
    assert.deepEqual(desktopManual.layoutLesson, {
      column: "1", row: "8", spanColumns: "2", spanRows: "1"
    }, "size and position staat niet als één rij hoge subles onder setup");
    assert.ok(desktopManual.codeBlockWidths.every((item) => Math.abs(item.width - desktopManual.boardWidth) <= 2), "manual-code moet de volledige rustige leesbreedte gebruiken");
    assert.equal(desktopManual.reader.tag, "ARTICLE", "de doorlopende leesroute moet een article zijn");
    assert.equal(desktopManual.reader.headings.length, 10, "de doorlopende leesroute moet ELI10 en alle negen lessen bevatten");
    assert.ok(desktopManual.reader.subheadings.length >= 16, "de doorlopende leesroute mist sublessen");
    assert.match(desktopManual.reader.text, /anything the browser can render/i, "de doorlopende leesroute mist de kernuitleg");
    assert.equal(desktopManual.protectedBlocks.length, 64, "manual test niet elk libraryblok op zijn standaardinteractie");
    assert.deepEqual(desktopManual.protectedBlocks.filter(function (block) { return block.draggable === "false"; }).map(function (block) { return block.id; }), ["manual-drag-locked"], "manual moet exact één niet-versleepbaar block hebben");
    assert.ok(desktopManual.protectedBlocks.every(function (block) { return block.actions === 2; }), "elk manualblock moet standaard minimaliseren en sluiten tonen");
    assert.ok(desktopManual.protectedBlocks.filter(function (block) { return block.id !== "manual-drag-locked"; }).every(function (block) {
      return block.draggable === "true" && block.tabIndex === 0 && block.role === "button" && block.ariaLabel;
    }), `standaardinteractie ontbreekt op manualblocks: ${JSON.stringify(desktopManual.protectedBlocks)}`);
    assert.deepEqual(desktopManual.dragLessonPair, {
      explanation: { column: "1", row: "26", spanColumns: "2", spanRows: "1" },
      code: { column: "3", row: "26", spanColumns: "4", spanRows: "1" }
    }, "manual 04 is niet als afzonderlijke dragging-les opgebouwd");
    assert.deepEqual(desktopManual.dragResult, {
      column: "6",
      row: "28",
      spanColumns: "1",
      spanRows: "1",
      title: "I'm not draggable!",
      statement: null
    }, "manual 04 start niet compact en duidelijk in de verkeerde kolom");
    assert.deepEqual(desktopManual.dragPattern, [
      { id: "manual-drag-fixed-1", column: "1", row: "27", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-fixed-2", column: "2", row: "27", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-fixed-3", column: "3", row: "27", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-fixed-4", column: "4", row: "27", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-fixed-5", column: "6", row: "27", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-movable", column: "5", row: "28", spanColumns: "1", spanRows: "1" },
      { id: "manual-drag-locked", column: "6", row: "28", spanColumns: "1", spanRows: "1" }
    ], "manual 04 zet het sleepbare en vaste block niet naast elkaar onder de puzzel");
    assert.deepEqual(desktopManual.baseColorsLessonPair, {
      explanation: { column: "1", row: "30", spanColumns: "2", spanRows: "2" },
      code: { column: "3", row: "30", spanColumns: "2", spanRows: "2" }
    }, "manual 05 toont de vier basiskleuren niet als uitleg en echte CSS");
    assert.deepEqual(desktopManual.appearanceLessonPair, {
      explanation: { column: "1", row: "33", spanColumns: "2", spanRows: "1" },
      code: { column: "3", row: "33", spanColumns: "4", spanRows: "1" }
    }, "manual 06 is niet compact opgesplitst in uitleg 2×1 en code 4×1");
    assert.deepEqual(desktopManual.colorsLessonPair, {
      explanation: { column: "1", row: "37", spanColumns: "2", spanRows: "2" },
      code: { column: "3", row: "37", spanColumns: "4", spanRows: "2" }
    }, "manual 07 is niet opgesplitst in uitleg 2×2 en code 4×2");
    assert.deepEqual(desktopManual.randomLessonPair, {
      explanation: { column: "1", row: "42", spanColumns: "2", spanRows: "2" },
      code: { column: "3", row: "42", spanColumns: "3", spanRows: "2" }
    }, "manual 08 is niet opgesplitst in uitleg 2×2 en code 3×2");
    assert.deepEqual(desktopManual.randomAction, {
      column: "6", row: "42", spanColumns: "1", spanRows: "2", title: ""
    }, "manual 08 gebruikt de vrije zesde kolom niet voor de herhaalactie met lege titelbalk");
    assert.equal(desktopManual.nextStatementLines, 1, "manual 09 breekt 'now' onnodig naar een tweede desktopregel");
    assert.deepEqual(desktopManual.randomExamples, [
      "01", "02", "03", "04", "05", "06",
      "07", "08", "09", "10", "11", "12"
    ].map(function (marker) { return { marker, childCount: 1, title: "" }; }), "de kansvoorbeelden moeten sobere genummerde specimens met lege titlebars zijn");
    assert.deepEqual(desktopManual.randomMiniGrids.combined.map(function (item) { return { column: item.column, row: item.row }; }), [
      { column: "1", row: "44" }, { column: "2", row: "44" }, { column: "3", row: "44" },
      { column: "4", row: "44" }, { column: "5", row: "44" }, { column: "6", row: "44" },
      { column: "1", row: "45" }, { column: "2", row: "45" }, { column: "3", row: "45" },
      { column: "4", row: "45" }, { column: "5", row: "45" }, { column: "6", row: "45" }
    ], "manual 08 vormt geen twee volledige rijen van zes resultaten");
    assert.deepEqual(await exerciseManualFactory(), {
      beforeState: "structure",
      beforeText: "structure",
      afterState: "contrast",
      afterText: "contrast"
    }, "de factory-inhoud moet zichtbaar naar haar volgende state schakelen");
    assert.deepEqual(await exerciseManualVanillaWaves(), {
      changed: true,
      removed: true,
      destroyed: true,
      textDisconnected: true
    }, "de vanilla.waves-demo moet echt animeren en zijn ASCII-veld opruimen wanneer het block sluit");
    const randomness = await exerciseManualRandomness();
    assert.equal(randomness.label, "random", "manual 07 benoemt de nieuwe trekking niet duidelijk");
    assert.deepEqual(randomness.sliderLabels, ["colorVariation", "colorInverse"], "manual 07 toont niet de gevraagde exacte slidernamen");
    assert.equal(randomness.hasRunCounter, false, "manual 07 toont nog een overbodige run-teller");
    assert.deepEqual(randomness.initialValues, ["0.5", "0.5"], "manual 07 toont de twee beginwaarden niet");
    assert.deepEqual(randomness.currentValues, ["0.2", "0.8"], "random zet de sliders niet op de nieuw getrokken waarden");
    assert.match(randomness.colorCode, /blocks\.colorVariation = 1\.0;[\s\S]*blocks\.inversionVariation = 0\.0;/, "de zichtbare code volgt de color-instelling niet");
    assert.match(randomness.inverseCode, /blocks\.colorVariation = 0\.0;[\s\S]*blocks\.inversionVariation = 1\.0;/, "de zichtbare code volgt de inverse-instelling niet");
    assert.match(randomness.randomCode, /blocks\.colorVariation = 0\.2;[\s\S]*blocks\.inversionVariation = 0\.8;/, "de zichtbare code volgt de random sliderwaarden niet");
    assert.deepEqual(randomness.colorVariants, Array(12).fill("color"), "colorVariation 1 maakt niet alle twaalf blocks gekleurd");
    assert.deepEqual(randomness.inverseVariants, Array(12).fill("inverse"), "inversionVariation 1 maakt niet alle twaalf blocks inverse");
    assert.equal(randomness.initialDetached, true, "een sliderwijziging laat oude kansblocks in de DOM staan");
    assert.equal(randomness.colorDetached, true, "de tweede sliderwijziging laat de vorige kansblocks in de DOM staan");
    assert.equal(randomness.inverseDetached, true, "random laat de vorige kansblocks in de DOM staan");
    assert.equal(randomness.count, 12, "de twee kansrijen bevatten na herhalen niet twaalf blocks");
    assert.deepEqual(randomness.markers, ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"], "de kansrijen verliezen hun sobere volgnummering");
    assert.deepEqual(await exerciseManualKeyboardReorder(), {
      movable: {
        beforeColumn: "5", beforeRow: "28", afterColumn: "5", afterRow: "27",
        focusAcquired: true, focusAfterMove: true
      },
      locked: {
        beforeColumn: "6", beforeRow: "28", afterColumn: "6", afterRow: "28",
        focusAcquired: true, focusAfterMove: true
      },
      events: [{ id: "manual-drag-movable", input: "keyboard", direction: "up" }]
    }, "het gewone block moet in het gat kunnen en het expliciet vaste block moet ernaast blijven staan");
    assert.deepEqual(await exerciseManualMenuLesson(), {
      minimized: { state: "true", hidden: "true" },
      restored: "false",
      closeRemoved: true,
      remainingBlocks: 63
    }, "interactieve menuvoorbeelden moeten bedienbaar blijven naast de beschermde uitleg");
    await protocol.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false
    });
    await navigateTo(`${pageUrl}docs/`);
    const mobileManual = await measureManual(390, 844, 1);
    assert.equal(mobileManual.columnCount, 1, "manual moet op mobiel één rustige leeskolom behouden");
    assert.ok(mobileManual.horizontalOverflow <= 0.5, "manual krijgt horizontale overflow op mobiel");
    assert.deepEqual(mobileManual.outsideBoard, [], "manual plaatst blocks buiten het mobiele board");
    assert.equal(mobileManual.pageSurfaceCount, 1, "manual moet ook op mobiel één library-veld gebruiken");
    assert.equal(mobileManual.nestedSurfaces, 0, "manual mag ook op mobiel geen geneste mini-app bevatten");
    await protocol.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await navigateTo(pageUrl + "docs/api.html");
    const linearReferenceResult = await protocol.send("Runtime.evaluate", {
      expression: "(async () => { for (let attempt = 0; attempt < 60 && !document.querySelector('#reference-board')?.dataset.referenceReady; attempt += 1) await new Promise((done) => requestAnimationFrame(done)); const board = document.querySelector('#reference-board'); const blocks = Array.from(board.querySelectorAll(':scope > .blocks-system-object')); const rect = board.getBoundingClientRect(); const anchors = ['exports','options','container','system-methods','grid','system-state','blocks','add-options','block-layout','block-methods','content','titlebar-controls','dragging','reorder-event','appearance','colors','chance','block-controller','adapters','adapter-methods','field-dom','css-hooks','errors']; return { ready: board.dataset.referenceReady, boardTop: rect.top, indexCount: document.querySelectorAll('.reference-index').length, introCount: document.querySelectorAll('.reference-introduction').length, ids: blocks.map((block) => block.dataset.blockObject), contractKinds: Array.from(board.querySelectorAll('.reference-table tbody td:first-child'), (cell) => cell.textContent.split(' · ')[0]), missingAnchors: anchors.filter((id) => !document.getElementById(id)), columns: getComputedStyle(board).gridTemplateColumns.split(' ').length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, outside: blocks.filter((block) => { const box = block.getBoundingClientRect(); return box.left < rect.left - .5 || box.right > rect.right + .5; }).map((block) => block.dataset.blockObject), surfaces: board.querySelectorAll('.blocks-system-surface').length, draggable: board.dataset.draggable, quantized: board.dataset.quantized, tableOverflow: Array.from(board.querySelectorAll('.reference-table-wrap')).map((node) => getComputedStyle(node).overflow), verticallyScrollableTables: Array.from(board.querySelectorAll('.reference-table-wrap')).filter((node) => node.scrollHeight > node.clientHeight + 1).map((node) => node.closest('.blocks-system-object').dataset.blockObject) }; })()",
      awaitPromise: true,
      returnByValue: true
    });
    const linearReference = linearReferenceResult.result.value;
    assert.equal(linearReference.ready, "true", "reference meldt niet dat haar inhoud klaar is");
    assert.equal(linearReference.indexCount, 0, "reference toont bovenaan nog een TOC");
    assert.equal(linearReference.introCount, 0, "reference legt bovenaan de zichtbare leerroute nog eens uit");
    assert.deepEqual(linearReference.ids, [
      "reference-system-create", "reference-container", "reference-grid", "reference-block-create",
      "reference-block-layout", "reference-content", "reference-titlebar", "reference-dragging",
      "reference-appearance", "reference-color", "reference-chance", "reference-block-controller",
      "reference-definition-create", "reference-adapter-methods", "reference-field-signals", "reference-system-errors"
    ], "reference volgt niet dezelfde onderwijsroute als de manual");
    assert.deepEqual(linearReference.missingAnchors, [], "reference verliest nieuwe of bestaande deep links");
    for (const kind of ["property", "method", "event", "option"]) {
      assert.ok(linearReference.contractKinds.includes(kind), `reference maakt ${kind} niet zichtbaar als contractsoort`);
    }
    assert.equal(linearReference.columns, 6, "reference herstelt de zes-koloms documentgrid niet");
    assert.equal(linearReference.overflow <= 0.5, true, "reference krijgt horizontale overflow");
    assert.deepEqual(linearReference.outside, [], "reference plaatst contracten buiten het board");
    assert.equal(linearReference.surfaces, 0, "reference mag geen geneste grids bevatten");
    assert.equal(linearReference.draggable, "true", "reference moet dezelfde standaard sleepinteractie als de library tonen");
    assert.equal(linearReference.quantized, "true", "reference moet hele rastertracks gebruiken");
    const referenceInteractionsResult = await protocol.send("Runtime.evaluate", {
      expression: "Array.from(document.querySelectorAll('#reference-board > .blocks-system-object'), (block) => { const title = block.querySelector(':scope > .blocks-system-menu > .blocks-system-title'); return { actions: block.querySelectorAll(':scope > .blocks-system-menu button').length, draggable: block.dataset.blockDraggable, tabIndex: title.tabIndex, role: title.getAttribute('role') }; })",
      returnByValue: true
    });
    assert.equal(referenceInteractionsResult.result.value.length, 16, "reference mist blocks in de interactie-audit");
    assert.ok(referenceInteractionsResult.result.value.every(function (block) {
      return block.actions === 2 && block.draggable === "true" && block.tabIndex === 0 && block.role === "button";
    }), "reference gebruikt niet op elk block de standaardknoppen en sleepinteractie");
    assert.ok(Math.abs(linearReference.boardTop - desktopManual.boardTop) <= 0.5, "manual en reference starten hun desktopgrid niet op dezelfde y-positie");
    const referenceDocumentNode = await protocol.send("DOM.getDocument");
    const referenceBlockNode = await protocol.send("DOM.querySelector", {
      nodeId: referenceDocumentNode.root.nodeId,
      selector: '[data-block-object="reference-system-create"]'
    });
    await protocol.send("CSS.forcePseudoState", {
      nodeId: referenceBlockNode.nodeId,
      forcedPseudoClasses: ["hover"]
    });
    const referenceHover = await manualHoverSignature("reference-system-create");
    assert.equal(referenceHover.outlineWidth, "3px", "referenceblokken tonen geen mouseoverkader wanneer de leesvolgorde vergrendeld is");
    assert.equal(referenceHover.outlineColor, referenceHover.borderColor, "reference-mouseover gebruikt niet de kleur van het echte libraryblok");
    await protocol.send("CSS.forcePseudoState", { nodeId: referenceBlockNode.nodeId, forcedPseudoClasses: [] });
    assert.ok(linearReference.tableOverflow.every((value) => value === "auto"), "reference tabellen moeten lokaal kunnen scrollen");
    assert.deepEqual(linearReference.verticallyScrollableTables, [], "reference-tabellen mogen op desktop geen interne verticale scrollbar nodig hebben");
    await protocol.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false
    });
    await navigateTo(pageUrl + "docs/api.html");
    const mobileReferenceResult = await protocol.send("Runtime.evaluate", {
      expression: "(async () => { for (let attempt = 0; attempt < 60 && !document.querySelector('#reference-board')?.dataset.referenceReady; attempt += 1) await new Promise((done) => requestAnimationFrame(done)); await document.fonts.ready; window.scrollTo(0, 0); const board = document.querySelector('#reference-board'); const masthead = document.querySelector('.reference-masthead'); const title = masthead.querySelector('h1'); const mastheadRect = masthead.getBoundingClientRect(); const titleRect = title.getBoundingClientRect(); return { boardTop: board.getBoundingClientRect().top, masthead: { top: mastheadRect.top, bottom: mastheadRect.bottom, height: mastheadRect.height, titleHeight: titleRect.height, titleWidth: titleRect.width, titleFont: getComputedStyle(title).font, titleLetterSpacing: getComputedStyle(title).letterSpacing } }; })()",
      awaitPromise: true,
      returnByValue: true
    });
    assert.ok(Math.abs(mobileReferenceResult.result.value.boardTop - mobileManual.boardTop) <= 0.5, `manual en reference starten hun mobiele grid niet op dezelfde y-positie: ${mobileManual.boardTop} versus ${mobileReferenceResult.result.value.boardTop}; manual=${JSON.stringify(mobileManual.mastheadMetrics)}; reference=${JSON.stringify(mobileReferenceResult.result.value.masthead)}`);
  } else {
  assert.equal(desktopManual.ready, "true", "manual meldt niet dat de lesmatrix klaar is");
  assert.equal(desktopManual.devicePixelRatio, 2, "manual test niet werkelijk op DPR 2");
  assert.equal(desktopManual.columns, 5, "manual gebruikt geen betekenisvolle vijfkoloms-grid op desktop");
  assert.ok(desktopManual.horizontalOverflow <= 0.5, "manual krijgt horizontale overflow op desktop");
  assert.equal(desktopManual.pageSurfaceCount, 2, "les 04 heeft geen afzonderlijk sandbox-veld naast het manual-veld");
  assert.ok(desktopManual.boardObjectCount > 40, "manual verliest lessen uit de volledige beginnersroute");
  assert.equal(desktopManual.tocCount, 0, "manual toont bovenaan nog een TOC");
  assert.equal(desktopManual.introCount, 0, "manual legt bovenaan zijn zichtbare leerroute nog eens uit");
  assert.equal(desktopManual.reader.tag, "ARTICLE", "doorlopende lestekst staat niet in het primaire article");
  assert.deepEqual(desktopManual.reader.headings, [
    "00 / ELI10", "01 / start the system", "02 / content can be anything", "03 / titlebar controls",
    "04 / dragging", "05 / choose an appearance", "06 / set a color",
    "07 / set the chance", "08 / unblocked"
  ], "reader mode krijgt geen nette h2-hiërarchie per les");
  assert.ok(desktopManual.reader.subheadings.length >= 16, "sublessen missen h3-koppen in de leesversie");
  assert.match(desktopManual.reader.text, /anything the browser can render/i, "reader mode toont niet de doorlopende handleidingstekst");
  assert.ok(desktopManual.protectedBlocks.length > 15, "manual beschermt onvoldoende uitleg- en codeblokken");
  assert.ok(desktopManual.protectedBlocks.every(function (block) {
    return block.actions === 0 && (block.tabIndex === -1 || block.tabIndex === null) && block.role === null && block.ariaLabel === null;
  }), `uitleg- of codeblokken zijn nog sluitbaar of versleepbaar: ${JSON.stringify(desktopManual.protectedBlocks)}`);
  assert.deepEqual(desktopManual.humanTitles.map(function (block) { return block.title; }), ["03.1 / minimize + close", "07.1 / cyan", "08.1 / color + inverse"], "machine-ids lekken nog naar titelbalken");
  assert.deepEqual([desktopManual.start.column, desktopManual.start.row, desktopManual.start.spanColumns, desktopManual.start.spanRows], ["1", "5", "1", "3"], "les 01 staat niet in de uitlegkolom");
  assert.deepEqual([desktopManual.startCode.column, desktopManual.startCode.row, desktopManual.startCode.spanColumns, desktopManual.startCode.spanRows], ["2", "5", "1", "3"], "les 01-code staat niet in de codekolom");
  assert.deepEqual([desktopManual.startResult.column, desktopManual.startResult.row, desktopManual.startResult.spanColumns, desktopManual.startResult.spanRows], ["3", "5", "3", "3"], "les 01-resultaat vult niet de resultaatkolommen");
  desktopManual.contentPairs.forEach(function (pair, index) {
    const lessonNumber = `02.${index + 1}`;
    assert.equal(pair.code.column, "2", `${lessonNumber}-code staat niet in de codekolom`);
    assert.equal(pair.result.column, "3", `${lessonNumber}-resultaat staat niet naast de code`);
    assert.equal(pair.code.row, pair.result.row, `${lessonNumber}-code en resultaat delen geen lesrij`);
    assert.ok(pair.code.title.startsWith(lessonNumber) && pair.result.title.startsWith(lessonNumber), `${lessonNumber}-code en resultaat missen hun gedeelde subnummer`);
  });
  assert.deepEqual(desktopManual.chance.map(function (block) { return [block.column, block.row]; }), [
    ["3", "44"], ["4", "44"], ["5", "44"],
    ["3", "45"], ["4", "45"], ["5", "45"],
    ["3", "46"], ["4", "46"], ["5", "46"]
  ], "les 08 legt chance niet als 2×3-matrix in het grid vast");
  assert.deepEqual(desktopManual.sandbox, {
    columns: 3,
    objects: [
      { id: "manual-layout-wide", row: "1", title: "04.1 / drag here" },
      { id: "manual-layout-small", row: "1", title: "04.2 / flow" }
    ]
  }, "les 04 is geen zelfstandig oefenveld meer");
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
  assert.equal(afterManualHover.borderColor, "rgb(0, 0, 0)", "een gekleurd block behoudt niet zijn dunne zwarte buitenrand");
  assert.equal(afterManualHover.outlineColor, afterManualHover.borderColor, "manual-hover versterkt niet exact de zwarte blockrand");
  assert.equal(afterManualHover.outlineStyle, "solid", "manual-hover toont geen volledig librarykader");
  assert.equal(afterManualHover.outlineWidth, "3px", "manual-hover heeft niet de kracht van het librarykader");
  assert.equal(afterManualHover.outlineOffset, "0px", "manual-hover moet de dunne buitenrand zichtbaar versterken");
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
  assert.equal(inverseHover.borderColor, "rgb(0, 0, 0)", "het inverse block behoudt niet dezelfde dunne zwarte buitenrand");
  assert.equal(inverseHover.outlineColor, inverseHover.borderColor, "inverse-hover versterkt niet exact de zwarte blockrand");
  assert.equal(inverseHover.outlineWidth, "3px", "inverse-hover verliest de volledige kadersterkte");
  await protocol.send("CSS.forcePseudoState", { nodeId: inverseNode.nodeId, forcedPseudoClasses: [] });
  const mobileManual = await measureManualMatrix(390, 844);
  assert.equal(mobileManual.columns, 1, "manual valt op een smal scherm niet terug naar één leeskolom");
  assert.ok(mobileManual.horizontalOverflow <= 0.5, "manual krijgt horizontale overflow op mobiel");
  assert.ok(mobileManual.contentPairs.every(function (pair) { return pair.result.top > pair.code.top; }), "mobiel volgt een resultaat niet onder zijn eigen code in DOM-volgorde");
  for (const [width, height, , documentColumns] of manualViewportMatrix) {
    for (const dpr of [1, 2]) {
    const manual = await measureManual(width, height, dpr);
    assert.equal(manual.blockCount, 39, `manual mist een block uit de volledige beginnersroute op ${width}px @${dpr}x`);
    assert.deepEqual(manual.ids, [
      "manual-eli10", "manual-start", "manual-finish",
      "manual-content-html-code", "manual-content-html",
      "manual-content-object-code", "manual-content-object",
      "manual-content-factory-code", "manual-content-factory",
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
      "manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none", "manual-menu-title",
      "manual-layout-small",
      "manual-appearance-regular", "manual-appearance-inverse",
      "manual-color-cyan", "manual-color-magenta", "manual-color-yellow"
    ], `manual laat dubbele menuteksten niet weg op ${width}px @${dpr}x`);
    assert.equal(manual.menuTitles["manual-random-combined"], "color + inverse / 0.5 + 0.5", `het gecombineerde kansblock benoemt beide kansen niet op ${width}px @${dpr}x`);
    assert.deepEqual(manual.variants, [
      ...Array(21).fill("regular"), "inverse",
      ...Array(6).fill("regular"), "color", "color", "regular", "inverse", "inverse", "regular", "color", "color", "inverse", "regular", "regular"
    ], `manual beperkt kleur en omkering niet tot de bedoelde resultaten op ${width}px @${dpr}x`);
    assert.deepEqual(manual.colors, [
      ...Array(28).fill(null), "cyan", "magenta", null, null, null, null, "cyan", "yellow", null, null, null
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
    assert.equal(manual.menuActionCount, 74, `manual toont niet de volledige menu-aan/uitreeks op ${width}px`);
    assert.match(manual.boardBackgroundImage, /linear-gradient/, `manual toont het tijdelijke achtergrondgrid niet op ${width}px`);
    assert.equal(manual.quantized, "true", `manual quantiseert het grid niet op ${width}px`);
    assert.ok(Number.isInteger(manual.trackWidth) && manual.trackWidth > 0, `manual gebruikt geen hele trackbreedte op ${width}px`);
    assert.deepEqual(manual.nonIntegerHorizontalGeometry, [], `manual laat fractionele blockgeometrie achter op ${width}px: ${manual.nonIntegerHorizontalGeometry.join(", ")}`);
    assert.equal(manual.codeOverflow, "auto", `manual code scrollt niet intern op ${width}px`);
    assert.equal(manual.eli10.title, "00 / ELI10", `manual begint niet met ELI10 op ${width}px`);
    assert.equal(manual.mastheadTitle, "Container. Blocks. Grid. Block.", `manual mist de volledige systeemvolgorde in zijn hoofdtitel op ${width}px`);
    assert.equal(manual.eli10.visual.role, "img", `ELI10 publiceert zijn canvas niet als toegankelijke visual op ${width}px`);
    assert.match(manual.eli10.visual.label, /container div[\s\S]*blocks system[\s\S]*grid[\s\S]*block inside/i, `ELI10 beschrijft container, systeem, grid en block niet in zijn visual op ${width}px`);
    assert.ok(manual.eli10.visual.width > 0 && manual.eli10.visual.height > 0, `ELI10 rendert geen zichtbaar schema op ${width}px`);
    assert.ok(Math.abs(manual.eli10.visual.width - manual.eli10.visual.hostWidth) <= 1, `ELI10 vult zijn hostbreedte niet op ${width}px`);
    assert.ok(Math.abs(manual.eli10.visual.height - manual.eli10.visual.hostHeight) <= 1, `ELI10 vult zijn hosthoogte niet op ${width}px`);
    assert.ok(manual.finishBlockTop > manual.startBlockBottom, `manual 02 staat niet onder 01 op ${width}px @${dpr}x`);
    assert.ok(manual.contentOptions.every(function (option) { return option.blockTop > manual.finishBlockBottom; }), `manual 02 staat niet boven alle drie contentvoorbeelden op ${width}px @${dpr}x`);
    assert.match(manual.contentOverview.intro, /anything the browser can render/i, `manual legt de gemeenschappelijke contentregel niet uit op ${width}px`);
    assert.equal(manual.dragLesson.title, "drag here", `de oefenheader benoemt het sleepgebied niet op ${width}px`);
    assert.equal(manual.dragLesson.guideLine, "dashed", `de oefenheader mist zijn gestippelde draglijn op ${width}px`);
    assert.equal(manual.dragLesson.status, "column 1 · row 30", `de dragoefening toont zijn startcel niet op ${width}px`);
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
      assert.ok(manual.contentPairs.every(function (pair) { return Math.abs(pair.introTop - pair.codeTop) <= 0.5 && Math.abs(pair.codeTop - pair.resultTop) <= 0.5; }), `uitleg, code en resultaat delen niet dezelfde rij op ${width}px`);
      assert.ok(manual.contentPairs.every(function (pair) { return pair.introColumn === "1" && pair.introSpan === "1" && pair.codeColumn === "2" && pair.codeSpan === "2" && pair.resultColumn === "4" && pair.resultSpan === "3"; }), `uitleg, code en resultaat gebruiken niet 1×2 + 2×2 + 3×2 op ${width}px`);
      const expectedEli10Width = manual.trackWidth * 3 + manual.columnGap * 2;
      assert.ok(Math.abs(manual.eli10.blockWidth - expectedEli10Width) <= 2, `de ELI10-visual gebruikt niet exact de linker drie kolommen op ${width}px`);
      assert.ok(manual.chapterGaps.every(function (item) { return item.marginTop === 0; }), `manual gebruikt nog marge binnen een desktop-gridcel op ${width}px: ${JSON.stringify(manual.chapterGaps)}`);
      assert.ok(manual.chapterGaps.every(function (item) { return Math.abs(item.gap - openRowInterval) <= 0.5; }), `manual gebruikt niet exact één open desktop-gridrij op ${width}px: ${openRowInterval}px versus ${JSON.stringify(manual.chapterGaps)}`);
      assert.equal(new Set([...manual.randomMiniGrids.color, ...manual.randomMiniGrids.inverse].map((item) => item.top)).size, 1, `de twee afzonderlijke random-mini-grids delen geen rij op ${width}px`);
      assert.ok(Math.abs(manual.randomMiniGrids.inverse[0].left - manual.randomMiniGrids.color[2].right - manual.columnGap) <= 0.5, `de color- en inverse-mini-grid sluiten niet als twee rasterhelften op elkaar aan op ${width}px`);
      assert.equal(new Set(manual.randomMiniGrids.combined.map((item) => item.top)).size, 1, `de gecombineerde randomproef vormt geen eigen rij op ${width}px`);
      assert.ok(Math.abs(manual.randomMiniGrids.combined[0].left - manual.randomMiniGrids.color[0].left) <= 0.5 && Math.abs(manual.randomMiniGrids.combined[5].right - manual.randomMiniGrids.inverse[2].right) <= 0.5, `de gecombineerde zesdelige proef vult niet de volledige rasterrij op ${width}px`);
      assert.ok([...manual.randomMiniGrids.color, ...manual.randomMiniGrids.inverse, ...manual.randomMiniGrids.combined].every(function (item) { return Math.abs(item.height - manual.rowHeight) <= 0.5; }), `de chance-resultaten zijn geen echte 1×1-gridcellen op ${width}px`);
    }
    const expectedTitlebarColors = ["rgb(0, 255, 255)", "rgb(255, 0, 255)", "rgb(255, 255, 0)"];
    assert.deepEqual(manual.colorBlockStyles.map((style) => style.border), ["rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)"], `manual bewaart niet dezelfde zwarte blockrand op ${width}px`);
    assert.deepEqual(manual.colorBlockStyles.map((style) => style.menuBackground), expectedTitlebarColors, `manual zet de gebruikerskleur niet uitsluitend op de blockheader op ${width}px`);
    assert.ok(manual.colorBlockStyles.every((style) => style.objectBackground === "rgb(239, 238, 232)" && style.contentBackground === "rgb(239, 238, 232)"), `manual laat gebruikerskleur in het inhoudsvlak lekken op ${width}px`);
    assert.ok(manual.colorBlockStyles.every((style) => style.menuColor === "rgb(0, 0, 0)" && style.contentColor === "rgb(20, 20, 15)"), `manual bewaart geen neutrale inkt in gekleurde blocks op ${width}px`);
    assert.deepEqual(manual.menuExamples, [
      { id: "manual-menu-both", actions: ["minimize", "close"] },
      { id: "manual-menu-minimize", actions: ["minimize", "close"] },
      { id: "manual-menu-close", actions: ["minimize", "close"] },
      { id: "manual-menu-none", actions: ["minimize", "close"] }
    ], `manual toont de standaard titelbalkacties niet op elk voorbeeld op ${width}px`);
    assert.ok(manual.randomExamples.every(function (example) { return /^\d{2}$/.test(example.marker) && example.childCount === 1; }), `manual gebruikt nog generieke kaartinhoud in de kanscellen op ${width}px`);
    assert.equal(manual.contentExamples.trusted.tag, "ARTICLE", `manual toont trusted HTML niet als echte inhoud op ${width}px`);
    assert.match(manual.contentExamples.trusted.text, /Structure makes movement visible\./, `manual mist de typografische HTML-inhoud op ${width}px`);
    assert.equal(manual.contentExamples.object.tag, "FIGURE", `manual toont de foto niet als echt object op ${width}px`);
    assert.match(manual.contentExamples.object.source, /\/docs\/img\/skatepark\.jpg$/, `manual gebruikt niet de eenvoudige skatepark-bestandsnaam op ${width}px`);
    assert.equal(manual.contentExamples.object.alt, "Black-and-white skatepark with converging concrete ramps, painted lines and a metal rail.", `manual mist de beschrijvende foto-alttekst op ${width}px`);
    assert.equal(manual.contentExamples.object.caption, null, `manual toont nog een caption die niet meer in de voorbeeldcode staat op ${width}px`);
    assert.equal(manual.contentExamples.object.fit, "cover", `manual plaatst de foto niet beeldvullend op ${width}px`);
    assert.ok(manual.contentCodeOverflow.every(function (item) { return item.overflow <= 1; }), `manual contentcode krijgt interne verticale scroll op ${width}px: ${JSON.stringify(manual.contentCodeOverflow)}`);
    assert.deepEqual(manual.contentExamples.factory, {
      tag: "BUTTON",
      state: "structure",
      text: "structure"
    }, `manual start niet met een vers interactief factory-element op ${width}px`);
    assert.equal(manual.scrollbarWidth, "thin", `manual gebruikt geen dunne OS-scrollbar op ${width}px`);
    assert.match(manual.scrollbarColor, /rgba\(17, 17, 17, 0\.58\)/, `manual gebruikt geen neutrale scrollbar op ${width}px`);
    if (width <= 900) assert.ok(manual.contentPairs.every(function (pair) { return pair.resultTop > pair.codeTop; }), `responsive contentresultaten volgen hun eigen code niet op ${width}px`);
    assert.ok(manual.pageScrollable && manual.documentHeight > height, `manual gebruikt geen natuurlijke paginascroll op ${width}px`);
    assert.notEqual(manual.boardOverflowY, "scroll", `manual maakt het volledige board scrollbaar op ${width}px`);
    }
  }

  assert.deepEqual(await exerciseManualFactory(), {
    beforeState: "structure",
    beforeText: "structure",
    afterState: "contrast",
    afterText: "contrast"
  }, "de factory-inhoud moet zichtbaar naar haar volgende state schakelen");

  assert.deepEqual(await exerciseManualReset(), {
    movedRow: "2",
    closed: true,
    restored: true,
    resetRow: "1"
  }, "reset manual herstelt gesloten demo's en verplaatste sandboxblokken niet");

  const mobileNavigation = await exerciseMobileNavigation();
  assert.deepEqual(mobileNavigation.opened, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie publiceert haar open toestand niet volledig");
  assert.equal(mobileNavigation.controlsTarget, true, "mobiele navigatie koppelt de hamburger niet aan het bediende menu");
  assert.deepEqual(mobileNavigation.escaped, { open: false, expanded: "false", label: "open navigation", focusReturned: true }, "Escape sluit de mobiele navigatie niet met herstelde focus");
  assert.deepEqual(mobileNavigation.outside, { open: false, expanded: "false", label: "open navigation" }, "een buitenklik sluit de mobiele navigatie niet");
  assert.deepEqual(mobileNavigation.beforeResize, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie staat niet open vóór de breakpointtest");
  assert.deepEqual(mobileNavigation.afterResize, { open: false, expanded: "false", label: "open navigation" }, "desktopresize ruimt de mobiele navigatiestate niet op");
  assert.ok(desktopManual.humanTitles[0].actions === 2, "de interactieve menu-demo verliest zijn twee acties");

  await navigateTo(`${pageUrl}docs/api.html`);
  assertMainNavigation(await measureMainNavigation(), "reference", "reference");
  const referenceContentOrder = [
    "reference-system-create", "reference-system-state", "reference-system-methods", "reference-system-errors",
    "reference-block-options", "reference-block-properties", "reference-block-methods",
    "reference-definition-create", "reference-adapter-methods", "reference-field-signals"
  ];
  const referenceMatrix = [
    ["reference-system-create", "blocks", "create-options", "2", "2", "1", "3", "#d64f43"],
    ["reference-system-state", "blocks", "state-properties", "2", "5", "1", "3", "#d64f43"],
    ["reference-system-methods", "blocks", "methods", "2", "8", "1", "4", "#d64f43"],
    ["reference-system-errors", "blocks", "reactions-failures", "2", "12", "1", "4", "#d64f43"],
    ["reference-block-options", "block", "create-options", "3", "2", "1", "3", "#1675bf"],
    ["reference-block-properties", "block", "state-properties", "3", "5", "1", "3", "#1675bf"],
    ["reference-block-methods", "block", "methods", "3", "8", "1", "4", "#1675bf"],
    ["reference-definition-create", "definition-adapter", "create-options", "4", "2", "1", "3", "#7b4cbf"],
    ["reference-adapter-methods", "definition-adapter", "methods", "4", "8", "1", "4", "#7b4cbf"],
    ["reference-field-signals", "field-dom", "reactions-failures", "5", "12", "1", "4", "#008f6b"]
  ].map(([id, column, aspect, gridColumn, gridRow, spanColumns, spanRows, color]) => ({
    id, column, aspect, gridColumn, gridRow, spanColumns, spanRows, variant: "color", color
  }));
  const referenceAxes = [
    ["reference-axis-corner", "1", "1", "1", "1"],
    ["reference-axis-blocks", "2", "1", "1", "1"],
    ["reference-axis-block", "3", "1", "1", "1"],
    ["reference-axis-definition-adapter", "4", "1", "1", "1"],
    ["reference-axis-field-dom", "5", "1", "1", "1"],
    ["reference-axis-create-options", "1", "2", "1", "3"],
    ["reference-axis-state-properties", "1", "5", "1", "3"],
    ["reference-axis-methods", "1", "8", "1", "4"],
    ["reference-axis-reactions-failures", "1", "12", "1", "4"]
  ].map(([id, gridColumn, gridRow, spanColumns, spanRows]) => ({
    id, column: null, aspect: null, gridColumn, gridRow, spanColumns, spanRows, variant: "regular", color: null
  }));
  const referenceMap = [
    ["blocks", "create-options", "exports", "2", "2"],
    ["block", "create-options", "add-options", "3", "2"],
    ["definition-adapter", "create-options", "adapters", "4", "2"],
    ["blocks", "state-properties", "system-state", "2", "5"],
    ["block", "state-properties", "block-controller", "3", "5"],
    ["blocks", "methods", "system-methods", "2", "8"],
    ["block", "methods", "block-methods", "3", "8"],
    ["definition-adapter", "methods", "adapter-methods", "4", "8"],
    ["blocks", "reactions-failures", "errors", "2", "12"],
    ["field-dom", "reactions-failures", "reorder-event", "5", "12"]
  ].map(([column, aspect, target, targetGridColumn, targetGridRow]) => ({
    column, aspect, target, targetColumn: column, targetAspect: aspect, targetGridColumn, targetGridRow
  }));
  for (const [width, height, , documentColumns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const reference = await measureReference(width, height, dpr);
      assert.equal(reference.blockCount, 19, `reference mist matrixblokken op ${width}px @${dpr}x`);
      assert.equal(reference.contentBlockCount, 10, `reference mist inhoudsvakken op ${width}px @${dpr}x`);
      assert.equal(reference.axisBlockCount, 9, `reference mist vaste matrixassen op ${width}px @${dpr}x`);
      assert.deepEqual(reference.ids, referenceContentOrder, `reference bewaart geen normale kolom-per-kolom leesvolgorde op ${width}px @${dpr}x`);
      assert.equal(reference.columnCount, width > 1100 ? 5 : 1, `reference gebruikt ${reference.columnCount} in plaats van de juiste matrix- of leeskolommen op ${width}px @${dpr}x`);
      assert.equal(reference.devicePixelRatio, dpr, `reference test niet werkelijk op DPR ${dpr}`);
      assert.ok(reference.horizontalOverflow <= 0.5, `reference heeft ${reference.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.match(reference.boardBackgroundImage, /linear-gradient/, `reference toont het tijdelijke achtergrondgrid niet op ${width}px @${dpr}x`);
      assert.equal(reference.quantized, "true", `reference quantiseert het grid niet op ${width}px @${dpr}x`);
      assert.ok(Number.isInteger(reference.trackWidth) && reference.trackWidth > 0, `reference gebruikt geen hele trackbreedte op ${width}px @${dpr}x`);
      assert.equal(reference.draggable, "false", `reference bewaart zijn leesvolgorde niet op ${width}px @${dpr}x`);
      assert.deepEqual(reference.lockedHandleState, { tabIndex: -1, role: null, ariaLabel: null, shortcuts: null }, `reference zet een niet-werkende verplaatsheader in de tabvolgorde op ${width}px @${dpr}x`);
      assert.equal(reference.menuActionCount, 10, `reference moet enkel zijn tien inhoudsvakken kunnen minimaliseren op ${width}px @${dpr}x`);
      assert.equal(reference.axisMenuCount, 0, `reference-assen moeten vaste, niet-sluitbare labelblokken zijn op ${width}px @${dpr}x`);
      assert.equal(reference.focusHidden, false, `reference toont de focusacties niet na JavaScript op ${width}px @${dpr}x`);
      assert.equal(reference.nestedSurfaces, 0, `reference bevat ${reference.nestedSurfaces} geneste grids op ${width}px @${dpr}x`);
      assert.deepEqual(reference.outsideBoard, [], `reference plaatst blocks buiten het board op ${width}px @${dpr}x: ${reference.outsideBoard.join(", ")}`);
      assert.deepEqual(reference.nonIntegerHorizontalGeometry, [], `reference laat fractionele geometrie achter op ${width}px @${dpr}x: ${reference.nonIntegerHorizontalGeometry.join(", ")}`);
      assert.deepEqual(reference.missingAnchors, [], `reference mist anchors op ${width}px @${dpr}x: ${reference.missingAnchors.join(", ")}`);
      assert.ok(reference.localOverflowModes.every((mode) => mode === "auto"), `reference code gebruikt geen lokale overflow op ${width}px @${dpr}x`);
      if (width > 1100) {
        assert.deepEqual(reference.matrix, referenceMatrix, `reference moet ieder contractvak op zijn object × aspect-cel plaatsen op ${width}px @${dpr}x`);
        assert.deepEqual(reference.axes, referenceAxes, `reference moet zijn kolom- en rijassen exact op de matrix plaatsen op ${width}px @${dpr}x`);
        assert.deepEqual(reference.mapCells, referenceMap, `reference-minimap wijst niet naar de echte matrixcellen op ${width}px @${dpr}x`);
      }
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
  assert.deepEqual(await exerciseReferenceFocus(), {
    focused: {
      boardFocus: "blocks",
      objects: referenceContentOrder.map((id, index) => ({
        id,
        column: index < 4 ? "blocks" : index < 7 ? "block" : index < 9 ? "definition-adapter" : "field-dom",
        minimized: index < 4 ? "false" : "true"
      })),
      pressed: [["blocks", "true"], ["block", "false"], ["definition-adapter", "false"], ["field-dom", "false"], ["all", "false"]]
    },
    restored: {
      boardFocus: "all",
      objects: referenceContentOrder.map((id, index) => ({
        id,
        column: index < 4 ? "blocks" : index < 7 ? "block" : index < 9 ? "definition-adapter" : "field-dom",
        minimized: "false"
      })),
      pressed: [["blocks", "false"], ["block", "false"], ["definition-adapter", "false"], ["field-dom", "false"], ["all", "true"]]
    }
  }, "reference-kolomfocus minimaliseert de andere kolommen niet via blocks.system of herstelt ze niet");
  assert.deepEqual(await measureReferenceWithoutJavaScript(), {
    entry: { boardChildren: 0, fallbackVisible: true, fallbackHref: "reference-fallback.html" },
    fallback: [
      { id: "exports", title: "A1 / blocks / create + options" },
      { id: "system-state", title: "A2 / blocks / state + properties" },
      { id: "system-methods", title: "A3 / blocks / methods" },
      { id: "errors", title: "A4 / blocks / failures" },
      { id: "add-options", title: "B1 / block / create + options" },
      { id: "block-controller", title: "B2 / block / properties" },
      { id: "block-methods", title: "B3 / block / methods" },
      { id: "adapters", title: "C1 / definition + adapter / create + options" },
      { id: "adapter-methods", title: "C3 / definition + adapter / methods" },
      { id: "reorder-event", title: "D4 / field + DOM / reactions + boundaries" }
    ]
  }, "reference houdt zonder JavaScript geen normale, volledige leesroute over");

  }

  const aliases = {
    "manual.html": "start",
    "system.html": "start",
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

  for (const [route, readySelector, anchor] of [
    ["docs/#next", "#manual-board[data-manual-ready]", "#next"],
    ["docs/api.html#colors", "#reference-board[data-reference-ready]", "#colors"]
  ]) {
    await navigateTo(`${pageUrl}${route}`);
    await protocol.send("Runtime.evaluate", {
      expression: `(async () => { for (let attempt = 0; attempt < 120 && !document.querySelector(${JSON.stringify(readySelector)}); attempt += 1) await new Promise((done) => requestAnimationFrame(done)); return true; })()`,
      awaitPromise: true,
      returnByValue: true
    });
    await new Promise(function (resolveHash) { setTimeout(resolveHash, 80); });
    const hashPosition = await protocol.send("Runtime.evaluate", {
      expression: `(() => { const target = document.querySelector(${JSON.stringify(anchor)}); const box = target.getBoundingClientRect(); return { scrollY, top: box.top, bottom: box.bottom, viewport: innerHeight }; })()`,
      returnByValue: true
    });
    assert.ok(hashPosition.result.value.scrollY > 1000, `${route} blijft bovenaan nadat het dynamische doel is gemaakt`);
    assert.ok(hashPosition.result.value.top < hashPosition.result.value.viewport && hashPosition.result.value.bottom > 0, `${route} maakt het dynamische doel niet zichtbaar: ${JSON.stringify(hashPosition.result.value)}`);
  }

  console.log("browser-layout: gedeelde cascade, routes op 1440–320px @1x/@2x en zes legacy aliases — OK");
} finally {
  await browser.close();
}
