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
      const nestedContents = Array.from(board.querySelectorAll(".example-live-board .blocks-system-content"));
      const links = Array.from(board.querySelectorAll(".example-actions a, .examples-next a"));
      const controls = Array.from(document.querySelectorAll(".docs-board-controls button, .docs-board-controls label, .docs-board-controls select"));
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
        clippedNestedContent: nestedContents.filter(function (content) {
          return getComputedStyle(content).display !== "none" &&
            (content.scrollWidth > content.clientWidth + 3 || content.scrollHeight > content.clientHeight + 3);
        }).map(function (content) {
          const id = content.closest(".blocks-system-object").dataset.blockObject;
          return id + ":" + content.scrollWidth + "×" + content.scrollHeight + "/" + content.clientWidth + "×" + content.clientHeight;
        }),
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
      density.value = "roomy";
      density.dispatchEvent(new Event("change", { bubbles: true }));
      boardSize.value = "12,6";
      boardSize.dispatchEvent(new Event("change", { bubbles: true }));
      const changedStatus = document.querySelector("#board-status").textContent;
      document.querySelector("#reset-board").click();
      return {
        incremented,
        allMinimized,
        allRestored: Array.from(board.querySelectorAll(":scope > .blocks-system-object")).every(function (block) {
          return block.dataset.blockMinimized === "false";
        }),
        changedStatus,
        resetDensity: density.value,
        resetBoard: boardSize.value
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
  assert.deepEqual(afterHover, beforeHover, "hover mag het block of het zichtbare grid niet veranderen");

  await navigateTo(`${pageUrl}docs/examples.html`);
  for (const [width, height] of [[1280, 720], [800, 900], [390, 844]]) {
    const examples = await measureExamples(width, height);
    assert.ok(examples.horizontalOverflow <= 0.5, `examples heeft ${examples.horizontalOverflow}px horizontale overflow op ${width}px`);
    assert.deepEqual(examples.outsideBoard, [], `examples plaatst blocks buiten het board op ${width}px: ${examples.outsideBoard.join(", ")}`);
    assert.deepEqual(examples.clippedStatements, [], `examples knipt statements af op ${width}px: ${examples.clippedStatements.join(", ")}`);
    assert.deepEqual(examples.clippedNestedContent, [], `examples knipt live inhoud af op ${width}px: ${examples.clippedNestedContent.join(", ")}`);
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

  console.log("browser-layout: showcase-uitlijning/hover en minimalistische examples op desktop/tablet/mobiel — OK");
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
