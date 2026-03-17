import { Metadata } from "next";
import { getLeaderboard, getSeasons } from "@/lib/api";
import { LeaderboardContent } from "./leaderboard-content";

export const metadata: Metadata = {
  title: "Leaderboard | ORBITAL ROXA",
  description: "Ranking dos jogadores de CS2 da ORBITAL ROXA. Veja quem lidera em kills, rating e mais.",
};

export default async function LeaderboardPage() {
  const [leaderboardData, seasonsData] = await Promise.all([
    getLeaderboard().catch(() => ({ leaderboard: [] })),
    getSeasons().catch(() => ({ seasons: [] })),
  ]);

  return (
    <LeaderboardContent
      initialLeaderboard={leaderboardData.leaderboard}
      initialSeasons={seasonsData.seasons}
    />
  );
}
