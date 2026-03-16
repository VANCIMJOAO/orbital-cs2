"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Radio, Map, Users, Target, Skull, Crosshair, RefreshCw, Download, Ban, Flag, Trash2, Loader2, Pause, Play, RotateCcw, UserPlus, Archive, Terminal, Send, ChevronDown, Settings, Shield, Clock, Calendar, Trophy, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HudCard } from "@/components/hud-card";
import { Match, PlayerStats, MapStats, Team, Server, VetoEntry, KillEvent, BombEvent, BackupEntry, getStatusText, getStatusType, getKillEvents, getBombEvents, updateMatch, deleteMatch, pauseMatch, unpauseMatch, restartMatch, addPlayerToMatch, getMatchBackups, restoreMatchBackup, sendMatchRcon } from "@/lib/api";
import { BracketMatch } from "@/lib/tournament";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback, useRef } from "react";

// Map screenshot URLs (GitHub: ghostcap-gaming/cs2-map-images)
const MAP_IMAGES: Record<string, string> = {
  de_ancient: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_ancient.png",
  de_anubis: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_anubis.png",
  de_dust2: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_dust2.png",
  de_inferno: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_inferno.png",
  de_mirage: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_mirage.png",
  de_nuke: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_nuke.png",
  de_overpass: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_overpass.png",
  de_vertigo: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_vertigo.png",
  de_train: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_train.png",
};

function TeamLogo({ logo, size = 48, className = "" }: { logo: string | null | undefined; size?: number; className?: string }) {
  if (!logo) return <Shield size={size * 0.5} className="text-orbital-text-dim" />;
  return <img src={logo} alt="" width={size} height={size} className={`object-contain ${className}`} />;
}

interface HighlightClip {
  id: number;
  match_id: number;
  map_number: number;
  rank: number;
  player_name: string | null;
  steam_id: string | null;
  kills_count: number;
  score: number;
  description: string | null;
  round_number: number | null;
  tick_start: number | null;
  tick_end: number | null;
  video_file: string | null;
  thumbnail_file: string | null;
  duration_s: number | null;
  status: "pending" | "extracting" | "recording" | "processing" | "ready" | "error";
  error_message: string | null;
}

interface Props {
  match: Match;
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  team1: Team | null;
  team2: Team | null;
  server: Server | null;
  bracketMatch?: BracketMatch | null;
  tournamentName?: string | null;
}

