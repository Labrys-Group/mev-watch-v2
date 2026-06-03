import { NextResponse } from "next/server";

export const apiCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type",
} as const;

function getApiCorsHeaders(request?: Request): HeadersInit {
  const requestedHeaders = request?.headers.get("access-control-request-headers");

  return {
    ...apiCorsHeaders,
    ...(requestedHeaders
      ? { vary: "Access-Control-Request-Headers" }
      : null),
    ...(requestedHeaders
      ? { "access-control-allow-headers": requestedHeaders }
      : null),
  };
}

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

export function apiOptions(request?: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getApiCorsHeaders(request),
  });
}
