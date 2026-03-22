"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Swords, X, Check, ArrowLeft, Loader2, Play, Trash2, BarChart3,
  Calendar, MapPin, DollarSign, Users, Shield, Sparkles, Target, Skull, Crosshair,
  Medal, Map, Layers, ChevronRight, Crown, Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HudCard } from "@/components/hud-card";
import { VideoPlayer } from "@/components/video-player";
import { FullBracket, MapScoresMap } from "@/components/bracket";
import { BracketExportButton } from "@/components/bracket-export-button";
import { useAuth } from "@/lib/auth-context";
import { createMatch, getServers, getTeams, getMapStats, getMatches, getLeaderboard, getPlayerStats, parseMapStats, Server, Match, LeaderboardEntry, HighlightClip, PlayerStats } from "@/lib/api";
import { calculateAwards, Award } from "@/lib/awards";
import { TeamsMap } from "@/components/bracket";
import { MAP_IMAGES } from "@/lib/maps";
import {
  Tournament,
  BracketMatch,
  advanceBracket,
  getTeamName,
  getNextPlayableMatch,
  getVetoSequence,
  getVetoTeamOrder,
  VetoAction,
  getSwissStandings,
} from "@/lib/tournament";
import { autoAdvanceTournament } from "@/lib/tournament-utils";

// ── Types ──
type TabId = "overview" | "partidas" | "ranking" | "highlights";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "partidas", label: "PARTIDAS" },
  { id: "ranking", label: "RANKING" },
  { id: "highlights", label: "HIGHLIGHTS" },
];

