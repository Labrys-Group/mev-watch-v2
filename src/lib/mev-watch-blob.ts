import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { SQLITE_DATA_PATH } from "./mev-watch-sqlite";

export const DEFAULT_BLOB_PATHNAME = "data/mev-watch.sqlite";
export const BLOB_CACHE_PATH = path.join(tmpdir(), "mev-watch.sqlite");
export const BLOB_WRITE_PATH = path.join(tmpdir(), "mev-watch-update.sqlite");
export const DEFAULT_BLOB_CACHE_TTL_MS = 5 * 60 * 1000;

interface BlobGetResult {
  statusCode: number;
  stream: ReadableStream<Uint8Array>;
  blob: {
    contentType: string;
    etag?: string;
  };
}

interface DownloadOptions {
  pathname?: string;
  filePath?: string;
  getBlob?: typeof get;
}

interface UploadOptions {
  pathname?: string;
  filePath?: string;
  putBlob?: typeof put;
}

let cachedPath: string | null = null;
let cachedAt = 0;
let cachedDownload: Promise<string> | null = null;

export function getMevWatchBlobPathname(): string {
  return process.env.MEV_WATCH_BLOB_PATH ?? DEFAULT_BLOB_PATHNAME;
}

export function shouldUseBlobArtifact(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function resolveReadableArtifactPath(): Promise<string> {
  if (!shouldUseBlobArtifact()) return SQLITE_DATA_PATH;
  const now = Date.now();
  const ttlMs = Number(
    process.env.MEV_WATCH_BLOB_CACHE_TTL_MS ?? DEFAULT_BLOB_CACHE_TTL_MS,
  );
  if (cachedPath && now - cachedAt < ttlMs) return cachedPath;

  cachedDownload ??= downloadBlobArtifact().then((filePath) => {
    cachedPath = filePath;
    cachedAt = Date.now();
    cachedDownload = null;
    return filePath;
  });
  return cachedDownload;
}

export async function prepareWritableArtifactPath(): Promise<string> {
  if (!shouldUseBlobArtifact()) return SQLITE_DATA_PATH;

  try {
    return await downloadBlobArtifact({ filePath: BLOB_WRITE_PATH });
  } catch (error) {
    try {
      await fs.copyFile(SQLITE_DATA_PATH, BLOB_WRITE_PATH);
      return BLOB_WRITE_PATH;
    } catch {
      throw error;
    }
  }
}

export function clearArtifactPathCache(): void {
  cachedPath = null;
  cachedAt = 0;
  cachedDownload = null;
}

export async function downloadBlobArtifact(
  opts: DownloadOptions = {},
): Promise<string> {
  const pathname = opts.pathname ?? getMevWatchBlobPathname();
  const filePath = opts.filePath ?? BLOB_CACHE_PATH;
  const getBlob = opts.getBlob ?? get;
  const result = (await getBlob(pathname, {
    access: "private",
  })) as BlobGetResult | null;

  if (!result || result.statusCode !== 200) {
    throw new Error(`Blob data artifact not found at ${pathname}`);
  }

  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  return filePath;
}

export async function uploadBlobArtifact(
  opts: UploadOptions = {},
): Promise<Awaited<ReturnType<typeof put>>> {
  const pathname = opts.pathname ?? getMevWatchBlobPathname();
  const filePath = opts.filePath ?? SQLITE_DATA_PATH;
  const putBlob = opts.putBlob ?? put;
  const bytes = await fs.readFile(filePath);

  const result = await putBlob(pathname, bytes, {
    access: "private",
    allowOverwrite: true,
    contentType: "application/vnd.sqlite3",
    cacheControlMaxAge: 60,
    multipart: true,
  });
  clearArtifactPathCache();
  return result;
}
