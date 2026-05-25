import { getLatestStats, getStatsSummary } from "@/lib/queries";
import { apiJson } from "@/lib/api-response";

export const dynamic = "force-static";

export async function GET() {
  const [latest, summary] = await Promise.all([
    getLatestStats(),
    getStatsSummary(),
  ]);
  return apiJson({ latest, summary });
}