export default function CampeonatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [vetoMatch, setVetoMatch] = useState<BracketMatch | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [vetoFirstTeam, setVetoFirstTeam] = useState<"team1" | "team2" | null>(null);
  const [teamsMap, setTeamsMap] = useState<TeamsMap>({});
  const [mapScoresMap, setMapScoresMap] = useState<MapScoresMap>({});
  const [mvp, setMvp] = useState<{ name: string; steamId: string; rating: number; kills: number; deaths: number; hs_percent: number } | null>(null);
  const [hlPage, setHlPage] = useState(1);
  const HL_PER_PAGE = 6;
  const [matchPage, setMatchPage] = useState(1);
  const MATCHES_PER_PAGE = 8;
  const [rankPage, setRankPage] = useState(1);
  const RANK_PER_PAGE = 10;
  const bracketRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Partidas tab state
  const [seasonMatches, setSeasonMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Ranking tab state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Highlights tab state
  const [highlights, setHighlights] = useState<HighlightClip[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  // Awards
  const [awards, setAwards] = useState<Award[]>([]);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      const t = (data.tournaments || []).find((t: Tournament) => t.id === id);
      if (t) {
        setTournament(t);
        // Fetch MVP immediately if finished
        if (t.status === "finished" && t.season_id) {
          try {
            const lbRes = await fetch(`/api/leaderboard/players?season_id=${t.season_id}`);
            const lbData = await lbRes.json();
            const lb = lbData.leaderboard || [];
            const sorted = [...lb].sort((a: Record<string, number>, b: Record<string, number>) => (b.average_rating || 0) - (a.average_rating || 0));
            if (sorted[0]) {
              const p = sorted[0];
              setMvp({
                name: p.name || p.steam_name || "Unknown",
                steamId: p.steamId || p.steam_id || "",
                rating: p.average_rating || 0,
                kills: p.kills || 0,
                deaths: p.deaths || 0,
                hs_percent: Math.round(p.hsp || 0),
              });
            }
          } catch { /* */ }
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  // Fetch teams for logos
  useEffect(() => {
    getTeams().then(r => {
      const map: TeamsMap = {};
      (r.teams || []).forEach((t: { id: number; name: string; logo: string | null; auth_name?: Record<string, string | { name: string; captain?: number }> }) => {
        const players = t.auth_name ? Object.entries(t.auth_name).map(([steamId, val]) => ({
          steamId,
          name: typeof val === "string" ? val : val.name,
          captain: typeof val === "string" ? 0 : (val.captain || 0),
        })) : [];
        map[t.id] = { name: t.name, logo: t.logo, players };
      });
      setTeamsMap(map);
    }).catch(() => {});
  }, []);

  // Fetch map scores for bracket display
  useEffect(() => {
    if (!tournament) return;
    const matchIds = tournament.matches.filter(m => m.match_id && m.status === "finished").map(m => m.match_id!);
    if (matchIds.length === 0) return;

    Promise.all(matchIds.map(async (mid) => {
      try {
        const raw = await getMapStats(mid) as Record<string, unknown>;
        const stats = parseMapStats(raw);
        return { mid, stats };
      } catch { return { mid, stats: [] as { team1_score: number; team2_score: number; map_name: string }[] }; }
    })).then(results => {
      const map: MapScoresMap = {};
      for (const r of results) {
        if (r.stats.length > 0) {
          map[r.mid] = r.stats.map(s => ({ team1_score: s.team1_score, team2_score: s.team2_score, map_name: s.map_name }));
        }
      }
      setMapScoresMap(map);
    });
  }, [tournament]);

  // Auto-advance: poll live G5API matches for completion
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  const hasLiveMatches = tournament?.status !== "finished" && tournament?.matches.some(m => m.status === "live" && m.match_id);

  useEffect(() => {
    // Only admins should auto-advance brackets (requires auth to save)
    if (!hasLiveMatches || !isAdmin) return;

    const clientFetcher = async (matchId: number) => {
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      return data.match || null;
    };

    const checkAutoAdvance = async () => {
      if (document.visibilityState === "hidden") return;
      const t = tournamentRef.current;
      if (!t || t.status === "finished") return;
      const result = await autoAdvanceTournament(t, clientFetcher);
      if (result.changed) {
        await saveTournament(result.tournament);
      }
    };

    const interval = setInterval(checkAutoAdvance, 10000);
    checkAutoAdvance();
    return () => clearInterval(interval);
  }, [hasLiveMatches, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin) {
      getServers().then(r => setServers(r.servers || [])).catch(() => {});
    }
  }, [isAdmin]);

  // Fetch season matches when PARTIDAS tab is activated
  useEffect(() => {
    if (activeTab !== "partidas" || !tournament?.season_id) return;
    setMatchesLoading(true);
    getMatches().then(r => {
      const filtered = (r.matches || []).filter(m => m.season_id === tournament.season_id);
      setSeasonMatches(filtered.sort((a, b) => {
        // Sort by start_time desc, nulls last
        if (!a.start_time && !b.start_time) return b.id - a.id;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }));
    }).catch(() => {}).finally(() => setMatchesLoading(false));
  }, [activeTab, tournament?.season_id]);

  // Fetch awards for finished tournament
  useEffect(() => {
    if (!tournament || tournament.status !== "finished") return;
    const matchIds = tournament.matches.filter(m => m.match_id && m.status === "finished").map(m => m.match_id!);
    if (matchIds.length === 0) return;

    Promise.all(matchIds.map(mid => getPlayerStats(mid).then(r => {
      const raw = r as unknown as Record<string, unknown>;
      return ((raw.playerstats || raw.playerStats || []) as PlayerStats[]);
    }).catch(() => [] as PlayerStats[]))).then(results => {
      const allStats = results.flat();
      if (allStats.length > 0) setAwards(calculateAwards(allStats));
    });
  }, [tournament]);

  // Fetch ranking when RANKING tab is activated
  useEffect(() => {
    if (activeTab !== "ranking" || !tournament?.season_id) return;
    setRankingLoading(true);
    getLeaderboard(tournament.season_id).then(r => {
      setLeaderboard(r.leaderboard || []);
    }).catch(() => {}).finally(() => setRankingLoading(false));
  }, [activeTab, tournament?.season_id]);

  // Fetch highlights when HIGHLIGHTS tab is activated
  useEffect(() => {
    if (activeTab !== "highlights" || !tournament) return;
    const matchIds = tournament.matches.filter(m => m.match_id).map(m => m.match_id!);
    if (matchIds.length === 0) { setHighlights([]); return; }
    setHighlightsLoading(true);

    Promise.all(matchIds.map(async (mid) => {
      try {
        const res = await fetch(`/api/highlights/${mid}`);
        const data = await res.json();
        return (data.clips || []) as HighlightClip[];
      } catch { return [] as HighlightClip[]; }
    })).then(results => {
      const all = results.flat().filter(c => c.status === "ready" && c.video_file);
      all.sort((a, b) => b.score - a.score);
      setHighlights(all);
    }).finally(() => setHighlightsLoading(false));
  }, [activeTab, tournament]);

  const saveTournament = async (t: Tournament) => {
    setTournament(t);
    await fetch("/api/tournaments", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
  };

  const openVeto = (match: BracketMatch) => {
    setVetoMatch({ ...match, veto_actions: [] });
    setVetoFirstTeam(null);
  };

  const handleVetoBan = async (map: string) => {
    if (!vetoMatch || !tournament) return;

    const sequence = getVetoSequence(vetoMatch.num_maps);
    const teamOrder = getVetoTeamOrder(vetoMatch.num_maps, vetoFirstTeam === "team1");
    const stepIndex = vetoMatch.veto_actions.length;

    if (stepIndex >= sequence.length) return;

    const action = sequence[stepIndex];
    const teamIdx = teamOrder[stepIndex];
    const teamId = teamIdx === 0 ? vetoMatch.team1_id! : vetoMatch.team2_id!;

    const vetoAction: VetoAction = {
      team_id: teamId,
      team_name: getTeamName(tournament, teamId),
      action,
      map,
    };

    const updatedActions = [...vetoMatch.veto_actions, vetoAction];
    const updatedMatch = { ...vetoMatch, veto_actions: updatedActions };

    if (updatedActions.length >= sequence.length) {
      const usedMaps = updatedActions.map(a => a.map);
      const remaining = tournament.map_pool.filter(m => !usedMaps.includes(m));
      const picks = updatedActions.filter(a => a.action === "pick").map(a => a.map);

      if (vetoMatch.num_maps === 1) {
        updatedMatch.map = remaining[0];
        updatedMatch.status = "ready";
      } else {
        updatedMatch.maps = [...picks, remaining[0]];
        updatedMatch.status = "ready";
      }
    }

    setVetoMatch(updatedMatch);

    const updatedTournament = {
      ...tournament,
      matches: tournament.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m),
    };
    await saveTournament(updatedTournament);
  };

  const handleStartMatch = async () => {
    if (!vetoMatch || !tournament || !selectedServer) return;
    setActionLoading(true);
    setMatchError(null);

    try {
      const maplist = vetoMatch.num_maps === 1
        ? [vetoMatch.map!]
        : vetoMatch.maps!;

      const result = await createMatch({
        team1_id: vetoMatch.team1_id!,
        team2_id: vetoMatch.team2_id!,
        server_id: parseInt(selectedServer),
        num_maps: vetoMatch.num_maps,
        max_maps: vetoMatch.num_maps,
        skip_veto: true,
        veto_first: "team1",
        side_type: "always_knife",
        players_per_team: 5,
        min_player_ready: 5,
        season_id: tournament.season_id || undefined,
        title: `${tournament.name} — ${vetoMatch.label}`,
        maplist,
        veto_mappool: maplist.join(" "),
        spectator_auths: tournament.spectator_auth ? { "0": tournament.spectator_auth } : undefined,
      });

      const updatedMatch = { ...vetoMatch, match_id: result.match.id, status: "live" as const };
      const updatedTournament = {
        ...tournament,
        status: "active" as const,
        current_match_id: vetoMatch.id,
        matches: tournament.matches.map(m => m.id === vetoMatch.id ? updatedMatch : m),
      };

      await saveTournament(updatedTournament);
      setMatchError(null);
      setVetoMatch(null);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Erro ao criar partida");
    }
    setActionLoading(false);
  };

  const handleResetVeto = async () => {
    if (!vetoMatch || !tournament) return;
    if (!confirm("Resetar veto e voltar ao inicio?")) return;

    const resetMatch = { ...vetoMatch, veto_actions: [], map: null, maps: null, status: "pending" as const };
    const updatedTournament = {
      ...tournament,
      matches: tournament.matches.map(m => m.id === resetMatch.id ? resetMatch : m),
    };
    await saveTournament(updatedTournament);
    setVetoMatch(null);
    setMatchError(null);
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    if (!confirm(`Deletar campeonato "${tournament.name}"? Esta acao e irreversivel.`)) return;

    await fetch("/api/tournaments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tournament.id }),
    });
    router.push("/admin/campeonatos");
  };

  const handleSetWinner = async (matchId: string, winnerId: number) => {
    if (!tournament) return;
    const teamName = getTeamName(tournament, winnerId);
    if (!confirm(`Confirmar ${teamName} como vencedor?`)) return;

    const updated = advanceBracket(tournament, matchId, winnerId);
    await saveTournament(updated);
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not Found ──
  if (!tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Trophy size={48} className="text-orbital-border mx-auto mb-4" />
        <p className="font-[family-name:var(--font-orbitron)] text-orbital-text-dim">
          Campeonato nao encontrado
        </p>
        <Link href="/admin/campeonatos" className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-orbital-border text-orbital-text-dim hover:text-orbital-purple hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-xs">
          <ArrowLeft size={14} /> VOLTAR
        </Link>
      </div>
    );
  }

  const nextMatch = getNextPlayableMatch(tournament);
  const adminActions = isAdmin ? { isAdmin, onSetWinner: handleSetWinner, onStartVeto: openVeto } : undefined;

  const finishedCount = tournament.matches.filter(m => m.status === "finished").length;
  const liveCount = tournament.matches.filter(m => m.status === "live").length;
  const grandFinal = tournament.matches.find(m => m.bracket === "grand_final");
  const champion = tournament.status === "finished" && grandFinal?.winner_id
    ? getTeamName(tournament, grandFinal.winner_id)
    : null;
  const championLogo = tournament.status === "finished" && grandFinal?.winner_id
    ? teamsMap[grandFinal.winner_id]?.logo
    : null;

  const statusColor = tournament.status === "active" ? "text-[#EF4444]" : tournament.status === "finished" ? "text-[#22C55E]" : "text-[#EAB308]";
  const statusBorder = tournament.status === "active" ? "border-[#EF4444]/30" : tournament.status === "finished" ? "border-[#22C55E]/30" : "border-[#EAB308]/30";
  const statusLabel = tournament.status === "active" ? "AO VIVO" : tournament.status === "finished" ? "FINALIZADO" : "PENDENTE";

  return (
    <div className="min-h-screen pb-20">
      {/* ════════════════ HERO BANNER ════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src="https://i.imgur.com/0irj00x.jpeg" alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/80 to-[#0A0A0A]" />
        </div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/40 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back + Status Row */}
            <div className="flex items-center gap-3 mb-4">
              <Link href="/admin/campeonatos" className="text-orbital-text-dim hover:text-orbital-purple transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] px-3 py-1 border ${statusColor} ${statusBorder} uppercase`}>
                {statusLabel}
              </span>
              {tournament.status === "active" && liveCount > 0 && (
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-orbitron)] text-[0.5rem] text-[#EF4444]">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  {liveCount} PARTIDA{liveCount > 1 ? "S" : ""} AO VIVO
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={handleDeleteTournament}
                  className="ml-auto p-2 text-orbital-text-dim hover:text-red-500 transition-colors"
                  title="Deletar campeonato"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Tournament Name */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 border border-orbital-purple/30 bg-orbital-purple/10 flex items-center justify-center shrink-0">
                <Trophy size={24} className="text-orbital-purple" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-bold tracking-wider text-orbital-text">
                  {tournament.name}
                </h1>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
                  {tournament.format === "double_elimination" ? "Eliminacao Dupla" : tournament.format || "Eliminacao Dupla"} — {tournament.teams.length} times — {finishedCount}/{tournament.matches.length} partidas
                </p>
              </div>
            </div>

            {/* Info Pills */}
            <div className="flex flex-wrap gap-3 mt-4">
              {tournament.start_date && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <Calendar size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {tournament.end_date && ` — ${new Date(tournament.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`}
                  </span>
                </div>
              )}
              {tournament.prize_pool && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <DollarSign size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.prize_pool}</span>
                </div>
              )}
              {tournament.location && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <MapPin size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Users size={12} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.teams.length} Times</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Layers size={12} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.map_pool.length} Mapas</span>
              </div>
              {tournament.status === "finished" && (
                <Link
                  href={`/campeonato/${tournament.id}/recap`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-purple"
                >
                  <BarChart3 size={12} /> RECAP
                </Link>
              )}
            </div>
          </motion.div>
        </div>
        {/* Bottom border */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent" />
      </div>

      {/* ════════════════ TAB NAVIGATION ════════════════ */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-orbital-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-none" role="tablist" aria-label="Seções do campeonato">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-orbital-purple"
                    : "text-orbital-text-dim hover:text-orbital-text"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-orbital-purple"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left / Main Column ─── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* ═══ OVERVIEW TAB ═══ */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Champion Banner */}
                  {champion && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6"
                    >
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-amber-500/60 via-amber-500/30 to-transparent" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/70" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/70" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/70" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/70" />
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 flex items-center justify-center shrink-0">
                          {championLogo ? (
                            <Image src={championLogo} alt={champion} width={56} height={56} className="object-contain" unoptimized />
                          ) : (
                            <Crown size={36} className="text-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.3em] text-amber-500/80 mb-1">CAMPEAO</div>
                          <div className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-amber-400">{champion}</div>
                          {grandFinal?.winner_id && teamsMap[grandFinal.winner_id]?.players && (
                            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-amber-500/60 mt-1">
                              {teamsMap[grandFinal.winner_id].players!.map(p => p.name).join(" • ")}
                            </div>
                          )}
                        </div>
                        <Trophy size={32} className="ml-auto text-amber-500/30" />
                      </div>
                    </motion.div>
                  )}

                  {/* MVP Banner */}
                  {mvp && tournament.status === "finished" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="relative overflow-hidden border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-5"
                    >
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-red-500/60 via-red-500/30 to-transparent" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/70" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/70" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/70" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/70" />
                      <div className="flex items-center gap-4">
                        <Star size={28} className="text-red-500 shrink-0" />
                        <div>
                          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.3em] text-red-500/80 mb-1">MVP DO CAMPEONATO</div>
                          <Link href={`/perfil/${mvp.steamId}`} className="font-[family-name:var(--font-orbitron)] text-lg font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors">
                            {mvp.name}
                          </Link>
                          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
                            Rating {mvp.rating.toFixed(2)} &nbsp; {mvp.kills}K / {mvp.deaths}D &nbsp; HS {mvp.hs_percent}%
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Next Match Banner (Admin) */}
                  {isAdmin && nextMatch && !vetoMatch && (
                    <div className="bg-orbital-purple/5 border border-orbital-purple/30 p-4 flex items-center justify-between">
                      <div>
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-1">PROXIMA PARTIDA</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                          {getTeamName(tournament, nextMatch.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, nextMatch.team2_id)}
                        </div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                          {nextMatch.label} — {nextMatch.num_maps === 1 ? "BO1" : "BO3"}
                        </div>
                      </div>
                      <button
                        onClick={() => openVeto(nextMatch)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
                      >
                        <Swords size={14} /> INICIAR VETO
                      </button>
                    </div>
                  )}

                  {/* Classificação (Standings) */}
                  {(() => {
                    const finishedBracketMatches = tournament.matches.filter(m => m.status === "finished" && m.winner_id);
                    if (finishedBracketMatches.length === 0) return null;

                    const standingsMap: Record<number, { teamId: number; wins: number; losses: number; mapWins: number; mapLosses: number; placement: number }> = {};

                    const ensureTeam = (tid: number) => {
                      if (!standingsMap[tid]) standingsMap[tid] = { teamId: tid, wins: 0, losses: 0, mapWins: 0, mapLosses: 0, placement: 99 };
                    };

                    for (const m of finishedBracketMatches) {
                      if (!m.team1_id || !m.team2_id || !m.winner_id) continue;
                      ensureTeam(m.team1_id);
                      ensureTeam(m.team2_id);

                      const loserId = m.winner_id === m.team1_id ? m.team2_id : m.team1_id;
                      standingsMap[m.winner_id].wins++;
                      standingsMap[loserId].losses++;

                      // Map scores from mapScoresMap
                      if (m.match_id && mapScoresMap[m.match_id]) {
                        const maps = mapScoresMap[m.match_id];
                        for (const ms of maps) {
                          standingsMap[m.team1_id].mapWins += ms.team1_score;
                          standingsMap[m.team1_id].mapLosses += ms.team2_score;
                          standingsMap[m.team2_id].mapWins += ms.team2_score;
                          standingsMap[m.team2_id].mapLosses += ms.team1_score;
                        }
                      }
                    }

                    // Also ensure teams with no finished matches appear
                    for (const team of tournament.teams) {
                      ensureTeam(team.id);
                    }

                    // Double elimination placement based on bracket position
                    // 1st = GF winner, 2nd = GF loser, 3rd = LF loser, 4th = LR3 loser
                    // 5-6th = LR2 losers, 7-8th = LR1 losers
                    const placementMap: Record<string, number> = {
                      "GF": 2,       // GF loser = 2nd
                      "LF": 3,       // LF loser = 3rd
                      "LR3": 4,      // LR3 loser = 4th (lower SF)
                      "LR2-A": 5, "LR2-B": 5,  // LR2 losers = 5-6th
                      "LR1-A": 7, "LR1-B": 7,  // LR1 losers = 7-8th
                    };

                    // GF winner = 1st
                    const gfMatch = tournament.matches.find(m => m.id === "GF");
                    if (gfMatch?.winner_id && standingsMap[gfMatch.winner_id]) {
                      standingsMap[gfMatch.winner_id].placement = 1;
                    }

                    // Set placements for losers of each bracket match
                    for (const m of finishedBracketMatches) {
                      if (!m.winner_id || !m.team1_id || !m.team2_id) continue;
                      const loserId = m.winner_id === m.team1_id ? m.team2_id : m.team1_id;
                      const place = placementMap[m.id];
                      if (place && standingsMap[loserId]) {
                        standingsMap[loserId].placement = place;
                      }
                    }

                    const sorted = Object.values(standingsMap).sort((a, b) => {
                      // Sort by placement first (lower = better)
                      if (a.placement !== b.placement) return a.placement - b.placement;
                      // Then by wins desc, map diff desc
                      if (b.wins !== a.wins) return b.wins - a.wins;
                      return (b.mapWins - b.mapLosses) - (a.mapWins - a.mapLosses);
                    });

                    const isChampion = (tid: number) => tournament.status === "finished" && grandFinal?.winner_id === tid;

                    return (
                      <HudCard className="p-5" label="CLASSIFICAÇÃO">
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-orbital-border">
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 w-8">#</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2">TIME</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">J</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">V</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">D</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">MW</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">ML</th>
                                <th className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">+/−</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.map((s, i) => {
                                const teamData = teamsMap[s.teamId];
                                const teamName = teamData?.name || tournament.teams.find(t => t.id === s.teamId)?.name || "TBD";
                                const mapDiff = s.mapWins - s.mapLosses;
                                const isTop = i === 0;
                                const champ = isChampion(s.teamId);

                                return (
                                  <tr
                                    key={s.teamId}
                                    className={`border-b border-orbital-border/30 transition-colors hover:bg-white/[0.02] ${isTop ? "border-l-2 border-l-amber-500" : ""}`}
                                  >
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2">
                                      {i + 1}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                          {teamData?.logo ? (
                                            <Image src={teamData.logo} alt={teamName} width={20} height={20} className="object-contain" unoptimized />
                                          ) : (
                                            <Shield size={12} className="text-orbital-text-dim/40" />
                                          )}
                                        </div>
                                        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate">
                                          {teamName}
                                        </span>
                                        {champ && <Trophy size={12} className="text-amber-500 shrink-0" />}
                                      </div>
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.wins + s.losses}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-emerald-400 py-2.5 px-2 text-center">
                                      {s.wins}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-red-400 py-2.5 px-2 text-center">
                                      {s.losses}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.mapWins}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.mapLosses}
                                    </td>
                                    <td className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-bold py-2.5 px-2 text-center ${
                                      mapDiff > 0 ? "text-emerald-400" : mapDiff < 0 ? "text-red-400" : "text-orbital-text-dim"
                                    }`}>
                                      {mapDiff > 0 ? `+${mapDiff}` : mapDiff}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </HudCard>
                    );
                  })()}

                  {/* Bracket or Swiss Standings */}
                  {tournament.format === "swiss" ? (
                    <SwissStandingsView tournament={tournament} teamsMap={teamsMap} mapScoresMap={mapScoresMap} />
                  ) : (
                    <HudCard className="p-5 overflow-hidden" label="BRACKET">
                      <div ref={bracketRef}>
                        <FullBracket
                          tournament={tournament}
                          teamsMap={teamsMap}
                          mapScoresMap={mapScoresMap}
                          admin={adminActions}
                        />
                      </div>
                      <div className="text-center mt-4">
                        <BracketExportButton bracketRef={bracketRef} tournamentName={tournament.name} />
                      </div>
                    </HudCard>
                  )}

                  {/* Awards */}
                  {awards.length > 0 && (
                    <HudCard className="p-5" label="AWARDS">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {awards.map((award) => (
                          <Link
                            key={award.id}
                            href={`/perfil/${award.steamId}`}
                            className="bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/40 p-3 text-center transition-colors group"
                          >
                            <div className="text-2xl mb-1">{award.emoji}</div>
                            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple mb-1">
                              {award.title}
                            </div>
                            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text group-hover:text-orbital-purple transition-colors truncate">
                              {award.playerName}
                            </div>
                            <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-0.5">
                              {award.value}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </HudCard>
                  )}

                  {/* Teams Grid */}
                  <HudCard className="p-5" label="TIMES PARTICIPANTES">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                      {tournament.teams.map((team, i) => {
                        const teamData = teamsMap[team.id];
                        return (
                          <Link key={team.id} href={`/times/${team.id}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3 bg-white/[0.02] border border-orbital-border hover:border-orbital-purple/30 transition-colors group cursor-pointer"
                          >
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              {teamData?.logo ? (
                                <Image src={teamData.logo} alt={team.name} width={28} height={28} className="object-contain" unoptimized />
                              ) : (
                                <Shield size={18} className="text-orbital-text-dim/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate group-hover:text-orbital-purple transition-colors">
                                {team.name}
                              </div>
                              {grandFinal?.winner_id === team.id && (
                                <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-amber-500">CAMPEÃO</div>
                              )}
                            </div>
                          </motion.div>
                          </Link>
                        );
                      })}
                    </div>
                  </HudCard>
                </motion.div>
              )}

              {/* ═══ PARTIDAS TAB ═══ */}
              {activeTab === "partidas" && (
                <motion.div
                  key="partidas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {!tournament.season_id ? (
                    <HudCard className="text-center py-12">
                      <Swords size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma season vinculada a este campeonato
                      </p>
                    </HudCard>
                  ) : matchesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : seasonMatches.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Swords size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma partida registrada
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const bracketInfo: Record<number, BracketMatch> = {};
                        tournament.matches.forEach(bm => { if (bm.match_id) bracketInfo[bm.match_id] = bm; });

                        // Flat list with phase labels
                        const allItems: { match: Match; bm?: BracketMatch; phase: string }[] = [];
                        const seenPhases = new Set<string>();
                        seasonMatches.forEach(m => {
                          const bm = bracketInfo[m.id];
                          allItems.push({ match: m, bm, phase: bm?.label || "Outras" });
                        });

                        const paged = allItems.slice((matchPage - 1) * MATCHES_PER_PAGE, matchPage * MATCHES_PER_PAGE);
                        let lastPhase = "";

                        return (
                          <>
                            {paged.map(({ match, bm, phase }) => {
                              const isLive = !match.end_time && !!match.start_time && !match.cancelled;
                              const isFinished = !!match.end_time && !match.cancelled;
                              const t1Logo = match.team1_id ? teamsMap[match.team1_id]?.logo : null;
                              const t2Logo = match.team2_id ? teamsMap[match.team2_id]?.logo : null;
                              const showPhase = phase !== lastPhase;
                              if (showPhase) { lastPhase = phase; seenPhases.add(phase); }

                              return (
                                <div key={match.id}>
                                  {showPhase && (
                                    <div className="flex items-center gap-2 mb-3 mt-2">
                                      <div className="h-[1px] w-4 bg-orbital-purple/40" />
                                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">{phase}</span>
                                      <div className="h-[1px] flex-1 bg-orbital-purple/15" />
                                    </div>
                                  )}
                                  <Link href={`/partidas/${match.id}`} className="block group">
                                    <div className={`relative overflow-hidden border transition-all p-4 ${
                                      isLive ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" :
                                      isFinished ? "bg-white/[0.02] border-orbital-border hover:border-orbital-purple/30" :
                                      "bg-white/[0.01] border-orbital-border/50 hover:border-orbital-border"
                                    }`}>
                                      {/* Corner accents */}
                                      <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />

                                      <div className="flex items-center gap-4">
                                        {/* Status */}
                                        <div className="shrink-0 w-12 text-center">
                                          {isLive ? (
                                            <span className="inline-flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] text-red-500">
                                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                                              LIVE
                                            </span>
                                          ) : isFinished ? (
                                            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-emerald-500/70">FIM</span>
                                          ) : (
                                            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-yellow-500/70">TBD</span>
                                          )}
                                          {bm && (
                                            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple/60 mt-0.5">
                                              {bm.num_maps === 1 ? "BO1" : "BO3"}
                                            </div>
                                          )}
                                        </div>

                                        {/* Team 1 */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                          <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${
                                            isFinished && match.winner === match.team1_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"
                                          }`}>
                                            {match.team1_string || "TBD"}
                                          </span>
                                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                            {t1Logo ? <Image src={t1Logo} alt="" width={24} height={24} className="object-contain" unoptimized /> : <Shield size={14} className="text-orbital-text-dim/30" />}
                                          </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-center shrink-0 px-3">
                                          {isFinished && mapScoresMap[match.id]?.length > 0 ? (
                                            <div className="flex items-center gap-0">
                                              {mapScoresMap[match.id].map((ms, mi) => (
                                                <div key={mi} className="flex items-center">
                                                  {mi > 0 && <div className="w-[1px] h-6 bg-orbital-border/40 mx-2" />}
                                                  <div className="text-center px-1.5">
                                                    <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple/50 uppercase mb-0.5">
                                                      {ms.map_name?.replace("de_", "") || `M${mi + 1}`}
                                                    </div>
                                                    <div className="flex items-center justify-center gap-1">
                                                      <span className={`font-[family-name:var(--font-jetbrains)] text-base font-bold tabular-nums ${
                                                        ms.team1_score > ms.team2_score ? "text-emerald-400" : "text-orbital-text-dim/60"
                                                      }`}>{ms.team1_score}</span>
                                                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/30">:</span>
                                                      <span className={`font-[family-name:var(--font-jetbrains)] text-base font-bold tabular-nums ${
                                                        ms.team2_score > ms.team1_score ? "text-emerald-400" : "text-orbital-text-dim/60"
                                                      }`}>{ms.team2_score}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5">
                                              <span className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${
                                                isFinished && match.team1_score > match.team2_score ? "text-emerald-400" : "text-orbital-text-dim"
                                              }`}>{isFinished || isLive ? match.team1_score : "-"}</span>
                                              <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50">:</span>
                                              <span className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${
                                                isFinished && match.team2_score > match.team1_score ? "text-emerald-400" : "text-orbital-text-dim"
                                              }`}>{isFinished || isLive ? match.team2_score : "-"}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Team 2 */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                            {t2Logo ? <Image src={t2Logo} alt="" width={24} height={24} className="object-contain" unoptimized /> : <Shield size={14} className="text-orbital-text-dim/30" />}
                                          </div>
                                          <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${
                                            isFinished && match.winner === match.team2_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"
                                          }`}>
                                            {match.team2_string || "TBD"}
                                          </span>
                                        </div>

                                        {/* Date + arrow */}
                                        <div className="shrink-0 text-right hidden sm:flex items-center gap-2">
                                          {match.start_time && (
                                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/60">
                                              {new Date(match.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                            </span>
                                          )}
                                          <ChevronRight size={14} className="text-orbital-text-dim/30 group-hover:text-orbital-purple transition-colors" />
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </div>
                              );
                            })}

                            {/* Pagination */}
                            {allItems.length > MATCHES_PER_PAGE && (
                              <div className="flex items-center justify-center gap-2 pt-2">
                                {Array.from({ length: Math.ceil(allItems.length / MATCHES_PER_PAGE) }, (_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setMatchPage(i + 1)}
                                    className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                                      matchPage === i + 1
                                        ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                        : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                                    }`}
                                  >
                                    {i + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ RANKING TAB ═══ */}
              {activeTab === "ranking" && (
                <motion.div
                  key="ranking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {!tournament.season_id ? (
                    <HudCard className="text-center py-12">
                      <Trophy size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma season vinculada a este campeonato
                      </p>
                    </HudCard>
                  ) : rankingLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Trophy size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhum dado de ranking disponivel
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-6">
                      {/* Top 3 Podium */}
                      {leaderboard.length >= 3 && (
                        <div className="grid grid-cols-3 gap-4">
                          {[1, 0, 2].map((idx, pos) => {
                            const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
                            const p = sorted[idx];
                            if (!p) return null;
                            const rank = idx + 1;
                            const isFirst = rank === 1;
                            return (
                              <HudCard key={p.steamId} glow={isFirst} delay={pos * 0.1} className={`text-center ${isFirst ? "sm:-mt-4" : "sm:mt-4"}`}>
                                <div className="py-2">
                                  <Medal size={isFirst ? 28 : 22} className={`mx-auto mb-2 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-amber-600"}`} />
                                  <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-1">#{rank}</div>
                                  <Link href={`/perfil/${p.steamId}`} className="font-[family-name:var(--font-orbitron)] text-xs font-bold tracking-wider text-orbital-text hover:text-orbital-purple transition-colors">
                                    {p.name}
                                  </Link>
                                  <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-purple mt-1">{(p.average_rating || 0).toFixed(2)}</div>
                                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">{p.kills}K / {p.deaths}D</div>
                                </div>
                              </HudCard>
                            );
                          })}
                        </div>
                      )}

                      {/* Full Table */}
                      <div className="bg-orbital-card border border-orbital-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Jogador</th>
                                <th><Target size={10} className="inline" /> K</th>
                                <th><Skull size={10} className="inline" /> D</th>
                                <th>K/D</th>
                                <th><Crosshair size={10} className="inline" /> HS%</th>
                                <th>Wins</th>
                                <th>Rounds</th>
                                <th>Rating</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
                                const paged = sorted.slice((rankPage - 1) * RANK_PER_PAGE, rankPage * RANK_PER_PAGE);
                                return paged.map((player, pi) => {
                                  const i = (rankPage - 1) * RANK_PER_PAGE + pi;
                                  const kd = (player.deaths || 0) > 0 ? ((player.kills || 0) / player.deaths).toFixed(2) : (player.kills || 0).toFixed(2);
                                  const rating = player.average_rating || 0;
                                  return (
                                    <tr key={player.steamId}>
                                      <td>
                                        <span className={`font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-orbital-text-dim"}`}>
                                          {i + 1}
                                        </span>
                                      </td>
                                      <td className="font-semibold">
                                        <Link href={`/perfil/${player.steamId}`} className="hover:text-orbital-purple transition-colors">{player.name}</Link>
                                      </td>
                                      <td className="text-orbital-success">{player.kills}</td>
                                      <td className="text-orbital-danger">{player.deaths}</td>
                                      <td>{kd}</td>
                                      <td>{Math.round(player.hsp || 0)}%</td>
                                      <td>{player.wins}</td>
                                      <td>{player.trp}</td>
                                      <td>
                                        <span className={`font-bold ${rating >= 1.2 ? "text-orbital-success" : rating >= 0.8 ? "text-orbital-text" : "text-orbital-danger"}`}>
                                          {rating.toFixed(2)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination */}
                        {leaderboard.length > RANK_PER_PAGE && (
                          <div className="flex items-center justify-center gap-2 p-3 border-t border-orbital-border">
                            {Array.from({ length: Math.ceil(leaderboard.length / RANK_PER_PAGE) }, (_, i) => (
                              <button
                                key={i}
                                onClick={() => setRankPage(i + 1)}
                                className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                                  rankPage === i + 1
                                    ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                    : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ HIGHLIGHTS TAB ═══ */}
              {activeTab === "highlights" && (
                <motion.div
                  key="highlights"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {highlightsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : highlights.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Sparkles size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhum highlight disponivel para este campeonato
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {highlights.slice((hlPage - 1) * HL_PER_PAGE, hlPage * HL_PER_PAGE).map((clip, i) => (
                        <motion.div
                          key={clip.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.5) }}
                          className="bg-orbital-card border border-orbital-border overflow-hidden group hover:border-orbital-purple/30 transition-colors"
                        >
                          <VideoPlayer
                            src={`/api/highlights-proxy/${clip.video_file}`}
                            clipId={clip.id}
                          />
                          <div className="p-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple shrink-0">#{clip.rank}</span>
                              {clip.steam_id ? (
                                <Link href={`/perfil/${clip.steam_id}`} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text hover:text-orbital-purple transition-colors truncate">
                                  {clip.player_name || "Player"}
                                </Link>
                              ) : (
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">{clip.player_name || "Player"}</span>
                              )}
                              {clip.kills_count >= 2 && (
                                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple bg-orbital-purple/10 px-1.5 py-0.5 shrink-0">
                                  {clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}
                                </span>
                              )}
                              {clip.round_number && (
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim shrink-0 ml-auto">R{clip.round_number}</span>
                              )}
                            </div>
                            <Link href={`/partidas/${clip.match_id}`} className="flex items-center gap-1.5 group/match">
                              <Swords size={9} className="text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors shrink-0" />
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors truncate">
                                {clip.team1_string || "Time 1"} vs {clip.team2_string || "Time 2"}
                              </span>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {highlights.length > HL_PER_PAGE && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {Array.from({ length: Math.ceil(highlights.length / HL_PER_PAGE) }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setHlPage(i + 1)}
                            className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                              hlPage === i + 1
                                ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Sidebar (Right) ─── */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">
            {/* Event Info */}
            <HudCard className="p-4" label="EVENTO">
              <div className="space-y-3 mt-1">
                {tournament.start_date && (
                  <div className="flex items-start gap-3">
                    <Calendar size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">DATAS</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                        {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        {tournament.end_date && (
                          <span className="text-orbital-text-dim">
                            {" "}— {new Date(tournament.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {tournament.prize_pool && (
                  <div className="flex items-start gap-3">
                    <DollarSign size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">PREMIACAO</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{tournament.prize_pool}</div>
                    </div>
                  </div>
                )}
                {tournament.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">LOCAL</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{tournament.location}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Layers size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                  <div>
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">FORMATO</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {tournament.format === "double_elimination" ? "Eliminacao Dupla" : tournament.format || "Eliminacao Dupla"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Swords size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                  <div>
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">PROGRESSO</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {finishedCount}/{tournament.matches.length} partidas
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-orbital-border mt-2 overflow-hidden">
                      <div
                        className="h-full bg-orbital-purple transition-all duration-500"
                        style={{ width: `${tournament.matches.length > 0 ? (finishedCount / tournament.matches.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </HudCard>

            {/* Map Pool */}
            <HudCard className="p-4" label="MAP POOL">
              <div className="grid grid-cols-1 gap-2 mt-1">
                {tournament.map_pool.map(map => (
                  <div
                    key={map}
                    className="relative overflow-hidden border border-orbital-border group hover:border-orbital-purple/30 transition-colors"
                  >
                    {MAP_IMAGES[map] && (
                      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Image
                          src={MAP_IMAGES[map]}
                          alt={map}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="relative flex items-center gap-2 px-3 py-2">
                      <Map size={12} className="text-orbital-purple shrink-0" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text uppercase">
                        {map.replace("de_", "")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </HudCard>

            {/* Teams Summary */}
            <HudCard className="p-4" label="TIMES">
              <div className="space-y-2 mt-1">
                {tournament.teams.map(team => {
                  const teamData = teamsMap[team.id];
                  return (
                    <div key={team.id} className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {teamData?.logo ? (
                          <Image src={teamData.logo} alt={team.name} width={18} height={18} className="object-contain" unoptimized />
                        ) : (
                          <Shield size={12} className="text-orbital-text-dim/40" />
                        )}
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">{team.name}</span>
                    </div>
                  );
                })}
              </div>
            </HudCard>
          </div>
        </div>
      </div>

      {/* ════════════════ VETO MODAL ════════════════ */}
      <AnimatePresence>
        {vetoMatch && (
          <VetoModal
            match={vetoMatch}
            tournament={tournament}
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            onBan={handleVetoBan}
            onStartMatch={handleStartMatch}
            onClose={() => { setVetoMatch(null); setMatchError(null); }}
            onResetVeto={handleResetVeto}
            actionLoading={actionLoading}
            matchError={matchError}
            vetoFirstTeam={vetoFirstTeam}
            onSelectVetoFirst={setVetoFirstTeam}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Veto Modal
function VetoModal({
  match,
  tournament,
  servers,
  selectedServer,
  onSelectServer,
  onBan,
  onStartMatch,
  onClose,
  onResetVeto,
  actionLoading,
  matchError,
  vetoFirstTeam,
  onSelectVetoFirst,
}: {
  match: BracketMatch;
  tournament: Tournament;
  servers: Server[];
  selectedServer: string;
  onSelectServer: (id: string) => void;
  onBan: (map: string) => void;
  onStartMatch: () => void;
  onClose: () => void;
  onResetVeto: () => void;
  actionLoading: boolean;
  matchError: string | null;
  vetoFirstTeam: "team1" | "team2" | null;
  onSelectVetoFirst: (team: "team1" | "team2") => void;
}) {
  const sequence = getVetoSequence(match.num_maps);
  const teamOrder = getVetoTeamOrder(match.num_maps, vetoFirstTeam === "team1");
  const currentStep = match.veto_actions.length;
  const isComplete = match.status === "ready";

  const usedMaps = match.veto_actions.map(a => a.map);
  const availableMaps = tournament.map_pool.filter(m => !usedMaps.includes(m));

  const currentAction = currentStep < sequence.length ? sequence[currentStep] : null;
  const currentTeamIdx = currentStep < teamOrder.length ? teamOrder[currentStep] : 0;
  const currentTeamId = currentTeamIdx === 0 ? match.team1_id : match.team2_id;
  const currentTeamName = getTeamName(tournament, currentTeamId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-label="Veto de mapas"
        className="bg-[#0D0D0D] border border-orbital-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orbital-border">
          <div>
            <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple">
              {match.label} — VETO
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text mt-1">
              {getTeamName(tournament, match.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, match.team2_id)}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-orbital-text-dim hover:text-orbital-text" aria-label="Fechar veto">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Team Selection - Who vetoes first */}
          {!vetoFirstTeam && (
            <div className="space-y-3">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple text-center">
                QUEM COMECA O VETO?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSelectVetoFirst("team1")}
                  className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all group"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text group-hover:text-orbital-purple transition-colors">
                    {getTeamName(tournament, match.team1_id)}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-1">TIME 1</div>
                </button>
                <button
                  onClick={() => onSelectVetoFirst("team2")}
                  className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all group"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text group-hover:text-orbital-purple transition-colors">
                    {getTeamName(tournament, match.team2_id)}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-1">TIME 2</div>
                </button>
              </div>
            </div>
          )}

          {/* Veto History */}
          {vetoFirstTeam && match.veto_actions.length > 0 && (
            <div className="space-y-1">
              {match.veto_actions.map((action, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 border ${
                  action.action === "ban"
                    ? "bg-orbital-danger/5 border-orbital-danger/20"
                    : "bg-orbital-success/5 border-orbital-success/20"
                }`}>
                  <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider ${
                    action.action === "ban" ? "text-orbital-danger" : "text-orbital-success"
                  }`}>
                    {action.action === "ban" ? "BAN" : "PICK"}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                    {action.team_name}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim ml-auto">
                    {action.map.replace("de_", "").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Current Action */}
          {vetoFirstTeam && !isComplete && currentAction && (
            <div className="border border-orbital-purple/30 p-4">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-1">
                {currentAction === "ban" ? "BANIR MAPA" : "ESCOLHER MAPA"}
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text mb-3">
                <span className="text-orbital-purple">{currentTeamName}</span> {currentAction === "ban" ? "remove" : "escolhe"} um mapa
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableMaps.map(map => (
                  <button
                    key={map}
                    onClick={() => onBan(map)}
                    className={`px-3 py-2.5 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
                      currentAction === "ban"
                        ? "bg-[#0A0A0A] border-orbital-border hover:border-orbital-danger/50 hover:bg-orbital-danger/10 hover:text-orbital-danger text-orbital-text"
                        : "bg-[#0A0A0A] border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 hover:text-orbital-success text-orbital-text"
                    }`}
                  >
                    {map.replace("de_", "").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Veto Complete */}
          {isComplete && (
            <div className="space-y-4">
              <div className="bg-orbital-success/10 border border-orbital-success/30 p-4 text-center">
                <Check size={20} className="text-orbital-success mx-auto mb-2" />
                <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-success mb-1">
                  VETO CONCLUIDO
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                  {match.num_maps === 1
                    ? `Mapa: ${match.map?.replace("de_", "").toUpperCase()}`
                    : `Mapas: ${match.maps?.map(m => m.replace("de_", "").toUpperCase()).join(" / ")}`
                  }
                </div>
              </div>

              {/* Config Info */}
              <div className="flex gap-4 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                <span>Knife Round</span>
                <span>5v5</span>
              </div>

              {/* Server Selection */}
              <div>
                <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">
                  SERVIDOR
                </label>
                <select
                  value={selectedServer}
                  onChange={e => onSelectServer(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none"
                >
                  <option value="">Selecionar servidor...</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.display_name} ({s.ip_string}:{s.port})</option>
                  ))}
                </select>
              </div>

              {/* Error message with retry */}
              {matchError && (
                <div className="bg-orbital-danger/10 border border-orbital-danger/30 p-3">
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-danger mb-2">
                    {matchError}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onStartMatch}
                      disabled={!selectedServer || actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      TENTAR NOVAMENTE
                    </button>
                    <button
                      onClick={onResetVeto}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-orbital-border hover:border-orbital-danger/50 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-text-dim hover:text-orbital-danger"
                    >
                      <X size={14} />
                      RESETAR VETO
                    </button>
                  </div>
                </div>
              )}

              {!matchError && (
                <button
                  onClick={onStartMatch}
                  disabled={!selectedServer || actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {actionLoading ? "CRIANDO..." : "CRIAR PARTIDA E INICIAR"}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══ SWISS STANDINGS VIEW ═══
function SwissStandingsView({
  tournament,
  teamsMap,
  mapScoresMap: _mapScoresMap,
}: {
  tournament: Tournament;
  teamsMap: TeamsMap;
  mapScoresMap: MapScoresMap;
}) {
  const standings = getSwissStandings(tournament);
  const currentRound = tournament.swiss_round || 1;
  const totalRounds = Math.max(currentRound, ...tournament.matches.map((m) => m.round));

  return (
    <div className="space-y-5">
      {/* Standings Table */}
      <HudCard className="p-5" label="CLASSIFICAÇÃO SWISS">
        <div className="overflow-x-auto mt-2">
          <table className="w-full font-[family-name:var(--font-jetbrains)] text-xs">
            <thead>
              <tr className="text-orbital-text-dim/50 border-b border-orbital-border text-[0.55rem]">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Time</th>
                <th className="text-center py-2 px-2">Record</th>
                <th className="text-center py-2 px-2">Buchholz</th>
                <th className="text-center py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const logo = teamsMap[s.team_id]?.logo;
                return (
                  <tr
                    key={s.team_id}
                    className={`border-b border-orbital-border/30 transition-colors ${
                      s.status === "advanced"
                        ? "bg-green-500/5"
                        : s.status === "eliminated"
                        ? "bg-red-500/5 opacity-40"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-2.5 px-2 text-orbital-text-dim">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <Link href={`/times/${s.team_id}`} className="flex items-center gap-2 hover:text-orbital-purple transition-colors">
                        {logo ? (
                          <Image src={logo} alt={s.name} width={20} height={20} className="object-contain" unoptimized />
                        ) : (
                          <Shield size={14} className="text-orbital-text-dim/30" />
                        )}
                        <span className="text-orbital-text">{s.name}</span>
                        {s.tag && <span className="text-orbital-text-dim/40">[{s.tag}]</span>}
                      </Link>
                    </td>
                    <td className="text-center py-2.5 px-2">
                      <span className="font-[family-name:var(--font-orbitron)] text-xs">
                        <span className="text-green-400">{s.wins}</span>
                        <span className="text-orbital-text-dim/30">-</span>
                        <span className="text-red-400/70">{s.losses}</span>
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-2 text-orbital-text-dim">{s.buchholz}</td>
                    <td className="text-center py-2.5 px-2">
                      <span
                        className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-2 py-0.5 border ${
                          s.status === "advanced"
                            ? "text-green-400 border-green-400/30 bg-green-400/5"
                            : s.status === "eliminated"
                            ? "text-red-400/60 border-red-400/20"
                            : "text-orbital-text-dim border-orbital-border"
                        }`}
                      >
                        {s.status === "advanced"
                          ? "AVANÇOU"
                          : s.status === "eliminated"
                          ? "ELIMINADO"
                          : "ATIVO"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </HudCard>

      {/* Matches by Round */}
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
        const roundMatches = tournament.matches.filter(
          (m) => m.bracket === "swiss" && m.round === round
        );
        if (roundMatches.length === 0) return null;

        const allDone = roundMatches.every((m) => m.status === "finished");
        const hasLive = roundMatches.some((m) => m.status === "live");

        return (
          <HudCard key={round} className="p-4" label={`ROUND ${round}`}>
            <div className="flex items-center gap-2 mb-3">
              {hasLive && (
                <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  AO VIVO
                </span>
              )}
              {allDone && (
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-green-400/50">
                  CONCLUÍDO
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {roundMatches.map((m) => {
                const t1 = getTeamName(tournament, m.team1_id);
                const t2 = getTeamName(tournament, m.team2_id);
                const t1Logo = m.team1_id ? teamsMap[m.team1_id]?.logo : null;
                const t2Logo = m.team2_id ? teamsMap[m.team2_id]?.logo : null;
                const isLive = m.status === "live";
                const isDone = m.status === "finished";

                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 border ${
                      isLive
                        ? "border-red-500/30 bg-red-500/5"
                        : isDone
                        ? "border-orbital-border/30 bg-orbital-card"
                        : "border-orbital-border bg-orbital-card"
                    }`}
                  >
                    {/* Team 1 */}
                    <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                      <span
                        className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                          isDone && m.winner_id === m.team1_id ? "text-green-400" : "text-orbital-text"
                        }`}
                      >
                        {t1}
                      </span>
                      {t1Logo ? (
                        <Image src={t1Logo} alt="" width={18} height={18} className="object-contain shrink-0" unoptimized />
                      ) : (
                        <Shield size={12} className="text-orbital-text-dim/30 shrink-0" />
                      )}
                    </div>

                    {/* Score / VS */}
                    <div className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text-dim shrink-0 w-12 text-center">
                      {isDone ? (
                        <span>
                          <span className={m.winner_id === m.team1_id ? "text-green-400" : ""}>{/* map score if available */}</span>
                          <span className="text-orbital-text-dim/40">VS</span>
                        </span>
                      ) : isLive ? (
                        <span className="text-red-400 text-[0.5rem]">LIVE</span>
                      ) : (
                        <span className="text-orbital-text-dim/30 text-[0.5rem]">VS</span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {t2Logo ? (
                        <Image src={t2Logo} alt="" width={18} height={18} className="object-contain shrink-0" unoptimized />
                      ) : (
                        <Shield size={12} className="text-orbital-text-dim/30 shrink-0" />
                      )}
                      <span
                        className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                          isDone && m.winner_id === m.team2_id ? "text-green-400" : "text-orbital-text"
                        }`}
                      >
                        {t2}
                      </span>
                    </div>

                    {/* BO indicator */}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/30 shrink-0">
                      {m.num_maps > 1 ? "BO3" : "BO1"}
                    </span>
                  </div>
                );
              })}
            </div>
          </HudCard>
        );
      })}
    </div>
  );
}
