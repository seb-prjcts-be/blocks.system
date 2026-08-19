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
      const { createBlocksSystem } = await import("/blocks.system.mjs?menu-copy-test");
      const field = document.createElement("div");
      document.body.replaceChildren(field);
      const blocks = createBlocksSystem({
        draggable: false,
        blockDefaults: { menu: { close: true, minimize: true, copy: true } }
      });
      blocks.attach(field);
      const block = blocks.add('<p>Bel 09 224 08 76 &quot;vandaag&quot;.</p>', { id: "contact", title: "Contact" });
      const button = block.element.querySelector(".blocks-system-copy");
      const icon = button?.querySelector("svg");
      const before = button ? {
        text: button.textContent,
        label: button.getAttribute("aria-label"),
        icon: icon ? {
          viewBox: icon.getAttribute("viewBox"),
          path: icon.querySelector("path")?.getAttribute("d")
        } : null
      } : null;
      const iconSizes = button ? {
        copy: icon ? [icon.getBoundingClientRect().width, icon.getBoundingClientRect().height] : null,
        minimize: getComputedStyle(block.element.querySelector(".blocks-system-minimize")).fontSize,
        close: getComputedStyle(block.element.querySelector(".blocks-system-close")).fontSize,
        button: [button.getBoundingClientRect().width, button.getBoundingClientRect().height]
      } : null;
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
        iconSizes,
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
    before: {
      text: "",
      label: "Contact copy content",
      icon: {
        viewBox: "0 0 24 24",
        path: "M9 18c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H9Zm0-2h9V4H9v12ZM5 22c-1.1 0-2-.9-2-2V6h2v14h11v2H5Z"
      }
    },
    iconSizes: { copy: [13, 13], minimize: "13px", close: "13px", button: [16, 16] },
    copied: 'Bel 09 224 08 76 "vandaag".',
    success: { text: "✓", label: "Contact content copied", state: "copied" },
    failure: { text: "!", label: "Contact copy failed", state: "failed" }
  }, "the opt-in menu copy action must copy decoded visible content and show feedback");
  browser.assertNoPageErrors();
  console.log("blocks.system menu copy — leesbare DOM-inhoud en kopieerfeedback OK");
} finally {
  await browser.close();
}
