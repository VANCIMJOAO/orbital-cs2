import { Metadata } from "next";
import { getMatches, getTeams, getLeaderboard, getMapStats, parseMapStats, Match, Team, LeaderboardEntry, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
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

  // ═══ TEMP PREVIEW — Campeonato #2 "em breve" (só pra visualizar; REMOVER depois) ═══
  tournaments = [
    {
      id: "preview-cup-2",
      name: "ORBITAL ROXA CUP #2",
      season_id: null,
      server_id: null,
      format: "double_elimination",
      mode: "online",
      teams: [
        { id: 9001, name: "Time A", tag: "TA", seed: 1 },
        { id: 9002, name: "Time B", tag: "TB", seed: 2 },
        { id: 9003, name: "Time C", tag: "TC", seed: 3 },
        { id: 9004, name: "Time D", tag: "TD", seed: 4 },
        { id: 9005, name: "Time E", tag: "TE", seed: 5 },
      ],
      matches: [],
      map_pool: [],
      players_per_team: 5,
      created_at: "2026-06-26T00:00:00.000Z",
      status: "pending",
      current_match_id: null,
      start_date: "12/07/2026",
      location: "Ribeirão Preto / SP",
    },
    ...tournaments,
  ];
  // ═══ FIM TEMP PREVIEW ═══

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
    />
  );
}
