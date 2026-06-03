import { NextResponse } from "next/server";

export const apiCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type",
} as const;

/**
 * Builds a JSON response for the public API: permissive CORS so third parties
 * can fetch it, and an hourly shared cache (the underlying data updates daily).
 */
export function apiJson(data: unknown): NextResponse {
  return NextResponse.json(data, {
    headers: {
      ...apiCorsHeaders,
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export function apiOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: apiCorsHeaders,
  });
}
