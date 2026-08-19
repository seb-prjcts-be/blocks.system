import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await startBrowserHarness(root);

try {
  const result = await browser.protocol.send("Runtime.evaluate", {
    expression: `(async () => {
      let copied = null;
      let rejectCopy = false;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (value) => {
          if (rejectCopy) throw new Error("clipboard denied");
          copied = value;
        } }
      });
      const { createBlocksSystem } = await import("/blocks.system.mjs?menu-link-test");
      const field = document.createElement("div");
      document.body.replaceChildren(field);
      const blocks = createBlocksSystem({
        catalogUrl: location.href,
        draggable: false,
        blockDefaults: { menu: { close: false, minimize: false, link: true } }
      });
      blocks.attach(field);
      const block = blocks.add("Nieuws", { id: "nieuws", title: "Nieuws" });
      blocks.register({ ...block.describe({ url: "verhaal.html" }), medium: "html" });
      const button = block.element.querySelector(".blocks-system-link");
      const before = button ? { text: button.textContent, label: button.getAttribute("aria-label") } : null;
      button?.click();
      await new Promise((done) => setTimeout(done, 20));
      const success = button ? {
        text: button.textContent,
        label: button.getAttribute("aria-label"),
        state: button.dataset.state
      } : null;
      rejectCopy = true;
      button?.click();
      await new Promise((done) => setTimeout(done, 20));
      return {
        button: Boolean(button),
        before,
        copied,
        success,
        failure: button ? {
          text: button.textContent,
          label: button.getAttribute("aria-label"),
          state: button.dataset.state
        } : null
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  assert.deepEqual(result.result.value, {
    button: true,
    before: { text: "⧉", label: "Nieuws copy link" },
    copied: `${browser.pageUrl}verhaal.html?block=nieuws`,
    success: { text: "✓", label: "Nieuws link copied", state: "copied" },
    failure: { text: "!", label: "Nieuws copy failed", state: "failed" }
  }, "the opt-in menu link must copy the registered deep link and show visible clipboard feedback");
  browser.assertNoPageErrors();
  console.log("blocks.system menu link — geregistreerde deep link en kopieerfeedback OK");
} finally {
  await browser.close();
}
