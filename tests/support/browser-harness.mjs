import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  const chromePath = candidates.find((candidate) => existsSync(candidate));
  if (!chromePath) throw new Error("browser-layout vereist Chrome, Edge of CHROME_PATH.");
  return chromePath;
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

function createStaticServer(root) {
  return createServer(async function (request, response) {
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
}

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

async function listen(server) {
  await new Promise(function (resolveListen, rejectListen) {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
}

async function waitForExit(process) {
  if (!process || process.exitCode !== null) return;
  await new Promise(function (resolveExit) {
    const timeout = setTimeout(function () {
      if (process.exitCode === null) process.kill();
    }, 2000);
    process.once("exit", function () {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

export async function startBrowserHarness(root, viewport = {}) {
  const server = createStaticServer(root);
  await listen(server);
  const address = server.address();
  const pageUrl = `http://127.0.0.1:${address.port}/`;
  const profile = await mkdtemp(join(tmpdir(), "blocks-system-layout-"));
  let chrome = null;
  let protocol = null;
  let closed = false;

  async function close() {
    if (closed) return;
    closed = true;
    if (protocol) {
      try { await protocol.send("Browser.close"); } catch {}
    }
    await waitForExit(chrome);
    if (server.listening) await new Promise((resolveClose) => server.close(resolveClose));
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  try {
    chrome = spawn(findChromePath(), [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank"
    ], { stdio: ["ignore", "ignore", "pipe"] });

    const browserSocketUrl = await waitForDevTools(chrome);
    const devToolsPort = new URL(browserSocketUrl).port;
    const targets = await fetch(`http://127.0.0.1:${devToolsPort}/json/list`).then((response) => response.json());
    const target = targets.find((entry) => entry.type === "page");
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
      width: viewport.width || 1280,
      height: viewport.height || 1000,
      deviceScaleFactor: viewport.dpr || 1,
      mobile: false
    });
    const loaded = protocol.once("Page.loadEventFired");
    await protocol.send("Page.navigate", { url: pageUrl });
    await loaded;
    return Object.freeze({ close, pageUrl, protocol });
  } catch (error) {
    await close();
    throw error;
  }
}
