import { Metadata } from "next";
import { Suspense } from "react";
import { getLeaderboard } from "@/lib/api";
import { CompareContent } from "./compare-content";

export const metadata: Metadata = {
  title: "Comparar Jogadores | ORBITAL ROXA",
  description: "Compare estatísticas de jogadores de CS2 lado a lado na ORBITAL ROXA.",
};

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