export function MatchDetailContent({ match: initialMatch, playerStats: initialStats, mapStats: initialMapStats, team1, team2, server, bracketMatch, tournamentName }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [playerStats, setPlayerStats] = useState(initialStats || []);
  const [mapStats, setMapStats] = useState(initialMapStats || []);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [vetoes, setVetoes] = useState<VetoEntry[]>([]);
  const [adminAction, setAdminAction] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | number>("all");
  const [killEvents, setKillEvents] = useState<KillEvent[]>([]);
  const [bombEvents, setBombEvents] = useState<BombEvent[]>([]);
  const [gameLogExpanded, setGameLogExpanded] = useState(true);
  const [gameLogMapFilter, setGameLogMapFilter] = useState<"all" | number>("all");
  const [highlightClips, setHighlightClips] = useState<HighlightClip[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsTriggering, setHighlightsTriggering] = useState(false);
  const { isAdmin } = useAuth();
  const router = useRouter();
  const statusType = getStatusType(match);
  const hasActiveMap = mapStats.some(m => m.start_time && !m.end_time);
  const isLive = statusType === "live" || (statusType === "upcoming" && hasActiveMap);
  const statusText = isLive ? "AO VIVO" : getStatusText(match);
  const isActive = isLive || statusType === "upcoming";
  const isFinished = statusType === "finished";

  // Live score from mapstats
  const currentMap = mapStats.length > 0 ? mapStats[mapStats.length - 1] : null;
  const liveScore1 = currentMap ? currentMap.team1_score : match.team1_score;
  const liveScore2 = currentMap ? currentMap.team2_score : match.team2_score;

  // Map wins (for BO3)
  const mapWins1 = mapStats.filter(ms => ms.end_time && ms.winner === match.team1_id).length;
  const mapWins2 = mapStats.filter(ms => ms.end_time && ms.winner === match.team2_id).length;

  // Use map wins for BO3+ overall score display, round score for current map
  const isBO1 = (match.max_maps || match.num_maps || 1) <= 1;
  const overallScore1 = isBO1 ? liveScore1 : mapWins1;
  const overallScore2 = isBO1 ? liveScore2 : mapWins2;

  const fetchLiveData = useCallback(async () => {
    try {
      const [matchRes, statsRes, mapRes] = await Promise.all([
        fetch(`/api/matches/${match.id}`).then(r => r.json()),
        fetch(`/api/playerstats/match/${match.id}`).then(r => r.json()).catch(() => ({ playerstats: [] })),
        fetch(`/api/mapstats/${match.id}`).then(r => r.json()).catch(() => ({ mapstats: [] })),
      ]);
      if (matchRes.match) setMatch(matchRes.match);
      const stats = matchRes.playerstats || statsRes.playerstats || statsRes.playerStats || [];
      if (Array.isArray(stats) && stats.length > 0) setPlayerStats(stats);
      const maps = mapRes.mapstats || mapRes.mapStats || [];
      if (Array.isArray(maps) && maps.length > 0) setMapStats(maps);
      setLastUpdate(new Date());
    } catch {
      // silently fail
    }
  }, [match.id]);

  // SSE + polling
  useEffect(() => {
    if (!isLive) return;
    let sseActive = false;
    const eventSource = new EventSource(`/api/matches/${match.id}/stream`);
    eventSource.onmessage = (event) => {
      sseActive = true;
      try {
        const data = JSON.parse(event.data);
        if (data.match) setMatch(data.match);
        if (data.playerstats && Array.isArray(data.playerstats) && data.playerstats.length > 0) setPlayerStats(data.playerstats);
        if (data.mapstats && Array.isArray(data.mapstats) && data.mapstats.length > 0) setMapStats(data.mapstats);
        setLastUpdate(new Date());
      } catch { }
    };
    eventSource.onerror = () => { sseActive = false; };
    const interval = setInterval(() => { if (!sseActive) fetchLiveData(); }, 10000);
    const backupInterval = setInterval(fetchLiveData, 30000);
    return () => { eventSource.close(); clearInterval(interval); clearInterval(backupInterval); };
  }, [isLive, fetchLiveData, match.id]);

  // Fetch vetoes
  useEffect(() => {
    if (!match.id) return;
    fetch(`/api/vetoes/${match.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.vetoes) setVetoes(d.vetoes); })
      .catch(() => {});
  }, [match.id]);

  // Fetch game log (kill events + bomb events)
  const fetchGameLog = useCallback(async () => {
    const [kills, bombs] = await Promise.all([
      getKillEvents(match.id),
      getBombEvents(match.id),
    ]);
    setKillEvents(kills);
    setBombEvents(bombs);
  }, [match.id]);

  useEffect(() => { fetchGameLog(); }, [fetchGameLog]);

  // Refresh game log when live
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchGameLog, 15000);
    return () => clearInterval(interval);
  }, [isLive, fetchGameLog]);

  // Fetch highlight clips
  const fetchHighlightClips = useCallback(async () => {
    try {
      setHighlightsLoading(true);
      const res = await fetch(`/api/highlights/${match.id}`);
      const data = await res.json();
      if (data.clips) setHighlightClips(data.clips);
    } catch { /* ignore */ }
    setHighlightsLoading(false);
  }, [match.id]);

  useEffect(() => { fetchHighlightClips(); }, [fetchHighlightClips]);

  // Poll for in-progress highlights every 15s
  useEffect(() => {
    const hasPending = highlightClips.some(c => c.status !== "ready" && c.status !== "error");
    if (!hasPending) return;
    const interval = setInterval(fetchHighlightClips, 15000);
    return () => clearInterval(interval);
  }, [highlightClips, fetchHighlightClips]);

  const triggerHighlights = async (mapNumber?: number) => {
    setHighlightsTriggering(true);
    try {
      const res = await fetch("/api/highlights/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, mapNumber }),
      });
      if (res.ok) {
        await fetchHighlightClips();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao gerar highlights");
      }
    } catch {
      alert("Erro de conexão");
    }
    setHighlightsTriggering(false);
  };

  // Stats per team (filtered by active tab / map)
  // When "all" and multiple maps, aggregate stats per player (sum kills, deaths, etc.)
  const filteredStats = (() => {
    if (activeTab !== "all") return playerStats.filter(s => s.map_id === activeTab);
    if (mapStats.length <= 1) return playerStats;
    // Aggregate: group by steam_id + team_id, sum numeric fields
    const grouped: Record<string, PlayerStats> = {};
    for (const s of playerStats) {
      const key = `${s.steam_id}_${s.team_id}`;
      const existing = grouped[key];
      if (!existing) {
        grouped[key] = { ...s };
      } else {
        existing.kills += s.kills;
        existing.deaths += s.deaths;
        existing.assists += s.assists;
        existing.flash_assists += s.flash_assists;
        existing.headshot_kills += s.headshot_kills;
        existing.roundsplayed += s.roundsplayed;
        existing.damage += s.damage;
        existing.k1 += s.k1;
        existing.k2 += s.k2;
        existing.k3 += s.k3;
        existing.k4 += s.k4;
        existing.k5 += s.k5;
        existing.firstkill_t += s.firstkill_t;
        existing.firstkill_ct += s.firstkill_ct;
        existing.firstdeath_t += s.firstdeath_t;
        existing.firstdeath_ct += s.firstdeath_ct;
        existing.mvp += s.mvp;
        existing.contribution_score += s.contribution_score;
      }
    }
    return Object.values(grouped);
  })();
  const team1Stats = filteredStats.filter((s) => s.team_id === match.team1_id);
  const team2Stats = filteredStats.filter((s) => s.team_id === match.team2_id);

  // Format date
  const matchDate = match.start_time
    ? new Date(match.start_time).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const matchTime = match.start_time
    ? new Date(match.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Top bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 flex items-center justify-between">
        <Link href="/partidas" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          {isLive && (
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
              {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
          {isLive && (
            <button onClick={fetchLiveData} className="inline-flex items-center gap-1.5 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
              <RefreshCw size={12} /> Atualizar
            </button>
          )}
        </div>
      </motion.div>

      {/* ═══ HERO SCOREBOARD (HLTV-inspired) ═══ */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className={`relative bg-orbital-card border overflow-hidden ${
          isLive ? "border-orbital-live/30" : "border-orbital-border"
        }`}>
          {/* Map image background (BO1 only) */}
          {isBO1 && currentMap && MAP_IMAGES[currentMap.map_name] && (
            <div className="absolute inset-0">
              <img src={MAP_IMAGES[currentMap.map_name]} alt={currentMap.map_name} className="w-full h-full object-cover opacity-15" />
              <div className="absolute inset-0 bg-gradient-to-b from-orbital-card/60 via-orbital-card/80 to-orbital-card" />
            </div>
          )}

          {/* Top accent */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] z-10 ${
            isLive ? "bg-orbital-live" : "bg-gradient-to-r from-transparent via-orbital-purple/40 to-transparent"
          }`} />

          <div className="relative py-8 px-6 z-10">
            {/* Tournament + bracket label */}
            {(tournamentName || bracketMatch?.label) && (
              <div className="text-center mb-3">
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple/80">
                  {tournamentName}{bracketMatch?.label ? ` — ${bracketMatch.label}` : ""}
                </span>
              </div>
            )}

            {/* Status + Date row */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {matchDate && (
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                  <Calendar size={11} className="text-orbital-purple/60" />
                  {matchDate}
                </span>
              )}
              {matchTime && (
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                  <Clock size={11} className="text-orbital-purple/60" />
                  {matchTime}
                </span>
              )}
              {match.title && !tournamentName && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple/80">
                  {match.title}
                </span>
              )}
            </div>

            {/* Score layout: Team1 | Score | Team2 */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {/* Team 1 */}
              <div className="flex-1 flex flex-col items-end gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 border border-orbital-border flex items-center justify-center bg-[#0A0A0A]">
                  <TeamLogo logo={team1?.logo} size={56} className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <h2 className={`font-[family-name:var(--font-orbitron)] text-sm sm:text-lg font-bold tracking-wider text-right ${
                  match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team1_string || team1?.name || `Time ${match.team1_id}`}
                </h2>
                {match.winner === match.team1_id && (
                  <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-success">
                    <Trophy size={10} /> VENCEDOR
                  </span>
                )}
              </div>

              {/* Score center */}
              <div className="text-center min-w-[120px]">
                {/* Status badge above score */}
                <div className="mb-2">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orbital-live/15 border border-orbital-live/30">
                      <Radio size={10} className="text-orbital-live animate-pulse-live" />
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-live">AO VIVO</span>
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 border ${
                      isFinished ? "bg-orbital-text-dim/5 border-orbital-border" : "bg-orbital-warning/10 border-orbital-warning/30"
                    }`}>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${
                        isFinished ? "text-orbital-text-dim" : "text-orbital-warning"
                      }`}>
                        {statusText}
                      </span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
                        BO{match.max_maps || match.num_maps || 1}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-5">
                  <span className={`font-[family-name:var(--font-jetbrains)] text-5xl sm:text-6xl font-black ${
                    match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                  }`}>
                    {overallScore1}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-2xl text-orbital-text-dim/30">:</span>
                  <span className={`font-[family-name:var(--font-jetbrains)] text-5xl sm:text-6xl font-black ${
                    match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
                  }`}>
                    {overallScore2}
                  </span>
                </div>

                {/* Current map round score (for BO3 when live) */}
                {!isBO1 && currentMap && isLive && (
                  <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                    <span className="text-orbital-purple">{currentMap.map_name.replace("de_", "").toUpperCase()}</span>
                    {" "}{currentMap.team1_score} : {currentMap.team2_score}
                  </div>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex-1 flex flex-col items-start gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 border border-orbital-border flex items-center justify-center bg-[#0A0A0A]">
                  <TeamLogo logo={team2?.logo} size={56} className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <h2 className={`font-[family-name:var(--font-orbitron)] text-sm sm:text-lg font-bold tracking-wider ${
                  match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team2_string || team2?.name || `Time ${match.team2_id}`}
                </h2>
                {match.winner === match.team2_id && (
                  <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-success">
                    <Trophy size={10} /> VENCEDOR
                  </span>
                )}
              </div>
            </div>

            {/* Map name badge (BO1 integrated) */}
            {isBO1 && currentMap && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <div className="h-[1px] flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-orbital-purple/30" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] text-orbital-purple/80">
                  {currentMap.map_name.replace("de_", "").toUpperCase()}
                </span>
                <div className="h-[1px] flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-orbital-purple/30" />
              </div>
            )}

            {/* Connect buttons */}
            {server && isActive && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <a
                  href={`steam://connect/${server.ip_string}:${server.port}`}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-orbital-purple/20 border border-orbital-purple/40 hover:border-orbital-purple hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
                >
                  CONNECT
                </a>
                {server.gotv_port && (
                  <a
                    href={`steam://connect/${server.ip_string}:${server.gotv_port}`}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-orbital-card border border-orbital-border hover:border-orbital-purple/40 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim hover:text-orbital-text"
                  >
                    GOTV
                  </a>
                )}
              </div>
            )}

            {/* Demo download (BO1 integrated) */}
            {isBO1 && currentMap?.demoFile && currentMap.end_time && (
              <div className="text-center mt-3">
                <a
                  href={`/api/demo/${currentMap.demoFile}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple"
                >
                  <Download size={10} /> DOWNLOAD DEMO
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ═══ CHAMPION BANNER (tournament finals) ═══ */}
      {isFinished && match.winner && tournamentName && bracketMatch?.bracket === "grand_final" && (
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6"
        >
          <div className="relative bg-gradient-to-r from-yellow-500/[0.03] via-yellow-400/[0.08] to-yellow-500/[0.03] border border-yellow-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMjBMMjAgMEw0MCAyMEwyMCA0MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMzQsMTc5LDgsLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
            <div className="relative py-6 px-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-yellow-400/50" />
                <Trophy size={18} className="text-yellow-400" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.25em] text-yellow-400/80">
                  CAMPEÃO
                </span>
                <Trophy size={18} className="text-yellow-400" />
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-yellow-400/50" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border border-yellow-500/30 flex items-center justify-center bg-[#0A0A0A]">
                  <TeamLogo
                    logo={match.winner === match.team1_id ? team1?.logo : team2?.logo}
                    size={48}
                    className="w-10 h-10 sm:w-12 sm:h-12"
                  />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-orbitron)] text-lg sm:text-2xl font-black tracking-wider text-yellow-400 glow-purple-text" style={{ textShadow: "0 0 20px rgba(234,179,8,0.4)" }}>
                    {match.winner === match.team1_id
                      ? (match.team1_string || team1?.name || "Time 1")
                      : (match.team2_string || team2?.name || "Time 2")}
                  </h3>
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-yellow-400/60 mt-0.5">
                    {tournamentName}{bracketMatch?.label ? ` — ${bracketMatch.label}` : ""}
                  </p>
                  {(() => {
                    const winnerTeam = match.winner === match.team1_id ? team1 : team2;
                    const playerNames = winnerTeam?.auth_name
                      ? Object.values(winnerTeam.auth_name).map(v => typeof v === "string" ? v : v.name).filter(Boolean)
                      : [];
                    return playerNames.length > 0 ? (
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-yellow-400/50 mt-1">
                        {playerNames.join(" • ")}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <AdminActions
          match={match}
          isActive={isActive}
          team1={team1}
          team2={team2}
          adminAction={adminAction}
          setAdminAction={setAdminAction}
          onUpdate={async () => {
            await fetchLiveData();
            router.refresh();
          }}
        />
      )}

      {/* ═══ MATCH INFO (shown when no stats yet — pending/upcoming) ═══ */}
      {mapStats.length === 0 && playerStats.length === 0 && (
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Crosshair size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">INFORMAÇÕES</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
          </div>
          <div className="bg-orbital-card border border-orbital-border p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoItem label="FORMATO" value={`BO${match.max_maps || match.num_maps || 1}`} />
              <InfoItem label="JOGADORES" value={`${match.players_per_team || 5}v${match.players_per_team || 5}`} />
              <InfoItem label="PARTIDA" value={`#${match.id}`} />
              {server && <InfoItem label="SERVIDOR" value={server.display_name || `${server.ip_string}:${server.port}`} />}
              {match.season_id && <InfoItem label="SEASON" value={`#${match.season_id}`} />}
              {match.veto_first && <InfoItem label="VETO FIRST" value={match.veto_first === "team1" ? (match.team1_string || team1?.name || "Time 1") : (match.team2_string || team2?.name || "Time 2")} />}
              {match.skip_veto && <InfoItem label="VETO" value="Desativado" />}
              {match.side_type && <InfoItem label="SIDES" value={match.side_type === "standard" ? "Padrão" : match.side_type === "always_knife" ? "Knife" : match.side_type} />}
            </div>

            {/* Status message */}
            <div className="mt-5 pt-4 border-t border-orbital-border/30 text-center">
              <div className="flex items-center justify-center gap-2">
                {isActive && !isLive && (
                  <>
                    <Clock size={14} className="text-orbital-warning" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-warning">
                      Aguardando início da partida
                    </span>
                  </>
                )}
                {isLive && (
                  <>
                    <Radio size={14} className="text-orbital-live animate-pulse-live" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-live">
                      Partida em andamento — aguardando dados
                    </span>
                  </>
                )}
                {match.cancelled && (
                  <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-danger">
                    Partida cancelada
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══ MAPS SECTION (HLTV-style with images) — only for BO3+ ═══ */}
      {mapStats.length > 0 && !isBO1 && (
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Map size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">MAPAS</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
          </div>
          <div className={`grid gap-3 ${mapStats.length === 1 ? "grid-cols-1 max-w-md" : mapStats.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
            {mapStats.map((ms, i) => {
              const isCurrentMap = !ms.end_time && isLive;
              const mapImg = MAP_IMAGES[ms.map_name];
              return (
                <motion.div
                  key={ms.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className={`relative bg-orbital-card border overflow-hidden ${
                    isCurrentMap ? "border-orbital-live/40" : ms.end_time ? "border-orbital-border" : "border-orbital-border/50"
                  }`}
                >
                  {/* Map image background */}
                  {mapImg && (
                    <div className="relative h-20 overflow-hidden">
                      <img src={mapImg} alt={ms.map_name} className="w-full h-full object-cover opacity-40" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orbital-card" />
                      {isCurrentMap && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-orbital-live/20 border border-orbital-live/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" />
                          <span className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider text-orbital-live">LIVE</span>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-3 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">
                        MAPA {ms.map_number + 1}
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Map name */}
                    <div className="text-center mb-3">
                      <span className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-orbital-text">
                        {ms.map_name.replace("de_", "").toUpperCase()}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-right flex-1">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          {match.team1_string || team1?.name || "Time 1"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                          ms.end_time && ms.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                        }`}>
                          {ms.team1_score}
                        </span>
                        <span className="text-orbital-text-dim text-sm">:</span>
                        <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                          ms.end_time && ms.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
                        }`}>
                          {ms.team2_score}
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                          {match.team2_string || team2?.name || "Time 2"}
                        </span>
                      </div>
                    </div>

                    {/* Demo download */}
                    {ms.demoFile && ms.end_time && (
                      <div className="text-center mt-3">
                        <a
                          href={`/api/demo/${ms.demoFile}`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple"
                        >
                          <Download size={10} /> DEMO
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ═══ SELECTED MAP (from tournament bracket, when no mapStats yet) ═══ */}
      {mapStats.length === 0 && bracketMatch?.map && (
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Map size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">MAPA</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
          </div>
          <div className="relative bg-orbital-card border border-orbital-border overflow-hidden">
            {MAP_IMAGES[bracketMatch.map] && (
              <div className="relative h-32 sm:h-40 overflow-hidden">
                <img src={MAP_IMAGES[bracketMatch.map]} alt={bracketMatch.map} className="w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orbital-card" />
              </div>
            )}
            <div className="p-4 text-center">
              <span className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
                {bracketMatch.map.replace("de_", "").toUpperCase()}
              </span>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">
                Mapa selecionado via veto
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══ HIGHLIGHTS ═══ */}
      {isFinished && mapStats.some(ms => ms.demoFile) && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <Film size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">HIGHLIGHTS</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
            {highlightClips.some(c => c.status !== "ready" && c.status !== "error") && (
              <button onClick={fetchHighlightClips} className="text-orbital-purple hover:text-orbital-text transition-colors">
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          {highlightsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-orbital-purple animate-spin" />
            </div>
          ) : (
            <>
              {/* Ready clips — 3 per row */}
              {highlightClips.filter(c => c.status === "ready" && c.video_file).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {highlightClips.filter(c => c.status === "ready" && c.video_file).map(clip => (
                    <div key={clip.id} className="bg-orbital-card border border-orbital-purple/20 overflow-hidden group hover:border-orbital-purple/40 transition-all" style={{ boxShadow: "0 0 12px rgba(168,85,247,0.08)" }}>
                      <ClipPlayer src={`/api/highlights-proxy/${clip.video_file}`} clipId={clip.id} />
                      <div className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] text-orbital-purple font-bold shrink-0">
                            #{clip.rank}
                          </span>
                          <Link href={`/perfil/${clip.steam_id}`} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text hover:text-orbital-purple transition-colors truncate">
                            {clip.player_name || "Highlight"}
                          </Link>
                          {clip.kills_count >= 2 && (
                            <span className={`font-[family-name:var(--font-orbitron)] text-[0.45rem] px-1.5 py-0.5 shrink-0 ${
                              clip.kills_count >= 5
                                ? "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20"
                                : "text-orbital-purple bg-orbital-purple/10"
                            }`}>
                              {clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}
                            </span>
                          )}
                        </div>
                        {clip.round_number && (
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim shrink-0">
                            R{clip.round_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* In-progress clips */}
              {highlightClips.filter(c => ["pending", "extracting", "recording", "processing"].includes(c.status)).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {highlightClips.filter(c => ["pending", "extracting", "recording", "processing"].includes(c.status)).map(clip => {
                    const statusLabels: Record<string, string> = {
                      pending: "Aguardando...",
                      extracting: "Analisando demo...",
                      recording: "Gravando clip...",
                      processing: "Aplicando efeitos...",
                    };
                    return (
                      <HudCard key={clip.id} className="flex items-center gap-3 p-3">
                        <Loader2 size={12} className="text-orbital-purple animate-spin shrink-0" />
                        <div className="min-w-0">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim block truncate">
                            {statusLabels[clip.status] || "Processando..."}
                          </span>
                          {clip.player_name && (
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple truncate block">
                              #{clip.rank} {clip.player_name}
                            </span>
                          )}
                        </div>
                      </HudCard>
                    );
                  })}
                </div>
              )}

              {/* Admin: generate highlights button */}
              {isAdmin && mapStats.filter(ms => ms.demoFile && ms.end_time).map(ms => {
                const hasClip = highlightClips.some(c => c.map_number === ms.map_number);
                if (hasClip) return null;
                return (
                  <button
                    key={`gen-${ms.map_number}`}
                    onClick={() => triggerHighlights(ms.map_number)}
                    disabled={highlightsTriggering}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-orbital-card border border-dashed border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/5 transition-all disabled:opacity-50"
                  >
                    {highlightsTriggering ? (
                      <Loader2 size={14} className="text-orbital-purple animate-spin" />
                    ) : (
                      <Sparkles size={14} className="text-orbital-purple" />
                    )}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple">
                      {highlightsTriggering ? "GERANDO..." : `GERAR HIGHLIGHTS — ${ms.map_name?.replace("de_", "").toUpperCase() || `MAPA ${ms.map_number + 1}`}`}
                    </span>
                  </button>
                );
              })}

              {/* No clips yet and not admin */}
              {highlightClips.length === 0 && !isAdmin && (
                <HudCard className="text-center py-6">
                  <Film size={20} className="text-orbital-border mx-auto mb-2" />
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    Nenhum highlight disponível
                  </p>
                </HudCard>
              )}
            </>
          )}
        </motion.section>
      )}

      {/* ═══ VETO + STREAM (side by side) ═══ */}
      {(() => {
        // Use G5API vetoes first, fallback to bracket match veto_actions
        const vetoList = vetoes.length > 0
          ? vetoes.map(v => ({ team_name: v.team_name, action: v.pick_or_ban as "ban" | "pick", map: v.map, id: v.id }))
          : (bracketMatch?.veto_actions || []).map((v, i) => ({ team_name: v.team_name, action: v.action, map: v.map, id: i }));

        // Find leftover maps: maps in pool not mentioned in veto list
        // BO1: 6 bans → 1 leftover; BO3: 4 bans + 2 picks → 1 leftover (decider)
        const vetoMaps = new Set(vetoList.map(v => v.map));
        const CS2_MAP_POOL = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_overpass"];
        const leftoverMaps = CS2_MAP_POOL.filter(m => !vetoMaps.has(m));
        // Fallback for BO1 with bracketMatch.map
        const leftoverMap = leftoverMaps.length === 0 && bracketMatch?.map && !vetoMaps.has(bracketMatch.map)
          ? bracketMatch.map
          : null;

        const hasVeto = vetoList.length > 0;

        return (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`mb-6 grid gap-4 ${hasVeto ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* VETO */}
            {hasVeto && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <Ban size={14} className="text-orbital-purple" />
                  <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">VETO</h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
                </div>
                <div className="bg-orbital-card border border-orbital-border p-4 h-[calc(100%-2rem)]">
                  <div className="space-y-1.5">
                    {vetoList.map((v, i) => {
                      const isCurrentMap = currentMap?.map_name === v.map && !isFinished;
                      return (
                        <div key={v.id} className={`flex items-center gap-3 py-1.5 ${isCurrentMap ? "py-2 px-2 -mx-2 bg-orbital-success/5 border border-orbital-success/20" : ""}`}>
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right">{i + 1}.</span>
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text min-w-[80px]">{v.team_name}</span>
                          <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.1em] px-2 py-0.5 border ${
                            v.action === "ban"
                              ? "text-orbital-danger bg-orbital-danger/5 border-orbital-danger/20"
                              : "text-orbital-success bg-orbital-success/5 border-orbital-success/20"
                          }`}>
                            {v.action === "ban" ? "REMOVEU" : "ESCOLHEU"}
                          </span>
                          <span className={`font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider font-bold ${isCurrentMap ? "text-orbital-success" : "text-orbital-text"}`}>
                            {v.map.replace("de_", "").toUpperCase()}
                          </span>
                          {isCurrentMap && (
                            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] px-2 py-0.5 text-orbital-success bg-orbital-success/10 border border-orbital-success/20 ml-auto">
                              AO VIVO
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {leftoverMaps.map((mapName, i) => {
                      const isCurrentMap = currentMap?.map_name === mapName && !isFinished;
                      return (
                        <div key={mapName} className={`flex items-center gap-3 py-2 px-2 -mx-2 mt-1 ${isCurrentMap ? "bg-orbital-success/5 border border-orbital-success/20" : "border border-orbital-border"}`}>
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right">{vetoList.length + i + 1}.</span>
                          <span className={`font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider font-bold ${isCurrentMap ? "text-orbital-success" : "text-orbital-text-dim"}`}>
                            {mapName.replace("de_", "").toUpperCase()}
                          </span>
                          <span className={`font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] px-2 py-0.5 ${isCurrentMap ? "text-orbital-success bg-orbital-success/10 border border-orbital-success/20" : "text-orbital-text-dim bg-orbital-card border border-orbital-border"}`}>
                            {isBO1 ? "JOGADO" : "DECIDER"}
                          </span>
                          {isCurrentMap && (
                            <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] px-2 py-0.5 text-orbital-success bg-orbital-success/10 border border-orbital-success/20 ml-auto">
                              AO VIVO
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {leftoverMap && (
                      <div className="flex items-center gap-3 py-2 px-2 -mx-2 bg-orbital-success/5 border border-orbital-success/20 mt-1">
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right">{vetoList.length + leftoverMaps.length + 1}.</span>
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-success font-bold">
                          {leftoverMap.replace("de_", "").toUpperCase()}
                        </span>
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] px-2 py-0.5 text-orbital-success bg-orbital-success/10 border border-orbital-success/20">
                          JOGADO
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* STREAM */}
            <section>
              <div className="flex items-center gap-3 mb-3">
                <Radio size={14} className="text-orbital-purple" />
                <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">STREAM</h3>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
              </div>
              <div className="bg-orbital-card border border-orbital-border overflow-hidden h-[calc(100%-2rem)]">
                <div className="relative w-full h-full min-h-[250px]">
                  <iframe
                    src="https://player.twitch.tv/?channel=orbitalcuplives&parent=www.orbitalroxa.com.br&parent=orbitalroxa.com.br&parent=orbital-cs2.vercel.app&parent=localhost"
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                  />
                </div>
              </div>
            </section>
          </motion.div>
        );
      })()}

      {/* ═══ GAME LOG ═══ */}
      {(killEvents.length > 0 || bombEvents.length > 0) && (
        <GameLog
          killEvents={killEvents}
          bombEvents={bombEvents}
          mapStats={mapStats}
          expanded={gameLogExpanded}
          onToggle={() => setGameLogExpanded(!gameLogExpanded)}
          mapFilter={gameLogMapFilter}
          onMapFilterChange={setGameLogMapFilter}
        />
      )}

      {/* ═══ PLAYER STATS (HLTV-style with tabs) ═══ */}
      {(team1Stats.length > 0 || team2Stats.length > 0) ? (
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-3 mb-3">
            <Crosshair size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">ESTATÍSTICAS</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
          </div>

          {/* Map tabs (when multiple maps) */}
          {mapStats.length > 1 && (
            <div className="flex items-center gap-1 mb-4">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider border transition-all ${
                  activeTab === "all"
                    ? "border-orbital-purple/50 bg-orbital-purple/10 text-orbital-purple"
                    : "border-orbital-border text-orbital-text-dim hover:text-orbital-text hover:border-orbital-border/80"
                }`}
              >
                GERAL
              </button>
              {mapStats.map(ms => (
                <button
                  key={ms.id}
                  onClick={() => setActiveTab(ms.id)}
                  className={`px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider border transition-all ${
                    activeTab === ms.id
                      ? "border-orbital-purple/50 bg-orbital-purple/10 text-orbital-purple"
                      : "border-orbital-border text-orbital-text-dim hover:text-orbital-text hover:border-orbital-border/80"
                  }`}
                >
                  {ms.map_name.replace("de_", "").toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-5">
            {team1Stats.length > 0 && (
              <PlayerStatsTable
                teamName={match.team1_string || team1?.name || "Time 1"}
                teamLogo={team1?.logo || null}
                stats={team1Stats}
                isWinner={match.winner === match.team1_id}
                delay={0.25}
              />
            )}
            {team2Stats.length > 0 && (
              <PlayerStatsTable
                teamName={match.team2_string || team2?.name || "Time 2"}
                teamLogo={team2?.logo || null}
                stats={team2Stats}
                isWinner={match.winner === match.team2_id}
                delay={0.3}
              />
            )}
          </div>
        </motion.section>
      ) : mapStats.length > 0 ? (
        /* Has maps but no player stats yet */
        <HudCard className="text-center py-8">
          <Users size={24} className="text-orbital-border mx-auto mb-3" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            {isLive ? "Aguardando dados dos jogadores..." : "Sem estatísticas de jogadores"}
          </p>
        </HudCard>
      ) : null}

      {/* Old highlights section removed — now above veto+stream */}
    </div>
  );
}

// ── Weapon display names ──
const WEAPON_NAMES: Record<string, string> = {
  ak47: "AK-47", m4a1: "M4A1-S", m4a1_silencer: "M4A1-S", m4a1_silencer_off: "M4A4",
  awp: "AWP", deagle: "Desert Eagle", glock: "Glock-18", usp_silencer: "USP-S",
  p250: "P250", fiveseven: "Five-SeveN", tec9: "Tec-9", cz75a: "CZ75-Auto",
  elite: "Dual Berettas", mp9: "MP9", mac10: "MAC-10", mp7: "MP7", ump45: "UMP-45",
  p90: "P90", bizon: "PP-Bizon", famas: "FAMAS", galilar: "Galil AR",
  aug: "AUG", sg556: "SG 553", ssg08: "SSG 08", g3sg1: "G3SG1", scar20: "SCAR-20",
  nova: "Nova", xm1014: "XM1014", sawedoff: "Sawed-Off", mag7: "MAG-7",
  m249: "M249", negev: "Negev", hkp2000: "P2000", revolver: "R8 Revolver",
  knife: "Knife", knife_t: "Knife", bayonet: "Knife",
  hegrenade: "HE Grenade", inferno: "Molotov", molotov: "Molotov",
  flashbang: "Flashbang", smokegrenade: "Smoke", decoy: "Decoy",
  world: "World", planted_c4: "C4",
};

function getWeaponName(weapon: string): string {
  return WEAPON_NAMES[weapon] || weapon.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Game Log Entry type ──
type GameLogEntry =
  | { type: "kill"; data: KillEvent; time: number }
  | { type: "bomb_plant"; data: BombEvent; time: number }
  | { type: "bomb_defuse"; data: BombEvent; time: number };

// ── Game Log Component ──
function GameLog({
  killEvents, bombEvents, mapStats,
  expanded, onToggle, mapFilter, onMapFilterChange,
}: {
  killEvents: KillEvent[];
  bombEvents: BombEvent[];
  mapStats: MapStats[];
  expanded: boolean;
  onToggle: () => void;
  mapFilter: "all" | number;
  onMapFilterChange: (v: "all" | number) => void;
}) {
  // Build unified log entries
  const entries: GameLogEntry[] = [];

  const filteredKills = mapFilter === "all" ? killEvents : killEvents.filter(k => k.map_id === mapFilter);
  const filteredBombs = mapFilter === "all" ? bombEvents : bombEvents.filter(b => b.map_id === mapFilter);

  for (const k of filteredKills) {
    entries.push({ type: "kill", data: k, time: k.id });
  }
  for (const b of filteredBombs) {
    entries.push({
      type: b.defused ? "bomb_defuse" : "bomb_plant",
      data: b,
      time: b.id,
    });
  }

  // Sort by id (chronological order from DB)
  entries.sort((a, b) => a.time - b.time);

  // Group by round
  const roundGroups = new window.Map<string, GameLogEntry[]>();
  for (const entry of entries) {
    const roundNum = entry.type === "kill" ? entry.data.round_number : entry.data.round_number;
    const mapId = entry.type === "kill" ? entry.data.map_id : entry.data.map_id;
    const key = `${mapId}-${roundNum}`;
    if (!roundGroups.has(key)) roundGroups.set(key, []);
    roundGroups.get(key)!.push(entry);
  }

  // Get round keys sorted
  const roundKeys = Array.from(roundGroups.keys()).sort((a, b) => {
    const [mapA, roundA] = a.split("-").map(Number);
    const [mapB, roundB] = b.split("-").map(Number);
    if (mapA !== mapB) return mapA - mapB;
    return roundA - roundB;
  });

  // Reverse to show most recent first
  roundKeys.reverse();

  const getSide = (side: string) => {
    if (side === "CT" || side === "3") return "CT";
    if (side === "T" || side === "2") return "T";
    return side;
  };

  const sideColor = (side: string) => {
    const s = getSide(side);
    return s === "CT" ? "text-blue-400" : s === "T" ? "text-yellow-400" : "text-orbital-text-dim";
  };

  const sideBg = (side: string) => {
    const s = getSide(side);
    return s === "CT" ? "bg-blue-500/10" : s === "T" ? "bg-yellow-500/10" : "";
  };

  const mapName = (mapId: number) => {
    const ms = mapStats.find(m => m.id === mapId);
    return ms ? ms.map_name.replace("de_", "").toUpperCase() : `Map ${mapId}`;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mb-6"
    >
      <div className="flex items-center gap-3 mb-3">
        <Skull size={14} className="text-orbital-purple" />
        <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">GAME LOG</h3>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
        <button
          onClick={onToggle}
          className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim hover:text-orbital-purple transition-colors flex items-center gap-1"
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
          {expanded ? "Recolher" : "Expandir"}
        </button>
      </div>

      {expanded && (
        <div className="bg-orbital-card border border-orbital-border overflow-hidden">
          {/* Map filter tabs */}
          {mapStats.length > 1 && (
            <div className="flex items-center gap-1 p-2 border-b border-orbital-border/50">
              <button
                onClick={() => onMapFilterChange("all")}
                className={`px-2.5 py-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider border transition-all ${
                  mapFilter === "all"
                    ? "border-orbital-purple/50 bg-orbital-purple/10 text-orbital-purple"
                    : "border-orbital-border text-orbital-text-dim hover:text-orbital-text"
                }`}
              >
                TODOS
              </button>
              {mapStats.map(ms => (
                <button
                  key={ms.id}
                  onClick={() => onMapFilterChange(ms.id)}
                  className={`px-2.5 py-1 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider border transition-all ${
                    mapFilter === ms.id
                      ? "border-orbital-purple/50 bg-orbital-purple/10 text-orbital-purple"
                      : "border-orbital-border text-orbital-text-dim hover:text-orbital-text"
                  }`}
                >
                  {ms.map_name.replace("de_", "").toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Log entries */}
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {roundKeys.length === 0 ? (
              <div className="text-center py-8">
                <Target size={20} className="text-orbital-border mx-auto mb-2" />
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  Nenhum evento registrado
                </p>
              </div>
            ) : (
              roundKeys.map(key => {
                const [mapId, roundNum] = key.split("-").map(Number);
                const events = roundGroups.get(key)!;
                return (
                  <div key={key} className="border-b border-orbital-border/30 last:border-0">
                    {/* Round header */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0d]">
                      <Flag size={10} className="text-orbital-purple/60" />
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple/80">
                        ROUND {roundNum}
                      </span>
                      {mapStats.length > 1 && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim">
                          {mapName(mapId)}
                        </span>
                      )}
                    </div>
                    {/* Events in this round */}
                    <div>
                      {events.map((entry, idx) => {
                        if (entry.type === "kill") {
                          const k = entry.data;
                          const badges: string[] = [];
                          if (k.headshot) badges.push("HS");
                          if (k.no_scope) badges.push("NS");
                          if (k.thru_smoke) badges.push("SM");
                          if (k.attacker_blind) badges.push("FB");

                          return (
                            <div key={`k-${k.id}`} className={`flex items-center gap-1.5 px-3 py-1 text-[0.6rem] font-[family-name:var(--font-jetbrains)] hover:bg-white/[0.02] ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                              {/* Attacker */}
                              <span className={`${sideColor(k.attacker_side)} font-medium truncate max-w-[100px] sm:max-w-[140px]`} title={k.attacker_name}>
                                {k.attacker_name}
                              </span>

                              {/* Assist */}
                              {k.assister_name && (
                                <>
                                  <span className="text-orbital-text-dim">+</span>
                                  <span className={`${sideColor(k.assister_side || k.attacker_side)} truncate max-w-[80px] opacity-70`} title={k.assister_name}>
                                    {k.flash_assist ? "⚡" : ""}{k.assister_name}
                                  </span>
                                </>
                              )}

                              {/* Weapon + badges */}
                              <span className="flex items-center gap-0.5 mx-1">
                                <Crosshair size={9} className="text-orbital-text-dim shrink-0" />
                                <span className="text-[0.5rem] text-orbital-text-dim whitespace-nowrap">
                                  {getWeaponName(k.weapon)}
                                </span>
                                {badges.map(b => (
                                  <span key={b} className={`text-[0.4rem] px-0.5 font-bold ${
                                    b === "HS" ? "text-orbital-danger" : "text-orbital-warning"
                                  }`}>
                                    {b}
                                  </span>
                                ))}
                              </span>

                              {/* Victim */}
                              <span className={`${sideColor(k.player_side)} truncate max-w-[100px] sm:max-w-[140px]`} title={k.player_name}>
                                {k.player_name}
                              </span>
                            </div>
                          );
                        }

                        if (entry.type === "bomb_plant") {
                          const b = entry.data;
                          return (
                            <div key={`bp-${b.id}`} className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-[family-name:var(--font-jetbrains)] ${sideBg("T")}`}>
                              <span className="text-yellow-400">💣</span>
                              <span className="text-yellow-400 font-medium">{b.player_name}</span>
                              <span className="text-orbital-text-dim">plantou a bomba no</span>
                              <span className="text-yellow-400 font-bold">BOMB {b.site}</span>
                            </div>
                          );
                        }

                        if (entry.type === "bomb_defuse") {
                          const b = entry.data;
                          return (
                            <div key={`bd-${b.id}`} className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.6rem] font-[family-name:var(--font-jetbrains)] ${sideBg("CT")}`}>
                              <span className="text-blue-400">🔧</span>
                              <span className="text-blue-400 font-medium">{b.player_name}</span>
                              <span className="text-orbital-text-dim">desarmou a bomba</span>
                              {b.bomb_time_remaining != null && (
                                <span className="text-orbital-danger text-[0.5rem]">
                                  ({(b.bomb_time_remaining / 1000).toFixed(1)}s restantes)
                                </span>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          <div className="px-3 py-2 border-t border-orbital-border/50 bg-[#0d0d0d] flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
              {filteredKills.length} kills • {filteredBombs.filter(b => !b.defused).length} plants • {filteredBombs.filter(b => b.defused).length} defuses
            </span>
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
              {roundKeys.length} rounds
            </span>
          </div>
        </div>
      )}
    </motion.section>
  );
}

// ── Info Item ──
function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim mb-1">{label}</div>
      <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">{value}</div>
    </div>
  );
}

// Calculate HLTV-style rating when not provided by API
function calcRating(p: PlayerStats): number {
  if (p.rating && p.rating > 0) return p.rating;
  const rounds = p.roundsplayed || 1;
  const AverageKPR = 0.679;
  const AverageSPR = 0.317;
  const AverageRMK = 1.277;
  const KillRating = p.kills / rounds / AverageKPR;
  const SurvivalRating = (rounds - p.deaths) / rounds / AverageSPR;
  const killcount = (p.k1 || 0) + 4 * (p.k2 || 0) + 9 * (p.k3 || 0) + 16 * (p.k4 || 0) + 25 * (p.k5 || 0);
  const RoundsWithMultipleKillsRating = killcount / rounds / AverageRMK;
  return (KillRating + 0.7 * SurvivalRating + RoundsWithMultipleKillsRating) / 2.7;
}

// ── Player Stats Table (HLTV-inspired) ──
function PlayerStatsTable({ teamName, teamLogo, stats, isWinner, delay }: {
  teamName: string;
  teamLogo: string | null;
  stats: PlayerStats[];
  isWinner: boolean;
  delay: number;
}) {
  const sorted = [...stats].sort((a, b) => calcRating(b) - calcRating(a));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className={`bg-orbital-card border overflow-hidden ${
        isWinner ? "border-orbital-success/20" : "border-orbital-border"
      }`}>
        {/* Team header bar */}
        <div className={`px-4 py-3 flex items-center gap-3 ${
          isWinner ? "bg-orbital-success/5 border-b border-orbital-success/15" : "bg-[#0d0d0d] border-b border-orbital-border"
        }`}>
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-6 h-6 object-contain" />
          ) : (
            <Shield size={16} className="text-orbital-text-dim" />
          )}
          <span className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider font-bold ${
            isWinner ? "text-orbital-success" : "text-orbital-text"
          }`}>
            {teamName}
          </span>
          {isWinner && (
            <Trophy size={12} className="text-orbital-success" />
          )}
        </div>

        {/* Stats table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-orbital-border/50">
                <th className="text-left px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">Jogador</th>
                <th className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">K-D</th>
                <th className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">
                  <span className="hidden sm:inline">+/-</span>
                  <span className="sm:hidden">±</span>
                </th>
                <th className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">ADR</th>
                <th className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">
                  <Crosshair size={10} className="inline" /> HS%
                </th>
                <th className="text-center px-3 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim font-normal tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const hsp = player.kills > 0 ? Math.round((player.headshot_kills / player.kills) * 100) : 0;
                const adr = player.roundsplayed > 0 ? Math.round(player.damage / player.roundsplayed) : 0;
                const diff = player.kills - player.deaths;
                const rating = calcRating(player);
                const isMvp = idx === 0;
                const adrPercent = Math.min(adr / 120 * 100, 100); // 120 ADR = 100%
                const hspPercent = Math.min(hsp, 100);

                return (
                  <tr key={player.id} className={`border-b border-orbital-border/20 transition-colors hover:bg-white/[0.02] ${
                    isMvp ? "bg-orbital-purple/[0.04]" : ""
                  }`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isMvp && <span className="text-[0.45rem] text-yellow-400/80">★</span>}
                        <Link
                          href={`/perfil/${player.steam_id}`}
                          className={`font-[family-name:var(--font-jetbrains)] text-[0.7rem] hover:text-orbital-purple transition-colors font-medium ${
                            isMvp ? "text-orbital-text font-bold" : "text-orbital-text"
                          }`}
                        >
                          {player.name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">
                      <span className="text-orbital-success">{player.kills}</span>
                      <span className="text-orbital-text-dim">-</span>
                      <span className="text-orbital-danger">{player.deaths}</span>
                    </td>
                    <td className={`text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] font-medium ${
                      diff > 0 ? "text-orbital-success" : diff < 0 ? "text-orbital-danger" : "text-orbital-text-dim"
                    }`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="relative flex items-center justify-center h-6">
                        <div className="absolute inset-0 bg-white/[0.03] rounded-sm overflow-hidden">
                          <div className={`h-full rounded-sm transition-all ${adr >= 80 ? "bg-orbital-success/25" : adr >= 50 ? "bg-orbital-purple/25" : "bg-orbital-danger/20"}`} style={{ width: `${adrPercent}%` }} />
                        </div>
                        <span className="relative font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">{adr}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="relative flex items-center justify-center h-6">
                        <div className="absolute inset-0 bg-white/[0.03] rounded-sm overflow-hidden">
                          <div className={`h-full rounded-sm transition-all ${hsp >= 60 ? "bg-orbital-success/25" : hsp >= 30 ? "bg-orbital-purple/25" : "bg-orbital-danger/20"}`} style={{ width: `${hspPercent}%` }} />
                        </div>
                        <span className="relative font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">{hsp}%</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className={`font-[family-name:var(--font-jetbrains)] text-[0.75rem] font-bold px-2 py-0.5 ${
                        rating >= 1.2 ? "text-orbital-success bg-orbital-success/10" :
                        rating >= 1.0 ? "text-orbital-text" :
                        rating >= 0.8 ? "text-orbital-warning" :
                        "text-orbital-danger bg-orbital-danger/10"
                      }`} style={rating >= 1.2 ? { textShadow: "0 0 8px rgba(34,197,94,0.3)" } : rating < 0.8 ? { textShadow: "0 0 8px rgba(239,68,68,0.3)" } : undefined}>
                        {rating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ── Admin Actions (unchanged logic) ──
function AdminActions({ match, isActive, team1, team2, adminAction, setAdminAction, onUpdate }: {
  match: Match;
  isActive: boolean;
  team1: Team | null;
  team2: Team | null;
  adminAction: boolean;
  setAdminAction: (v: boolean) => void;
  onUpdate: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<"none" | "rcon" | "addplayer" | "backups">("none");
  const [rconCmd, setRconCmd] = useState("");
  const [rconResponse, setRconResponse] = useState("");
  const [playerSteamId, setPlayerSteamId] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");
  const [playerTeam, setPlayerTeam] = useState("team1");
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupsError, setBackupsError] = useState("");

  const inputClass = "w-full bg-orbital-bg border border-orbital-border px-3 py-1.5 text-[0.65rem] font-[family-name:var(--font-jetbrains)] text-orbital-text focus:border-orbital-purple/60 outline-none";

  const runAction = async (fn: () => Promise<void>) => {
    setMenuOpen(false);
    setAdminAction(true);
    try { await fn(); } catch { }
    setAdminAction(false);
  };

  const sectionLabel = (text: string) => (
    <div className="px-3 pt-3 pb-1.5 first:pt-2">
      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple/60 uppercase">{text}</span>
    </div>
  );

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, color = "text-orbital-text-dim hover:text-orbital-text") => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors font-[family-name:var(--font-jetbrains)] text-[0.65rem] ${color} text-left group`}
    >
      <span className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>
      {label}
    </button>
  );

  const handleCancel = () => runAction(async () => {
    if (!confirm(`Cancelar partida #${match.id}?`)) return;
    await updateMatch({ match_id: match.id, cancelled: true });
    await onUpdate();
  });

  const handleForfeit = (winnerId: number) => {
    const name = winnerId === match.team1_id ? (team1?.name || match.team1_string) : (team2?.name || match.team2_string);
    runAction(async () => {
      if (!confirm(`Dar W.O. para "${name}"?`)) return;
      await updateMatch({ match_id: match.id, forfeit: true, winner: winnerId });
      await onUpdate();
    });
  };

  const handleDelete = () => runAction(async () => {
    if (!match.cancelled && !match.end_time) { alert("Cancele a partida antes de deletar."); return; }
    if (!confirm(`Deletar partida #${match.id}? Irreversível.`)) return;
    await deleteMatch(match.id);
    window.location.href = "/partidas";
  });

  const handlePause = () => runAction(async () => { await pauseMatch(match.id); });
  const handleUnpause = () => runAction(async () => { await unpauseMatch(match.id); });

  const handleRestart = () => runAction(async () => {
    if (!confirm("Reiniciar a partida atual?")) return;
    await restartMatch(match.id);
    await onUpdate();
  });

  const openPanel = (p: "rcon" | "addplayer" | "backups") => {
    setMenuOpen(false);
    setPanel(panel === p ? "none" : p);
    if (p === "backups" && panel !== "backups") {
      setBackupsLoading(true);
      setBackups([]);
      setBackupsError("");
      getMatchBackups(match.id)
        .then(b => {
          setBackups(Array.isArray(b) ? b : []);
          if (!b || b.length === 0) setBackupsError("Servidor não retornou backups. Verifique se a partida está ativa.");
        })
        .catch((e) => { setBackups([]); setBackupsError(String(e)); })
        .finally(() => setBackupsLoading(false));
    }
  };

  const handleAddPlayer = async () => {
    if (!playerSteamId || !playerNickname) { alert("Preencha Steam ID e Nickname"); return; }
    setAdminAction(true);
    try {
      await addPlayerToMatch(match.id, playerSteamId, playerNickname, playerTeam);
      setPlayerSteamId(""); setPlayerNickname("");
      setPanel("none");
      alert("Jogador adicionado!");
    } catch { alert("Erro ao adicionar jogador"); }
    setAdminAction(false);
  };

  const handleRestoreBackup = async (file: string) => {
    if (!confirm(`Restaurar backup "${file}"?`)) return;
    setAdminAction(true);
    try {
      await restoreMatchBackup(match.id, file);
      await onUpdate();
    } catch { alert("Erro ao restaurar backup"); }
    setAdminAction(false);
  };

  const handleRcon = async () => {
    if (!rconCmd.trim()) return;
    setAdminAction(true);
    try {
      const res = await sendMatchRcon(match.id, rconCmd);
      setRconResponse(res.response || "OK");
      setRconCmd("");
    } catch { setRconResponse("Erro ao enviar comando"); }
    setAdminAction(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
      <div className="relative inline-block">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={adminAction}
          className="flex items-center gap-2 px-4 py-2 bg-orbital-purple hover:bg-orbital-purple/80 transition-colors font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider text-white disabled:opacity-50"
        >
          {adminAction ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          ADMIN ACTIONS
          <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-50 w-60 bg-[#111113] border border-orbital-border/60 shadow-2xl shadow-black/60 rounded-sm overflow-hidden">
              {isActive && (
                <>
                  {sectionLabel("Controle")}
                  {menuItem(<Pause size={13} />, "Pausar partida", handlePause)}
                  {menuItem(<Play size={13} />, "Despausar partida", handleUnpause)}
                  {menuItem(<RotateCcw size={13} />, "Reiniciar partida", handleRestart, "text-orange-400/70 hover:text-orange-400")}

                  {sectionLabel("Gerenciar")}
                  {menuItem(<UserPlus size={13} />, "Adicionar jogador", () => openPanel("addplayer"))}
                  {menuItem(<Archive size={13} />, "Listar backups", () => openPanel("backups"))}
                  {menuItem(<Terminal size={13} />, "Comando RCON", () => openPanel("rcon"))}

                  {sectionLabel("Encerrar")}
                  {menuItem(<Ban size={13} />, "Cancelar partida", handleCancel, "text-orange-400/70 hover:text-orange-400")}
                  {menuItem(<Flag size={13} />, `W.O. ${(team1?.name || match.team1_string || "Time 1").substring(0, 18)}`, () => handleForfeit(match.team1_id))}
                  {menuItem(<Flag size={13} />, `W.O. ${(team2?.name || match.team2_string || "Time 2").substring(0, 18)}`, () => handleForfeit(match.team2_id))}
                </>
              )}
              {(match.cancelled || match.end_time) && (
                <>
                  {sectionLabel("Perigo")}
                  {menuItem(<Trash2 size={13} />, "Deletar partida", handleDelete, "text-red-400/70 hover:text-red-400")}
                </>
              )}
              <div className="h-1.5" />
            </div>
          </>
        )}
      </div>

      {panel === "addplayer" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 bg-orbital-card border border-orbital-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">ADICIONAR JOGADOR</span>
            <button onClick={() => setPanel("none")} className="text-orbital-text-dim hover:text-orbital-text text-xs">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[0.55rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)] mb-1">STEAM ID</label>
              <input value={playerSteamId} onChange={e => setPlayerSteamId(e.target.value)} placeholder="76561198..." className={inputClass} />
            </div>
            <div>
              <label className="block text-[0.55rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)] mb-1">NICKNAME</label>
              <input value={playerNickname} onChange={e => setPlayerNickname(e.target.value)} placeholder="Player" className={inputClass} />
            </div>
            <div>
              <label className="block text-[0.55rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)] mb-1">TIME</label>
              <select value={playerTeam} onChange={e => setPlayerTeam(e.target.value)} className={inputClass}>
                <option value="team1">{team1?.name || "Time 1"}</option>
                <option value="team2">{team2?.name || "Time 2"}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleAddPlayer} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orbital-purple/20 border border-orbital-purple/40 hover:border-orbital-purple transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple">
                <Send size={12} /> Adicionar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {panel === "backups" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 bg-orbital-card border border-orbital-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">BACKUPS</span>
            <button onClick={() => setPanel("none")} className="text-orbital-text-dim hover:text-orbital-text text-xs">✕</button>
          </div>
          {backupsLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-orbital-purple" />
              <span className="text-[0.65rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)]">Buscando backups...</span>
            </div>
          ) : backups.length === 0 ? (
            <span className="text-[0.65rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)]">{backupsError || "Nenhum backup encontrado"}</span>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {backups.map((b, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-orbital-bg/50 border border-orbital-border/30">
                  <span className="text-[0.6rem] text-orbital-text font-[family-name:var(--font-jetbrains)] truncate">{b.label}</span>
                  <button onClick={() => handleRestoreBackup(b.filename)} className="shrink-0 px-2 py-1 text-[0.55rem] text-orbital-purple hover:bg-orbital-purple/10 border border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)]">
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {panel === "rcon" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 bg-orbital-card border border-orbital-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple">RCON CONSOLE</span>
            <button onClick={() => setPanel("none")} className="text-orbital-text-dim hover:text-orbital-text text-xs">✕</button>
          </div>
          <div className="flex gap-2">
            <input
              value={rconCmd}
              onChange={e => setRconCmd(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRcon()}
              placeholder="Comando RCON..."
              className={`${inputClass} flex-1`}
            />
            <button onClick={handleRcon} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/20 border border-orbital-purple/40 hover:border-orbital-purple transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple">
              <Send size={12} /> Enviar
            </button>
          </div>
          {rconResponse && (
            <pre className="text-[0.6rem] text-orbital-text font-[family-name:var(--font-jetbrains)] bg-orbital-bg border border-orbital-border/50 p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {rconResponse}
            </pre>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function ClipPlayer({ src, clipId }: { src: string; clipId: number }) {
  const [playing, setPlaying] = useState(false);
  const [thumbReady, setThumbReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTime = 12 + (clipId % 5);

  useEffect(() => {
    if (playing) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const onLoadedData = () => {
      if (cancelled) return;
      video.currentTime = Math.min(seekTime, video.duration * 0.5);
    };

    const onSeeked = () => {
      if (cancelled) return;
      setThumbReady(true);
    };

    if (video.readyState >= 2) {
      video.currentTime = Math.min(seekTime, video.duration * 0.5);
    }

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [playing, src, seekTime]);

  if (playing) {
    return (
      <video controls autoPlay className="w-full aspect-video bg-black">
        <source src={src} type="video/mp4" />
      </video>
    );
  }

  return (
    <div
      onClick={() => setPlaying(true)}
      className="relative w-full aspect-video bg-black group/play cursor-pointer overflow-hidden"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover pointer-events-none ${thumbReady ? "" : "opacity-0"}`}
        src={`${src}#t=${seekTime}`}
      />
      {!thumbReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="text-orbital-purple/40 animate-spin" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/play:bg-black/10 transition-colors">
        <div className="w-12 h-12 rounded-full bg-orbital-purple/80 flex items-center justify-center group-hover/play:bg-orbital-purple group-hover/play:scale-110 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <Play size={20} className="text-white ml-0.5" fill="white" />
        </div>
      </div>
    </div>
  );
}
