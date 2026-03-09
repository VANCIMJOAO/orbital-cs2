"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Radio, Map, Users, Target, Skull, Crosshair, RefreshCw, Download, Ban, Flag, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HudCard } from "@/components/hud-card";
import { Match, PlayerStats, MapStats, Team, getStatusText, getStatusType, updateMatch, deleteMatch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback } from "react";

interface Props {
  match: Match;
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  team1: Team | null;
  team2: Team | null;
}

export function MatchDetailContent({ match: initialMatch, playerStats: initialStats, mapStats: initialMapStats, team1, team2 }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [playerStats, setPlayerStats] = useState(initialStats || []);
  const [mapStats, setMapStats] = useState(initialMapStats || []);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [adminAction, setAdminAction] = useState(false);
  const { isAdmin } = useAuth();
  const router = useRouter();
  const statusType = getStatusType(match);
  const statusText = getStatusText(match);
  const isLive = statusType === "live";
  const isActive = statusType === "live" || statusType === "upcoming";

  // Calcular score ao vivo a partir do mapstats (mais preciso que match.team1_score)
  const currentMap = mapStats.length > 0 ? mapStats[mapStats.length - 1] : null;
  const liveScore1 = currentMap ? currentMap.team1_score : match.team1_score;
  const liveScore2 = currentMap ? currentMap.team2_score : match.team2_score;

  // Polling para atualizar dados ao vivo
  const fetchLiveData = useCallback(async () => {
    try {
      const [matchRes, statsRes, mapRes] = await Promise.all([
        fetch(`/api/matches/${match.id}`).then(r => r.json()),
        fetch(`/api/playerstats/match/${match.id}`).then(r => r.json()).catch(() => ({ playerstats: [] })),
        fetch(`/api/mapstats/${match.id}`).then(r => r.json()).catch(() => ({ mapstats: [] })),
      ]);
      if (matchRes.match) setMatch(matchRes.match);
      const stats = matchRes.playerstats || statsRes.playerstats || statsRes.playerStats || [];
      if (stats.length > 0) setPlayerStats(stats);
      const maps = mapRes.mapstats || mapRes.mapStats || [];
      if (maps.length > 0) setMapStats(maps);
      setLastUpdate(new Date());
    } catch {
      // silently fail
    }
  }, [match.id]);

  useEffect(() => {
    if (!isLive) return;

    // Polling a cada 10 segundos para partidas ao vivo
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, [isLive, fetchLiveData]);

  // Separar stats por time
  const team1Stats = playerStats.filter((s) => s.team_id === match.team1_id);
  const team2Stats = playerStats.filter((s) => s.team_id === match.team2_id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 flex items-center justify-between">
        <Link href="/partidas" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} />
          Voltar
        </Link>
        {isLive && (
          <button
            onClick={fetchLiveData}
            className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-[0.6rem]"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        )}
      </motion.div>

      {/* Scoreboard Hero */}
      <HudCard glow={isLive} className="mb-6" label={isLive ? "LIVE" : `PARTIDA #${match.id}`}>
        <div className="py-4">
          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {isLive && <Radio size={14} className="text-orbital-live animate-pulse-live" />}
            <span className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] uppercase ${
              isLive ? "text-orbital-live" : "text-orbital-text-dim"
            }`}>
              {statusText}
            </span>
            {isLive && currentMap && (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim ml-2">
                {currentMap.map_name.replace("de_", "").toUpperCase()}
              </span>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center justify-center gap-6 sm:gap-12">
            <div className="flex-1 text-right">
              <h2 className={`font-[family-name:var(--font-orbitron)] text-lg sm:text-2xl font-bold tracking-wider ${
                match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
              }`}>
                {match.team1_string || team1?.name || `Time ${match.team1_id}`}
              </h2>
              {team1?.tag && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  [{team1.tag}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className={`font-[family-name:var(--font-jetbrains)] text-4xl sm:text-5xl font-bold ${
                match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
              }`}>
                {liveScore1}
              </span>
              <div className="flex flex-col items-center">
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-purple tracking-widest">VS</span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                  BO{match.max_maps || match.num_maps || 1}
                </span>
              </div>
              <span className={`font-[family-name:var(--font-jetbrains)] text-4xl sm:text-5xl font-bold ${
                match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
              }`}>
                {liveScore2}
              </span>
            </div>

            <div className="flex-1 text-left">
              <h2 className={`font-[family-name:var(--font-orbitron)] text-lg sm:text-2xl font-bold tracking-wider ${
                match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
              }`}>
                {match.team2_string || team2?.name || `Time ${match.team2_id}`}
              </h2>
              {team2?.tag && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  [{team2.tag}]
                </span>
              )}
            </div>
          </div>

          {/* Live update info */}
          {isLive && (
            <div className="text-center mt-4">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")}
              </span>
            </div>
          )}
        </div>
      </HudCard>

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

      {/* Map Stats */}
      {mapStats.length > 0 && (
        <div className={`grid grid-cols-1 ${mapStats.length > 1 ? "sm:grid-cols-" + Math.min(mapStats.length, 3) : ""} gap-4 mb-6`}>
          {mapStats.map((ms, i) => (
            <HudCard key={ms.id} delay={i * 0.1} label={`MAPA ${ms.map_number + 1}`}>
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Map size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">
                    {ms.map_name.replace("de_", "").toUpperCase()}
                  </span>
                  {!ms.end_time && isLive && (
                    <span className="status-dot status-live ml-1" />
                  )}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold">
                  <span className={ms.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"}>
                    {ms.team1_score}
                  </span>
                  <span className="text-orbital-text-dim mx-2">:</span>
                  <span className={ms.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"}>
                    {ms.team2_score}
                  </span>
                </div>
                {ms.demoFile && ms.end_time && (
                  <a
                    href={`/api/demo/${ms.demoFile}`}
                    download
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple"
                  >
                    <Download size={11} />
                    DOWNLOAD DEMO
                  </a>
                )}
              </div>
            </HudCard>
          ))}
        </div>
      )}

      {/* Player Stats */}
      {(team1Stats.length > 0 || team2Stats.length > 0) && (
        <div className="space-y-6">
          {team1Stats.length > 0 && (
            <PlayerStatsTable
              teamName={match.team1_string || team1?.name || "Time 1"}
              stats={team1Stats}
              isWinner={match.winner === match.team1_id}
              delay={0.2}
            />
          )}
          {team2Stats.length > 0 && (
            <PlayerStatsTable
              teamName={match.team2_string || team2?.name || "Time 2"}
              stats={team2Stats}
              isWinner={match.winner === match.team2_id}
              delay={0.3}
            />
          )}
        </div>
      )}

      {playerStats.length === 0 && (
        <HudCard className="text-center py-8">
          <Users size={24} className="text-orbital-border mx-auto mb-3" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            {isLive ? "Aguardando dados dos jogadores..." : "Sem estatísticas disponíveis"}
          </p>
        </HudCard>
      )}
    </div>
  );
}

function PlayerStatsTable({ teamName, stats, isWinner, delay }: {
  teamName: string;
  stats: PlayerStats[];
  isWinner: boolean;
  delay: number;
}) {
  const sorted = [...stats].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="bg-orbital-card border border-orbital-border overflow-hidden">
        {/* Team header */}
        <div className={`px-4 py-3 border-b border-orbital-border flex items-center gap-3 ${
          isWinner ? "border-l-2 border-l-orbital-success" : ""
        }`}>
          <Users size={14} className="text-orbital-purple" />
          <span className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider ${
            isWinner ? "text-orbital-success" : "text-orbital-text"
          }`}>
            {teamName}
            {isWinner && " ★"}
          </span>
        </div>

        {/* Stats table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th><Target size={10} className="inline" /> K</th>
                <th><Skull size={10} className="inline" /> D</th>
                <th>A</th>
                <th>ADR</th>
                <th><Crosshair size={10} className="inline" /> HS%</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player) => {
                const hsp = player.kills > 0 ? Math.round((player.headshot_kills / player.kills) * 100) : 0;
                const adr = player.roundsplayed > 0 ? Math.round(player.damage / player.roundsplayed) : 0;
                return (
                  <tr key={player.id}>
                    <td className="font-semibold">{player.name}</td>
                    <td className="text-orbital-success">{player.kills}</td>
                    <td className="text-orbital-danger">{player.deaths}</td>
                    <td>{player.assists}</td>
                    <td>{adr}</td>
                    <td>{hsp}%</td>
                    <td>
                      <span className={`font-bold ${
                        (player.rating || 0) >= 1.2 ? "text-orbital-success" :
                        (player.rating || 0) >= 0.8 ? "text-orbital-text" :
                        "text-orbital-danger"
                      }`}>
                        {(player.rating || 0).toFixed(2)}
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

function AdminActions({ match, isActive, team1, team2, adminAction, setAdminAction, onUpdate }: {
  match: Match;
  isActive: boolean;
  team1: Team | null;
  team2: Team | null;
  adminAction: boolean;
  setAdminAction: (v: boolean) => void;
  onUpdate: () => Promise<void>;
}) {
  const handleCancel = async () => {
    if (!confirm(`Cancelar partida #${match.id}?`)) return;
    setAdminAction(true);
    try {
      await updateMatch({ match_id: match.id, cancelled: true });
      await onUpdate();
    } catch { alert("Erro ao cancelar partida"); }
    setAdminAction(false);
  };

  const handleForfeit = async (winnerId: number) => {
    const name = winnerId === match.team1_id ? (team1?.name || match.team1_string) : (team2?.name || match.team2_string);
    if (!confirm(`Dar W.O. para "${name}"?`)) return;
    setAdminAction(true);
    try {
      await updateMatch({ match_id: match.id, forfeit: true, winner: winnerId });
      await onUpdate();
    } catch { alert("Erro ao aplicar forfeit"); }
    setAdminAction(false);
  };

  const handleDelete = async () => {
    if (!match.cancelled && !match.end_time) {
      alert("Cancele a partida antes de deletar.");
      return;
    }
    if (!confirm(`Deletar partida #${match.id}? Irreversível.`)) return;
    setAdminAction(true);
    try {
      await deleteMatch(match.id);
      window.location.href = "/partidas";
    } catch { alert("Erro ao deletar partida"); setAdminAction(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <div className="bg-orbital-card border border-orbital-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-warning">ADMIN</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminAction ? (
            <Loader2 size={16} className="animate-spin text-orbital-text-dim" />
          ) : (
            <>
              {isActive && (
                <>
                  <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-warning/10 border border-orbital-warning/30 hover:border-orbital-warning/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-warning">
                    <Ban size={12} /> Cancelar
                  </button>
                  <button onClick={() => handleForfeit(match.team1_id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-success/10 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-success">
                    <Flag size={12} /> W.O. {team1?.name || match.team1_string || "Time 1"}
                  </button>
                  <button onClick={() => handleForfeit(match.team2_id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-success/10 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-success">
                    <Flag size={12} /> W.O. {team2?.name || match.team2_string || "Time 2"}
                  </button>
                </>
              )}
              {(match.cancelled || match.end_time) && (
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-danger/10 border border-orbital-danger/30 hover:border-orbital-danger/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-danger">
                  <Trash2 size={12} /> Deletar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
