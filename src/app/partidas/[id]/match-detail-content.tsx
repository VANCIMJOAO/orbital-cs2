"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Radio, Map, Users, Target, Skull, Crosshair, RefreshCw, Download, Ban, Flag, Trash2, Loader2, Pause, Play, RotateCcw, UserPlus, Archive, Terminal, Send, ChevronDown, Settings, Shield, Clock, Calendar, Trophy, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HudCard } from "@/components/hud-card";
import { Match, PlayerStats, MapStats, Team, Server, VetoEntry, getStatusText, getStatusType, updateMatch, deleteMatch, pauseMatch, unpauseMatch, restartMatch, addPlayerToMatch, getMatchBackups, restoreMatchBackup, sendMatchRcon } from "@/lib/api";
import { BracketMatch } from "@/lib/tournament";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback } from "react";

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

interface AllstarClip {
  id: number;
  match_id: number;
  map_number: number;
  request_id: string | null;
  clip_id: string | null;
  clip_url: string | null;
  clip_title: string | null;
  clip_thumbnail: string | null;
  steam_id: string | null;
  status: "pending" | "submitted" | "processed" | "error";
  error_message: string | null;
  use_case: string;
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
  const [allstarClips, setAllstarClips] = useState<AllstarClip[]>([]);
  const [allstarLoading, setAllstarLoading] = useState(false);
  const [allstarSubmitting, setAllstarSubmitting] = useState(false);
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

  // Fetch Allstar clips
  const fetchAllstarClips = useCallback(async () => {
    try {
      setAllstarLoading(true);
      const res = await fetch(`/api/allstar/clips?matchId=${match.id}`);
      const data = await res.json();
      if (data.clips) setAllstarClips(data.clips);
    } catch { /* ignore */ }
    setAllstarLoading(false);
  }, [match.id]);

  useEffect(() => { fetchAllstarClips(); }, [fetchAllstarClips]);

  const submitToAllstar = async (mapNumber: number, demoFile: string) => {
    setAllstarSubmitting(true);
    try {
      const res = await fetch("/api/allstar/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, mapNumber, demoFile }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAllstarClips();
      } else {
        alert(data.error || "Erro ao enviar para Allstar");
      }
    } catch {
      alert("Erro de conexão com Allstar");
    }
    setAllstarSubmitting(false);
  };

