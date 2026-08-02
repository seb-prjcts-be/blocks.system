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
    const canvas = field.querySelector(".home-canvas");
    const canvasRect = canvas.getBoundingClientRect();
    return {
      blockCount: objects.length,
      columnCount: getComputedStyle(field).gridTemplateColumns.split(" ").length,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      backgroundImage: getComputedStyle(field).backgroundImage,
      quantized: field.dataset.quantized,
      trackWidth: Number(field.dataset.trackWidth),
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
      canvas: {
        cssWidth: canvasRect.width,
        cssHeight: canvasRect.height,
        bitmapWidth: canvas.width,
        bitmapHeight: canvas.height
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

async function hoverSignature() {
  const result = await protocol.send("Runtime.evaluate", {
    expression: `(() => {
      const field = document.querySelector("#home-board");
      const block = document.querySelector('[data-block-object="home-canvas"]');
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
      const canvas = board.querySelector(".manual-canvas");
      const canvasRect = canvas.getBoundingClientRect();
      const video = board.querySelector(".manual-media video");
      const videoRect = video.getBoundingClientRect();
      const code = board.querySelector(".manual-code");
      const rootStyle = getComputedStyle(document.documentElement);
      const navbar = document.querySelector("#navbar");
      const logo = navbar.querySelector(".nav-logo");
      const navigation = navbar.querySelector(".nav-links");
      const toolbar = document.querySelector(".manual-toolbar");
      const intersects = function (first, second) {
        const a = first.getBoundingClientRect();
        const b = second.getBoundingClientRect();
        return Math.max(a.left, b.left) < Math.min(a.right, b.right) &&
          Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom);
      };
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
        pageSurfaceCount: document.querySelectorAll(".blocks-system-surface").length,
        navigationCount: document.querySelectorAll("nav").length,
        logoNavigationOverlap: getComputedStyle(navigation).display !== "none" && intersects(logo, navigation),
        navigationToolbarOverlap: intersects(navbar, toolbar),
        draggable: board.dataset.draggable,
        devicePixelRatio: window.devicePixelRatio,
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
      return {
        blockCount: objects.length,
        columnCount: getComputedStyle(board).gridTemplateColumns.split(" ").length,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        boardBackgroundImage: getComputedStyle(board).backgroundImage,
        quantized: board.dataset.quantized,
        trackWidth: Number(board.dataset.trackWidth),
        draggable: board.dataset.draggable,
        devicePixelRatio: window.devicePixelRatio,
        nestedSurfaces: board.querySelectorAll(".blocks-system-surface").length,
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
        missingAnchors: ["shared-system", "block-controller", "adapters", "definition", "css-hooks", "errors"].filter(function (id) {
          return !document.getElementById(id);
        }),
        overflowModes: Array.from(board.querySelectorAll(".reference-table-wrap, .reference-code, .reference-hooks"))
          .map(function (node) { return getComputedStyle(node).overflow; })
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
      const media = board.querySelector('[data-block-object="manual-media"]');
      const video = media.querySelector("video");
      video.dataset.pauseCalls = "0";
      video.pause = function () { video.dataset.pauseCalls = String(Number(video.dataset.pauseCalls) + 1); };
      media.querySelector(".blocks-system-minimize").click();
      await Promise.resolve();
      const mediaPauseCalls = Number(video.dataset.pauseCalls);
      media.querySelector(".blocks-system-minimize").click();
      document.querySelector('[data-section-navigation] a[href="#connect"]').click();
      const activeAnchor = document.querySelector('[data-section-navigation] a[aria-current="location"]')?.getAttribute("href");
      const draggedOrder = order();
      const dragCleanedUp = !board.hasAttribute("data-dragging") && !board.querySelector(".is-dragging");
      document.querySelector("#manual-lock").click();
      const locked = board.dataset.draggable === "false" && document.querySelector("#manual-lock").getAttribute("aria-pressed") === "true";
      document.querySelector("#manual-reset").click();
      const keyboardHandle = board.querySelector(":scope > .blocks-system-object > .blocks-system-menu");
      keyboardHandle.focus();
      const keyboardEvent = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
      keyboardHandle.dispatchEvent(keyboardEvent);
      const keyboardOrder = order();
      document.querySelector("#manual-reset").click();
      return {
        draggedOrder,
        dragCleanedUp,
        locked,
        keyboardOrder,
        keyboardPrevented: keyboardEvent.defaultPrevented,
        keyboardHandleLabel: keyboardHandle.getAttribute("aria-label"),
        mediaPauseCalls,
        activeAnchor,
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

  const viewportMatrix = [[1440, 1000, 6], [1280, 900, 6], [1024, 900, 6], [800, 900, 3], [390, 844, 1], [320, 720, 1]];
  const homeMeasurements = [];
  for (const [width, height, columns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const home = await measureHome(width, height, dpr);
      homeMeasurements.push(home);
      assert.equal(home.blockCount, 5, `home toont ${home.blockCount} in plaats van vijf directe blocks op ${width}px @${dpr}x`);
      assert.equal(home.columnCount, columns, `home gebruikt ${home.columnCount} in plaats van ${columns} kolommen op ${width}px @${dpr}x`);
      assert.equal(home.devicePixelRatio, dpr, `home test niet werkelijk op DPR ${dpr}`);
      assert.ok(home.horizontalOverflow <= 0.5, `home heeft ${home.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.equal(home.backgroundImage, "none", `home tekent nog een achtergrondgrid op ${width}px @${dpr}x`);
      assert.equal(home.quantized, "true", `home quantiseert het grid niet op ${width}px @${dpr}x`);
      assert.ok(Number.isInteger(home.trackWidth) && home.trackWidth > 0, `home gebruikt geen hele trackbreedte op ${width}px @${dpr}x`);
      assert.equal(home.draggable, "true", `home start niet versleepbaar op ${width}px @${dpr}x`);
      assert.equal(home.nestedSurfaces, 0, `home bevat ${home.nestedSurfaces} geneste blocks-grids op ${width}px @${dpr}x`);
      assert.deepEqual(home.outsideBoard, [], `home plaatst blocks buiten het board op ${width}px @${dpr}x: ${home.outsideBoard.join(", ")}`);
      assert.deepEqual(home.nonIntegerHorizontalGeometry, [], `home laat fractionele geometrie achter op ${width}px @${dpr}x: ${home.nonIntegerHorizontalGeometry.join(", ")}`);
      assert.deepEqual(home.clippedContent, [], `home knipt inhoud af op ${width}px @${dpr}x: ${home.clippedContent.join(", ")}`);
      assert.ok(home.canvas.cssWidth > 0 && home.canvas.cssHeight > 0 && home.canvas.bitmapWidth > 0 && home.canvas.bitmapHeight > 0, `home canvas herschaalt niet op ${width}px @${dpr}x`);
      assert.ok(Math.abs(home.canvas.bitmapWidth - Math.round(home.canvas.cssWidth * dpr)) <= 2, `home canvas gebruikt geen scherpe ${dpr}x bitmap op ${width}px: ${home.canvas.bitmapWidth} versus ${home.canvas.cssWidth * dpr}`);
    }
  }
  assert.notEqual(homeMeasurements[0].canvas.cssWidth, homeMeasurements.at(-1).canvas.cssWidth, "home canvas reageert niet op viewportbreedte");

  await measureHome(1280, 900);
  const beforeHover = await hoverSignature();
  const documentNode = await protocol.send("DOM.getDocument");
  const canvasNode = await protocol.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: '[data-block-object="home-canvas"]'
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

  await navigateTo(`${pageUrl}docs/`);
  const manualMeasurements = [];
  for (const [width, height, columns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
    const manual = await measureManual(width, height, dpr);
    manualMeasurements.push(manual);
    assert.equal(manual.blockCount, 15, `manual mist directe blocks op ${width}px @${dpr}x`);
    assert.equal(manual.devicePixelRatio, dpr, `manual test niet werkelijk op DPR ${dpr}`);
    assert.equal(manual.columnCount, columns, `manual gebruikt ${manual.columnCount} in plaats van ${columns} kolommen op ${width}px`);
    assert.ok(manual.horizontalOverflow <= 0.5, `manual heeft ${manual.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(manual.outsideBoard, [], `manual plaatst blocks buiten het board op ${width}px: ${manual.outsideBoard.join(", ")}`);
    assert.deepEqual(manual.clippedContent, [], `manual knipt inhoud af op ${width}px: ${manual.clippedContent.join(", ")}`);
    assert.equal(manual.nestedSurfaces, 0, `manual bevat ${manual.nestedSurfaces} geneste blocks-grids op ${width}px`);
    assert.equal(manual.pageSurfaceCount, 1, `manual bevat ${manual.pageSurfaceCount} systemen op ${width}px`);
    assert.equal(manual.navigationCount, 1, `manual bevat ${manual.navigationCount} menu's op ${width}px`);
    assert.equal(manual.logoNavigationOverlap, false, `manual laat logo en menu overlappen op ${width}px`);
    assert.equal(manual.navigationToolbarOverlap, false, `manual laat menu en layoutbediening overlappen op ${width}px`);
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
  }
  assert.notEqual(manualMeasurements[0].canvas.cssWidth, manualMeasurements.at(-1).canvas.cssWidth, "manual canvas reageert niet op viewportbreedte");
  await measureManual(1280, 720);
  const manualInteraction = await exerciseManual();
  assert.notEqual(manualInteraction.draggedOrder[0], "manual-cycle", "manual drag herschikt de directe blocks niet");
  assert.equal(manualInteraction.dragCleanedUp, true, "manual drag laat een pointer/dragtoestand hangen");
  assert.equal(manualInteraction.locked, true, "manual layout lock schakelt dragging niet uit");
  assert.deepEqual(manualInteraction.keyboardOrder.slice(0, 2), ["manual-rectangle", "manual-cycle"], "manual pijltjestoetsen herschikken de blocks niet");
  assert.equal(manualInteraction.keyboardPrevented, true, "manual keyboard drag laat de pagina meescrollen");
  assert.match(manualInteraction.keyboardHandleLabel, /pijltjestoetsen/, "manual keyboard handle legt zijn bediening niet uit");
  assert.ok(manualInteraction.mediaPauseCalls >= 1, "manual video pauzeert niet bij minimaliseren");
  assert.equal(manualInteraction.activeAnchor, "#connect", "manual sectienavigatie markeert de gekozen anchor niet");
  assert.equal(manualInteraction.resetOrder[0], "manual-cycle", "manual reset herstelt de oorspronkelijke volgorde niet");
  assert.equal(manualInteraction.resetDraggable, "true", "manual reset zet dragging niet opnieuw aan");
  assert.match(manualInteraction.resetStatus, /layout reset · drag on/, "manual resetstatus is niet duidelijk");

  await navigateTo(`${pageUrl}docs/api.html`);
  for (const [width, height, columns] of viewportMatrix) {
    for (const dpr of [1, 2]) {
      const reference = await measureReference(width, height, dpr);
      assert.equal(reference.blockCount, 6, `reference mist directe blocks op ${width}px @${dpr}x`);
      assert.equal(reference.columnCount, columns, `reference gebruikt ${reference.columnCount} in plaats van ${columns} kolommen op ${width}px @${dpr}x`);
      assert.equal(reference.devicePixelRatio, dpr, `reference test niet werkelijk op DPR ${dpr}`);
      assert.ok(reference.horizontalOverflow <= 0.5, `reference heeft ${reference.horizontalOverflow}px horizontale overflow op ${width}px @${dpr}x`);
      assert.equal(reference.boardBackgroundImage, "none", `reference tekent nog een achtergrondgrid op ${width}px @${dpr}x`);
      assert.equal(reference.quantized, "true", `reference quantiseert het grid niet op ${width}px @${dpr}x`);
      assert.ok(Number.isInteger(reference.trackWidth) && reference.trackWidth > 0, `reference gebruikt geen hele trackbreedte op ${width}px @${dpr}x`);
      assert.equal(reference.draggable, "false", `reference bewaart zijn leesvolgorde niet op ${width}px @${dpr}x`);
      assert.equal(reference.nestedSurfaces, 0, `reference bevat ${reference.nestedSurfaces} geneste grids op ${width}px @${dpr}x`);
      assert.deepEqual(reference.outsideBoard, [], `reference plaatst blocks buiten het board op ${width}px @${dpr}x: ${reference.outsideBoard.join(", ")}`);
      assert.deepEqual(reference.nonIntegerHorizontalGeometry, [], `reference laat fractionele geometrie achter op ${width}px @${dpr}x: ${reference.nonIntegerHorizontalGeometry.join(", ")}`);
      assert.deepEqual(reference.missingAnchors, [], `reference mist anchors op ${width}px @${dpr}x: ${reference.missingAnchors.join(", ")}`);
      assert.ok(reference.overflowModes.every((mode) => mode === "auto"), `reference gebruikt geen lokale overflow op ${width}px @${dpr}x`);
      assert.equal(reference.pageScrollable, true, `reference gebruikt geen natuurlijke paginascroll op ${width}px @${dpr}x`);
    }
  }

  const aliases = {
    "manual.html": "system",
    "system.html": "system",
    "examples.html": "examples",
    "guide.html": "start",
    "guide-blocks.html": "compose",
    "guide-finish.html": "connect",
    "about.html": "boundary"
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

  console.log("browser-layout: canonieke routes op 1440–320px @1x/@2x plus zeven legacy aliases — OK");
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
