import { NextResponse } from "next/server";

/**
 * Builds a JSON response for the public API: permissive CORS so third parties
 * can fetch it, and an hourly shared cache (the underlying data updates daily).
 */
export function apiJson(data: unknown): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
