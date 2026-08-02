import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);
const chromePath = chromeCandidates.find(function (candidate) {
  return existsSync(candidate);
});

if (!chromePath) {
  throw new Error("browser-layout vereist Chrome, Edge of CHROME_PATH.");
}

function mimeType(path) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8"
  })[extname(path)] || "application/octet-stream";
}

const server = createServer(async function (request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("forbidden");
      return;
    }
    if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    const body = await readFile(target);
    response.writeHead(200, { "content-type": mimeType(target), "cache-control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
});

await new Promise(function (resolveListen, rejectListen) {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});

const address = server.address();
const pageUrl = `http://127.0.0.1:${address.port}/`;
const profile = await mkdtemp(join(tmpdir(), "blocks-system-layout-"));
let chrome;
let protocol;

function waitForDevTools(process) {
  return new Promise(function (resolveTools, rejectTools) {
    let output = "";
    const timeout = setTimeout(function () {
      rejectTools(new Error("Chrome DevTools startte niet binnen 15 seconden."));
    }, 15000);
    process.stderr.on("data", function (chunk) {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolveTools(match[1]);
    });
    process.once("exit", function (code) {
      clearTimeout(timeout);
      rejectTools(new Error(`Chrome stopte vóór de test met code ${code}.`));
    });
  });
}

class Protocol {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener("message", (event) => this.receive(event));
  }

  receive(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }
    const waiters = this.events.get(message.method);
    if (waiters?.length) waiters.shift()(message.params);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
    });
  }

  once(method) {
    return new Promise((resolveEvent) => {
      const waiters = this.events.get(method) || [];
      waiters.push(resolveEvent);
      this.events.set(method, waiters);
    });
  }
}

