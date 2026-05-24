/**
 * Reads the libSQL database URL. Throws if it is not configured,
 * so misconfiguration fails loudly rather than silently connecting nowhere.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Copy .env.example to .env.",
    );
  }
  return url;
}
