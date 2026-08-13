import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.44";
import { REFERENCE_SECTIONS } from "./reference-sections.mjs?v=0.1.0";

const board = document.querySelector("#reference-board");
const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  draggable: false,
  blockDefaults: { menu: { minimize: true, close: true } }
});

const content = await loadDocsContent("reference", REFERENCE_SECTIONS.map(({ id }) => id));

blocks.attach(board);
blocks.setGrid(6, 47);
quantizeSurface(board);

function text(name, value, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function table(headers, rows) {
  const wrapper = document.createElement("div");
  wrapper.className = "reference-table-wrap";
  const element = document.createElement("table");
  element.className = "reference-table";
  const head = element.createTHead().insertRow();
  for (const label of headers) head.append(text("th", label));
  const body = element.createTBody();
  for (const row of rows) {
    const tableRow = body.insertRow();
    if (row.id) tableRow.id = row.id;
    for (const [index, value] of row.cells.entries()) {
      const cell = tableRow.insertCell();
      cell.dataset.label = headers[index];
      cell.textContent = value;
    }
  }
  wrapper.append(element);
  return wrapper;
}

function referenceEntry(entry, aliases) {
  const root = document.createElement("div");
  root.className = "reference-entry";
  root.append(text("h2", entry.title, "reference-section-heading"));
  for (const alias of aliases) {
    const anchor = document.createElement("span");
    anchor.className = "reference-anchor-alias";
    anchor.id = alias;
    root.append(anchor);
  }
  if (entry.intro) root.append(text("p", entry.intro, "reference-intro"));
  if (entry.eyebrow) root.append(text("small", entry.eyebrow));
  if (entry.statement) root.append(text("strong", entry.statement));
  if (entry.code) {
    const pre = document.createElement("pre");
    pre.className = "reference-code";
    pre.append(text("code", entry.code.join("\n")));
    root.append(pre);
  }
  if (entry.headers && entry.rows) root.append(table(entry.headers, entry.rows));
  if (entry.details) root.append(text("p", entry.details, "reference-details"));
  return root;
}

for (const definition of REFERENCE_SECTIONS) {
  const entry = content[definition.id];
  const block = blocks.add(referenceEntry(entry, definition.aliases), {
    id: definition.id,
    title: entry.title
  });
  block.span(...definition.span);
  block.place(...definition.place);
  block.element.id = definition.anchor;
  block.element.classList.add("reference-anchor", "reference-full");
}

const searchInput = document.querySelector("#reference-search");
if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    const query = String(event.target.value || "").trim().toLowerCase();
    const blocksList = board.querySelectorAll(":scope > .blocks-system-object");
    for (const blockEl of blocksList) {
      if (!query) {
        blockEl.style.display = "";
        continue;
      }
      const textContent = blockEl.textContent.toLowerCase();
      blockEl.style.display = textContent.includes(query) ? "" : "none";
    }
  });
}

board.dataset.referenceReady = "true";