async function measure(width, rows) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  const expression = `(async function () {
    const input = document.querySelector("#rows");
    input.value = "${rows}";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise(function (resolveFrame) {
      requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
    });
    const field = document.querySelector("#field");
    const fieldRect = field.getBoundingClientRect();
    const fieldStyle = getComputedStyle(field);
    const rowGap = parseFloat(fieldStyle.rowGap);
    const rowSizes = fieldStyle.gridTemplateRows.split(" ").slice(0, ${rows}).map(parseFloat);
    const backgroundPitch = (field.clientHeight + rowGap) / ${rows};
    const objects = Array.from(field.querySelectorAll(".blocks-system-object")).map(function (block) {
      const content = block.querySelector(".blocks-system-content");
      const blockRect = block.getBoundingClientRect();
      const row = Number(getComputedStyle(block).gridRowStart);
      return {
        id: block.dataset.blockObject,
        height: blockRect.height,
        alignmentDelta: Number.isInteger(row)
          ? blockRect.top - fieldRect.top - parseFloat(fieldStyle.borderTopWidth) - (row - 1) * backgroundPitch
          : null,
        overflow: content.scrollHeight > content.clientHeight || content.scrollWidth > content.clientWidth
      };
    });
    return {
      fieldHeight: fieldRect.height,
      minBlockHeight: Math.min(...objects.map(function (block) { return block.height; })),
      rowSizes,
      misaligned: objects.filter(function (block) {
        return block.alignmentDelta !== null && Math.abs(block.alignmentDelta) > 0.25;
      }).map(function (block) { return block.id; }),
      overflowing: objects.filter(function (block) { return block.overflow; }).map(function (block) { return block.id; })
    };
  })()`;
  const result = await protocol.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function hoverSignature() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(() => {
      const field = document.querySelector("#field");
      const block = document.querySelector('[data-block-object="canvas"]');
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

async function measureExamples(width, height) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#docs-board")?.dataset.docsBoardReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      window.scrollTo(0, 0);
      const board = document.querySelector("#docs-board");
      const boardRect = board.getBoundingClientRect();
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const statements = objects.map(function (block) {
        return { block, content: block.querySelector(":scope > .blocks-system-content"), statement: block.querySelector(":scope > .blocks-system-content > *") };
      });
      const links = Array.from(board.querySelectorAll(".example-actions a, .examples-next a"));
      const controls = Array.from(document.querySelectorAll(".docs-board-controls button, .docs-board-controls label, .docs-board-controls select"));
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        documentHeight: document.documentElement.scrollHeight,
        boardBottom: boardRect.bottom,
        outsideBoard: objects.filter(function (block) {
          const rect = block.getBoundingClientRect();
          return rect.left < boardRect.left - 0.5 || rect.right > boardRect.right + 0.5;
        }).map(function (block) { return block.dataset.blockObject; }),
        clippedStatements: statements.filter(function ({ content, statement }) {
          return content.scrollWidth > content.clientWidth + 1 || content.scrollHeight > content.clientHeight + 1 ||
            statement.scrollWidth > statement.clientWidth + 1 || statement.scrollHeight > statement.clientHeight + 1;
        }).map(function ({ block }) { return block.dataset.blockObject; }),
        nestedSurfaces: board.querySelectorAll(".blocks-system-surface").length,
        closeButtons: board.querySelectorAll(":scope > .blocks-system-object .blocks-system-close").length,
        scrollbarWidth: rootStyle.scrollbarWidth,
        scrollbarColor: rootStyle.scrollbarColor,
        hiddenActions: links.filter(function (link) {
          const rect = link.getBoundingClientRect();
          return rect.width < 1 || rect.height < 1 || getComputedStyle(link).visibility === "hidden";
        }).map(function (link) { return link.textContent.trim(); }),
        clippedControls: controls.filter(function (control) {
          return control.scrollWidth > control.clientWidth + 1 || control.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5;
        }).map(function (control) { return control.textContent.trim(); }),
        routeBorderWidths: ["basic-route", "mixed-route", "adapter-route", "next-step"].map(function (id) {
          return getComputedStyle(board.querySelector('[data-block-object="' + id + '"] .example-route, [data-block-object="' + id + '"] .examples-next')).borderLeftWidth;
        })
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseExamples() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      const board = document.querySelector("#docs-board");
      const toggle = document.querySelector("#toggle-minimized");
      const density = document.querySelector("#density");
      const boardSize = document.querySelector("#board-size");
      const counter = board.querySelector(".adapter-live-root output");
      board.querySelector(".adapter-live-root button").click();
      const incremented = counter.value;
      toggle.click();
      await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      const allMinimized = Array.from(board.querySelectorAll(":scope > .blocks-system-object")).every(function (block) {
        return block.dataset.blockMinimized === "true";
      });
      toggle.click();
      const allRestored = Array.from(board.querySelectorAll(":scope > .blocks-system-object")).every(function (block) {
        return block.dataset.blockMinimized === "false";
      });
      density.value = "roomy";
      density.dispatchEvent(new Event("change", { bubbles: true }));
      boardSize.value = "12,6";
      boardSize.dispatchEvent(new Event("change", { bubbles: true }));
      const changedStatus = document.querySelector("#board-status").textContent;
      document.querySelector("#reset-board").click();
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      const close = board.querySelector('[data-block-object="basic-1"] .blocks-system-close');
      close.click();
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      const closedCount = board.querySelectorAll(":scope > .blocks-system-object").length;
      const closedStatus = document.querySelector("#board-status").textContent;
      document.querySelector("#reset-board").click();
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      return {
        incremented,
        allMinimized,
        allRestored,
        changedStatus,
        resetDensity: density.value,
        resetBoard: boardSize.value,
        closedCount,
        closedStatus,
        restoredCount: board.querySelectorAll(":scope > .blocks-system-object").length,
        restoredCloseButtons: board.querySelectorAll(":scope > .blocks-system-object .blocks-system-close").length,
        restoredStatus: document.querySelector("#board-status").textContent,
        restoredOrder: Array.from(board.querySelectorAll(":scope > .blocks-system-object")).map(function (block) {
          return block.dataset.blockObject;
        }),
        resetMinimized: Array.from(board.querySelectorAll(':scope > .blocks-system-object[data-block-minimized="true"]')).map(function (block) {
          return block.dataset.blockObject;
        })
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function measureManual(width, height) {
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      for (let attempt = 0; attempt < 60 && !document.querySelector("#manual-board")?.dataset.manualReady; attempt += 1) {
        await new Promise(function (resolveFrame) { requestAnimationFrame(resolveFrame); });
      }
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      window.scrollTo(0, 0);
      const board = document.querySelector("#manual-board");
      const boardRect = board.getBoundingClientRect();
      const objects = Array.from(board.querySelectorAll(":scope > .blocks-system-object"));
      const canvas = board.querySelector(".manual-canvas");
      const canvasRect = canvas.getBoundingClientRect();
      const video = board.querySelector(".manual-media video");
      const videoRect = video.getBoundingClientRect();
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const formBlocks = ["manual-cycle", "manual-rectangle", "manual-direction"].map(function (id) {
        const block = board.querySelector('[data-block-object="' + id + '"]');
        const blockRect = block.getBoundingClientRect();
        const shape = block.querySelector(".manual-circle, .manual-rectangle, .manual-triangle");
        const shapeRect = shape.getBoundingClientRect();
        return {
          id,
          blockTop: blockRect.top,
          blockWidth: blockRect.width,
          shapeCenterY: shapeRect.top + shapeRect.height / 2,
          color: getComputedStyle(shape).backgroundColor
        };
      });
      return {
        blockCount: objects.length,
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
        draggable: board.dataset.draggable,
        codeOverflow: getComputedStyle(code).overflowX,
        scrollbarWidth: rootStyle.scrollbarWidth,
        scrollbarColor: rootStyle.scrollbarColor,
        formBlocks,
        canvas: {
          cssWidth: canvasRect.width,
          cssHeight: canvasRect.height,
          bitmapWidth: canvas.width,
          bitmapHeight: canvas.height
        },
        video: {
          width: videoRect.width,
          height: videoRect.height,
          controls: video.controls,
          fit: getComputedStyle(video).objectFit,
          preload: video.preload
        }
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function exerciseManual() {
  const pointResult = await protocol.send("Runtime.evaluate", {
    expression: `(() => {
      const center = function (element, xFactor) {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width * xFactor, y: rect.top + rect.height / 2 };
      };
      return {
        start: center(document.querySelector('[data-block-object="manual-cycle"] > .blocks-system-menu'), 0.5),
        target: center(document.querySelector('[data-block-object="manual-rectangle"] > .blocks-system-menu'), 0.8)
      };
    })()`,
    returnByValue: true
  });
  const { start, target } = pointResult.result.value;
  await protocol.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: start.x, y: start.y });
  await protocol.send("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await protocol.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: start.x + (target.x - start.x) * progress,
      y: start.y + (target.y - start.y) * progress,
      button: "left",
      buttons: 1
    });
  }
  await protocol.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", buttons: 0, clickCount: 1 });

  const result = await protocol.send("Runtime.evaluate", {
    expression: `(async function () {
      await new Promise(function (resolveFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(resolveFrame); });
      });
      const board = document.querySelector("#manual-board");
      const order = function () {
        return Array.from(board.querySelectorAll(":scope > .blocks-system-object")).map(function (block) {
          return block.dataset.blockObject;
        });
      };
      const draggedOrder = order();
      const dragCleanedUp = !board.hasAttribute("data-dragging") && !board.querySelector(".is-dragging");
      document.querySelector("#manual-lock").click();
      const locked = board.dataset.draggable === "false" && document.querySelector("#manual-lock").getAttribute("aria-pressed") === "true";
      document.querySelector("#manual-reset").click();
      return {
        draggedOrder,
        dragCleanedUp,
        locked,
        resetOrder: order(),
        resetDraggable: board.dataset.draggable,
        resetStatus: document.querySelector("#manual-status").textContent
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

try {
  chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const browserSocketUrl = await waitForDevTools(chrome);
  const devToolsPort = new URL(browserSocketUrl).port;
  const targets = await fetch(`http://127.0.0.1:${devToolsPort}/json/list`).then(function (response) {
    return response.json();
  });
  const target = targets.find(function (entry) { return entry.type === "page"; });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(function (resolveSocket, rejectSocket) {
    socket.addEventListener("open", resolveSocket, { once: true });
    socket.addEventListener("error", rejectSocket, { once: true });
  });
  protocol = new Protocol(socket);
  await protocol.send("Page.enable");
  await protocol.send("DOM.enable");
  await protocol.send("CSS.enable");
  await protocol.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  const loaded = protocol.once("Page.loadEventFired");
  await protocol.send("Page.navigate", { url: pageUrl });
  await loaded;

  for (const width of [1280, 800, 390]) {
    const fourRows = await measure(width, 4);
    const eightRows = await measure(width, 8);
    for (const [rows, result] of [[4, fourRows], [8, eightRows]]) {
      assert.ok(result.minBlockHeight >= 109.5, `${width}px/${rows} rijen plet een block tot ${result.minBlockHeight}px`);
      assert.ok(result.rowSizes.length === rows && result.rowSizes.every(function (size) { return Math.abs(size - 110) <= 0.25; }), `${width}px/${rows} rijen gebruikt ongelijke rastereenheden: ${result.rowSizes.join(", ")}`);
      assert.deepEqual(result.misaligned, [], `${width}px/${rows} rijen lijnt blocks niet uit: ${result.misaligned.join(", ")}`);
      assert.deepEqual(result.overflowing, [], `${width}px/${rows} rijen laat inhoud overlopen in ${result.overflowing.join(", ")}`);
    }
    assert.ok(eightRows.fieldHeight > fourRows.fieldHeight, `${width}px laat extra rijen het veld niet groeien`);
  }

  await measure(1280, 4);
  const beforeHover = await hoverSignature();
  const documentNode = await protocol.send("DOM.getDocument");
  const canvasNode = await protocol.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: '[data-block-object="canvas"]'
  });
  await protocol.send("CSS.forcePseudoState", {
    nodeId: canvasNode.nodeId,
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

  await navigateTo(`${pageUrl}docs/examples.html`);
  for (const [width, height] of [[1280, 720], [800, 900], [390, 844]]) {
    const examples = await measureExamples(width, height);
    assert.ok(examples.horizontalOverflow <= 0.5, `examples heeft ${examples.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(examples.outsideBoard, [], `examples plaatst blocks buiten het board op ${width}px: ${examples.outsideBoard.join(", ")}`);
    assert.deepEqual(examples.clippedStatements, [], `examples knipt statements af op ${width}px: ${examples.clippedStatements.join(", ")}`);
    assert.equal(examples.nestedSurfaces, 0, `examples bevat opnieuw ${examples.nestedSurfaces} geneste blocks-grids op ${width}px`);
    assert.equal(examples.closeButtons, 13, `examples toont ${examples.closeButtons} in plaats van 13 ×-sluitknoppen op ${width}px`);
    assert.equal(examples.scrollbarWidth, "thin", `examples gebruikt geen dunne OS-scrollbar op ${width}px`);
    assert.match(examples.scrollbarColor, /rgba\(17, 17, 17, 0\.58\)/, `examples gebruikt geen neutrale scrollbar op ${width}px`);
    assert.deepEqual(examples.hiddenActions, [], `examples verbergt acties op ${width}px: ${examples.hiddenActions.join(", ")}`);
    assert.deepEqual(examples.clippedControls, [], `examples knipt controls af op ${width}px: ${examples.clippedControls.join(", ")}`);
    assert.deepEqual(examples.routeBorderWidths, ["0px", "0px", "0px", "0px"], `examples toont opnieuw verticale kleurstroken op ${width}px`);
    if (width === 1280) {
      assert.ok(examples.boardBottom <= height, `examples-board past niet in het desktopscherm: ${examples.boardBottom}px > ${height}px`);
      assert.ok(examples.documentHeight <= height, `examples is niet langer één scherm op desktop: ${examples.documentHeight}px > ${height}px`);
    }
  }
  const examplesInteraction = await exerciseExamples();
  assert.equal(examplesInteraction.incremented, "4", "examples adapter increment werkt niet meer");
  assert.equal(examplesInteraction.allMinimized, true, "examples kan niet alle blocks minimaliseren");
  assert.equal(examplesInteraction.allRestored, true, "examples kan de blocks niet herstellen");
  assert.match(examplesInteraction.changedStatus, /12 × 6 · roomy/, "examples status volgt density/board niet");
  assert.equal(examplesInteraction.resetDensity, "normal", "examples reset herstelt density niet");
  assert.equal(examplesInteraction.resetBoard, "8,6", "examples reset herstelt board niet");
  assert.deepEqual(examplesInteraction.resetMinimized, ["basic-2"], "examples reset herstelt de directe minimized-demo niet");
  assert.equal(examplesInteraction.closedCount, 12, "de ×-sluitknop verwijdert het gekozen voorbeeldblock niet");
  assert.match(examplesInteraction.closedStatus, /12 blocks/, "examples status volgt een gesloten block niet");
  assert.equal(examplesInteraction.restoredCount, 13, "reset bouwt een gesloten voorbeeldblock niet opnieuw op");
  assert.equal(examplesInteraction.restoredCloseButtons, 13, "een hersteld voorbeeldblock verliest zijn ×-sluitknop");
  assert.match(examplesInteraction.restoredStatus, /13 blocks · 1 minimized/, "reset herstelt de oorspronkelijke examples status niet");
  assert.deepEqual(examplesInteraction.restoredOrder.slice(0, 5), ["learning-path", "basic-1", "basic-2", "basic-3", "basic-4"], "reset herstelt de canonieke examples leesvolgorde niet");

  await navigateTo(`${pageUrl}docs/manual.html`);
  const manualWidths = [[1280, 720, 6], [800, 900, 3], [390, 844, 1]];
  const manualMeasurements = [];
  for (const [width, height, columns] of manualWidths) {
    const manual = await measureManual(width, height);
    manualMeasurements.push(manual);
    assert.equal(manual.blockCount, 15, `manual mist directe blocks op ${width}px`);
    assert.equal(manual.columnCount, columns, `manual gebruikt ${manual.columnCount} in plaats van ${columns} kolommen op ${width}px`);
    assert.ok(manual.horizontalOverflow <= 0.5, `manual heeft ${manual.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(manual.outsideBoard, [], `manual plaatst blocks buiten het board op ${width}px: ${manual.outsideBoard.join(", ")}`);
    assert.deepEqual(manual.clippedContent, [], `manual knipt inhoud af op ${width}px: ${manual.clippedContent.join(", ")}`);
    assert.equal(manual.nestedSurfaces, 0, `manual bevat ${manual.nestedSurfaces} geneste blocks-grids op ${width}px`);
    assert.equal(manual.draggable, "true", `manual start niet versleepbaar op ${width}px`);
    assert.equal(manual.boardBackgroundImage, "none", `manual tekent nog een achtergrondgrid op ${width}px`);
    assert.equal(manual.quantized, "true", `manual quantiseert het grid niet op ${width}px`);
    assert.ok(Number.isInteger(manual.trackWidth) && manual.trackWidth > 0, `manual gebruikt geen hele trackbreedte op ${width}px`);
    assert.deepEqual(manual.nonIntegerHorizontalGeometry, [], `manual laat fractionele blockgeometrie achter op ${width}px: ${manual.nonIntegerHorizontalGeometry.join(", ")}`);
    assert.equal(manual.codeOverflow, "auto", `manual code scrollt niet intern op ${width}px`);
    assert.deepEqual(manual.formBlocks.map(function (form) { return form.id; }), ["manual-cycle", "manual-rectangle", "manual-direction"], `manual verliest de vormvolgorde op ${width}px`);
    assert.deepEqual(manual.formBlocks.map(function (form) { return form.color; }), ["rgb(255, 0, 255)", "rgb(0, 0, 0)", "rgb(0, 0, 0)"], `manual verliest magenta als enige vormaccent op ${width}px`);
    assert.equal(manual.scrollbarWidth, "thin", `manual gebruikt geen dunne OS-scrollbar op ${width}px`);
    assert.match(manual.scrollbarColor, /rgba\(17, 17, 17, 0\.58\)/, `manual gebruikt geen neutrale scrollbar op ${width}px`);
    if (width > 560) {
      assert.ok(Math.max(...manual.formBlocks.map(function (form) { return form.blockTop; })) - Math.min(...manual.formBlocks.map(function (form) { return form.blockTop; })) <= 0.5, `manual zet de drie vormen niet op één rij op ${width}px`);
      assert.ok(Math.max(...manual.formBlocks.map(function (form) { return form.blockWidth; })) - Math.min(...manual.formBlocks.map(function (form) { return form.blockWidth; })) <= 0.5, `manual geeft de drie vormvelden geen gelijke breedte op ${width}px`);
      assert.ok(Math.max(...manual.formBlocks.map(function (form) { return form.shapeCenterY; })) - Math.min(...manual.formBlocks.map(function (form) { return form.shapeCenterY; })) <= 0.5, `manual centreert de drie vormen niet op één optische lijn op ${width}px`);
    }
    assert.ok(manual.pageScrollable && manual.documentHeight > height, `manual gebruikt geen natuurlijke paginascroll op ${width}px`);
    assert.notEqual(manual.boardOverflowY, "scroll", `manual maakt het volledige board scrollbaar op ${width}px`);
    assert.ok(manual.canvas.cssWidth > 0 && manual.canvas.cssHeight > 0 && manual.canvas.bitmapWidth > 0 && manual.canvas.bitmapHeight > 0, `manual canvas herschaalt niet op ${width}px`);
    assert.ok(manual.video.width > 0 && manual.video.height > 0, `manual video heeft geen bruikbare maat op ${width}px`);
    assert.equal(manual.video.controls, true, `manual video mist controls op ${width}px`);
    assert.equal(manual.video.fit, "contain", `manual video gebruikt geen contain op ${width}px`);
    assert.equal(manual.video.preload, "none", `manual video preload is niet terughoudend op ${width}px`);
  }
  assert.notEqual(manualMeasurements[0].canvas.cssWidth, manualMeasurements[2].canvas.cssWidth, "manual canvas reageert niet op viewportbreedte");
  await measureManual(1280, 720);
  const manualInteraction = await exerciseManual();
  assert.notEqual(manualInteraction.draggedOrder[0], "manual-cycle", "manual drag herschikt de directe blocks niet");
  assert.equal(manualInteraction.dragCleanedUp, true, "manual drag laat een pointer/dragtoestand hangen");
  assert.equal(manualInteraction.locked, true, "manual layout lock schakelt dragging niet uit");
  assert.equal(manualInteraction.resetOrder[0], "manual-cycle", "manual reset herstelt de oorspronkelijke volgorde niet");
  assert.equal(manualInteraction.resetDraggable, "true", "manual reset zet dragging niet opnieuw aan");
  assert.match(manualInteraction.resetStatus, /layout reset · drag on/, "manual resetstatus is niet duidelijk");

  console.log("browser-layout: showcase, examples en levende manual op desktop/tablet/mobiel — OK");
} finally {
  if (protocol) {
    try { await protocol.send("Browser.close"); } catch {}
  }
  if (chrome && chrome.exitCode === null) {
    await new Promise(function (resolveExit) {
      const timeout = setTimeout(function () {
        if (chrome.exitCode === null) chrome.kill();
      }, 2000);
      chrome.once("exit", function () {
        clearTimeout(timeout);
        resolveExit();
      });
    });
  }
  await new Promise(function (resolveClose) { server.close(resolveClose); });
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
