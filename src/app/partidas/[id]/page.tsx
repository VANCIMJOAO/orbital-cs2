import { Metadata } from "next";
import { getMatch, getPlayerStats, getMapStats, getTeam, getServer } from "@/lib/api";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { BracketMatch } from "@/lib/tournament";
import { MatchDetailContent } from "./match-detail-content";

export const revalidate = 5;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const matchRes = await getMatch(parseInt(id));
    const match = matchRes.match;
    const [team1Res, team2Res] = await Promise.all([
      getTeam(match.team1_id).catch(() => null),
      getTeam(match.team2_id).catch(() => null),
    ]);
    const team1Name = team1Res?.team?.name || match.team1_string || "Time 1";
    const team2Name = team2Res?.team?.name || match.team2_string || "Time 2";
    const score = match.end_time
      ? ` ${match.team1_score}-${match.team2_score}`
      : "";
    return {
      title: `${team1Name} vs ${team2Name}${score} | ORBITAL ROXA`,
    };
  } catch {
    return {
      title: `Partida #${id} | ORBITAL ROXA`,
    };
  }
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = parseInt(id);

  try {
    const [matchRes, statsRes, mapStatsRes, tournaments] = await Promise.all([
      getMatch(matchId),
      getPlayerStats(matchId).catch(() => ({ playerStats: [] })),
      getMapStats(matchId).catch(() => ({ mapStats: [] })),
      getTournamentsFromDB().catch(() => []),
    ]);

    const match = matchRes.match;

    // Buscar dados dos times e servidor
    const [team1Res, team2Res, serverRes] = await Promise.all([
      getTeam(match.team1_id).catch(() => null),
      getTeam(match.team2_id).catch(() => null),
      getServer(match.server_id).catch(() => null),
    ]);

    // API retorna chaves em lowercase: playerstats, mapstats
    const raw = statsRes as Record<string, unknown>;
    const playerStatsRaw = Array.isArray(statsRes) ? statsRes : (raw.playerstats || raw.playerStats || []);
    const playerStats = Array.isArray(playerStatsRaw) ? playerStatsRaw : [];
    const rawMap = mapStatsRes as Record<string, unknown>;
    const mapStatsRaw = Array.isArray(mapStatsRes) ? mapStatsRes : (rawMap.mapstats || rawMap.mapStats || []);
    const mapStatsArr = Array.isArray(mapStatsRaw) ? mapStatsRaw : [];

    // Find bracket match from tournament (for veto history + map info)
    let bracketMatch: BracketMatch | null = null;
    let tournamentName: string | null = null;
    for (const t of tournaments) {
      const bm = t.matches.find(m => m.match_id === matchId);
      if (bm) {
        bracketMatch = bm;
        tournamentName = t.name;
        break;
      }
    }

    return (
      <MatchDetailContent
        match={match}
        playerStats={playerStats}
        mapStats={mapStatsArr}
        team1={team1Res?.team || null}
        team2={team2Res?.team || null}
        server={serverRes?.server || null}
        bracketMatch={bracketMatch}
        tournamentName={tournamentName}
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
