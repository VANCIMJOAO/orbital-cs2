import { getLeaderboard, LeaderboardEntry } from "@/lib/api";
import { LeaderboardContent } from "./leaderboard-content";

export const revalidate = 60;

export default async function LeaderboardPage() {
  let leaderboard: LeaderboardEntry[] = [];

  try {
    const res = await getLeaderboard();
    leaderboard = res.leaderboard || [];
  } catch {
    // API offline
  }

  return <LeaderboardContent leaderboard={leaderboard} />;
}
