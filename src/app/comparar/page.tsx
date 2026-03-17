import { Suspense } from "react";
import { getLeaderboard } from "@/lib/api";
import { CompareContent } from "./compare-content";

export const revalidate = 60;

export default async function ComparePage() {
  let players: Awaited<ReturnType<typeof getLeaderboard>>["leaderboard"] = [];
  try {
    const res = await getLeaderboard();
    players = res.leaderboard || [];
  } catch {
    /* fallback to empty */
  }
  return (
    <Suspense>
      <CompareContent initialPlayers={players} />
    </Suspense>
  );
}
