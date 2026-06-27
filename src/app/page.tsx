import { Metadata } from "next";
import { getMatches, getTeams, getLeaderboard, getMapStats, parseMapStats, Match, Team, LeaderboardEntry, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { getTournamentsFromDB, dbPool } from "@/lib/tournaments-db";
import { HomeContent } from "./home-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ORBITAL ROXA — Campeonatos CS2",
  description: "Plataforma de campeonatos CS2 presenciais e online com stats em tempo real, highlights automáticos, leaderboard e sistema completo de torneios. Ribeirão Preto/SP.",
  openGraph: {
    title: "ORBITAL ROXA — Campeonatos CS2",
    description: "Plataforma de campeonatos CS2 com stats ao vivo, highlights e ranking.",
    type: "website",
  },
};

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

  // Fetch map stats for displayed matches (direct to G5API, not self-referential)
  const displayedMatches = [...liveMatches, ...recentMatches.slice(0, 6)];
  const mapScoresMap: Record<number, { team1_score: number; team2_score: number; map_name: string }[]> = {};
  if (displayedMatches.length > 0) {
    try {
      const results = await Promise.all(
        displayedMatches.map(m => getMapStats(m.id).then(r => ({ id: m.id, stats: parseMapStats(r as Record<string, unknown>) })).catch(() => ({ id: m.id, stats: [] })))
      );
      for (const { id, stats } of results) {
        const ms = stats as { team1_score: number; team2_score: number; map_name: string }[];
        if (ms?.length > 0) {
          mapScoresMap[id] = ms.map(s => ({
            team1_score: s.team1_score,
            team2_score: s.team2_score,
            map_name: s.map_name,
          }));
        }
      }
    } catch { /* fallback: no map scores */ }
  }

  // Ligação partida -> campeonato (lógica HLTV: cada match carrega seu evento)
  const matchTournamentMap: Record<number, { id: string; name: string }> = {};
  const seasonToTour: Record<number, { id: string; name: string }> = {};
  for (const tour of tournaments) {
    const ref = { id: tour.id, name: tour.name };
    if (tour.season_id != null) seasonToTour[tour.season_id] = ref;
    for (const bm of tour.matches) {
      if (bm.match_id != null) matchTournamentMap[bm.match_id] = ref;
    }
  }

  // Find active tournament
  let activeTournament = tournaments.find(t => t.status === "active")
    || tournaments.find(t => t.status === "pending")
    || tournaments[0]
    || null;

  // Vagas preenchidas por campeonato = inscrições não-rejeitadas (pra contagem real
  // antes do bracket ser montado, quando tour.teams ainda está vazio)
  const inscritosCount: Record<string, number> = {};
  try {
    const [rows] = await dbPool.query(
      "SELECT tournament_id, COUNT(*) AS c FROM inscricoes WHERE status IN ('pendente','aprovado','pago') AND tournament_id IS NOT NULL GROUP BY tournament_id"
    );
    for (const r of rows as { tournament_id: string; c: number }[]) {
      inscritosCount[r.tournament_id] = Number(r.c);
    }
  } catch { /* tabela inscricoes pode não existir ainda */ }

  // Top 5 players
  const topPlayers = [...leaderboard]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 5);

  // MVP do último campeonato encerrado (pro card de recap do hero)
  let recapMvp: { steamId: string; name: string; average_rating: number } | null = null;
  const recapTour = tournaments.find((t) => t.status === "finished") || null;
  if (recapTour?.season_id != null) {
    try {
      const lb = (await getLeaderboard(recapTour.season_id)).leaderboard || [];
      if (lb.length > 0) {
        const top = lb.reduce((b, c) => ((c.average_rating || 0) > (b.average_rating || 0) ? c : b), lb[0]);
        recapMvp = { steamId: top.steamId, name: top.name, average_rating: top.average_rating || 0 };
      }
    } catch { /* sem MVP */ }
  }

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
      matchTournamentMap={matchTournamentMap}
      seasonToTour={seasonToTour}
      recapMvp={recapMvp}
      inscritosCount={inscritosCount}
    />
  );
}
