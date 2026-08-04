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
    return {
      blockCount: objects.length,
      columnCount: getComputedStyle(field).gridTemplateColumns.split(" ").length,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      backgroundImage: getComputedStyle(field).backgroundImage,
      draggable: field.dataset.draggable,
      devicePixelRatio: window.devicePixelRatio,
      nestedSurfaces: field.querySelectorAll(".blocks-system-surface").length,
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
      intro: {
        text: intro.textContent.replace(/\\s+/g, " ").trim(),
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
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const masthead = document.querySelector(".manual-masthead");
      const title = masthead.querySelector("h1");
      const intro = masthead.querySelector(".manual-intro");
      const heroImage = masthead.querySelector(".manual-hero-image");
      const heroPhoto = heroImage.querySelector("img");
      const mastheadRect = masthead.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const introRect = intro.getBoundingClientRect();
      const heroImageRect = heroImage.getBoundingClientRect();
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const contentOptions = ["manual-content-html", "manual-content-node", "manual-content-factory"].map(function (id) {
        const blockRect = board.querySelector('[data-block-object="' + id + '"]').getBoundingClientRect();
        return {
          id,
          blockTop: blockRect.top,
          blockWidth: blockRect.width
        };
      });
      const chapterIds = ["result", "layout", "colors", "random", "next"];
      const chapterGaps = chapterIds.map(function (id) {
        const block = document.getElementById(id);
        const previous = block.previousElementSibling;
        return { id, gap: block.getBoundingClientRect().top - previous.getBoundingClientRect().bottom };
      });
      const codeBlockWidths = Array.from(board.querySelectorAll(":scope > .manual-code-block"), function (block) {
        return { id: block.dataset.blockObject, width: block.getBoundingClientRect().width };
      });
      const colorContentColors = ["manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random-1", "manual-random-2", "manual-random-3"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        return getComputedStyle(block.querySelector(":scope > .blocks-system-content")).color;
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
        hero: {
          columnCount: getComputedStyle(masthead).gridTemplateColumns.split(" ").length,
          mastheadWidth: mastheadRect.width,
          titleRight: titleRect.right,
          titleBottom: titleRect.bottom,
          introBottom: introRect.bottom,
          imageLeft: heroImageRect.left,
          imageTop: heroImageRect.top,
          imageWidth: heroImageRect.width,
          imageHeight: heroImageRect.height,
          gridColumnStart: getComputedStyle(heroImage).gridColumnStart,
          source: new URL(heroPhoto.src).pathname,
          alt: heroPhoto.alt,
          fit: getComputedStyle(heroPhoto).objectFit
        },
        boardWidth: boardRect.width,
        contentOptions,
        chapterGaps,
        codeBlockWidths,
        colorContentColors
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
  assertMainNavigation(await measureMainNavigation(), "home", "home");
  for (const [width, height, homeColumns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const home = await measureHome(width, height, dpr);
      assert.equal(home.blockCount, 2, `home toont ${home.blockCount} in plaats van twee directe blocks op ${width}px @${dpr}x`);
      assert.equal(home.columnCount, homeColumns, `home gebruikt ${home.columnCount} in plaats van ${homeColumns} kolommen op ${width}px @${dpr}x`);
      assert.equal(home.devicePixelRatio, dpr, `home test niet werkelijk op DPR ${dpr}`);
      assert.ok(home.horizontalOverflow <= 0.5, `home heeft ${home.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.match(home.backgroundImage, /linear-gradient/, `home toont zijn constructieve raster niet op ${width}px @${dpr}x`);
      assert.equal(home.draggable, "true", `home start niet versleepbaar op ${width}px @${dpr}x`);
      assert.equal(home.nestedSurfaces, 0, `home bevat ${home.nestedSurfaces} geneste blocks-grids op ${width}px @${dpr}x`);
      assert.deepEqual(home.outsideBoard, [], `home plaatst blocks buiten het board op ${width}px @${dpr}x: ${home.outsideBoard.join(", ")}`);
      assert.deepEqual(home.clippedContent, [], `home knipt inhoud af op ${width}px @${dpr}x: ${home.clippedContent.join(", ")}`);
      assert.deepEqual(home.ids, ["home-title", "home-intro"], `home bewaart zijn korte leesvolgorde niet op ${width}px @${dpr}x`);
      assert.equal(home.title.text.trim(), "blocks.\nsystem.", `home verliest zijn canonieke titel op ${width}px @${dpr}x`);
      assert.match(home.title.fontFamily, /Instrument Sans/, `home gebruikt Instrument Sans niet voor de hoofdboodschap op ${width}px @${dpr}x`);
      assert.equal(home.title.whiteSpace, "pre-line", `home bewaart de titelregeleinde niet op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.title.leftOffset) <= 0.5, `home lijnt de hero-titel niet links uit op ${width}px @${dpr}x: ${home.title.leftOffset}px`);
      assert.match(home.intro.text, /individually addressable blocks/, `home benoemt de bibliotheek niet concreet op ${width}px @${dpr}x`);
      assert.equal(home.intro.href, "docs/", `home verwijst niet rechtstreeks naar de manual op ${width}px @${dpr}x`);
    }
  }

  const userColor = await measureUserColor();
  assert.deepEqual(userColor, {
    variant: "color",
    dataBlockColor: "yellow",
    objectBackground: "rgb(255, 255, 0)",
    objectColor: "rgb(0, 0, 0)",
    borderColor: "rgb(0, 0, 0)",
    menuBackground: "rgb(0, 0, 0)",
    menuColor: "rgb(255, 255, 0)",
    contentColor: "rgb(0, 0, 0)"
  }, "een kleur uit de gebruikersarray moet via de generieke kleurvariant neutrale zwarte blockinkt en de zwart/kleur-omkering gebruiken");

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

  await navigateTo(`${pageUrl}docs/`);
  assertMainNavigation(await measureMainNavigation(), "manual", "manual");
  for (const [width, height, , documentColumns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
    const manual = await measureManual(width, height, dpr);
    assert.equal(manual.blockCount, 22, `manual mist directe lesblokken op ${width}px @${dpr}x`);
    assert.deepEqual(manual.ids, [
      "manual-start", "manual-content-html", "manual-content-node", "manual-content-factory", "manual-finish",
      "manual-result-regular", "manual-result-inverse", "manual-layout", "manual-layout-wide", "manual-layout-small",
      "manual-colors", "manual-color-cyan", "manual-color-magenta", "manual-color-yellow", "manual-random",
      "manual-random-1", "manual-random-2", "manual-random-3", "manual-random-4", "manual-random-5", "manual-random-6", "manual-next"
    ], `manual bewaart zijn beginnersroute niet op ${width}px @${dpr}x`);
    assert.deepEqual(manual.variants, [
      "regular", "regular", "regular", "regular", "regular", "regular", "inverse", "regular", "regular", "inverse", "regular",
      "color", "color", "color", "regular", "color", "color", "color", "regular", "inverse", "regular", "inverse"
    ], `manual beperkt kleur en omkering niet tot de bedoelde resultaten op ${width}px @${dpr}x`);
    assert.deepEqual(manual.colors, [
      null, null, null, null, null, null, null, null, null, null, null,
      "cyan", "magenta", "yellow", null, "cyan", "magenta", "yellow", null, null, null, null
    ], `manual bewaart de gekozen gebruikerskleuren niet afzonderlijk op ${width}px @${dpr}x`);
    assert.equal(manual.devicePixelRatio, dpr, `manual test niet werkelijk op DPR ${dpr}`);
    assert.equal(manual.columnCount, documentColumns, `manual gebruikt ${manual.columnCount} in plaats van ${documentColumns} kolommen op ${width}px`);
    assert.equal(manual.hero.columnCount, documentColumns, `manual hero gebruikt niet dezelfde ${documentColumns}-kolomslogica op ${width}px`);
    assert.ok(manual.hero.source.endsWith("/docs/img/pexels-peter-dyllong-2158803154-37466849.jpg"), `manual hero laadt niet de gekozen foto op ${width}px`);
    assert.equal(manual.hero.alt, "Black-and-white landscape with a solitary tree beneath large clouds.", `manual hero mist bruikbare alttekst op ${width}px`);
    assert.equal(manual.hero.fit, "cover", `manual hero crop past niet in zijn module op ${width}px`);
    if (width > 900) {
      assert.equal(manual.hero.gridColumnStart, "6", `manual foto staat niet in de zesde desktopkolom op ${width}px`);
      assert.ok(Math.abs(manual.hero.imageHeight - 396) <= 0.5, `manual foto is niet drie rasterrijen hoog op ${width}px: ${manual.hero.imageHeight}px`);
      assert.ok(manual.hero.imageWidth < manual.hero.mastheadWidth / 5, `manual foto is breder dan één van zes hero-kolommen op ${width}px`);
    } else if (width > 560) {
      assert.equal(manual.hero.gridColumnStart, "3", `manual foto staat niet in de derde tabletkolom op ${width}px`);
      assert.ok(manual.hero.imageLeft >= manual.hero.titleRight - 0.5, `manual foto staat niet naast de herotekst op ${width}px`);
    } else {
      assert.equal(manual.hero.gridColumnStart, "1", `manual foto gebruikt mobiel niet de ene beschikbare kolom op ${width}px`);
      assert.ok(manual.hero.imageTop >= manual.hero.introBottom - 0.5, `manual foto stapelt mobiel niet na de hero-intro op ${width}px`);
    }
    assert.ok(manual.horizontalOverflow <= 0.5, `manual heeft ${manual.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(manual.outsideBoard, [], `manual plaatst blocks buiten het board op ${width}px: ${manual.outsideBoard.join(", ")}`);
    assert.deepEqual(manual.clippedContent, [], `manual knipt inhoud af op ${width}px: ${manual.clippedContent.join(", ")}`);
    assert.equal(manual.nestedSurfaces, 0, `manual bevat ${manual.nestedSurfaces} geneste blocks-grids op ${width}px`);
    assert.equal(manual.pageSurfaceCount, 1, `manual bevat ${manual.pageSurfaceCount} systemen op ${width}px`);
    assert.equal(manual.navigationCount, 1, `manual bevat ${manual.navigationCount} menu's op ${width}px`);
    assert.equal(manual.draggable, "false", `manual bewaart zijn vaste leesvolgorde niet op ${width}px`);
    assert.deepEqual(manual.lockedHandleState, { tabIndex: -1, ariaLabel: null }, `manual biedt geen schijnbare verplaatsbediening op ${width}px`);
    assert.equal(manual.menuActionCount, 0, `manual toont nog minimaliseer- of sluitknoppen op ${width}px`);
    assert.equal(manual.boardBackgroundImage, "none", `manual tekent nog een achtergrondgrid op ${width}px`);
    assert.equal(manual.quantized, "true", `manual quantiseert het grid niet op ${width}px`);
    assert.ok(Number.isInteger(manual.trackWidth) && manual.trackWidth > 0, `manual gebruikt geen hele trackbreedte op ${width}px`);
    assert.deepEqual(manual.nonIntegerHorizontalGeometry, [], `manual laat fractionele blockgeometrie achter op ${width}px: ${manual.nonIntegerHorizontalGeometry.join(", ")}`);
    assert.equal(manual.codeOverflow, "auto", `manual code scrollt niet intern op ${width}px`);
    assert.ok(manual.codeBlockWidths.every(function (item) { return Math.abs(item.width - manual.boardWidth) <= 2; }), `manual gebruikt niet de volle breedte voor lescode op ${width}px`);
    assert.ok(manual.chapterGaps.every(function (item) { return item.gap >= 15; }), `manual geeft een hoofdstuk geen ademruimte op ${width}px: ${JSON.stringify(manual.chapterGaps)}`);
    assert.deepEqual(manual.colorContentColors, ["rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)", "rgb(0, 0, 0)"], `manual laat gebruikerskleuren in de voorbeeldinhoud lekken op ${width}px`);
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

  const mobileNavigation = await exerciseMobileNavigation();
  assert.deepEqual(mobileNavigation.opened, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie publiceert haar open toestand niet volledig");
  assert.equal(mobileNavigation.controlsTarget, true, "mobiele navigatie koppelt de hamburger niet aan het bediende menu");
  assert.deepEqual(mobileNavigation.escaped, { open: false, expanded: "false", label: "open navigation", focusReturned: true }, "Escape sluit de mobiele navigatie niet met herstelde focus");
  assert.deepEqual(mobileNavigation.outside, { open: false, expanded: "false", label: "open navigation" }, "een buitenklik sluit de mobiele navigatie niet");
  assert.deepEqual(mobileNavigation.beforeResize, { open: true, expanded: "true", label: "close navigation" }, "mobiele navigatie staat niet open vóór de breakpointtest");
  assert.deepEqual(mobileNavigation.afterResize, { open: false, expanded: "false", label: "open navigation" }, "desktopresize ruimt de mobiele navigatiestate niet op");

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
      assert.equal(reference.menuActionCount, 0, `reference toont nog minimaliseer- of sluitknoppen op ${width}px @${dpr}x`);
      assert.equal(reference.nestedSurfaces, 0, `reference bevat ${reference.nestedSurfaces} geneste grids op ${width}px @${dpr}x`);
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
            })
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
      if (example === "basic-grid") {
        assert.deepEqual(exampleStyle.variants, ["regular", "inverse", "color", "regular"], `basic-grid gebruikt niet de generieke variant voor de gebruikerskleur op ${width}px`);
        assert.deepEqual(exampleStyle.colors, [null, null, "magenta", null], `basic-grid bewaart de geselecteerde gebruikerskleur niet afzonderlijk op ${width}px`);
      }
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
