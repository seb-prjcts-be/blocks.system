import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REFERENCE_SECTIONS } from "../docs/reference-sections.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = resolve(root, "docs", "content.json");
const fallbackPath = resolve(root, "docs", "reference-fallback.html");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTable(entry) {
  if (!entry.headers || !entry.rows) return "";
  const headers = entry.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = entry.rows.map((row) => {
    const id = row.id ? ` id="${escapeHtml(row.id)}"` : "";
    return `<tr${id}>${row.cells.map((cell, index) => `<td data-label="${escapeHtml(entry.headers[index])}">${escapeHtml(cell)}</td>`).join("")}</tr>`;
  }).join("\n");
  return `<div class="reference-table-wrap"><table class="reference-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderEntry(entry, definition) {
  const aliases = definition.aliases.map((alias) => `<span id="${escapeHtml(alias)}" class="reference-anchor-alias" aria-hidden="true"></span>`).join("");
  const contents = [
    entry.intro && `<p class="reference-intro">${escapeHtml(entry.intro)}</p>`,
    entry.eyebrow && `<small>${escapeHtml(entry.eyebrow)}</small>`,
    entry.statement && `<strong>${escapeHtml(entry.statement)}</strong>`,
    entry.code && `<pre class="reference-code"><code>${escapeHtml(entry.code.join("\n"))}</code></pre>`,
    renderTable(entry),
    entry.details && `<p class="reference-details">${escapeHtml(entry.details)}</p>`,
  ].filter(Boolean).join("\n  ");
  return `<section id="${escapeHtml(definition.anchor)}" class="reference-fallback-entry">
  <h2>${escapeHtml(entry.title)}</h2>${aliases}
  ${contents}
</section>`;
}

export function renderReferenceFallback(content) {
  const entries = REFERENCE_SECTIONS.map((definition) => {
    const entry = content.reference?.[definition.id];
    if (!entry) throw new Error(`Missing reference fallback content: ${definition.id}.`);
    return renderEntry(entry, definition);
  }).join("\n\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Linear blocks.system API reference without JavaScript.">
  <title>linear reference · blocks.system</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="../blocks.system.css?v=0.1.16">
  <link rel="stylesheet" href="style.css?v=0.2.47">
</head>
<body class="docs-page reference-page reference-fallback-page">
  <main class="reference-fallback-main">
    <header class="reference-fallback-head">
      <p>blocks.system / reference / no JavaScript</p>
      <h1>linear reference.</h1>
      <p>The enhanced page presents the same contracts as one direct reading sequence.</p>
      <p><a href="api.html">open the interactive reference</a></p>
    </header>
${entries}
  </main>
  <footer class="site-footer">
    <a class="site-credit" href="https://sebastienvanblaere.be/">blocks.system by Sebastien Vanblaere</a>
  </footer>
</body>
</html>
`;
}

async function main() {
  const content = JSON.parse(await readFile(contentPath, "utf8"));
  const output = renderReferenceFallback(content);
  if (process.argv.includes("--write")) {
    await writeFile(fallbackPath, output);
    return;
  }
  if (process.argv.includes("--check")) {
    const existing = await readFile(fallbackPath, "utf8");
    if (existing !== output) throw new Error("docs/reference-fallback.html is not generated from docs/content.json.");
    return;
  }
  process.stdout.write(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
