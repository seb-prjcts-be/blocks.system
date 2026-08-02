export function nodeFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function createDocsBoard({ system, closeable = false }) {
  const board = document.querySelector("#docs-board");
  const status = document.querySelector("#board-status");
  const boardSize = document.querySelector("#board-size");
  const density = document.querySelector("#density");
  const toggleMinimized = document.querySelector("#toggle-minimized");
  const reset = document.querySelector("#reset-board");
  const blocks = [];
  const specs = [];
  const initialMinimized = new Map();

  system.attach(board);
  system.setGrid(...boardSize.value.split(",").map(Number));
  system.snap = true;
  board.dataset.density = density.value;

  function mountBlock({ id, title, content, span = [1, 1], place, variant, minimized = false }, index) {
    const block = system.add(content, { id, variant, minimized });
    block.menu(title, { close: closeable, minimize: true });
    block.span(...span);
    block.place(...place);
    blocks[index] = block;
    return block;
  }

  function addBlock(spec) {
    const index = specs.push({ ...spec }) - 1;
    initialMinimized.set(spec.id, Boolean(spec.minimized));
    return mountBlock(specs[index], index);
  }

  function activeBlocks() {
    return blocks.filter((block) => block?.element.isConnected);
  }

  function updateStatus() {
    const [columns, rows] = boardSize.value.split(",");
    const active = activeBlocks();
    const minimized = active.filter((block) => block.minimized).length;
    status.textContent = `${columns} × ${rows} · ${density.value} · ${active.length} blocks · ${minimized} minimized`;
    toggleMinimized.textContent = active.length > 0 && active.every((block) => block.minimized)
      ? "restore all"
      : "minimize all";
  }

  function applyBoardSize() {
    system.setGrid(...boardSize.value.split(",").map(Number));
    updateStatus();
  }

  boardSize.addEventListener("change", applyBoardSize);
  density.addEventListener("change", () => {
    board.dataset.density = density.value;
    updateStatus();
  });
  toggleMinimized.addEventListener("click", () => {
    const active = activeBlocks();
    const nextState = !active.every((block) => block.minimized);
    active.forEach((block) => { block.minimized = nextState; });
    updateStatus();
  });
  reset.addEventListener("click", () => {
    boardSize.value = "8,6";
    density.value = "normal";
    board.dataset.density = "normal";
    specs.forEach((spec, index) => {
      if (!blocks[index]?.element.isConnected) mountBlock(spec, index);
      blocks[index].minimized = initialMinimized.get(spec.id);
    });
    blocks.forEach((block) => board.appendChild(block.element));
    applyBoardSize();
  });

  const observer = new MutationObserver(updateStatus);
  observer.observe(board, { childList: true });

  return Object.freeze({
    addBlock,
    blocks,
    ready() {
      board.dataset.docsBoardReady = "true";
      updateStatus();
    }
  });
}
