import { getTrend } from "@/lib/queries";
import { apiJson } from "@/lib/api-response";

export const dynamic = "force-static";

export async function GET() {
  return apiJson({ trend: await getTrend() });
}
