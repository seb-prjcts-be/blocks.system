import assert from "node:assert/strict";
import {
  BlocksStorageConflictError,
  createBlocksStorage,
  createHttpStorage,
  createJsonStorage
} from "../blocks.storage.mjs";
import * as minifiedStorage from "../blocks.storage.min.mjs";

function memoryDirectory(initial = {}) {
  const files = new Map(Object.entries(initial).map(([path, value]) => [path, {
    bytes: new TextEncoder().encode(value),
    modified: 1
  }]));
  const removed = [];

  function directory(prefix = "") {
    return {
      async getDirectoryHandle(name, options = {}) {
        const next = `${prefix}${name}/`;
        if (!options.create && ![...files.keys()].some((path) => path.startsWith(next))) {
          throw new Error(`map ontbreekt: ${next}`);
        }
        return directory(next);
      },
      async getFileHandle(name, options = {}) {
        const path = `${prefix}${name}`;
        if (!files.has(path) && !options.create) throw new Error(`bestand ontbreekt: ${path}`);
        if (!files.has(path)) files.set(path, { bytes: new Uint8Array(), modified: 1 });
        return {
          async getFile() {
            const current = files.get(path);
            return {
              lastModified: current.modified,
              size: current.bytes.byteLength,
              async text() { return new TextDecoder().decode(current.bytes); }
            };
          },
          async createWritable() {
            return {
              async write(value) {
                const bytes = typeof value === "string"
                  ? new TextEncoder().encode(value)
                  : new Uint8Array(value);
                files.set(path, { bytes, modified: (files.get(path)?.modified || 0) + 1 });
              },
              async close() {}
            };
          }
        };
      },
      async removeEntry(name) {
        const path = `${prefix}${name}`;
        removed.push(path);
        files.delete(path);
      }
    };
  }

  return { root: directory(), files, removed };
}

assert.throws(() => createBlocksStorage({}), /load.*commit/i, "een custom adapter moet beide contractmethoden leveren");
assert.deepEqual(
  Object.keys(minifiedStorage).sort(),
  ["BlocksStorageConflictError", "createBlocksStorage", "createHttpStorage", "createJsonStorage"],
  "de minified storage-entrypoint moet dezelfde exports houden"
);

const memory = memoryDirectory({
  "content/page.json": "{\"title\":\"contact\"}\n",
  "content/composition.json": "{\"columns\":2}\n"
});
const json = createJsonStorage({
  directory: memory.root,
  documents: {
    page: "content/page.json",
    composition: "content/composition.json"
  }
});
const loaded = await json.load(["page", "composition"]);
assert.deepEqual(loaded.documents, {
  page: { title: "contact" },
  composition: { columns: 2 }
});
assert.equal(typeof loaded.revision, "string");

const saved = await json.commit({
  revision: loaded.revision,
  documents: {
    page: { title: "contact proef" },
    composition: { columns: 3 }
  },
  assets: [{ path: "images/beheer/proef.png", file: new Blob(["beeld"], { type: "image/png" }) }]
});
assert.equal(typeof saved.revision, "string");
assert.equal(JSON.parse(new TextDecoder().decode(memory.files.get("content/page.json").bytes)).title, "contact proef");
assert.equal(new TextDecoder().decode(memory.files.get("images/beheer/proef.png").bytes), "beeld");

await assert.rejects(() => json.commit({
  revision: loaded.revision,
  documents: { page: { title: "verouderd" } }
}), BlocksStorageConflictError, "een oude revisie mag een nieuwere bron niet overschrijven");

let httpRequest = null;
const http = createHttpStorage({
  endpoint: "https://example.test/beheer.php",
  fetch: async (url, options) => {
    httpRequest = { url, options };
    return {
      ok: true,
      async json() {
        return options.body instanceof FormData
          ? { revision: "r2" }
          : { documents: { page: { title: "contact" } }, revision: "r1" };
      }
    };
  }
});
assert.equal((await http.load(["page"])).revision, "r1");
assert.equal(httpRequest.options.credentials, "same-origin");
assert.equal((await http.commit({
  revision: "r1",
  documents: { page: { title: "nieuw" } },
  assets: [{ path: "images/proef.png", file: new Blob(["beeld"]) }]
})).revision, "r2");
assert.ok(httpRequest.options.body instanceof FormData, "HTTP commit verstuurt documenten en assets multipart");

console.log("storagecontract in orde");
