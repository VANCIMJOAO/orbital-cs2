import { Metadata } from "next";
import { getMatches, getTeams, getLeaderboard, Match, Team, LeaderboardEntry, getStatusType } from "@/lib/api";
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

  // Fetch map stats for displayed matches (batch)
  const displayedMatches = [...liveMatches, ...recentMatches.slice(0, 5)];
  const mapScoresMap: Record<number, { team1_score: number; team2_score: number; map_name: string }[]> = {};
  if (displayedMatches.length > 0) {
    try {
      const ids = displayedMatches.map(m => m.id).join(",");
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.orbitalroxa.com.br";
      const batchRes = await fetch(`${SITE_URL}/api/mapstats-batch?ids=${ids}`, { next: { revalidate: 30 } }).catch(() => null);
      if (batchRes?.ok) {
        const batchData = await batchRes.json();
        const batchMap = batchData.mapStats || {};
        for (const [idStr, stats] of Object.entries(batchMap)) {
          const ms = stats as { team1_score: number; team2_score: number; map_name: string }[];
          if (ms?.length > 0) {
            mapScoresMap[Number(idStr)] = ms.map(s => ({
              team1_score: s.team1_score,
              team2_score: s.team2_score,
              map_name: s.map_name,
            }));
          }
        }
      }
    } catch { /* fallback: no map scores */ }
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
