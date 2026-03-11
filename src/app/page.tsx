import { getMatches, getTeams, getMapStats, Match, Team, MapStats, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { HomeContent } from "./home-content";

export const revalidate = 30;

export default async function HomePage() {
  let matches: Match[] = [];
  let teams: Team[] = [];
  let tournaments: Tournament[] = [];

  const [tournamentsData, apiData] = await Promise.all([
    getTournamentsFromDB(),
    Promise.all([getMatches(), getTeams()]).catch(() => [{ matches: [] }, { teams: [] }]),
  ]);

  tournaments = tournamentsData;

  if (Array.isArray(apiData)) {
    matches = (apiData[0] as { matches: Match[] }).matches || [];
    teams = (apiData[1] as { teams: Team[] }).teams || [];
  }

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
  const upcomingMatches = matches
    .filter((m) => getStatusType(m) === "upcoming")
    .slice(0, 3);

  // Fetch map stats for finished + live matches (to show round scores)
  const displayedMatches = [...liveMatches, ...recentMatches];
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

  // Find active tournament (priority: active > pending > finished)
  const activeTournament = tournaments.find(t => t.status === "active")
    || tournaments.find(t => t.status === "pending")
    || tournaments[0]
    || null;

  return (
    <HomeContent
      tournament={activeTournament}
      liveMatches={liveMatches}
      recentMatches={recentMatches}
      upcomingMatches={upcomingMatches}
      totalMatches={matches.length}
      teamCount={teams.length}
      teamsMap={teamsMap}
      mapScoresMap={mapScoresMap}
    />
  );
}
