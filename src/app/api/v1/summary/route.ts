import { getLatestStats, getStatsSummary } from "@/lib/queries";
import { apiJson, apiOptions } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [latest, summary] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
  ]);
  return apiJson({ latest, summary });
}

export const OPTIONS = apiOptions;
