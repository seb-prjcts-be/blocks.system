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
      gridWidth: field.clientWidth,
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
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
        const objectStyle = getComputedStyle(block.element);
        const menuStyle = getComputedStyle(block.element.querySelector(".blocks-system-menu"));
        const contentStyle = getComputedStyle(block.content);
        return {
          variant: block.variant,
          dataBlockColor: block.element.getAttribute("data-block-color"),
          objectBackground: objectStyle.backgroundColor,
          objectColor: objectStyle.color,
          borderColor: objectStyle.borderColor,
          menuBackground: menuStyle.backgroundColor,
          menuColor: menuStyle.color,
          contentBackground: contentStyle.backgroundColor,
          contentColor: contentStyle.color
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
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
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
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const contentOptions = ["manual-content-html", "manual-content-object", "manual-content-factory"].map(function (id) {
        const blockRect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
        return {
          id,
          blockTop: blockRect.top,
          blockWidth: blockRect.width
        };
      });
      const trustedDemo = board.querySelector(".manual-content-html-demo");
      const imageDemo = board.querySelector(".manual-content-image-demo");
      const image = imageDemo.querySelector("img");
      const factoryDemo = board.querySelector(".manual-content-factory-demo");
      const factoryButton = factoryDemo.querySelector("button");
      const chapterIds = ["result", "menu", "layout", "colors", "random", "next"];
      const chapterGaps = chapterIds.map(function (id) {
        const block = document.getElementById(id);
        const previous = block.previousElementSibling;
        return { id, gap: block.getBoundingClientRect().top - previous.getBoundingClientRect().bottom };
      });
      const codeBlockWidths = Array.from(board.querySelectorAll(":scope > .manual-code-block"), function (block) {
        return { id: block.dataset.blockObject, width: block.getBoundingClientRect().width };
      });
      const colorBlockStyles = ["manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random-1", "manual-random-2", "manual-random-3"].map(function (id) {
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
      const randomExamples = ["manual-random-1", "manual-random-2", "manual-random-3", "manual-random-4", "manual-random-5", "manual-random-6"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const lesson = block.querySelector(":scope > .blocks-system-content > .manual-lesson");
        return {
          title: block.querySelector(".blocks-system-title").textContent,
          eyebrow: lesson.querySelector("small").textContent,
          statement: lesson.querySelector("strong").textContent,
          body: lesson.querySelector("p").textContent
        };
      });
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
      const firstHandle = objects[0].querySelector(":scope > .blocks-system-menu");
      return {
        blockCount: objects.length,
        ids: objects.map(function (block) { return block.dataset.blockObject; }),
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
          ariaLabel: firstHandle.getAttribute("aria-label")
        },
        menuActionCount: board.querySelectorAll(".blocks-system-minimize, .blocks-system-close").length,
        devicePixelRatio: window.devicePixelRatio,
        codeOverflow: getComputedStyle(code).overflowX,
        scrollbarWidth: rootStyle.scrollbarWidth,
        scrollbarColor: rootStyle.scrollbarColor,
        boardWidth: boardRect.width,
        mastheadGap: boardRect.top - mastheadRect.bottom,
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

async function manualHoverSignature(blockId = "manual-random-1") {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(function () {
      const block = document.querySelector(${JSON.stringify(`[data-block-object="${blockId}"]`)});
      const handle = block.querySelector(":scope > .blocks-system-menu");
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
      const block = board.querySelector('[data-block-object="manual-random-1"]');
      const handle = block.querySelector(":scope > .blocks-system-menu");
      const beforeRow = getComputedStyle(block).getPropertyValue("--block-row").trim();
      let reorderDetail = null;
      board.addEventListener("blocks:reorder", function (event) { reorderDetail = event.detail; }, { once: true });
      handle.focus();
      const focusAcquired = document.activeElement === handle;
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      return {
        beforeRow,
        afterRow: getComputedStyle(block).getPropertyValue("--block-row").trim(),
        focusAcquired,
        event: reorderDetail && { id: reorderDetail.id, input: reorderDetail.input, direction: reorderDetail.direction }
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
      const firstHandle = objects[0].querySelector(":scope > .blocks-system-menu");
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
          ariaLabel: firstHandle.getAttribute("aria-label")
        },
        tableOverflowModes: Array.from(board.querySelectorAll(".reference-table-wrap"))
          .map(function (node) { return getComputedStyle(node).overflow; }),
        localOverflowModes: Array.from(board.querySelectorAll(".reference-code"))
          .map(function (node) { return getComputedStyle(node).overflow; }),
        fullWidthDifferences: objects.map(function (block) {
          return Math.abs(block.getBoundingClientRect().width - boardRect.width);
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
      assert.ok(home.intro.objectLineBoxHeight + 1 >= home.intro.objectInkHeight, `home geeft object. geen volledige regelbox op ${width}px @${dpr}x: ${home.intro.objectLineBoxHeight}px voor ${home.intro.objectInkHeight}px inkt`);
      assert.ok(home.intro.objectPaintedBottomSpace >= 8, `home geeft de zichtbare inkt van object. minder dan 8px onderruimte op ${width}px @${dpr}x: ${home.intro.objectPaintedBottomSpace}px`);
      assert.equal(home.intro.sequence, "add · span · place", `home spreekt de werkwoordentaal van het systeem niet op ${width}px @${dpr}x`);
      assert.match(home.intro.text, /your content becomes an object\./, `home legt de overgang van inhoud naar object niet uit op ${width}px @${dpr}x`);
      assert.equal(home.intro.href, "docs/", `home verwijst niet rechtstreeks naar de manual op ${width}px @${dpr}x`);
    }
  }

  const shortHome = await measureHome(826, 395);
  assert.equal(shortHome.clippedContent.includes("home-intro"), false, "object / start mag op de aangeleverde lage probleemmaat geen inhoud afsnijden");
  assert.equal(shortHome.intro.objectWhiteSpace, "nowrap", "object. moet op de aangeleverde lage probleemmaat één woord blijven");
  assert.ok(shortHome.intro.objectPaintedBottomSpace >= 8, `object. heeft op de aangeleverde lage probleemmaat maar ${shortHome.intro.objectPaintedBottomSpace}px zichtbare onderruimte`);

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
    contentColor: "rgb(20, 20, 15)"
  }, "een kleur uit de gebruikersarray moet alleen het blockkader en menu kleuren en de inhoud neutraal laten");

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
    selector: '[data-block-object="manual-random-1"]'
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
    selector: '[data-block-object="manual-result-inverse"]'
  });
  await protocol.send("CSS.forcePseudoState", {
    nodeId: inverseNode.nodeId,
    forcedPseudoClasses: ["hover"]
  });
  const inverseHover = await manualHoverSignature("manual-result-inverse");
  assert.equal(inverseHover.variant, "inverse", "de inverse-hoverrepro gebruikt geen inverse block");
  assert.equal(inverseHover.borderColor, "rgb(239, 238, 232)", "het inverse block gebruikt niet zijn lichte randkleur");
  assert.equal(inverseHover.outlineColor, inverseHover.borderColor, "inverse-hover gebruikt niet exact de lichte kleur van het blockkader");
  assert.equal(inverseHover.outlineWidth, "3px", "inverse-hover verliest de volledige kadersterkte");
  await protocol.send("CSS.forcePseudoState", { nodeId: inverseNode.nodeId, forcedPseudoClasses: [] });
  for (const [width, height, , documentColumns] of manualViewportMatrix) {
    for (const dpr of [1, 2]) {
    const manual = await measureManual(width, height, dpr);
    assert.equal(manual.blockCount, 27, `manual mist directe lesblokken op ${width}px @${dpr}x`);
    assert.deepEqual(manual.ids, [
      "manual-start", "manual-content-html", "manual-content-object", "manual-content-factory", "manual-finish",
      "manual-result-regular", "manual-result-inverse", "manual-menu", "manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none",
      "manual-layout", "manual-layout-wide", "manual-layout-small",
      "manual-colors", "manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random",
      "manual-random-1", "manual-random-2", "manual-random-3", "manual-random-4", "manual-random-5", "manual-random-6", "manual-next"
    ], `manual bewaart zijn beginnersroute niet op ${width}px @${dpr}x`);
    assert.deepEqual(manual.variants, [
      "regular", "regular", "regular", "inverse", "regular", "regular", "inverse", "regular", "regular", "regular", "regular", "regular", "regular", "regular", "inverse", "regular",
      "color", "color", "color", "regular", "color", "color", "color", "regular", "inverse", "regular", "inverse"
    ], `manual beperkt kleur en omkering niet tot de bedoelde resultaten op ${width}px @${dpr}x`);
    assert.deepEqual(manual.colors, [
      null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
      "cyan", "magenta", "yellow", null, "cyan", "magenta", "yellow", null, null, null, null
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
    assert.match(manual.lockedHandleState.ariaLabel, /arrow keys/i, `manual legt de toetsenbordverplaatsing niet toegankelijk uit op ${width}px`);
    assert.equal(manual.menuActionCount, 50, `manual toont niet de volledige menu-aan/uitreeks op ${width}px`);
    assert.equal(manual.boardBackgroundImage, "none", `manual tekent nog een achtergrondgrid op ${width}px`);
    assert.equal(manual.quantized, "true", `manual quantiseert het grid niet op ${width}px`);
    assert.ok(Number.isInteger(manual.trackWidth) && manual.trackWidth > 0, `manual gebruikt geen hele trackbreedte op ${width}px`);
    assert.deepEqual(manual.nonIntegerHorizontalGeometry, [], `manual laat fractionele blockgeometrie achter op ${width}px: ${manual.nonIntegerHorizontalGeometry.join(", ")}`);
    assert.equal(manual.codeOverflow, "auto", `manual code scrollt niet intern op ${width}px`);
    assert.ok(manual.codeBlockWidths.every(function (item) { return Math.abs(item.width - manual.boardWidth) <= 2; }), `manual gebruikt niet de volle breedte voor lescode op ${width}px`);
    assert.ok(manual.chapterGaps.every(function (item) { return item.gap >= 15; }), `manual geeft een hoofdstuk geen ademruimte op ${width}px: ${JSON.stringify(manual.chapterGaps)}`);
    assert.ok(manual.chapterGaps.every(function (item) { return Math.abs(item.gap - manual.mastheadGap) <= 0.5; }), `manual gebruikt na de masthead niet exact hetzelfde interval als tussen hoofdstukken op ${width}px: ${manual.mastheadGap}px versus ${JSON.stringify(manual.chapterGaps)}`);
    const expectedShellColors = ["rgb(0, 255, 255)", "rgb(255, 0, 255)", "rgb(255, 255, 0)", "rgb(0, 255, 255)", "rgb(255, 0, 255)", "rgb(255, 255, 0)"];
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
    beforeRow: "31",
    afterRow: "32",
    focusAcquired: true,
    event: { id: "manual-random-1", input: "keyboard", direction: "down" }
  }, "een manualblock moet via zijn echte libraryheader verplaatsbaar zijn");

  const mobileNavigation = await exerciseMobileNavigation();
  assert.deepEqual(mobileNavigation.opened, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie publiceert haar open toestand niet volledig");
  assert.equal(mobileNavigation.controlsTarget, true, "mobiele navigatie koppelt de hamburger niet aan het bediende menu");
  assert.deepEqual(mobileNavigation.escaped, { open: false, expanded: "false", label: "open navigation", focusReturned: true }, "Escape sluit de mobiele navigatie niet met herstelde focus");
  assert.deepEqual(mobileNavigation.outside, { open: false, expanded: "false", label: "open navigation" }, "een buitenklik sluit de mobiele navigatie niet");
  assert.deepEqual(mobileNavigation.beforeResize, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie staat niet open vóór de breakpointtest");
  assert.deepEqual(mobileNavigation.afterResize, { open: false, expanded: "false", label: "open navigation" }, "desktopresize ruimt de mobiele navigatiestate niet op");
  assertBlockActions(await exerciseBlockActions("#manual-board"), "manual", 27, 25, 25);
  assert.deepEqual(await exerciseManualMenuLesson(), {
    minimized: { state: "true", hidden: "true" },
    restored: "false",
    closeRemoved: true,
    remainingBlocks: 26
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
      assert.equal(reference.boardBackgroundImage, "none", `reference tekent nog een achtergrondgrid op ${width}px @${dpr}x`);
      assert.equal(reference.quantized, "true", `reference quantiseert het grid niet op ${width}px @${dpr}x`);
      assert.ok(Number.isInteger(reference.trackWidth) && reference.trackWidth > 0, `reference gebruikt geen hele trackbreedte op ${width}px @${dpr}x`);
      assert.equal(reference.draggable, "false", `reference bewaart zijn leesvolgorde niet op ${width}px @${dpr}x`);
      assert.deepEqual(reference.lockedHandleState, { tabIndex: -1, ariaLabel: null }, `reference zet een niet-werkende verplaatsheader in de tabvolgorde op ${width}px @${dpr}x`);
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
    "guide-blocks.html": "result",
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
