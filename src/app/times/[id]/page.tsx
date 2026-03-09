import { getTeam, getMatches, Team, Match } from "@/lib/api";
import { TeamDetailContent } from "./team-detail-content";

export const revalidate = 30;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id);

  try {
    const [teamRes, matchesRes] = await Promise.all([
      getTeam(teamId),
      getMatches().catch(() => ({ matches: [] })),
    ]);

    const team = teamRes.team;
    // Filter matches involving this team
    const teamMatches = (matchesRes.matches || [])
      .filter((m: Match) => m.team1_id === teamId || m.team2_id === teamId)
      .sort((a: Match, b: Match) => b.id - a.id)
      .slice(0, 20);

    return <TeamDetailContent team={team} matches={teamMatches} />;
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
