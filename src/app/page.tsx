import { getMatches, getTeams, getMatch, getMapStats, getLeaderboard, parseMapStats, Match, Team, LeaderboardEntry, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { autoAdvanceTournament } from "@/lib/tournament-utils";
import { getTournamentsFromDB, saveTournamentToDB } from "@/lib/tournaments-db";
import { HomeContent } from "./home-content";

export const revalidate = 60;

export default async function HomePage() {
  let matches: Match[] = [];
  let teams: Team[] = [];
  let tournaments: Tournament[] = [];
  let leaderboard: LeaderboardEntry[] = [];

  const [tournamentsData, matchesData, teamsData, leaderboardData] = await Promise.all([
    getTournamentsFromDB(),
    getMatches().catch(() => ({ matches: [] as Match[] })),
    getTeams().catch(() => ({ teams: [] as Team[] })),
    getLeaderboard().catch(() => ({ leaderboard: [] as LeaderboardEntry[] })),
  ]);

  tournaments = tournamentsData;
  matches = matchesData.matches || [];
  teams = teamsData.teams || [];
  leaderboard = leaderboardData.leaderboard || [];

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
    .slice(0, 8);
  const upcomingMatches = matches
    .filter((m) => getStatusType(m) === "upcoming")
    .slice(0, 5);

  // Fetch map stats for displayed matches
  const displayedMatches = [...liveMatches, ...recentMatches.slice(0, 5)];
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

  // Find active tournament
  let activeTournament = tournaments.find(t => t.status === "active")
    || tournaments.find(t => t.status === "pending")
    || tournaments[0]
    || null;

  // Auto-advance bracket
  if (activeTournament) {
    const serverFetcher = async (matchId: number) => {
      const data = await getMatch(matchId);
      return data.match || null;
    };
    const result = await autoAdvanceTournament(activeTournament, serverFetcher);
    if (result.changed) {
      await saveTournamentToDB(result.tournament);
    }
    activeTournament = result.tournament;
  }

  // Top 5 players
  const topPlayers = [...leaderboard]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 5);

  return (
    <HomeContent
      tournaments={tournaments}
      activeTournament={activeTournament}
      liveMatches={liveMatches}
      recentMatches={recentMatches}
      upcomingMatches={upcomingMatches}
      totalMatches={matches.length}
      teamCount={teams.length}
      playerCount={leaderboard.length}
      topPlayers={topPlayers}
      teamsMap={teamsMap}
      mapScoresMap={mapScoresMap}
    />
  );
}
