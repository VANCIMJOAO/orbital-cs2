import { Metadata } from "next";
import { getMatches, getTeams, getMapStats, parseMapStats, Match, Team, getStatusType } from "@/lib/api";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { PartidasContent } from "./partidas-content";

export const metadata: Metadata = {
  title: "Partidas | ORBITAL ROXA",
  description: "Todas as partidas de CS2 da ORBITAL ROXA. Acompanhe resultados, placares e estatísticas.",
};

export const revalidate = 30;

export default async function PartidasPage() {
  let matches: Match[] = [];
  let teams: Team[] = [];
  let tournaments: Awaited<ReturnType<typeof getTournamentsFromDB>> = [];

  try {
    const [matchesRes, teamsRes, toursRes] = await Promise.all([
      getMatches(),
      getTeams().catch(() => ({ teams: [] })),
      getTournamentsFromDB().catch(() => []),
    ]);
    matches = matchesRes.matches || [];
    teams = teamsRes.teams || [];
    tournaments = toursRes || [];
  } catch {
    // API offline
  }

  const teamsMap: Record<number, { name: string; logo: string | null }> = {};
  teams.forEach((t) => { teamsMap[t.id] = { name: t.name, logo: t.logo }; });

  // Vínculo partida → campeonato (match_id carrega seu evento)
  const matchTournamentMap: Record<number, { id: string; name: string; logo?: string | null }> = {};
  for (const tour of tournaments) {
    const ref = { id: tour.id, name: tour.name };
    for (const bm of tour.matches) {
      if (bm.match_id != null) matchTournamentMap[bm.match_id] = ref;
    }
  }

  // Fetch map stats for recent finished + live matches (limit to 16 for performance)
  const displayedMatches = [
    ...matches.filter(m => getStatusType(m) === "live"),
    ...matches.filter(m => getStatusType(m) === "finished").slice(0, 16),
  ];
  const mapScoresMap: Record<number, { team1_score: number; team2_score: number; map_name: string }[]> = {};
  await Promise.all(
    displayedMatches.map(async (m) => {
      try {
        const raw = await getMapStats(m.id) as Record<string, unknown>;
        const mapStats = parseMapStats(raw);
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

  return <PartidasContent matches={matches} teamsMap={teamsMap} mapScoresMap={mapScoresMap} matchTournamentMap={matchTournamentMap} />;
}
