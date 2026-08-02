export function nodeFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function createDocsBoard({ system }) {
  const board = document.querySelector("#docs-board");
  const status = document.querySelector("#board-status");
  const boardSize = document.querySelector("#board-size");
  const density = document.querySelector("#density");
  const toggleMinimized = document.querySelector("#toggle-minimized");
  const reset = document.querySelector("#reset-board");
  const blocks = [];
  const initialMinimized = new Map();

  system.attach(board);
  system.setGrid(...boardSize.value.split(",").map(Number));
  system.snap = true;
  board.dataset.density = density.value;

  function addBlock({ id, title, content, span = [1, 1], place, variant, minimized = false }) {
    const block = system.add(content, { id, variant, minimized });
    block.menu(title, { minimize: true });
    block.span(...span);
    block.place(...place);
    blocks.push(block);
    initialMinimized.set(id, Boolean(minimized));
    return block;
  }

  function updateStatus() {
    const [columns, rows] = boardSize.value.split(",");
    const minimized = blocks.filter((block) => block.minimized).length;
    status.textContent = `${columns} × ${rows} · ${density.value} · ${blocks.length} blocks · ${minimized} minimized`;
    toggleMinimized.textContent = blocks.length > 0 && blocks.every((block) => block.minimized)
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
    const nextState = !blocks.every((block) => block.minimized);
    blocks.forEach((block) => { block.minimized = nextState; });
    updateStatus();
  });
  reset.addEventListener("click", () => {
    boardSize.value = "8,6";
    density.value = "normal";
    board.dataset.density = "normal";
    blocks.forEach((block) => { block.minimized = initialMinimized.get(block.id); });
    applyBoardSize();
  });

  return Object.freeze({
    addBlock,
    blocks,
    ready() {
      board.dataset.docsBoardReady = "true";
      updateStatus();
    }
  });
}
