import { redirect } from "next/navigation";
import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { getLeaderboard, getMatch, getMapStats, getPlayerStats } from "@/lib/api";
import type { Match, MapStats, PlayerStats, LeaderboardEntry } from "@/lib/api";
import type { Tournament, BracketMatch } from "@/lib/tournament";
import { RecapContent } from "./recap-content";

interface MatchData {
  bracketMatch: BracketMatch;
  match: Match | null;
  mapStats: MapStats[];
  playerStats: PlayerStats[];
}

interface HighlightClip {
  id: number;
  match_id: number;
  map_number: number;
  rank: number;
  player_name: string;
  steam_id: string;
  kills_count: number;
  score: number;
  description: string;
  round_number: number;
  video_file: string;
  thumbnail_file: string;
  duration_s: number;
  status: string;
  created_at: string;
  team1_string: string;
  team2_string: string;
}

async function fetchHighlightsForMatches(matchIds: number[]): Promise<HighlightClip[]> {
  const G5API_URL = process.env.NEXT_PUBLIC_G5API_URL || process.env.G5API_URL || "https://g5api-production-998f.up.railway.app";
  try {
    const res = await fetch(`${G5API_URL}/highlights/all?limit=200`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const all: HighlightClip[] = data.clips || [];
    return all.filter(c => matchIds.includes(c.match_id));
  } catch {
    return [];
  }
}

export default async function RecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournaments = await getTournamentsFromDB();
  const tournament = tournaments.find((t: Tournament) => t.id === id);

  if (!tournament) {
    redirect(`/campeonato/${id}`);
  }

  if (tournament.status !== "finished") {
    redirect(`/campeonato/${id}`);
  }

  // Fetch leaderboard for the tournament's season
  let leaderboard: LeaderboardEntry[] = [];
  try {
    const lb = await getLeaderboard(tournament.season_id ?? undefined);
    leaderboard = lb.leaderboard || [];
  } catch {
    leaderboard = [];
  }

  // Fetch match data for all bracket matches that have a match_id
  const bracketMatchesWithId = tournament.matches.filter((m: BracketMatch) => m.match_id);
  const matchDataPromises = bracketMatchesWithId.map(async (bm: BracketMatch): Promise<MatchData> => {
    try {
      const [matchRes, mapRes, playerRes] = await Promise.all([
        getMatch(bm.match_id!),
        getMapStats(bm.match_id!).then(r => r as Record<string, unknown>),
        getPlayerStats(bm.match_id!).then(r => r as Record<string, unknown>),
      ]);
      // G5API returns lowercase keys: mapstats, playerstats
      const mapStats = (mapRes.mapStats || mapRes.mapstats || []) as MapStats[];
      const playerStats = (playerRes.playerStats || playerRes.playerstats || []) as PlayerStats[];
      return {
        bracketMatch: bm,
        match: matchRes.match || null,
        mapStats,
        playerStats,
      };
    } catch {
      return { bracketMatch: bm, match: null, mapStats: [], playerStats: [] };
    }
  });

  const matchesData: MatchData[] = await Promise.all(matchDataPromises);

  // Fetch highlights for all tournament matches
  const matchIds = bracketMatchesWithId.map((m: BracketMatch) => m.match_id!);
  const highlights = await fetchHighlightsForMatches(matchIds);

  return (
    <RecapContent
      tournament={tournament}
      leaderboard={leaderboard}
      matchesData={matchesData}
      highlights={highlights}
    />
  );
}
