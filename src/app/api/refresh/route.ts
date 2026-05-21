import { NextResponse } from "next/server";
import { refreshDay } from "@/lib/refresh";
import { RelayscanDataSource } from "@/lib/data-source/relayscan";

export const runtime = "nodejs";
// Always run fresh — never serve a cached refresh.
export const dynamic = "force-dynamic";

/** Yesterday (UTC) as an ISO date — the most recent complete day. */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Cron entry point. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`
 * when a CRON_SECRET env var is set; we reject anything that does not match.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = yesterdayUtc();
  const result = await refreshDay(date, new RelayscanDataSource());

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 500,
  });
}
