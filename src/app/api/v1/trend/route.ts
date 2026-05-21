import { getTrend } from "@/lib/queries";
import { apiJson } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  return apiJson({ trend: await getTrend() });
}
