/**
 * ASCII content extracted from the supplied vanilla.waves demo vocabulary.
 * The shared engine owns timing; this module owns only the text renderer.
 */
let registeredLibrary = null;

function registerAscii(Waves) {
  if (registeredLibrary === Waves) return;

  Waves.register("ascii", {
    create(node, options, helpers) {
      const pre = helpers.el("pre", "wv-ascii");
      pre.setAttribute("role", "img");
      pre.setAttribute("aria-label", "Animated ASCII content driven by vanilla.waves.");
      pre.style.cssText = "box-sizing:border-box;display:grid;place-content:center;width:100%;height:100%;margin:0;overflow:hidden;font:12px/1 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre";
      node.appendChild(pre);

      const columns = helpers.num(options.cols, 34);
      const rows = helpers.num(options.rows, 12);
      function fitText() {
        const byWidth = node.clientWidth / (columns * 0.61);
        const byHeight = node.clientHeight / (rows * 1.05);
        pre.style.fontSize = `${Math.max(8, Math.min(byWidth, byHeight)).toFixed(2)}px`;
        pre.style.lineHeight = "1.05";
      }
      const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(fitText) : null;
      resizeObserver?.observe(node);
      fitText();

      return {
        pre,
        columns,
        rows,
        chars: options.chars || " ·-=+*#%@",
        sampler: helpers.makeSampler({
          range: [-1, 1],
          shiftInterval: 4,
          shiftDuration: 2
        }),
        previous: "",
        resizeObserver
      };
    },

    update(state, time) {
      let output = "";
      const length = state.chars.length;
      for (let row = 0; row < state.rows; row += 1) {
        for (let column = 0; column < state.columns; column += 1) {
          const value = state.sampler.sample(column * 0.5, time + row * 0.4);
          const index = Math.floor(((value + 1) / 2) * length);
          output += state.chars[Math.max(0, Math.min(length - 1, index))];
        }
        output += "\n";
      }
      if (output !== state.previous) {
        state.pre.textContent = output;
        state.previous = output;
      }
    },

    destroy(state) {
      state.resizeObserver?.disconnect();
    }
  });

  registeredLibrary = Waves;
}

export function mountVanillaWavesDemo(host, Waves = window.VanillaWaves) {
  if (!(host instanceof HTMLElement)) throw new TypeError("The vanilla.waves demo needs an HTML host.");
  if (!Waves || typeof Waves.register !== "function" || typeof Waves.init !== "function") {
    throw new Error("Load vanilla.waves before mounting its demo.");
  }
  if (host.dataset.wavesMounted === "true") return null;

  registerAscii(Waves);
  host.style.cssText = "display:grid;place-items:stretch;overflow:hidden";
  host.dataset.wv = "ascii";
  host.dataset.seed = "13";
  host.dataset.cols = "34";
  host.dataset.rows = "12";
  host.dataset.chars = " ·-=+*#%@";
  host.dataset.wavesMounted = "true";
  Waves.init(host);

  let destroyed = false;
  const removalObserver = new MutationObserver(() => {
    if (!host.isConnected) destroy();
  });
  removalObserver.observe(document.documentElement, { childList: true, subtree: true });

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    removalObserver.disconnect();
    Waves.destroy(host);
    host.dataset.wavesMounted = "false";
  }

  return { destroy };
}
