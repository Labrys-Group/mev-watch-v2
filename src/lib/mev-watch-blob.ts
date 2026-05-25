import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  put,
} from "@vercel/blob";
import { SQLITE_DATA_PATH } from "./mev-watch-sqlite";

export const DEFAULT_BLOB_PATHNAME = "data/mev-watch.sqlite";
export const BLOB_CACHE_PATH = path.join(tmpdir(), "mev-watch.sqlite");
export const BLOB_WRITE_PATH = path.join(tmpdir(), "mev-watch-update.sqlite");
export const DEFAULT_BLOB_CACHE_TTL_MS = 5 * 60 * 1000;
export const REFRESH_LOCK_TTL_MS = 15 * 60 * 1000;

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

interface LockBody {
  runId: string;
  artifactPathname: string;
  acquiredAt: string;
  expiresAt: string;
}

interface BlobHeadResult {
  etag: string;
  uploadedAt?: Date;
}

type HeadBlobFn = (pathname: string) => Promise<BlobHeadResult>;
type GetBlobFn = typeof get;
type PutBlobFn = typeof put;
type DelBlobFn = typeof del;

interface AcquireRefreshLockOptions {
  artifactPathname?: string;
  lockPathname?: string;
  now?: Date;
  ttlMs?: number;
  runId?: string;
  headBlob?: HeadBlobFn;
  getBlob?: GetBlobFn;
  putBlob?: PutBlobFn;
  delBlob?: DelBlobFn;
}

interface ReleaseRefreshLockOptions {
  delBlob?: DelBlobFn;
}

export interface AcquiredRefreshLock {
  acquired: true;
  lockPathname: string;
  etag: string;
  runId: string;
}

export interface SkippedRefreshLock {
  acquired: false;
  reason: "refresh_locked";
  lockPathname: string;
}

export type RefreshLock = AcquiredRefreshLock | SkippedRefreshLock;

let cachedPath: string | null = null;
let cachedAt = 0;
let cachedDownload: Promise<string> | null = null;

export function getMevWatchBlobPathname(): string {
  return process.env.MEV_WATCH_BLOB_PATH ?? DEFAULT_BLOB_PATHNAME;
}

export function getMevWatchLockPathname(
  artifactPathname = getMevWatchBlobPathname(),
): string {
  return `${artifactPathname}.lock`;
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

export async function acquireRefreshLock(
  opts: AcquireRefreshLockOptions = {},
): Promise<RefreshLock> {
  const artifactPathname = opts.artifactPathname ?? getMevWatchBlobPathname();
  const lockPathname =
    opts.lockPathname ?? getMevWatchLockPathname(artifactPathname);
  const now = opts.now ?? new Date();
  const ttlMs = opts.ttlMs ?? REFRESH_LOCK_TTL_MS;
  const runId = opts.runId ?? crypto.randomUUID();
  const headBlob = opts.headBlob ?? head;
  const getBlob = opts.getBlob ?? get;
  const putBlob = opts.putBlob ?? put;
  const delBlob = opts.delBlob ?? del;

  let existing: BlobHeadResult | null = null;
  try {
    existing = await headBlob(lockPathname);
  } catch (error) {
    if (!isBlobNotFoundError(error)) throw error;
  }

  if (existing) {
    const lockBody = await readRefreshLockBody(getBlob, lockPathname);
    if (!isExpiredLock(lockBody, existing, now, ttlMs)) {
      return locked(lockPathname);
    }

    try {
      await delBlob(lockPathname, { ifMatch: existing.etag });
    } catch (error) {
      if (isBlobNotFoundError(error) || isBlobPreconditionFailedError(error)) {
        return locked(lockPathname);
      }
      throw error;
    }
  }

  const body: LockBody = {
    runId,
    artifactPathname,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };

  try {
    const created = await putBlob(lockPathname, JSON.stringify(body), {
      access: "private",
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return {
      acquired: true,
      lockPathname,
      etag: created.etag,
      runId,
    };
  } catch (error) {
    if (isBlobPreconditionFailedError(error)) {
      return locked(lockPathname);
    }
    throw error;
  }
}

export async function releaseRefreshLock(
  lock: RefreshLock,
  opts: ReleaseRefreshLockOptions = {},
): Promise<void> {
  if (!lock.acquired) return;
  const delBlob = opts.delBlob ?? del;

  try {
    await delBlob(lock.lockPathname, { ifMatch: lock.etag });
  } catch (error) {
    if (isBlobNotFoundError(error) || isBlobPreconditionFailedError(error)) {
      return;
    }
    throw error;
  }
}

async function readRefreshLockBody(
  getBlob: GetBlobFn,
  lockPathname: string,
): Promise<LockBody | null> {
  const result = await getBlob(lockPathname, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;

  try {
    const body = await new Response(result.stream).json();
    return isLockBody(body) ? body : null;
  } catch {
    return null;
  }
}

function isExpiredLock(
  lockBody: LockBody | null,
  headResult: BlobHeadResult,
  now: Date,
  ttlMs: number,
): boolean {
  if (lockBody) return Date.parse(lockBody.expiresAt) <= now.getTime();
  if (headResult.uploadedAt) {
    return headResult.uploadedAt.getTime() + ttlMs <= now.getTime();
  }
  return false;
}

function isLockBody(value: unknown): value is LockBody {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.runId === "string" &&
    typeof candidate.artifactPathname === "string" &&
    typeof candidate.acquiredAt === "string" &&
    typeof candidate.expiresAt === "string"
  );
}

function locked(lockPathname: string): SkippedRefreshLock {
  return { acquired: false, reason: "refresh_locked", lockPathname };
}

function isBlobNotFoundError(error: unknown): boolean {
  return (
    error instanceof BlobNotFoundError ||
    (error instanceof Error && error.name === "BlobNotFoundError")
  );
}

function isBlobPreconditionFailedError(error: unknown): boolean {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error && error.name === "BlobPreconditionFailedError")
  );
}
