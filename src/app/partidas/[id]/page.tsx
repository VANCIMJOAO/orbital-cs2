import { getMatch, getPlayerStats, getMapStats, getTeam } from "@/lib/api";
import { MatchDetailContent } from "./match-detail-content";

export const revalidate = 5;

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = parseInt(id);

  try {
    const [matchRes, statsRes, mapStatsRes] = await Promise.all([
      getMatch(matchId),
      getPlayerStats(matchId).catch(() => ({ playerStats: [] })),
      getMapStats(matchId).catch(() => ({ mapStats: [] })),
    ]);

    const match = matchRes.match;

    // Buscar dados dos times
    const [team1Res, team2Res] = await Promise.all([
      getTeam(match.team1_id).catch(() => null),
      getTeam(match.team2_id).catch(() => null),
    ]);

    // API retorna chaves em lowercase: playerstats, mapstats
    const raw = statsRes as Record<string, unknown>;
    const playerStatsRaw = Array.isArray(statsRes) ? statsRes : (raw.playerstats || raw.playerStats || []);
    const playerStats = Array.isArray(playerStatsRaw) ? playerStatsRaw : [];
    const rawMap = mapStatsRes as Record<string, unknown>;
    const mapStatsRaw = Array.isArray(mapStatsRes) ? mapStatsRes : (rawMap.mapstats || rawMap.mapStats || []);
    const mapStatsArr = Array.isArray(mapStatsRaw) ? mapStatsRaw : [];

    return (
      <MatchDetailContent
        match={match}
        playerStats={playerStats}
        mapStats={mapStatsArr}
        team1={team1Res?.team || null}
        team2={team2Res?.team || null}
      />
    );
  } catch {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="font-[family-name:var(--font-orbitron)] text-orbital-text-dim">
          Partida #{id} não encontrada
        </p>
      </div>
    );
  }
}
