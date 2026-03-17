import { getMatches, getTeams, getMapStats, getLeaderboard, Match, Team, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { HomeContent } from "./home-content";

export const revalidate = 30;

export default async function HomePage() {
  let matches: Match[] = [];
  let teams: Team[] = [];
  let tournaments: Tournament[] = [];

  const [tournamentsData, matchesData, teamsData] = await Promise.all([
    getTournamentsFromDB(),
    getMatches().catch(() => ({ matches: [] as Match[] })),
    getTeams().catch(() => ({ teams: [] as Team[] })),
  ]);

  tournaments = tournamentsData;
  matches = matchesData.matches || [];
  teams = teamsData.teams || [];

  // Build teamsMap for MatchCard props
  const teamsMap: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }> = {};
  teams.forEach((t) => {
    const players = t.auth_name ? Object.entries(t.auth_name).map(([steamId, val]) => ({
      steamId,
      name: typeof val === "string" ? val : val.name,
      captain: typeof val === "string" ? 0 : (val.captain || 0),
    })) : [];
    teamsMap[t.id] = { name: t.name, logo: t.logo, players };
  });

  const liveMatches = matches.filter((m) => getStatusType(m) === "live");
  const recentMatches = matches
    .filter((m) => getStatusType(m) === "finished")
    .slice(0, 5);

  // Fetch map stats for finished + live matches (MatchCard needs them)
  const allFinishedAndLive = matches.filter((m) => getStatusType(m) === "finished" || getStatusType(m) === "live");
  const mapScoresMap: Record<number, { team1_score: number; team2_score: number; map_name: string }[]> = {};
  await Promise.all(
    allFinishedAndLive.map(async (m) => {
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

  // Count total unique players from leaderboard
  let totalPlayers = 0;
  try {
    const lbRes = await getLeaderboard();
    totalPlayers = lbRes.leaderboard?.length || 0;
  } catch { /* ignore */ }

  return (
    <HomeContent
      tournaments={tournaments}
      liveMatches={liveMatches}
      recentMatches={recentMatches}
      totalMatches={matches.length}
      totalPlayers={totalPlayers}
      teamsMap={teamsMap}
      mapScoresMap={mapScoresMap}
    />
  );
}
