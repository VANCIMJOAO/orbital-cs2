import { getMatches, getTeams, getMapStats, Match, Team, getStatusType } from "@/lib/api";
import { PartidasContent } from "./partidas-content";

export const revalidate = 30;

export default async function PartidasPage() {
  let matches: Match[] = [];
  let teams: Team[] = [];

  try {
    const [matchesRes, teamsRes] = await Promise.all([
      getMatches(),
      getTeams().catch(() => ({ teams: [] })),
    ]);
    matches = matchesRes.matches || [];
    teams = teamsRes.teams || [];
  } catch {
    // API offline
  }

  const teamsMap: Record<number, { name: string; logo: string | null }> = {};
  teams.forEach((t) => { teamsMap[t.id] = { name: t.name, logo: t.logo }; });

  // Fetch map stats for finished + live matches
  const displayedMatches = matches.filter(m => getStatusType(m) === "finished" || getStatusType(m) === "live");
  const mapScoresMap: Record<number, { team1_score: number; team2_score: number; map_name: string }[]> = {};
  await Promise.all(
    displayedMatches.map(async (m) => {
      try {
        const raw = await getMapStats(m.id) as Record<string, unknown>;
        const mapStats = (raw.mapstats || raw.mapStats || []) as { team1_score: number; team2_score: number; map_name: string }[];
        if (mapStats?.length > 0) {
          mapScoresMap[m.id] = mapStats.map(ms => ({
            team1_score: ms.team1_score,
            team2_score: ms.team2_score,
            map_name: ms.map_name,
          }));
        }
      } catch { /* ignore */ }
    })
  );

  return <PartidasContent matches={matches} teamsMap={teamsMap} mapScoresMap={mapScoresMap} />;
}
