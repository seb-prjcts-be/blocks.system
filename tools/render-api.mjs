// Maakt docs/api.json: de publieke API van blocks.system als data, voor
// agents en gereedschap. De bron is wat er echt is: de declaraties, de module
// en de stylesheet. Niets hierin is met de hand bijgehouden.
//
//   node tools/render-api.mjs           toont het resultaat
//   node tools/render-api.mjs --write   schrijft docs/api.json
//   node tools/render-api.mjs --check   faalt als docs/api.json verouderd is

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "docs/api.json");
const read = (path) => readFile(resolve(root, path), "utf8");

function interfaceBody(declarations, name) {
  const start = new RegExp(`(?:export\\s+)?interface\\s+${name}(?:<[^{]+>)?(?:\\s+extends[^{]+)?\\s*\\{`).exec(declarations);
  if (!start) throw new Error(`blocks.system.d.ts mist interface ${name}`);
  let depth = 1;
  let index = start.index + start[0].length;
  const from = index;
  for (; index < declarations.length && depth > 0; index += 1) {
    if (declarations[index] === "{") depth += 1;
    if (declarations[index] === "}") depth -= 1;
  }
  return declarations.slice(from, index - 1);
}

// Splitst een interface in leden, met de JSDoc die erboven staat.
function members(declarations, name) {
  const body = interfaceBody(declarations, name);
  const result = [];
  let braces = 0;
  let parentheses = 0;
  let statement = "";
  for (let index = 0; index < body.length; index += 1) {
    if (body.startsWith("/**", index)) {
      const end = body.indexOf("*/", index) + 2;
      statement += body.slice(index, end);
      index = end - 1;
      continue;
    }
    const character = body[index];
    if (character === "{") braces += 1;
    if (character === "}") braces -= 1;
    if (character === "(") parentheses += 1;
    if (character === ")") parentheses -= 1;
    if (character === ";" && braces === 0 && parentheses === 0) {
      const docs = [...statement.matchAll(/\/\*\*([\s\S]*?)\*\//g)].map((match) => match[1].replace(/\s*\n\s*\*?\s*/g, " ").trim());
      const signature = statement.replace(/\/\*\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
      const match = signature.match(/^(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*(?:<[^>]*>\s*)?(\(|:)/);
      if (match) {
        const member = { name: match[2], kind: match[4] === "(" ? "method" : "property", signature };
        if (match[1]) member.readonly = true;
        if (match[3]) member.optional = true;
        if (docs.length) member.doc = docs.join(" ");
        result.push(member);
      }
      statement = "";
      continue;
    }
    statement += character;
  }
  return result;
}

function literals(declarations, typeName) {
  const match = new RegExp(`export\\s+type\\s+${typeName}\\s*=([^;]+);`).exec(declarations);
  if (!match) throw new Error(`blocks.system.d.ts mist type ${typeName}`);
  const own = [...match[1].matchAll(/"([^"]+)"/g)].map((found) => found[1]);
  const referenced = [...match[1].matchAll(/\b(Blocks[A-Za-z]+Code)\b/g)].flatMap((found) => literals(declarations, found[1]));
  return [...new Set([...referenced, ...own])];
}

const unique = (values) => [...new Set(values)].sort();
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export async function renderApi() {
  const [declarations, source, css, packageText] = await Promise.all([
    read("blocks.system.d.ts"),
    read("blocks.system.mjs"),
    read("blocks.system.css"),
    read("package.json")
  ]);
  const packageData = JSON.parse(packageText);
  const { DOCS_RELEASE } = await import("../docs/release.mjs");
  const withoutComments = declarations.replace(/\/\*[\s\S]*?\*\//g, "");

  // data-attributen: wat de module schrijft, en wat ze uit de pagina leest.
  const attributeName = (raw) => raw.replace(/\$\{[^}]+\}/g, "{mode}");
  const written = [...source.matchAll(/setAttribute\(\s*[`"](data-[a-z${}-]+)[`"]/g)].map((match) => attributeName(match[1]));
  const datasetWritten = [...source.matchAll(/\.dataset\.([A-Za-z]+)\s*=[^=]/g)].map((match) => `data-${kebab(match[1])}`);
  // Gelezen: alleen wat uit de pagina komt, via de bronelementen van
  // hydrate() en bindSearch() en via selectors.
  const read1 = [...source.matchAll(/(?:node|source)\.(?:getAttribute|hasAttribute)\(\s*[`"](data-[a-z${}-]+)[`"]/g)].map((match) => attributeName(match[1]));
  const read2 = [...source.matchAll(/\[(data-[a-z-]+)[\]=]/g)].map((match) => match[1]);
  const read3 = [...source.matchAll(/(?:node|source|element)\.dataset\.([A-Za-z]+)\b(?!\s*=[^=])/g)].map((match) => `data-${kebab(match[1])}`);
  const writtenAttributes = unique([...written, ...datasetWritten]);
  const readAttributes = unique([...read1, ...read3, ...read2.filter((name) => !writtenAttributes.includes(name))]);

  // De codes in de bron en de codes in de declaraties moeten dezelfde zijn.
  const declaredCodes = unique([...literals(declarations, "BlocksErrorCode"), ...literals(declarations, "BlocksIssueCode")]);
  const sourceCodes = unique([...source.matchAll(/"(BLOCKS_[A-Z_]+)"/g)].map((match) => match[1]));
  if (JSON.stringify(declaredCodes) !== JSON.stringify(sourceCodes)) {
    const onlySource = sourceCodes.filter((code) => !declaredCodes.includes(code));
    const onlyDeclared = declaredCodes.filter((code) => !sourceCodes.includes(code));
    throw new Error(`Foutcodes lopen uiteen. Alleen in de bron: ${onlySource.join(", ") || "-"}. Alleen in de declaraties: ${onlyDeclared.join(", ") || "-"}.`);
  }

  const events = [
    ["blocks:change", "BlocksChangeDetail"],
    ["blocks:reorder", "BlocksReorderDetail"],
    ["blocks:resize", "BlocksResizeDetail"]
  ].map(([name, detail]) => ({ name, target: "the attached field", bubbles: false, detail: members(declarations, detail) }));

  return {
    schema: "blocks.system/api@1",
    name: packageData.name,
    version: packageData.version,
    description: packageData.description,
    // main kan verder zijn dan de laatste tag; dit bestand beschrijft de bron ernaast.
    describes: DOCS_RELEASE.releaseStatus === "released" ? DOCS_RELEASE.stableRef : `${DOCS_RELEASE.sourceRef} (after ${DOCS_RELEASE.stableRef}, not released yet)`,
    install: {
      stable: {
        module: `${DOCS_RELEASE.stableCdnBase}/blocks.system.mjs`,
        style: `${DOCS_RELEASE.stableCdnBase}/blocks.system.css`
      },
      types: "blocks.system.d.ts",
      dependencies: "none"
    },
    docs: {
      humans: packageData.homepage,
      agents: "llms.txt",
      howItWorks: "docs/WERKING.md",
      unreleased: DOCS_RELEASE.releaseStatus === "released" ? null : "docs/releases/unreleased.md"
    },
    exports: [...withoutComments.matchAll(/^export\s+(function|const)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => ({ name: match[2], kind: match[1] })),
    layouts: literals(declarations, "BlocksLayoutMode"),
    system: {
      create: "createBlocksSystem(options?)",
      options: members(declarations, "BlocksSystemOptions"),
      members: members(declarations, "BlocksSystem")
    },
    block: {
      create: "blocks.add(content, options?)",
      content: "trusted HTML string, a DOM node, or a function returning either",
      options: members(declarations, "AddBlockOptions"),
      menu: members(declarations, "BlockMenuOptions"),
      members: members(declarations, "BlockController")
    },
    layoutSnapshot: {
      shape: members(declarations, "BlocksLayout"),
      entry: members(declarations, "BlocksLayoutEntry"),
      restoreOptions: members(declarations, "BlocksRestoreOptions"),
      check: members(declarations, "BlocksLayoutCheck")
    },
    hydrate: {
      options: members(declarations, "BlocksHydrateOptions"),
      page: members(declarations, "BlocksHydratedPage"),
      addressOptions: members(declarations, "BlocksAddressOptions"),
      searchOptions: members(declarations, "BlocksSearchOptions")
    },
    catalog: {
      definition: members(declarations, "BlockDefinition"),
      adapter: members(declarations, "BlockAdapter")
    },
    events,
    changeTypes: literals(declarations, "BlocksChangeType"),
    errorCodes: literals(declarations, "BlocksErrorCode"),
    issueCodes: literals(declarations, "BlocksIssueCode"),
    labels: members(declarations, "BlocksLabels").map((member) => member.name),
    dom: {
      attributesWritten: writtenAttributes,
      attributesRead: readAttributes,
      classes: unique([...`${source}\n${css}`.matchAll(/(?<!data-)\bblocks-system-[a-z]+(?:-[a-z]+)*(?:--[a-z]+)?/g)].map((match) => match[0])),
      cssVariables: unique([...`${source}\n${css}`.matchAll(/--blocks?-[a-z]+(?:-[a-z]+)*/g)].map((match) => match[0]))
    }
  };
}

async function main() {
  const output = `${JSON.stringify(await renderApi(), null, 2)}\n`;
  if (process.argv.includes("--write")) {
    await writeFile(outputPath, output);
    return;
  }
  if (process.argv.includes("--check")) {
    const existing = await readFile(outputPath, "utf8").catch(() => "");
    if (existing !== output) {
      throw new Error("docs/api.json is not generated from the current declarations, source and stylesheet. Run: npm run build:api");
    }
    return;
  }
  process.stdout.write(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
