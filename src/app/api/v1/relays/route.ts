import { getLeaderboard } from "@/lib/queries";
import { apiJson } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiJson({ relays: await getLeaderboard() });
}
