import { getTeam, getTeams, getMatches, getPlayerStats, getMapStats, Team, Match, PlayerStats, MapStats } from "@/lib/api";
import { TeamDetailContent } from "./team-detail-content";

export const revalidate = 30;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id);

  try {
    const [teamRes, matchesRes, teamsRes] = await Promise.all([
      getTeam(teamId),
      getMatches().catch(() => ({ matches: [] })),
      getTeams().catch(() => ({ teams: [] })),
    ]);

    const team = teamRes.team;
    const allMatches = matchesRes.matches || [];
    const allTeams = teamsRes.teams || [];

    // Filter matches involving this team
    const teamMatches = allMatches
      .filter((m: Match) => m.team1_id === teamId || m.team2_id === teamId)
      .sort((a: Match, b: Match) => b.id - a.id);

    // Fetch player stats and map stats for all finished team matches (limit to recent 50)
    const finishedMatches = teamMatches.filter(m => m.end_time && !m.cancelled).slice(0, 50);

    const [allPlayerStats, allMapStats] = await Promise.all([
      Promise.all(
        finishedMatches.map(m =>
          getPlayerStats(m.id)
            .then(r => {
              const raw = r as Record<string, unknown>;
              const stats = Array.isArray(r) ? r : (raw.playerstats || raw.playerStats || []);
              return Array.isArray(stats) ? stats as PlayerStats[] : [];
            })
            .catch(() => [] as PlayerStats[])
        )
      ),
      Promise.all(
        finishedMatches.map(m =>
          getMapStats(m.id)
            .then(r => {
              const raw = r as Record<string, unknown>;
              const stats = Array.isArray(r) ? r : (raw.mapstats || raw.mapStats || []);
              return Array.isArray(stats) ? stats as MapStats[] : [];
            })
            .catch(() => [] as MapStats[])
        )
      ),
    ]);

    const playerStats = allPlayerStats.flat();
    const mapStats = allMapStats.flat();

    // Build teams map with name + logo from full team data
    const teamsMap: Record<number, { name: string; logo: string | null }> = {};
    allTeams.forEach((t: Team) => {
      teamsMap[t.id] = { name: t.name, logo: t.logo };
    });
    // Fallback: fill from match strings for teams not in allTeams
    allMatches.forEach((m: Match) => {
      if (!teamsMap[m.team1_id] && m.team1_string) teamsMap[m.team1_id] = { name: m.team1_string, logo: null };
      if (!teamsMap[m.team2_id] && m.team2_string) teamsMap[m.team2_id] = { name: m.team2_string, logo: null };
    });

    return (
      <TeamDetailContent
        team={team}
        matches={teamMatches}
        playerStats={playerStats}
        mapStats={mapStats}
        teamsMap={teamsMap}
      />
    );
  } catch {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="font-[family-name:var(--font-orbitron)] text-orbital-text-dim">
          Time #{id} não encontrado
        </p>
      </div>
    );
  }
}
