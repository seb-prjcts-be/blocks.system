export type StorageDocuments = Record<string, unknown>;

export interface StorageAsset {
  path: string;
  file: Blob;
}

export interface StorageSnapshot {
  documents: StorageDocuments;
  revision: string | null;
}

export interface StorageChange {
  documents: StorageDocuments;
  assets?: StorageAsset[];
  revision?: string | null;
}

export interface BlocksStorage {
  readonly kind: string;
  load(keys?: string[]): Promise<StorageSnapshot>;
  commit(change: StorageChange): Promise<{ revision: string | null }>;
}

export interface BlocksStorageAdapter {
  kind?: string;
  load(keys?: string[]): Promise<StorageSnapshot>;
  commit(change: StorageChange & { assets: StorageAsset[]; revision: string | null }): Promise<{ revision: string | null }>;
}

export class BlocksStorageConflictError extends Error {}

export function createBlocksStorage(adapter: BlocksStorageAdapter): BlocksStorage;

export function createJsonStorage(options: {
  directory: FileSystemDirectoryHandle;
  documents: Record<string, string>;
}): BlocksStorage;

export function createHttpStorage(options: {
  endpoint: string | URL;
  fetch?: typeof fetch;
}): BlocksStorage;
