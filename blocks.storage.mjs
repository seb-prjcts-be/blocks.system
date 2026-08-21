function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} verwacht een object.`);
  }
  return value;
}

function cleanPath(value, label = "pad") {
  const path = String(value || "").replace(/\\/g, "/");
  if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new TypeError(`${label} verwacht een relatief pad zonder lege delen, "." of "..".`);
  }
  return path;
}

async function fileHandle(root, path, create = false) {
  const parts = cleanPath(path).split("/");
  const name = parts.pop();
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
  return { directory, name, handle: await directory.getFileHandle(name, { create }) };
}

async function writeFile(handle, value) {
  const stream = await handle.createWritable();
  await stream.write(value);
  await stream.close();
}

function documentKeys(keys, available) {
  const list = keys === undefined ? available : keys;
  if (!Array.isArray(list) || list.length === 0) throw new TypeError("storage.load(keys) verwacht minstens één documentsleutel.");
  const unique = [...new Set(list.map((key) => String(key || "")))];
  for (const key of unique) if (!available.includes(key)) throw new RangeError(`Onbekend storagedocument: ${key || "(leeg)"}`);
  return unique;
}

function normalizedChange(change) {
  plainObject(change, "storage.commit(change)");
  const documents = plainObject(change.documents, "storage.commit(change).documents");
  const assets = change.assets === undefined ? [] : change.assets;
  if (!Array.isArray(assets)) throw new TypeError("storage.commit(change).assets verwacht een array.");
  return {
    revision: change.revision === undefined || change.revision === null ? null : String(change.revision),
    documents,
    assets: assets.map((asset, index) => {
      plainObject(asset, `storage asset ${index + 1}`);
      if (!(asset.file instanceof Blob)) throw new TypeError(`storage asset ${index + 1} verwacht een Blob als file.`);
      return { path: cleanPath(asset.path, `storage asset ${index + 1}.path`), file: asset.file };
    })
  };
}

export class BlocksStorageConflictError extends Error {
  constructor(message = "De opgeslagen inhoud is intussen gewijzigd.") {
    super(message);
    this.name = "BlocksStorageConflictError";
  }
}

export function createBlocksStorage(adapter) {
  plainObject(adapter, "createBlocksStorage(adapter)");
  if (typeof adapter.load !== "function" || typeof adapter.commit !== "function") {
    throw new TypeError("Een storage-adapter moet load(keys) en commit(change) leveren.");
  }
  return Object.freeze({
    kind: String(adapter.kind || "custom"),
    async load(keys) {
      const result = await adapter.load(keys);
      plainObject(result, "storage.load() resultaat");
      plainObject(result.documents, "storage.load() documents");
      return { documents: result.documents, revision: result.revision == null ? null : String(result.revision) };
    },
    async commit(change) {
      const result = await adapter.commit(normalizedChange(change));
      plainObject(result, "storage.commit() resultaat");
      return { revision: result.revision == null ? null : String(result.revision) };
    }
  });
}

export function createJsonStorage(options) {
  plainObject(options, "createJsonStorage(options)");
  const root = options.directory;
  if (!root || typeof root.getDirectoryHandle !== "function" || typeof root.getFileHandle !== "function") {
    throw new TypeError("createJsonStorage() verwacht een FileSystemDirectoryHandle als directory.");
  }
  const configured = plainObject(options.documents, "createJsonStorage().documents");
  const paths = Object.fromEntries(Object.entries(configured).map(([key, path]) => [key, cleanPath(path, `documents.${key}`)]));
  const available = Object.keys(paths);
  if (available.length === 0) throw new TypeError("createJsonStorage().documents mag niet leeg zijn.");

  async function revision() {
    const parts = [];
    for (const key of available.sort()) {
      const { handle } = await fileHandle(root, paths[key]);
      const file = await handle.getFile();
      parts.push(`${key}:${file.lastModified || 0}:${file.size}`);
    }
    return parts.join("|");
  }

  async function load(keys) {
    const selected = documentKeys(keys, available);
    const documents = {};
    for (const key of selected) {
      const { handle } = await fileHandle(root, paths[key]);
      documents[key] = JSON.parse(await (await handle.getFile()).text());
    }
    return { documents, revision: await revision() };
  }

  async function commit(change) {
    if (change.revision !== null && change.revision !== await revision()) throw new BlocksStorageConflictError();
    const entries = Object.entries(change.documents);
    for (const [key] of entries) if (!available.includes(key)) throw new RangeError(`Onbekend storagedocument: ${key}`);
    const backups = [];
    const createdAssets = [];
    try {
      for (const asset of change.assets) {
        try {
          await fileHandle(root, asset.path);
          throw new RangeError(`Storage asset bestaat al: ${asset.path}`);
        } catch (error) {
          if (error instanceof RangeError) throw error;
        }
        const target = await fileHandle(root, asset.path, true);
        createdAssets.push(target);
        await writeFile(target.handle, await asset.file.arrayBuffer());
      }
      for (const [key, value] of entries) {
        const target = await fileHandle(root, paths[key]);
        backups.push({ handle: target.handle, value: await (await target.handle.getFile()).text() });
        await writeFile(target.handle, `${JSON.stringify(value, null, 2)}\n`);
      }
    } catch (error) {
      let rollbackError = null;
      try {
        for (const backup of backups) await writeFile(backup.handle, backup.value);
        for (const asset of createdAssets) await asset.directory.removeEntry?.(asset.name);
      } catch (failedRollback) {
        rollbackError = failedRollback;
      }
      if (rollbackError) error.rollbackError = rollbackError;
      throw error;
    }
    return { revision: await revision() };
  }

  return createBlocksStorage({ kind: "json", load, commit });
}

export function createHttpStorage(options) {
  plainObject(options, "createHttpStorage(options)");
  const endpoint = String(options.endpoint || "");
  if (!endpoint) throw new TypeError("createHttpStorage().endpoint mag niet leeg zijn.");
  const request = options.fetch || globalThis.fetch;
  if (typeof request !== "function") throw new TypeError("createHttpStorage() verwacht fetch.");

  async function response(call) {
    const result = await call;
    if (result.status === 409) throw new BlocksStorageConflictError();
    let body;
    try { body = await result.json(); } catch { body = null; }
    if (!result.ok) throw new Error(body?.error || `Storageverzoek faalde met HTTP ${result.status}.`);
    return body;
  }

  async function load(keys) {
    const selected = Array.isArray(keys) ? keys.map(String) : keys;
    return response(request(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "load", keys: selected })
    }));
  }

  async function commit(change) {
    const form = new FormData();
    const assets = change.assets.map((asset, index) => ({ path: asset.path, field: `asset-${index}` }));
    form.append("payload", JSON.stringify({
      action: "commit",
      revision: change.revision,
      documents: change.documents,
      assets
    }));
    change.assets.forEach((asset, index) => form.append(`asset-${index}`, asset.file, asset.path.split("/").pop()));
    return response(request(endpoint, { method: "POST", credentials: "same-origin", body: form }));
  }

  return createBlocksStorage({ kind: "http", load, commit });
}
