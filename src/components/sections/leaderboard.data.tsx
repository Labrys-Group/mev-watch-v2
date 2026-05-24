import { Leaderboard } from "@/components/sections/leaderboard";
import { getLeaderboard } from "@/lib/queries";

// Empty array is fine — <Leaderboard> renders its own "No relay data
// available" row when rows.length === 0.
export async function LeaderboardData() {
  const rows = await getLeaderboard();
  return <Leaderboard rows={rows} />;
}
