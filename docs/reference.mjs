import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.39";
import { REFERENCE_ASPECTS, REFERENCE_AXIS_BLOCKS, REFERENCE_BLOCKS, REFERENCE_COLUMNS } from "./reference-matrix.mjs?v=0.1.0";

const board = document.querySelector("#reference-board");
let activeColorColumn = 0;
const blocks = createBlocksSystem({
  variant: "random",
  snap: true,
  draggable: false,
  colorArray: REFERENCE_COLUMNS.map((column) => column.color),
  colorVariation: 1,
  inversionVariation: 0,
  random: () => (activeColorColumn + 0.5) / REFERENCE_COLUMNS.length,
  blockDefaults: {
    menu: { minimize: true, close: false }
  }
});
const referenceContent = await loadDocsContent("reference", REFERENCE_BLOCKS.map(({ id }) => id));
const contentBlocks = new Map();

blocks.attach(board);
blocks.setGrid(5, 15);
quantizeSurface(board);

function createTextElement(name, text, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createReferenceTable(headers, rows) {
  const wrapper = document.createElement("div");
  wrapper.className = "reference-table-wrap";
  const table = document.createElement("table");
  table.className = "reference-table";
  const headRow = table.createTHead().insertRow();
  for (const label of headers) headRow.append(createTextElement("th", label));

  const body = table.createTBody();
  for (const row of rows) {
    const tableRow = body.insertRow();
    if (row.id) tableRow.id = row.id;
    for (const [index, value] of row.cells.entries()) {
      const cell = tableRow.insertCell();
      cell.dataset.label = headers[index];
      cell.textContent = value;
    }
  }
  wrapper.append(table);
  return wrapper;
}

function createReferenceContent(entry, aliases) {
  const root = document.createElement("div");
  root.className = "reference-entry";
  root.append(createTextElement("h2", entry.title, "reference-section-heading"));
  for (const alias of aliases) {
    const anchor = createTextElement("span", "", "reference-anchor-alias");
    anchor.id = alias;
    root.append(anchor);
  }
  if (entry.intro) root.append(createTextElement("p", entry.intro, "reference-intro"));
  if (entry.eyebrow) root.append(createTextElement("small", entry.eyebrow));
  if (entry.statement) root.append(createTextElement("strong", entry.statement));
  if (entry.code) {
    const pre = document.createElement("pre");
    pre.className = "reference-code";
    pre.append(createTextElement("code", entry.code.join("\n")));
    root.append(pre);
  }
  if (entry.headers && entry.rows) root.append(createReferenceTable(entry.headers, entry.rows));
  if (entry.details) root.append(createTextElement("p", entry.details, "reference-details"));
  return root;
}

function createAxisContent(definition) {
  return createTextElement("span", definition.label, `reference-axis-label reference-axis-label-${definition.axis}`);
}

function addReference(definition) {
  const entry = referenceContent[definition.id];
  const columnIndex = REFERENCE_COLUMNS.findIndex((column) => column.key === definition.column);
  activeColorColumn = columnIndex;
  const block = blocks.add(createReferenceContent(entry, definition.aliases), {
    id: definition.id,
    title: entry.title,
    menu: { minimize: true, close: false }
  });
  block.span(...definition.span);
  block.place(...definition.place);
  block.element.id = definition.anchor;
  block.element.classList.add("reference-anchor", "reference-cell");
  block.element.dataset.referenceColumn = definition.column;
  block.element.dataset.referenceAspect = definition.aspect;
  contentBlocks.set(definition.id, block);
}

function addAxis(definition) {
  const block = blocks.add(createAxisContent(definition), {
    id: definition.id,
    menu: false,
    variant: "regular"
  });
  block.span(...definition.span);
  block.place(...definition.place);
  block.element.classList.add("reference-axis-block", `reference-axis-${definition.axis}`);
  block.element.setAttribute("aria-hidden", "true");
  if (definition.column) {
    const column = REFERENCE_COLUMNS.find((candidate) => candidate.key === definition.column);
    block.color = column.color;
  }
}

function setFocusedColumn(columnKey) {
  const showAll = columnKey === "all";
  for (const definition of REFERENCE_BLOCKS) {
    const block = contentBlocks.get(definition.id);
    block.minimized = !showAll && definition.column !== columnKey;
    block.element.toggleAttribute("data-reference-focused", !showAll && definition.column === columnKey);
  }
  for (const control of document.querySelectorAll("#reference-focus [data-reference-focus]")) {
    control.setAttribute("aria-pressed", String(control.dataset.referenceFocus === columnKey));
  }
  board.dataset.referenceFocus = columnKey;
}

for (const definition of REFERENCE_BLOCKS) addReference(definition);
for (const definition of REFERENCE_AXIS_BLOCKS) addAxis(definition);

for (const control of document.querySelectorAll("#reference-focus [data-reference-focus]")) {
  control.addEventListener("click", () => setFocusedColumn(control.dataset.referenceFocus));
}
document.querySelector("#reference-focus")?.removeAttribute("hidden");
board.dataset.referenceColumns = REFERENCE_COLUMNS.map((column) => column.key).join(",");
board.dataset.referenceAspects = REFERENCE_ASPECTS.map((aspect) => aspect.key).join(",");
board.dataset.referenceReady = "true";
