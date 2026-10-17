function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} verwacht een object.`);
  }
  return value;
}

function normalizeRelativePath(value, label = "pad") {
  const path = String(value || "").replaceAll("\\", "/");
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new TypeError(`${label} verwacht een relatief pad zonder lege delen, "." of "..".`);
  }
  return path;
}

async function resolveFileHandle(root, normalizedPath, create = false) {
  const parts = normalizedPath.split("/");
  const name = parts.pop();
  let directory = root;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create });
  }

  const handle = await directory.getFileHandle(name, { create });
  return { directory, name, handle };
}

async function createExclusiveAssetFile(root, normalizedPath) {
  const parts = normalizedPath.split("/");
  const name = parts.pop();
  let directory = root;
  let creatingDirectories = false;

  for (const part of parts) {
    if (!creatingDirectories) {
      try {
        directory = await directory.getDirectoryHandle(part, { create: false });
        continue;
      } catch {
        creatingDirectories = true;
      }
    }
    directory = await directory.getDirectoryHandle(part, { create: true });
  }

  if (!creatingDirectories) {
    let exists = false;
    try {
      await directory.getFileHandle(name, { create: false });
      exists = true;
    } catch {
      // Bestand bestaat nog niet; we maken het hieronder aan.
    }
    if (exists) {
      throw new RangeError(`Storage asset bestaat al: ${normalizedPath}`);
    }
  }

  const handle = await directory.getFileHandle(name, { create: true });
  return { directory, name, handle };
}

async function writeFile(handle, content) {
  const stream = await handle.createWritable();
  await stream.write(content);
  await stream.close();
}

function resolveDocumentKeys(keys, availableKeys, availableKeySet) {
  if (keys === undefined) {
    return availableKeys;
  }
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new TypeError("storage.load(keys) verwacht minstens één documentsleutel.");
  }

  const uniqueKeys = new Set();
  for (const rawKey of keys) {
    const key = String(rawKey || "");
    if (!availableKeySet.has(key)) {
      throw new RangeError(`Onbekend storagedocument: ${key || "(leeg)"}`);
    }
    uniqueKeys.add(key);
  }
  return [...uniqueKeys];
}

function normalizeChange(change) {
  assertPlainObject(change, "storage.commit(change)");
  const documents = assertPlainObject(change.documents, "storage.commit(change).documents");
  const rawAssets = change.assets === undefined ? [] : change.assets;

  if (!Array.isArray(rawAssets)) {
    throw new TypeError("storage.commit(change).assets verwacht een array.");
  }

  const assets = rawAssets.map((asset, index) => {
    const label = `storage asset ${index + 1}`;
    assertPlainObject(asset, label);
    if (!(asset.file instanceof Blob)) {
      throw new TypeError(`${label} verwacht een Blob als file.`);
    }
    return {
      path: normalizeRelativePath(asset.path, `${label}.path`),
      file: asset.file
    };
  });

  return {
    revision: change.revision == null ? null : String(change.revision),
    documents,
    assets
  };
}

export class BlocksStorageConflictError extends Error {
  constructor(message = "De opgeslagen inhoud is intussen gewijzigd.") {
    super(message);
    this.name = "BlocksStorageConflictError";
  }
}

export function createBlocksStorage(adapter) {
  assertPlainObject(adapter, "createBlocksStorage(adapter)");
  if (typeof adapter.load !== "function" || typeof adapter.commit !== "function") {
    throw new TypeError("Een storage-adapter moet load(keys) en commit(change) leveren.");
  }

  return Object.freeze({
    kind: String(adapter.kind || "custom"),
    async load(keys) {
      const result = await adapter.load(keys);
      assertPlainObject(result, "storage.load() resultaat");
      assertPlainObject(result.documents, "storage.load() documents");
      return {
        documents: result.documents,
        revision: result.revision == null ? null : String(result.revision)
      };
    },
    async commit(change) {
      const result = await adapter.commit(normalizeChange(change));
      assertPlainObject(result, "storage.commit() resultaat");
      return {
        revision: result.revision == null ? null : String(result.revision)
      };
    }
  });
}

export function createJsonStorage(options) {
  assertPlainObject(options, "createJsonStorage(options)");
  const root = options.directory;
  if (!root || typeof root.getDirectoryHandle !== "function" || typeof root.getFileHandle !== "function") {
    throw new TypeError("createJsonStorage() verwacht een FileSystemDirectoryHandle als directory.");
  }

  const configured = assertPlainObject(options.documents, "createJsonStorage().documents");
  const paths = Object.fromEntries(
    Object.entries(configured).map(([key, path]) => [
      key,
      normalizeRelativePath(path, `documents.${key}`)
    ])
  );

  const availableKeys = Object.keys(paths);
  if (availableKeys.length === 0) {
    throw new TypeError("createJsonStorage().documents mag niet leeg zijn.");
  }

  const availableKeySet = new Set(availableKeys);
  const sortedKeys = [...availableKeys].sort();

  async function readRevision(filesByKey) {
    const parts = await Promise.all(
      sortedKeys.map(async (key) => {
        let file = filesByKey?.get(key);
        if (!file) {
          const { handle } = await resolveFileHandle(root, paths[key]);
          file = await handle.getFile();
        }
        return `${key}:${file.lastModified || 0}:${file.size}`;
      })
    );
    return parts.join("|");
  }

  async function load(keys) {
    const selectedKeys = resolveDocumentKeys(keys, availableKeys, availableKeySet);
    const filesByKey = new Map();

    const entries = await Promise.all(
      selectedKeys.map(async (key) => {
        const { handle } = await resolveFileHandle(root, paths[key]);
        const file = await handle.getFile();
        filesByKey.set(key, file);
        return [key, JSON.parse(await file.text())];
      })
    );

    return {
      documents: Object.fromEntries(entries),
      revision: await readRevision(filesByKey)
    };
  }

  async function commit(change) {
    if (change.revision !== null && change.revision !== (await readRevision())) {
      throw new BlocksStorageConflictError();
    }

    const documentEntries = Object.entries(change.documents);
    for (const [key] of documentEntries) {
      if (!availableKeySet.has(key)) {
        throw new RangeError(`Onbekend storagedocument: ${key}`);
      }
    }

    const serializedDocuments = documentEntries.map(([key, value]) => [
      key,
      `${JSON.stringify(value, null, 2)}\n`
    ]);

    const backups = [];
    const createdAssets = [];

    try {
      for (const asset of change.assets) {
        const target = await createExclusiveAssetFile(root, asset.path);
        createdAssets.push(target);
        await writeFile(target.handle, await asset.file.arrayBuffer());
      }

      for (const [key, serializedContent] of serializedDocuments) {
        const target = await resolveFileHandle(root, paths[key]);
        const currentFile = await target.handle.getFile();
        backups.push({ handle: target.handle, value: await currentFile.text() });
        await writeFile(target.handle, serializedContent);
      }
    } catch (error) {
      try {
        for (const backup of backups) {
          await writeFile(backup.handle, backup.value);
        }
        for (const asset of createdAssets) {
          await asset.directory.removeEntry?.(asset.name);
        }
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }

    return { revision: await readRevision() };
  }

  return createBlocksStorage({ kind: "json", load, commit });
}

export function createHttpStorage(options) {
  assertPlainObject(options, "createHttpStorage(options)");
  const endpoint = String(options.endpoint || "");
  if (!endpoint) {
    throw new TypeError("createHttpStorage().endpoint mag niet leeg zijn.");
  }

  const fetchFn = options.fetch || globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new TypeError("createHttpStorage() verwacht fetch.");
  }

  async function parseResponse(responsePromise) {
    const response = await responsePromise;
    if (response.status === 409) {
      throw new BlocksStorageConflictError();
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      // Negeer ongeldige of lege JSON bij foutstatussen.
    }

    if (!response.ok) {
      throw new Error(body?.error || `Storageverzoek faalde met HTTP ${response.status}.`);
    }
    return body;
  }

  async function load(keys) {
    const selectedKeys = Array.isArray(keys) ? keys.map(String) : keys;
    return parseResponse(
      fetchFn(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "load", keys: selectedKeys })
      })
    );
  }

  async function commit(change) {
    const form = new FormData();
    const assets = change.assets.map((asset, index) => ({
      path: asset.path,
      field: `asset-${index}`
    }));

    form.append(
      "payload",
      JSON.stringify({
        action: "commit",
        revision: change.revision,
        documents: change.documents,
        assets
      })
    );

    for (let i = 0; i < change.assets.length; i++) {
      const { path, file } = change.assets[i];
      const fileName = path.slice(path.lastIndexOf("/") + 1);
      form.append(`asset-${i}`, file, fileName);
    }

    return parseResponse(
      fetchFn(endpoint, {
        method: "POST",
        credentials: "same-origin",
        body: form
      })
    );
  }

  return createBlocksStorage({ kind: "http", load, commit });
}