  // Stats per team (filtered by active tab / map)
  const filteredStats = activeTab === "all"
    ? playerStats
    : playerStats.filter(s => s.map_id === activeTab);
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
                <div className="flex items-center justify-center gap-3">
                  <span className={`font-[family-name:var(--font-jetbrains)] text-5xl sm:text-6xl font-black ${
                    match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                  }`}>
                    {overallScore1}
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    {isLive && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orbital-live/15 border border-orbital-live/30">
                        <Radio size={10} className="text-orbital-live animate-pulse-live" />
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-live">LIVE</span>
                      </span>
                    )}
                    {!isLive && (
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] ${
                        isFinished ? "text-orbital-text-dim" : "text-orbital-warning"
                      }`}>
                        {statusText}
                      </span>
                    )}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                      BO{match.max_maps || match.num_maps || 1}
                    </span>
                  </div>
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

      {/* ═══ VETO HISTORY ═══ */}
      {(() => {
        // Use G5API vetoes first, fallback to bracket match veto_actions
        const vetoList = vetoes.length > 0
          ? vetoes.map(v => ({ team_name: v.team_name, action: v.pick_or_ban as "ban" | "pick", map: v.map, id: v.id }))
          : (bracketMatch?.veto_actions || []).map((v, i) => ({ team_name: v.team_name, action: v.action, map: v.map, id: i }));

        // For BO1 with 6 bans, the 7th map is left over — add it
        const leftoverMap = bracketMatch?.map && vetoList.length > 0 && !vetoList.some(v => v.action === "pick")
          ? bracketMatch.map
          : null;

        if (vetoList.length === 0) return null;

        return (
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Ban size={14} className="text-orbital-purple" />
              <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">VETO</h3>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
            </div>
            <div className="bg-orbital-card border border-orbital-border p-4">
              <div className="space-y-1.5">
                {vetoList.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 py-1.5">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right">{i + 1}.</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text min-w-[80px]">{v.team_name}</span>
                    <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.1em] px-2 py-0.5 border ${
                      v.action === "ban"
                        ? "text-orbital-danger bg-orbital-danger/5 border-orbital-danger/20"
                        : "text-orbital-success bg-orbital-success/5 border-orbital-success/20"
                    }`}>
                      {v.action === "ban" ? "REMOVEU" : "ESCOLHEU"}
                    </span>
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-text font-bold">
                      {v.map.replace("de_", "").toUpperCase()}
                    </span>
                  </div>
                ))}
                {leftoverMap && (
                  <div className="flex items-center gap-3 py-1.5">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim w-4 text-right">{vetoList.length + 1}.</span>
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple font-bold">
                      {leftoverMap.replace("de_", "").toUpperCase()}
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">restou</span>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        );
      })()}

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

      {/* ═══ ALLSTAR HIGHLIGHTS ═══ */}
      {isFinished && mapStats.some(ms => ms.demoFile) && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <Film size={14} className="text-orbital-purple" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">HIGHLIGHTS</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-orbital-purple/30 to-transparent" />
          </div>

          {allstarLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-orbital-purple animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Processed clips — show iframe */}
              {allstarClips.filter(c => c.status === "processed" && c.clip_id).map(clip => (
                <div key={clip.id} className="bg-orbital-card border border-orbital-border overflow-hidden">
                  <div className="p-3 border-b border-orbital-border flex items-center justify-between">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text">
                      {clip.clip_title || "Play of the Game"}
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-success bg-orbital-success/10 px-2 py-0.5">
                      PRONTO
                    </span>
                  </div>
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={`https://allstar.gg/iframe?clip=${clip.clip_id}&known=true&platform=ORBITALROXA&useCase=${clip.use_case}&autoplay=false&location=matchResults`}
                      allow="clipboard-write"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              ))}

              {/* Pending/submitted clips — show status */}
              {allstarClips.filter(c => c.status === "pending" || c.status === "submitted").map(clip => (
                <HudCard key={clip.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 size={14} className="text-orbital-purple animate-spin" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                      {clip.status === "pending" ? "Enviando demo para Allstar..." : "Processando highlight..."}
                    </span>
                  </div>
                  <button
                    onClick={fetchAllstarClips}
                    className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple hover:text-orbital-text transition-colors"
                  >
                    <RefreshCw size={12} />
                  </button>
                </HudCard>
              ))}

              {/* Error clips */}
              {allstarClips.filter(c => c.status === "error").map(clip => (
                <HudCard key={clip.id} className="p-4 border-orbital-danger/30">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-danger">
                      Erro: {clip.error_message || "Falha ao gerar highlight"}
                    </span>
                  </div>
                </HudCard>
              ))}

              {/* Admin: generate highlight button for maps without clips */}
              {isAdmin && mapStats.filter(ms => ms.demoFile && ms.end_time).map(ms => {
                const hasClip = allstarClips.some(c => c.map_number === ms.map_number);
                if (hasClip) return null;
                return (
                  <button
                    key={`gen-${ms.map_number}`}
                    onClick={() => submitToAllstar(ms.map_number, ms.demoFile!)}
                    disabled={allstarSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orbital-card border border-dashed border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/5 transition-all disabled:opacity-50"
                  >
                    {allstarSubmitting ? (
                      <Loader2 size={14} className="text-orbital-purple animate-spin" />
                    ) : (
                      <Sparkles size={14} className="text-orbital-purple" />
                    )}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple">
                      {allstarSubmitting ? "ENVIANDO..." : `GERAR HIGHLIGHT — ${ms.map_name?.replace("de_", "").toUpperCase() || `MAPA ${ms.map_number + 1}`}`}
                    </span>
                  </button>
                );
              })}

              {/* No clips yet and not admin */}
              {allstarClips.length === 0 && !isAdmin && (
                <HudCard className="text-center py-6">
                  <Film size={20} className="text-orbital-border mx-auto mb-2" />
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    Nenhum highlight disponível
                  </p>
                </HudCard>
              )}
            </div>
          )}
        </motion.section>
      )}
    </div>
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

                return (
                  <tr key={player.id} className={`border-b border-orbital-border/20 transition-colors hover:bg-white/[0.02] ${
                    idx === 0 ? "bg-orbital-purple/[0.03]" : ""
                  }`}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/perfil/${player.steam_id}`}
                        className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text hover:text-orbital-purple transition-colors font-medium"
                      >
                        {player.name}
                      </Link>
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
                    <td className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">
                      {adr}
                    </td>
                    <td className="text-center px-2 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">
                      {hsp}%
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className={`font-[family-name:var(--font-jetbrains)] text-[0.75rem] font-bold px-2 py-0.5 ${
                        rating >= 1.2 ? "text-orbital-success bg-orbital-success/10" :
                        rating >= 1.0 ? "text-orbital-text" :
                        rating >= 0.8 ? "text-orbital-warning" :
                        "text-orbital-danger bg-orbital-danger/10"
                      }`}>
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
  const [backups, setBackups] = useState<string[]>([]);

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
      getMatchBackups(match.id).then(b => setBackups(Array.isArray(b) ? b : [])).catch(() => setBackups([]));
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
          {backups.length === 0 ? (
            <span className="text-[0.65rem] text-orbital-text-dim font-[family-name:var(--font-jetbrains)]">Nenhum backup encontrado</span>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {backups.map((b, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-orbital-bg/50 border border-orbital-border/30">
                  <span className="text-[0.6rem] text-orbital-text font-[family-name:var(--font-jetbrains)] truncate">{b}</span>
                  <button onClick={() => handleRestoreBackup(b)} className="shrink-0 px-2 py-1 text-[0.55rem] text-orbital-purple hover:bg-orbital-purple/10 border border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)]">
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
