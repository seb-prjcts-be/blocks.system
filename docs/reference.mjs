import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.3";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.3";

const board = document.querySelector("#reference-board");
const blocks = createBlocksSystem({ variant: "regular" });

const referenceBlocks = [
  { id: "reference-system", anchor: "shared-system", span: [3, 3], render: createReferenceTable },
  { id: "reference-block", anchor: "block-controller", span: [3, 3], render: createReferenceTable },
  { id: "reference-adapters", anchor: "adapters", span: [4, 4], render: createReferenceTable },
  { id: "reference-definition", anchor: "definition", span: [2, 2], render: createReferenceCode },
  { id: "reference-hooks", anchor: "css-hooks", span: [3, 2], render: createReferenceHooks },
  { id: "reference-errors", anchor: "errors", span: [3, 2], render: createReferenceErrors }
];

blocks.attach(board);
blocks.setGrid(6, 20);
blocks.snap = true;
blocks.draggable = false;
quantizeSurface(board);

function addReference({ id, title, anchor, span, content }) {
  const block = blocks.add(content, { id });
  block.menu(title, { minimize: true, close: true });
  block.span(...span);
  block.element.id = anchor;
  block.element.classList.add("reference-anchor");
  return block;
}

function appendInlineContent(target, content) {
  if (typeof content === "string") {
    target.textContent = content;
    return;
  }
  if (!Array.isArray(content)) throw new Error("Reference purpose must be text or an array of text/code parts.");

  for (const part of content) {
    if (typeof part?.text === "string") {
      target.append(document.createTextNode(part.text));
    } else if (typeof part?.code === "string") {
      const code = document.createElement("code");
      code.textContent = part.code;
      target.append(code);
    } else {
      throw new Error("Reference purpose parts must contain text or code.");
    }
  }
}

function createReferenceTable({ headers, rows }) {
  const wrapper = document.createElement("div");
  wrapper.className = "reference-table-wrap";

  const table = document.createElement("table");
  table.className = "reference-table";
  const head = table.createTHead();
  const headRow = head.insertRow();
  for (const label of headers) {
    const cell = document.createElement("th");
    cell.textContent = label;
    headRow.append(cell);
  }

  const body = table.createTBody();
  for (const row of rows) {
    const tableRow = body.insertRow();
    tableRow.id = row.id;
    for (const value of [row.member, row.returns]) {
      const cell = tableRow.insertCell();
      cell.textContent = value;
    }
    appendInlineContent(tableRow.insertCell(), row.purpose);
  }

  wrapper.append(table);
  return wrapper;
}

function createReferenceCode({ code }) {
  const pre = document.createElement("pre");
  pre.className = "reference-code";
  const codeElement = document.createElement("code");
  codeElement.textContent = code.join("\n");
  pre.append(codeElement);
  return pre;
}

function createReferenceHooks({ items }) {
  const root = document.createElement("div");
  root.className = "reference-hooks";
  for (const item of items) {
    const line = document.createElement("p");
    const term = document.createElement("code");
    const description = document.createElement("span");
    term.textContent = item.term;
    description.textContent = item.description;
    line.append(term, description);
    root.append(line);
  }
  return root;
}

function createReferenceErrors({ eyebrow, statement, details }) {
  const root = document.createElement("div");
  root.className = "reference-errors";
  const small = document.createElement("small");
  const strong = document.createElement("strong");
  const paragraph = document.createElement("p");
  small.textContent = eyebrow;
  strong.textContent = statement;
  paragraph.textContent = details;
  root.append(small, strong, paragraph);
  return root;
}

const referenceContent = await loadDocsContent("reference", referenceBlocks.map(({ id }) => id));

for (const definition of referenceBlocks) {
  const content = referenceContent[definition.id];
  addReference({
    id: definition.id,
    title: content.title,
    anchor: definition.anchor,
    span: definition.span,
    content: definition.render(content)
  });
}

board.dataset.referenceReady = "true";
