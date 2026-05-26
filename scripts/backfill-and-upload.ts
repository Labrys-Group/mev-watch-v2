import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  updateDataFile,
  type UpdateDataFileOptions,
} from "../src/lib/mev-watch-generator";
import {
  getMevWatchBlobPathname,
  uploadBlobArtifact,
} from "../src/lib/mev-watch-blob";
import { SQLITE_DATA_PATH } from "../src/lib/mev-watch-sqlite";

export const DEFAULT_BACKFILL_DB_PATH = path.join(
  process.cwd(),
  "data/mev-watch.db",
);

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_WRITE_EVERY = 1;

type Env = Record<string, string | undefined>;
type Mkdir = (dirPath: string, opts: { recursive: true }) => Promise<unknown>;
type CopyFile = (source: string, destination: string) => Promise<unknown>;
type Access = (filePath: string) => Promise<unknown>;
type UpdateDataFile = typeof updateDataFile;
type UploadBlobArtifact = typeof uploadBlobArtifact;

interface BackfillAndUploadOptions {
  seedFilePath?: string;
  filePath?: string;
  blobPathname?: string;
  concurrency?: number;
  writeEvery?: number;
  mkdir?: Mkdir;
  copyFile?: CopyFile;
  access?: Access;
  updateDataFile?: UpdateDataFile;
  uploadBlobArtifact?: UploadBlobArtifact;
  onProgress?: (progress: { date: string; index: number; total: number }) => void;
  onPersist?: UpdateDataFileOptions["onPersist"];
}

interface BackfillAndUploadResult {
  changed: boolean;
  fetchedDates: string[];
  sourceEndDate: string | null;
  uploadedUrl: string | null;
}

interface BackfillAndUploadConfig {
  seedFilePath: string;
  filePath: string;
  blobPathname: string;
  concurrency: number;
  writeEvery: number;
}

export function readBackfillUploadConcurrency(
  env: Env = process.env,
): number {
  return readPositiveInteger(env.UPDATE_DATA_CONCURRENCY, DEFAULT_CONCURRENCY);
}

export function readBackfillUploadWriteEvery(env: Env = process.env): number {
  return readPositiveInteger(env.UPDATE_DATA_WRITE_EVERY, DEFAULT_WRITE_EVERY);
}

export function readBackfillUploadConfig(
  args = process.argv.slice(2),
  env: Env = process.env,
): BackfillAndUploadConfig {
  return {
    seedFilePath: path.resolve(
      readOption(args, "--seed") ?? env.MEV_WATCH_BACKFILL_SEED_PATH ?? SQLITE_DATA_PATH,
    ),
    filePath: path.resolve(
      readOption(args, "--file") ?? env.MEV_WATCH_BACKFILL_PATH ?? DEFAULT_BACKFILL_DB_PATH,
    ),
    blobPathname: readOption(args, "--blob-path") ?? getMevWatchBlobPathname(),
    concurrency: readBackfillUploadConcurrency(env),
    writeEvery: readBackfillUploadWriteEvery(env),
  };
}

export async function backfillAndUploadArtifact(
  opts: BackfillAndUploadOptions = {},
): Promise<BackfillAndUploadResult> {
  const seedFilePath = opts.seedFilePath ?? SQLITE_DATA_PATH;
  const filePath = opts.filePath ?? DEFAULT_BACKFILL_DB_PATH;
  const blobPathname = opts.blobPathname ?? getMevWatchBlobPathname();
  const mkdir = opts.mkdir ?? fs.mkdir;
  const copyFile = opts.copyFile ?? fs.copyFile;
  const access = opts.access ?? fs.access;
  const runUpdateDataFile = opts.updateDataFile ?? updateDataFile;
  const runUploadBlobArtifact = opts.uploadBlobArtifact ?? uploadBlobArtifact;

  await mkdir(path.dirname(filePath), { recursive: true });
  if (!(await fileExists(filePath, access))) {
    await copyFile(seedFilePath, filePath);
  }

  const result = await runUpdateDataFile({
    filePath,
    concurrency: opts.concurrency ?? DEFAULT_CONCURRENCY,
    writeEvery: opts.writeEvery ?? DEFAULT_WRITE_EVERY,
    onProgress: opts.onProgress,
    onPersist: opts.onPersist,
  });
  const uploadResult = await runUploadBlobArtifact({
    filePath,
    pathname: blobPathname,
  });

  return {
    changed: result.changed,
    fetchedDates: result.fetchedDates,
    sourceEndDate: result.snapshot.sourceEndDate,
    uploadedUrl: readUploadedUrl(uploadResult),
  };
}

export async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to upload to Vercel Blob.");
  }

  const config = readBackfillUploadConfig();
  const result = await backfillAndUploadArtifact({
    ...config,
    onProgress: ({ date, index, total }) => {
      console.log(`[${index}/${total}] fetched ${date}`);
    },
    onPersist: ({ persistedDates, sourceEndDate }) => {
      console.log(
        `saved ${persistedDates.length} day(s), resumable through ${sourceEndDate}`,
      );
    },
  });

  console.log(`created ${config.filePath}`);
  if (result.fetchedDates.length === 0) {
    console.log("MEV Watch data is already current.");
  } else {
    console.log(
      `backfilled ${result.fetchedDates.length} day(s): ${result.fetchedDates[0]}..${result.fetchedDates.at(-1)}`,
    );
  }
  console.log(`uploaded ${config.filePath} to ${config.blobPathname}`);
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function readOption(args: string[], flag: string): string | undefined {
  const equalsPrefix = `${flag}=`;
  const equalsValue = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsValue) return equalsValue.slice(equalsPrefix.length);

  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function fileExists(filePath: string, access: Access): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function readUploadedUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.url === "string" ? candidate.url : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
