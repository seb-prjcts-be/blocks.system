import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import * as currentModule from "../blocks.system.mjs";
import { DOCS_RELEASE } from "../docs/release.mjs";
import { startBrowserHarness } from "./support/browser-harness.mjs";

const execFile = promisify(execFileCallback);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const declarationsSource = await readFile(resolve(root, "blocks.system.d.ts"), "utf8");
const docsContent = JSON.parse(await readFile(resolve(root, "docs/content.json"), "utf8"));
const declarationsWithoutComments = declarationsSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function exportedRuntimeNames() {
  return [...declarationsWithoutComments.matchAll(/^export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/gm)]
    .map((match) => match[1])
    .sort();
}

function interfaceMembers(interfaceName) {
  const startMatch = new RegExp(`(?:export\\s+)?interface\\s+${escapeRegExp(interfaceName)}(?:<[^\\{]+>)?(?:\\s+extends[^\\{]+)?\\s*\\{`).exec(declarationsWithoutComments);
  assert.ok(startMatch, `missing public interface ${interfaceName}`);
  const bodyStart = startMatch.index + startMatch[0].length;
  let braceDepth = 1;
  let parenthesisDepth = 0;
  let statementStart = bodyStart;
  const statements = [];
  for (let index = bodyStart; index < declarationsWithoutComments.length && braceDepth > 0; index += 1) {
    const character = declarationsWithoutComments[index];
    if (character === "{") braceDepth += 1;
    if (character === "}") braceDepth -= 1;
    if (character === "(") parenthesisDepth += 1;
    if (character === ")") parenthesisDepth -= 1;
    if (character === ";" && braceDepth === 1 && parenthesisDepth === 0) {
      statements.push(declarationsWithoutComments.slice(statementStart, index).trim());
      statementStart = index + 1;
    }
  }
  return statements.flatMap((statement) => {
    const match = statement.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*(?:\(|:)/);
    return match ? [match[1]] : [];
  }).sort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsMember(value, member) {
  return new RegExp(`(^|[^A-Za-z0-9_$])${escapeRegExp(member)}([^A-Za-z0-9_$]|$)`, "i").test(value);
}

assert.deepEqual(Object.keys(currentModule).sort(), exportedRuntimeNames(), "runtime module exports must equal the declarations");
assert.deepEqual(Object.keys(currentModule.system).sort(), interfaceMembers("BlocksSystem"), "runtime system members must equal BlocksSystem declarations");

const browser = await startBrowserHarness(root);
try {
  const expression = `(async function () {
    const api = await import("/blocks.system.mjs?docs-contract");
    const field = document.createElement("div");
    document.body.append(field);
    const blocks = api.createBlocksSystem({ variant: "regular" });
    blocks.attach(field);
    return Object.keys(blocks.add("probe", { id: "docs-contract-probe" })).sort();
  })()`;
  const evaluation = await browser.protocol.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  assert.equal(evaluation.exceptionDetails, undefined, "browser runtime inventory must execute without an exception");
  assert.deepEqual(evaluation.result.value, interfaceMembers("BlockController"), "runtime block controller members must equal BlockController declarations");
} finally {
  await browser.close();
}

const referenceSectionsByInterface = {
  BlocksFont: ["reference-system-create"],
  BlocksLabels: ["reference-system-create"],
  BlockDefinition: ["reference-definition-create"],
  BlockAdapterContext: ["reference-adapter-methods"],
  MountedBlock: ["reference-adapter-methods"],
  BlockAdapter: ["reference-adapter-methods"],
  RegisterOptions: ["reference-definition-create"],
  AddBlockOptions: ["reference-block-create", "reference-titlebar", "reference-appearance"],
  BlockMenuOptions: ["reference-titlebar"],
  BlockDefaults: ["reference-titlebar"],
  BlockController: ["reference-block-layout", "reference-content", "reference-titlebar", "reference-appearance", "reference-color", "reference-block-controller"],
  BlockDescribeOptions: ["reference-block-controller"],
  BlocksReorderPosition: ["reference-dragging"],
  BlocksReorderDetail: ["reference-dragging"],
  BlocksChangeDetail: ["reference-field-signals"],
  BlocksSystemOptions: ["reference-system-create", "reference-grid", "reference-titlebar", "reference-dragging", "reference-appearance", "reference-color", "reference-chance"],
  BlocksSystem: ["reference-system-create", "reference-container", "reference-grid", "reference-block-create", "reference-dragging", "reference-appearance", "reference-color", "reference-chance", "reference-definition-create", "reference-adapter-methods", "reference-block-controller"]
};

for (const [interfaceName, sectionIds] of Object.entries(referenceSectionsByInterface)) {
  const documentation = JSON.stringify(sectionIds.map((sectionId) => docsContent.reference[sectionId]));
  for (const member of interfaceMembers(interfaceName)) {
    assert.ok(containsMember(documentation, member), `reference misses ${interfaceName}.${member}`);
  }
}

const stableTag = DOCS_RELEASE.stableRef;
const candidateMode = process.env.BLOCKS_RELEASE_CANDIDATE === stableTag;
let stableSource;
let stableCss;
if (candidateMode) {
  assert.equal(stableTag, `v${DOCS_RELEASE.packageVersion}`, "release candidate ref must equal the package version");
  assert.equal(DOCS_RELEASE.sourceRef, stableTag, "release candidate docs must identify their intended tag");
  await assert.rejects(
    execFile("git", ["rev-parse", "--verify", `refs/tags/${stableTag}^{commit}`], { cwd: root }),
    "candidate mode is only valid before the local tag exists"
  );
  [stableSource, stableCss] = await Promise.all([
    readFile(resolve(root, "blocks.system.mjs"), "utf8"),
    readFile(resolve(root, "blocks.system.css"), "utf8")
  ]);
} else {
  await execFile("git", ["rev-parse", "--verify", `refs/tags/${stableTag}^{commit}`], { cwd: root });
  [{ stdout: stableSource }, { stdout: stableCss }] = await Promise.all([
    execFile("git", ["show", `${stableTag}:blocks.system.mjs`], { cwd: root, maxBuffer: 1024 * 1024 }),
    execFile("git", ["show", `${stableTag}:blocks.system.css`], { cwd: root, maxBuffer: 1024 * 1024 })
  ]);
}
const stableModuleUrl = `data:text/javascript;base64,${Buffer.from(stableSource).toString("base64")}`;
const stableModule = await import(stableModuleUrl);
assert.deepEqual(Object.keys(stableModule).sort(), ["createBlocksSystem", "system"], "stable tag must expose the documented module entrypoints");
assert.ok(stableCss.includes(".blocks-system-surface"), "stable tag must contain the documented stylesheet");
if (DOCS_RELEASE.releaseStatus === "released") {
  const currentCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
  assert.equal(DOCS_RELEASE.sourceRef, stableTag, "released docs must identify the stable tag as their source");
  assert.equal(currentCss, stableCss, "released docs may not serve stylesheet behavior that differs from their stable tag");
}
const manualStart = JSON.stringify([docsContent.manual["manual-start-a"], docsContent.manual["manual-start-b"]]);
assert.ok(manualStart.includes(`${DOCS_RELEASE.stableCdnBase}/blocks.system.mjs`), "manual ESM snippet must resolve to the verified stable tag");
assert.ok(manualStart.includes(`${DOCS_RELEASE.stableCdnBase}/blocks.system.css`), "manual CSS snippet must resolve to the verified stable tag");

console.log(`blocks.system docs API contract — current ${DOCS_RELEASE.sourceRef}, stable ${stableTag} — OK`);
