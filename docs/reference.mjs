import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.34";

const board = document.querySelector("#reference-board");
const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  draggable: false,
  blockDefaults: {
    menu: { minimize: true, close: true }
  }
});

const referenceBlocks = [
  { id: "reference-exports", anchor: "exports", span: [6, 2], place: [1, 1] },
  { id: "reference-options", anchor: "options", span: [6, 4], place: [1, 4] },
  { id: "reference-state", anchor: "system-state", span: [6, 4], place: [1, 9] },
  { id: "reference-methods", anchor: "system-methods", span: [6, 5], place: [1, 14] },
  { id: "reference-block", anchor: "block-controller", span: [6, 5], place: [1, 20] },
  { id: "reference-add-options", anchor: "add-options", span: [6, 3], place: [1, 26] },
  { id: "reference-adapters", anchor: "adapters", span: [6, 5], place: [1, 30] },
  { id: "reference-event", anchor: "reorder-event", span: [6, 4], place: [1, 36] },
  { id: "reference-hooks", anchor: "css-hooks", span: [6, 4], place: [1, 41] },
  { id: "reference-errors", anchor: "errors", span: [6, 2], place: [1, 46] }
];
const referenceContent = await loadDocsContent("reference", referenceBlocks.map(({ id }) => id));

blocks.attach(board);
blocks.setGrid(6, 47);
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

function createReferenceContent(entry) {
  const root = document.createElement("div");
  root.className = "reference-entry";
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

function addReference({ id, anchor, span, place }) {
  const entry = referenceContent[id];
  const block = blocks.add(createReferenceContent(entry), { id, title: entry.title });
  block.span(...span);
  block.place(...place);
  block.element.id = anchor;
  block.element.classList.add("reference-anchor", "reference-full");
}

for (const definition of referenceBlocks) addReference(definition);

board.dataset.referenceReady = "true";
