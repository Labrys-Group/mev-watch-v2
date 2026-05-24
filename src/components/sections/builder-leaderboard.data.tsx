import { BuilderLeaderboard } from "@/components/sections/builder-leaderboard";
import { getBuilderLeaderboard } from "@/lib/queries";

// Empty array is fine — <BuilderLeaderboard> renders its own "No builder
// data available" row when rows.length === 0.
export async function BuilderLeaderboardData() {
  const rows = await getBuilderLeaderboard();
  return <BuilderLeaderboard rows={rows} />;
}
