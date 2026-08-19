import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await startBrowserHarness(root);

try {
  assert.equal(typeof browser.assertNoPageErrors, "function", "browserharness moet asynchrone paginafouten kunnen afkeuren");
  assert.equal(typeof browser.clearPageErrors, "function", "browserharness moet bewust opgevangen proeferrors kunnen wissen");

  await browser.protocol.send("Runtime.evaluate", {
    expression: "setTimeout(() => { throw new Error('browser-harness exception sentinel'); }, 0)"
  });
  await delay(50);
  assert.throws(
    () => browser.assertNoPageErrors(),
    /browser-harness exception sentinel/,
    "een asynchrone runtime-exception mag niet onzichtbaar groen blijven"
  );
  browser.clearPageErrors();

  await browser.protocol.send("Runtime.evaluate", {
    expression: "console.error('browser-harness console sentinel')"
  });
  await delay(20);
  assert.throws(
    () => browser.assertNoPageErrors(),
    /browser-harness console sentinel/,
    "console.error mag niet onzichtbaar groen blijven"
  );
  browser.clearPageErrors();
  assert.doesNotThrow(() => browser.assertNoPageErrors(), "gewiste proeferrors mogen latere pagina's niet besmetten");

  console.log("blocks.system browser harness — runtime- en consolefouten worden bewaakt");
} finally {
  await browser.close();
}
