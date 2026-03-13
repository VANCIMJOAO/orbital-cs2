"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Swords, X, Check, ArrowLeft, Loader2, Play, Pause, RotateCcw,
  ChevronDown, ChevronUp, Terminal, Shield, Radio, List, Gamepad2, Send,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  createMatch, getServers, Server, getMatch,
  pauseMatch, unpauseMatch, getMatchBackups, restoreMatchBackup, sendMatchRcon,
} from "@/lib/api";
import {
  Tournament, BracketMatch, advanceBracket, getTeamName, getNextPlayableMatch,
  getVetoSequence, getVetoTeamOrder, VetoAction,
} from "@/lib/tournament";

type Tab = "bracket" | "controls" | "veto" | "queue";

export function MissionControlContent({ initialTournament }: { initialTournament: Tournament }) {
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [activeTab, setActiveTab] = useState<Tab>("bracket");
  const [servers, setServers] = useState<Server[]>([]);

  // Veto state
  const [vetoMatch, setVetoMatch] = useState<BracketMatch | null>(null);
  const [selectedServer, setSelectedServer] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [vetoFirstTeam, setVetoFirstTeam] = useState<"team1" | "team2" | null>(null);

  // Live match controls state
  const [rconCommand, setRconCommand] = useState("");
  const [rconResponse, setRconResponse] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [controlLoading, setControlLoading] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<{ team1: number; team2: number } | null>(null);

  // Fetch tournament data (polling)
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      const t = (data.tournaments || []).find((t: Tournament) => t.id === tournament.id);
      if (t) setTournament(t);
    } catch { /* */ }
  }, [tournament.id]);

  useEffect(() => {
    const interval = setInterval(fetchTournament, 15000);
    return () => clearInterval(interval);
  }, [fetchTournament]);

  // Load servers
  useEffect(() => {
    if (isAdmin) {
      getServers().then(r => setServers(r.servers || [])).catch(() => {});
    }
  }, [isAdmin]);

  // Auto-advance: poll live G5API matches for completion
  useEffect(() => {
    if (tournament.status === "finished") return;
    const liveMatches = tournament.matches.filter(m => m.status === "live" && m.match_id);
    if (liveMatches.length === 0) return;

    const checkAutoAdvance = async () => {
      let changed = false;
      let updated = { ...tournament, matches: tournament.matches.map(m => ({ ...m })) };

      for (const bm of liveMatches) {
        try {
          const res = await fetch(`/api/matches/${bm.match_id}`);
          const data = await res.json();
          const g5match = data.match;

          // Update live score
          if (g5match && bm.match_id === currentLiveMatch?.match_id) {
            setLiveScore({ team1: g5match.team1_score || 0, team2: g5match.team2_score || 0 });
          }

          if (g5match && g5match.end_time && !bm.winner_id) {
            let winnerId = g5match.winner;
            if (!winnerId && g5match.team1_score !== g5match.team2_score) {
              winnerId = g5match.team1_score > g5match.team2_score ? g5match.team1_id : g5match.team2_id;
            }
            if (winnerId) {
              const tourTeam = updated.teams.find(t => t.id === winnerId);
              if (tourTeam) {
                updated = advanceBracket(updated, bm.id, tourTeam.id);
                changed = true;
              }
            }
          }
        } catch { /* */ }
      }

      if (changed) {
        await saveTournament(updated);
      }
    };

    const interval = setInterval(checkAutoAdvance, 10000);
    checkAutoAdvance();
    return () => clearInterval(interval);
  }, [tournament]);

  const saveTournament = async (t: Tournament) => {
    setTournament(t);
    await fetch("/api/tournaments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
  };

  // Current live match
  const currentLiveMatch = tournament.matches.find(m => m.status === "live" && m.match_id);
  const nextMatch = getNextPlayableMatch(tournament);

  // ===== VETO HANDLERS =====
  const openVeto = (match: BracketMatch) => {
    setVetoMatch({ ...match, veto_actions: [] });
    setVetoFirstTeam(null);
    setMatchError(null);
    setActiveTab("veto");
  };

  const handleVetoBan = async (map: string) => {
    if (!vetoMatch) return;
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
    if (!vetoMatch || !selectedServer) return;
    setActionLoading(true);
    setMatchError(null);

    try {
      const maplist = vetoMatch.num_maps === 1 ? [vetoMatch.map!] : vetoMatch.maps!;
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
      });

      const updatedMatch = { ...vetoMatch, match_id: result.match.id, status: "live" as const };
      const updatedTournament = {
        ...tournament,
        status: "active" as const,
        current_match_id: vetoMatch.id,
        matches: tournament.matches.map(m => m.id === vetoMatch.id ? updatedMatch : m),
      };
      await saveTournament(updatedTournament);
      setVetoMatch(null);
      setActiveTab("controls");
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Erro ao criar partida");
    }
    setActionLoading(false);
  };

  const handleResetVeto = async () => {
    if (!vetoMatch) return;
    if (!confirm("Resetar veto e voltar ao início?")) return;
    const resetMatch = { ...vetoMatch, veto_actions: [], map: null, maps: null, status: "pending" as const };
    const updatedTournament = {
      ...tournament,
      matches: tournament.matches.map(m => m.id === resetMatch.id ? resetMatch : m),
    };
    await saveTournament(updatedTournament);
    setVetoMatch(null);
    setMatchError(null);
  };

  // ===== LIVE MATCH CONTROL HANDLERS =====
  const handlePause = async () => {
    if (!currentLiveMatch?.match_id) return;
    setControlLoading("pause");
    try { await pauseMatch(currentLiveMatch.match_id); } catch { /* */ }
    setControlLoading(null);
  };

  const handleUnpause = async () => {
    if (!currentLiveMatch?.match_id) return;
    setControlLoading("unpause");
    try { await unpauseMatch(currentLiveMatch.match_id); } catch { /* */ }
    setControlLoading(null);
  };

  const handleLoadBackups = async () => {
    if (!currentLiveMatch?.match_id) return;
    setControlLoading("backups");
    try {
      const list = await getMatchBackups(currentLiveMatch.match_id);
      setBackups(list);
    } catch { setBackups([]); }
    setControlLoading(null);
  };

  const handleRestoreBackup = async (file: string) => {
    if (!currentLiveMatch?.match_id) return;
    if (!confirm(`Restaurar backup ${file}?`)) return;
    setControlLoading("restore");
    try { await restoreMatchBackup(currentLiveMatch.match_id, file); } catch { /* */ }
    setControlLoading(null);
  };

  const handleRcon = async () => {
    if (!currentLiveMatch?.match_id || !rconCommand.trim()) return;
    setControlLoading("rcon");
    try {
      const res = await sendMatchRcon(currentLiveMatch.match_id, rconCommand.trim());
      setRconResponse(res.response || "OK");
      setRconCommand("");
    } catch (err) {
      setRconResponse(err instanceof Error ? err.message : "Erro");
    }
    setControlLoading(null);
  };

  const handleSetWinner = async (matchId: string, winnerId: number) => {
    const teamName = getTeamName(tournament, winnerId);
    if (!confirm(`Confirmar ${teamName} como vencedor?`)) return;
    const updated = advanceBracket(tournament, matchId, winnerId);
    await saveTournament(updated);
  };

  // ===== RENDER =====
  const tabs: { id: Tab; label: string; icon: typeof Trophy; badge?: boolean }[] = [
    { id: "bracket", label: "BRACKET", icon: Trophy },
    { id: "controls", label: "CONTROLES", icon: Gamepad2, badge: !!currentLiveMatch },
    { id: "veto", label: "VETO", icon: Swords, badge: !!nextMatch },
    { id: "queue", label: "FILA", icon: List },
  ];

  const finishedCount = tournament.matches.filter(m => m.status === "finished").length;
  const totalCount = tournament.matches.length;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/campeonatos"
          className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-orbital-purple shrink-0" />
            <h1 className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-wider text-orbital-text truncate">
              MISSION CONTROL
            </h1>
          </div>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5 truncate">
            {tournament.name} — {finishedCount}/{totalCount} partidas
          </p>
        </div>
        <span className={`shrink-0 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider px-2 py-1 border ${
          tournament.status === "active" ? "text-orbital-live border-orbital-live/30 bg-orbital-live/5" :
          tournament.status === "finished" ? "text-orbital-success border-orbital-success/30" :
          "text-orbital-warning border-orbital-warning/30"
        }`}>
          {tournament.status === "active" ? "AO VIVO" : tournament.status === "finished" ? "FIM" : "PENDENTE"}
        </span>
      </div>

      {/* Live Match Banner */}
      {currentLiveMatch && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-orbital-live/5 border border-orbital-live/30 p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orbital-live animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-live">
              PARTIDA AO VIVO — {currentLiveMatch.label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
              {getTeamName(tournament, currentLiveMatch.team1_id)}
            </span>
            <div className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text px-4">
              {liveScore ? `${liveScore.team1} : ${liveScore.team2}` : "— : —"}
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text text-right">
              {getTeamName(tournament, currentLiveMatch.team2_id)}
            </span>
          </div>
          {currentLiveMatch.map && (
            <div className="text-center mt-1">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple">
                {currentLiveMatch.map.replace("de_", "").toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab Content */}
      <div className="min-h-[50vh]">
        {activeTab === "bracket" && (
          <BracketTab
            tournament={tournament}
            onSetWinner={handleSetWinner}
            onStartVeto={openVeto}
          />
        )}

        {activeTab === "controls" && (
          <ControlsTab
            currentLiveMatch={currentLiveMatch}
            tournament={tournament}
            controlLoading={controlLoading}
            onPause={handlePause}
            onUnpause={handleUnpause}
            onLoadBackups={handleLoadBackups}
            backups={backups}
            onRestoreBackup={handleRestoreBackup}
            rconCommand={rconCommand}
            onRconCommandChange={setRconCommand}
            onRcon={handleRcon}
            rconResponse={rconResponse}
            onSetWinner={handleSetWinner}
          />
        )}

        {activeTab === "veto" && (
          <VetoTab
            tournament={tournament}
            vetoMatch={vetoMatch}
            nextMatch={nextMatch}
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            vetoFirstTeam={vetoFirstTeam}
            onSelectVetoFirst={setVetoFirstTeam}
            onBan={handleVetoBan}
            onStartMatch={handleStartMatch}
            onResetVeto={handleResetVeto}
            onOpenVeto={openVeto}
            actionLoading={actionLoading}
            matchError={matchError}
          />
        )}

        {activeTab === "queue" && (
          <QueueTab tournament={tournament} onStartVeto={openVeto} />
        )}
      </div>

      {/* Bottom Tab Bar (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-orbital-border z-40">
        <div className="max-w-7xl mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                  isActive ? "text-orbital-purple" : "text-orbital-text-dim"
                }`}
              >
                <div className="relative">
                  <Icon size={18} />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orbital-live shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                  )}
                </div>
                <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider">
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mc-tab"
                    className="absolute top-0 left-4 right-4 h-[2px] bg-orbital-purple"
                    style={{ boxShadow: "0 0 8px rgba(168,85,247,0.5)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== BRACKET TAB =====
function BracketTab({
  tournament,
  onSetWinner,
  onStartVeto,
}: {
  tournament: Tournament;
  onSetWinner: (matchId: string, winnerId: number) => void;
  onStartVeto: (match: BracketMatch) => void;
}) {
  const winnerMatches = tournament.matches.filter(m => m.bracket === "winner");
  const lowerMatches = tournament.matches.filter(m => m.bracket === "lower");
  const grandFinal = tournament.matches.find(m => m.bracket === "grand_final");

  const rounds = (matches: BracketMatch[]) => {
    const map = new Map<number, BracketMatch[]>();
    matches.forEach(m => {
      const list = map.get(m.round) || [];
      list.push(m);
      map.set(m.round, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  };

  return (
    <div className="space-y-6">
      {/* Winner */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-3">
          WINNER BRACKET
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {rounds(winnerMatches).map(([round, matches]) => (
            <div key={round} className="flex flex-col gap-2 min-w-[160px]">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.15em] text-orbital-text-dim text-center">
                {round === 1 ? "QUARTAS" : round === 2 ? "SEMI" : "FINAL"}
              </div>
              {matches.map(m => (
                <MiniMatchCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  onSetWinner={onSetWinner}
                  onStartVeto={onStartVeto}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Lower */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-3">
          LOWER BRACKET
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {rounds(lowerMatches).map(([round, matches]) => (
            <div key={round} className="flex flex-col gap-2 min-w-[160px]">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.15em] text-orbital-text-dim text-center">
                R{round}
              </div>
              {matches.map(m => (
                <MiniMatchCard
                  key={m.id}
                  match={m}
                  tournament={tournament}
                  onSetWinner={onSetWinner}
                  onStartVeto={onStartVeto}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Grand Final */}
      {grandFinal && (
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-3">
            GRAND FINAL — BO3
          </div>
          <MiniMatchCard
            match={grandFinal}
            tournament={tournament}
            onSetWinner={onSetWinner}
            onStartVeto={onStartVeto}
            highlight
          />
        </div>
      )}
    </div>
  );
}

function MiniMatchCard({
  match,
  tournament,
  onSetWinner,
  onStartVeto,
  highlight = false,
}: {
  match: BracketMatch;
  tournament: Tournament;
  onSetWinner: (matchId: string, winnerId: number) => void;
  onStartVeto: (match: BracketMatch) => void;
  highlight?: boolean;
}) {
  const t1 = getTeamName(tournament, match.team1_id);
  const t2 = getTeamName(tournament, match.team2_id);
  const isReady = match.team1_id && match.team2_id && match.status === "pending";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`border p-2 ${
      highlight ? "bg-orbital-purple/5 border-orbital-purple/30" :
      isLive ? "bg-orbital-card border-orbital-live/40" :
      isFinished ? "bg-orbital-card border-orbital-success/20" :
      "bg-orbital-card border-orbital-border"
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider text-orbital-text-dim">
          {match.label}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-[0.4rem] text-orbital-live animate-pulse">
            <span className="w-1 h-1 rounded-full bg-orbital-live" /> LIVE
          </span>
        )}
        {match.map && (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-purple">
            {match.map.replace("de_", "").toUpperCase()}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className={`flex items-center gap-1.5 px-1.5 py-1 text-[0.6rem] font-[family-name:var(--font-jetbrains)] ${
          match.winner_id === match.team1_id && match.winner_id !== null
            ? "bg-orbital-success/10 text-orbital-success font-bold"
            : match.winner_id && match.winner_id !== match.team1_id
              ? "opacity-40 text-orbital-text-dim"
              : !match.team1_id ? "text-orbital-text-dim/30 italic" : "text-orbital-text"
        }`}>
          {match.winner_id === match.team1_id && <Check size={8} />}
          <span className="truncate">{t1}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-1.5 py-1 text-[0.6rem] font-[family-name:var(--font-jetbrains)] ${
          match.winner_id === match.team2_id && match.winner_id !== null
            ? "bg-orbital-success/10 text-orbital-success font-bold"
            : match.winner_id && match.winner_id !== match.team2_id
              ? "opacity-40 text-orbital-text-dim"
              : !match.team2_id ? "text-orbital-text-dim/30 italic" : "text-orbital-text"
        }`}>
          {match.winner_id === match.team2_id && <Check size={8} />}
          <span className="truncate">{t2}</span>
        </div>
      </div>

      {/* Actions */}
      {isReady && (
        <button
          onClick={() => onStartVeto(match)}
          className="w-full mt-1.5 flex items-center justify-center gap-1 px-2 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider text-orbital-purple"
        >
          <Swords size={9} /> VETO
        </button>
      )}
      {isLive && match.team1_id && match.team2_id && (
        <div className="flex gap-1 mt-1.5">
          <button
            onClick={() => onSetWinner(match.id, match.team1_id!)}
            className="flex-1 px-1 py-1 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim hover:text-orbital-success truncate"
          >
            {t1} W
          </button>
          <button
            onClick={() => onSetWinner(match.id, match.team2_id!)}
            className="flex-1 px-1 py-1 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim hover:text-orbital-success truncate"
          >
            {t2} W
          </button>
        </div>
      )}
      {match.match_id && (
        <Link
          href={`/partidas/${match.match_id}`}
          className="block text-center mt-1 font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim hover:text-orbital-purple transition-colors"
        >
          #{match.match_id}
        </Link>
      )}
    </div>
  );
}

// ===== CONTROLS TAB =====
function ControlsTab({
  currentLiveMatch,
  tournament,
  controlLoading,
  onPause,
  onUnpause,
  onLoadBackups,
  backups,
  onRestoreBackup,
  rconCommand,
  onRconCommandChange,
  onRcon,
  rconResponse,
  onSetWinner,
}: {
  currentLiveMatch: BracketMatch | undefined;
  tournament: Tournament;
  controlLoading: string | null;
  onPause: () => void;
  onUnpause: () => void;
  onLoadBackups: () => void;
  backups: string[];
  onRestoreBackup: (file: string) => void;
  rconCommand: string;
  onRconCommandChange: (cmd: string) => void;
  onRcon: () => void;
  rconResponse: string | null;
  onSetWinner: (matchId: string, winnerId: number) => void;
}) {
  if (!currentLiveMatch) {
    return (
      <div className="py-16 text-center">
        <Gamepad2 size={32} className="text-orbital-text-dim/30 mx-auto mb-3" />
        <p className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text-dim tracking-wider">
          NENHUMA PARTIDA AO VIVO
        </p>
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50 mt-1">
          Inicie uma partida na aba VETO
        </p>
      </div>
    );
  }

  const t1 = getTeamName(tournament, currentLiveMatch.team1_id);
  const t2 = getTeamName(tournament, currentLiveMatch.team2_id);

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-2">
          AÇÕES RÁPIDAS
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onPause}
            disabled={controlLoading === "pause"}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orbital-warning/5 border border-orbital-warning/30 hover:border-orbital-warning/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-warning disabled:opacity-50"
          >
            {controlLoading === "pause" ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
            PAUSAR
          </button>
          <button
            onClick={onUnpause}
            disabled={controlLoading === "unpause"}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orbital-success/5 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-success disabled:opacity-50"
          >
            {controlLoading === "unpause" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            DESPAUSAR
          </button>
        </div>
      </div>

      {/* Manual Winner Override */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-2">
          DEFINIR VENCEDOR MANUAL
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSetWinner(currentLiveMatch.id, currentLiveMatch.team1_id!)}
            className="px-3 py-2.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-success truncate"
          >
            {t1} WIN
          </button>
          <button
            onClick={() => onSetWinner(currentLiveMatch.id, currentLiveMatch.team2_id!)}
            className="px-3 py-2.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-success truncate"
          >
            {t2} WIN
          </button>
        </div>
      </div>

      {/* Backups */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim">
            BACKUPS / VOLTAR ROUND
          </div>
          <button
            onClick={onLoadBackups}
            disabled={controlLoading === "backups"}
            className="flex items-center gap-1 px-3 py-1.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-orbital-text-dim hover:text-orbital-purple"
          >
            {controlLoading === "backups" ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
            CARREGAR
          </button>
        </div>
        {backups.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {backups.map((b, i) => (
              <button
                key={i}
                onClick={() => onRestoreBackup(b)}
                disabled={controlLoading === "restore"}
                className="w-full text-left px-3 py-2 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-warning/30 hover:bg-orbital-warning/5 transition-all font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim hover:text-orbital-warning truncate"
              >
                <RotateCcw size={9} className="inline mr-2" />
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RCON Console */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-2">
          RCON CONSOLE
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={rconCommand}
            onChange={e => onRconCommandChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onRcon()}
            placeholder="Comando RCON..."
            className="flex-1 bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none placeholder:text-orbital-text-dim/30"
          />
          <button
            onClick={onRcon}
            disabled={controlLoading === "rcon" || !rconCommand.trim()}
            className="px-4 py-2.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all text-orbital-purple disabled:opacity-30"
          >
            {controlLoading === "rcon" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {rconResponse && (
          <div className="mt-2 bg-[#0A0A0A] border border-orbital-border p-3 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim whitespace-pre-wrap max-h-32 overflow-y-auto">
            <Terminal size={10} className="inline mr-1 text-orbital-purple" />
            {rconResponse}
          </div>
        )}
      </div>

      {/* Quick RCON presets */}
      <div>
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-2">
          COMANDOS RÁPIDOS
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { cmd: "get5_status", label: "STATUS" },
            { cmd: "mp_pause_match", label: "PAUSE" },
            { cmd: "mp_unpause_match", label: "UNPAUSE" },
            { cmd: "get5_endmatch", label: "ENCERRAR" },
            { cmd: "mp_restartgame 1", label: "RESTART" },
          ].map(preset => (
            <button
              key={preset.cmd}
              onClick={() => onRconCommandChange(preset.cmd)}
              className="px-3 py-1.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-purple"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== VETO TAB =====
function VetoTab({
  tournament,
  vetoMatch,
  nextMatch,
  servers,
  selectedServer,
  onSelectServer,
  vetoFirstTeam,
  onSelectVetoFirst,
  onBan,
  onStartMatch,
  onResetVeto,
  onOpenVeto,
  actionLoading,
  matchError,
}: {
  tournament: Tournament;
  vetoMatch: BracketMatch | null;
  nextMatch: BracketMatch | null;
  servers: Server[];
  selectedServer: string;
  onSelectServer: (id: string) => void;
  vetoFirstTeam: "team1" | "team2" | null;
  onSelectVetoFirst: (team: "team1" | "team2") => void;
  onBan: (map: string) => void;
  onStartMatch: () => void;
  onResetVeto: () => void;
  onOpenVeto: (match: BracketMatch) => void;
  actionLoading: boolean;
  matchError: string | null;
}) {
  // No active veto — show next match prompt
  if (!vetoMatch) {
    if (!nextMatch) {
      return (
        <div className="py-16 text-center">
          <Check size={32} className="text-orbital-success/30 mx-auto mb-3" />
          <p className="font-[family-name:var(--font-orbitron)] text-xs text-orbital-text-dim tracking-wider">
            {tournament.status === "finished" ? "CAMPEONATO FINALIZADO" : "NENHUMA PARTIDA PRONTA PARA VETO"}
          </p>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50 mt-1">
            {tournament.status === "finished" ? "Parabéns!" : "Aguardando partidas anteriores terminarem"}
          </p>
        </div>
      );
    }

    return (
      <div className="py-8">
        <div className="bg-orbital-purple/5 border border-orbital-purple/30 p-4">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-3">
            PRÓXIMA PARTIDA
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text mb-1">
            {getTeamName(tournament, nextMatch.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, nextMatch.team2_id)}
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-4">
            {nextMatch.label} — {nextMatch.num_maps === 1 ? "BO1" : "BO3"}
          </div>
          <button
            onClick={() => onOpenVeto(nextMatch)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple"
          >
            <Swords size={14} /> INICIAR VETO
          </button>
        </div>
      </div>
    );
  }

  // Active veto flow
  const sequence = getVetoSequence(vetoMatch.num_maps);
  const teamOrder = getVetoTeamOrder(vetoMatch.num_maps, vetoFirstTeam === "team1");
  const currentStep = vetoMatch.veto_actions.length;
  const isComplete = vetoMatch.status === "ready";
  const usedMaps = vetoMatch.veto_actions.map(a => a.map);
  const availableMaps = tournament.map_pool.filter(m => !usedMaps.includes(m));
  const currentAction = currentStep < sequence.length ? sequence[currentStep] : null;
  const currentTeamIdx = currentStep < teamOrder.length ? teamOrder[currentStep] : 0;
  const currentTeamId = currentTeamIdx === 0 ? vetoMatch.team1_id : vetoMatch.team2_id;
  const currentTeamName = getTeamName(tournament, currentTeamId);

  return (
    <div className="space-y-4">
      {/* Match info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple">
            {vetoMatch.label} — VETO
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text mt-0.5">
            {getTeamName(tournament, vetoMatch.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, vetoMatch.team2_id)}
          </div>
        </div>
        <button
          onClick={() => { onResetVeto(); }}
          className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Team Selection */}
      {!vetoFirstTeam && (
        <div className="space-y-3">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple text-center">
            QUEM COMEÇA O VETO?
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSelectVetoFirst("team1")}
              className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all"
            >
              <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                {getTeamName(tournament, vetoMatch.team1_id)}
              </div>
            </button>
            <button
              onClick={() => onSelectVetoFirst("team2")}
              className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all"
            >
              <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                {getTeamName(tournament, vetoMatch.team2_id)}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Veto History */}
      {vetoFirstTeam && vetoMatch.veto_actions.length > 0 && (
        <div className="space-y-1">
          {vetoMatch.veto_actions.map((action, i) => (
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
                className={`px-3 py-3 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
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
              VETO CONCLUÍDO
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
              {vetoMatch.num_maps === 1
                ? `Mapa: ${vetoMatch.map?.replace("de_", "").toUpperCase()}`
                : `Mapas: ${vetoMatch.maps?.map(m => m.replace("de_", "").toUpperCase()).join(" / ")}`
              }
            </div>
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

          {/* Error */}
          {matchError && (
            <div className="bg-orbital-danger/10 border border-orbital-danger/30 p-3">
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-danger mb-2">
                {matchError}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onStartMatch}
                  disabled={!selectedServer || actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple disabled:opacity-30"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  TENTAR NOVAMENTE
                </button>
                <button
                  onClick={onResetVeto}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-orbital-border hover:border-orbital-danger/50 transition-all font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-text-dim hover:text-orbital-danger"
                >
                  <X size={14} /> RESETAR
                </button>
              </div>
            </div>
          )}

          {!matchError && (
            <button
              onClick={onStartMatch}
              disabled={!selectedServer || actionLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple disabled:opacity-30"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {actionLoading ? "CRIANDO..." : "CRIAR PARTIDA E INICIAR"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== QUEUE TAB =====
function QueueTab({
  tournament,
  onStartVeto,
}: {
  tournament: Tournament;
  onStartVeto: (match: BracketMatch) => void;
}) {
  const pendingReady = tournament.matches.filter(
    m => m.status === "pending" && m.team1_id && m.team2_id
  );
  const live = tournament.matches.filter(m => m.status === "live");
  const waitingTeams = tournament.matches.filter(
    m => m.status === "pending" && (!m.team1_id || !m.team2_id)
  );
  const finished = tournament.matches.filter(m => m.status === "finished");

  return (
    <div className="space-y-5">
      {/* Live */}
      {live.length > 0 && (
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-live mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" />
            AO VIVO ({live.length})
          </div>
          {live.map(m => (
            <QueueItem key={m.id} match={m} tournament={tournament} />
          ))}
        </div>
      )}

      {/* Ready to play */}
      {pendingReady.length > 0 && (
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-2">
            PRONTAS PARA JOGAR ({pendingReady.length})
          </div>
          {pendingReady.map(m => (
            <div key={m.id} className="mb-2">
              <QueueItem match={m} tournament={tournament} />
              <button
                onClick={() => onStartVeto(m)}
                className="w-full mt-1 flex items-center justify-center gap-1 px-3 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-orbital-purple"
              >
                <Swords size={10} /> INICIAR VETO
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Waiting for teams */}
      {waitingTeams.length > 0 && (
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-2">
            AGUARDANDO ({waitingTeams.length})
          </div>
          {waitingTeams.map(m => (
            <QueueItem key={m.id} match={m} tournament={tournament} />
          ))}
        </div>
      )}

      {/* Finished */}
      {finished.length > 0 && (
        <div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-success/50 mb-2">
            FINALIZADAS ({finished.length})
          </div>
          {finished.map(m => (
            <QueueItem key={m.id} match={m} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItem({ match, tournament }: { match: BracketMatch; tournament: Tournament }) {
  const t1 = getTeamName(tournament, match.team1_id);
  const t2 = getTeamName(tournament, match.team2_id);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 border mb-1 ${
      isLive ? "border-orbital-live/30 bg-orbital-live/5" :
      isFinished ? "border-orbital-success/20 bg-orbital-card" :
      "border-orbital-border bg-orbital-card"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate">
          {t1} <span className="text-orbital-text-dim">vs</span> {t2}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider text-orbital-text-dim">
            {match.label}
          </span>
          {match.map && (
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-purple">
              {match.map.replace("de_", "").toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <span className={`shrink-0 font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-wider px-1.5 py-0.5 border ${
        isLive ? "text-orbital-live border-orbital-live/30" :
        isFinished ? "text-orbital-success border-orbital-success/20" :
        match.team1_id && match.team2_id ? "text-orbital-purple border-orbital-purple/20" :
        "text-orbital-text-dim border-orbital-border"
      }`}>
        {isLive ? "LIVE" : isFinished ? "FIM" : match.team1_id && match.team2_id ? "PRONTO" : "AGUARDANDO"}
      </span>
    </div>
  );
}
