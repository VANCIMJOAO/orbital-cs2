"use client";

import { useEffect, useState, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Swords, X, Check, ArrowLeft, Loader2, Shield, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { useAuth } from "@/lib/auth-context";
import { createMatch, getServers, Server } from "@/lib/api";
import {
  Tournament,
  BracketMatch,
  advanceBracket,
  getTeamName,
  getNextPlayableMatch,
  getVetoSequence,
  getVetoTeamOrder,
  VetoAction,
} from "@/lib/tournament";

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

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      const t = (data.tournaments || []).find((t: Tournament) => t.id === id);
      if (t) setTournament(t);
    } catch { /* */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  // Auto-advance: poll live G5API matches for completion
  useEffect(() => {
    if (!tournament || tournament.status === "finished") return;

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

          if (g5match && g5match.end_time && !bm.winner_id) {
            // Match finished in G5API — determine winner
            let winnerId = g5match.winner;
            if (!winnerId && g5match.team1_score !== g5match.team2_score) {
              winnerId = g5match.team1_score > g5match.team2_score ? g5match.team1_id : g5match.team2_id;
            }
            if (winnerId) {
              // Map G5API team ID to tournament team ID
              const tourTeam = updated.teams.find(t => t.id === winnerId);
              if (tourTeam) {
                updated = advanceBracket(updated, bm.id, tourTeam.id);
                changed = true;
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (changed) {
        await saveTournament(updated);
      }
    };

    const interval = setInterval(checkAutoAdvance, 10000);
    checkAutoAdvance(); // run immediately
    return () => clearInterval(interval);
  }, [tournament]);

  useEffect(() => {
    if (isAdmin) {
      getServers().then(r => setServers(r.servers || [])).catch(() => {});
    }
  }, [isAdmin]);

  const saveTournament = async (t: Tournament) => {
    setTournament(t);
    await fetch("/api/tournaments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
  };

  const openVeto = (match: BracketMatch) => {
    setVetoMatch({ ...match, veto_actions: [] });
    setVetoFirstTeam(null); // Force team selection before veto starts
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

    // Check if veto is complete
    if (updatedActions.length >= sequence.length) {
      // Find remaining map(s)
      const usedMaps = updatedActions.map(a => a.map);
      const remaining = tournament.map_pool.filter(m => !usedMaps.includes(m));
      const picks = updatedActions.filter(a => a.action === "pick").map(a => a.map);

      if (vetoMatch.num_maps === 1) {
        // BO1: remaining[0] is the map
        updatedMatch.map = remaining[0];
        updatedMatch.status = "ready";
      } else {
        // BO3: picks + remaining decider
        updatedMatch.maps = [...picks, remaining[0]];
        updatedMatch.status = "ready";
      }
    }

    setVetoMatch(updatedMatch);

    // Save to tournament
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

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    if (!confirm(`Deletar campeonato "${tournament.name}"? Esta ação é irreversível.`)) return;

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Trophy size={48} className="text-orbital-border mx-auto mb-4" />
        <p className="font-[family-name:var(--font-orbitron)] text-orbital-text-dim">
          Campeonato não encontrado
        </p>
        <Link href="/admin/campeonatos" className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-orbital-border text-orbital-text-dim hover:text-orbital-purple hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-xs">
          <ArrowLeft size={14} /> VOLTAR
        </Link>
      </div>
    );
  }

  const winnerMatches = tournament.matches.filter(m => m.bracket === "winner");
  const lowerMatches = tournament.matches.filter(m => m.bracket === "lower");
  const grandFinal = tournament.matches.find(m => m.bracket === "grand_final");
  const nextMatch = getNextPlayableMatch(tournament);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            {tournament.name}
          </h1>
          <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider px-2 py-1 border ${
            tournament.status === "active" ? "text-orbital-live border-orbital-live/30" : tournament.status === "finished" ? "text-orbital-success border-orbital-success/30" : "text-orbital-warning border-orbital-warning/30"
          }`}>
            {tournament.status === "active" ? "AO VIVO" : tournament.status === "finished" ? "FINALIZADO" : "PENDENTE"}
          </span>
          {isAdmin && (
            <button
              onClick={handleDeleteTournament}
              className="ml-auto p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors"
              title="Deletar campeonato"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          Eliminação Dupla — {tournament.teams.length} times — {tournament.matches.filter(m => m.status === "finished").length}/{tournament.matches.length} partidas
        </p>
      </motion.div>

      {/* Next Match Banner */}
      {isAdmin && nextMatch && !vetoMatch && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-orbital-purple/5 border border-orbital-purple/30 p-4 flex items-center justify-between">
            <div>
              <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-1">PRÓXIMA PARTIDA</div>
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
        </motion.div>
      )}

      {/* Bracket Visualization */}
      <div className="space-y-8">
        {/* Winner Bracket */}
        <HudCard label="WINNER BRACKET">
          <BracketSection
            matches={winnerMatches}
            tournament={tournament}
            isAdmin={isAdmin}
            onSetWinner={handleSetWinner}
            onStartVeto={openVeto}
          />
        </HudCard>

        {/* Lower Bracket */}
        <HudCard label="LOWER BRACKET">
          <BracketSection
            matches={lowerMatches}
            tournament={tournament}
            isAdmin={isAdmin}
            onSetWinner={handleSetWinner}
            onStartVeto={openVeto}
          />
        </HudCard>

        {/* Grand Final */}
        {grandFinal && (
          <HudCard label="GRAND FINAL — BO3">
            <div className="flex justify-center py-4">
              <MatchNode
                match={grandFinal}
                tournament={tournament}
                isAdmin={isAdmin}
                onSetWinner={handleSetWinner}
                onStartVeto={openVeto}
                isGrandFinal
              />
            </div>
          </HudCard>
        )}
      </div>

      {/* Veto Modal */}
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

// Bracket Section Component
function BracketSection({
  matches,
  tournament,
  isAdmin,
  onSetWinner,
  onStartVeto,
}: {
  matches: BracketMatch[];
  tournament: Tournament;
  isAdmin: boolean;
  onSetWinner: (matchId: string, winnerId: number) => void;
  onStartVeto: (match: BracketMatch) => void;
}) {
  // Group by round
  const rounds = new Map<number, BracketMatch[]>();
  matches.forEach(m => {
    const list = rounds.get(m.round) || [];
    list.push(m);
    rounds.set(m.round, list);
  });

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="flex gap-6 overflow-x-auto py-4 px-2">
      {sortedRounds.map(([round, roundMatches]) => (
        <div key={round} className="flex flex-col gap-4 min-w-[220px]">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim text-center mb-2">
            {roundMatches[0]?.bracket === "winner"
              ? round === 1 ? "QUARTAS" : round === 2 ? "SEMIFINAL" : "FINAL"
              : `RODADA ${round}`
            }
          </div>
          {roundMatches.map(match => (
            <MatchNode
              key={match.id}
              match={match}
              tournament={tournament}
              isAdmin={isAdmin}
              onSetWinner={onSetWinner}
              onStartVeto={onStartVeto}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Match Node Component
function MatchNode({
  match,
  tournament,
  isAdmin,
  onSetWinner,
  onStartVeto,
  isGrandFinal = false,
}: {
  match: BracketMatch;
  tournament: Tournament;
  isAdmin: boolean;
  onSetWinner: (matchId: string, winnerId: number) => void;
  onStartVeto: (match: BracketMatch) => void;
  isGrandFinal?: boolean;
}) {
  const team1Name = getTeamName(tournament, match.team1_id);
  const team2Name = getTeamName(tournament, match.team2_id);
  const isReady = match.team1_id && match.team2_id && match.status === "pending";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`border p-3 transition-all ${
      isGrandFinal
        ? "bg-orbital-purple/5 border-orbital-purple/30 min-w-[280px]"
        : isLive
          ? "bg-orbital-card border-orbital-live/40"
          : isFinished
            ? "bg-orbital-card border-orbital-success/20"
            : "bg-orbital-card border-orbital-border"
    }`}>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-text-dim">
          {match.label}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-live animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-orbital-live shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            LIVE
          </span>
        )}
        {match.map && (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple">
            {match.map.replace("de_", "").toUpperCase()}
          </span>
        )}
        {match.maps && (
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple">
            {match.maps.map(m => m.replace("de_", "").toUpperCase()).join(" / ")}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-1">
        <TeamRow
          name={team1Name}
          teamId={match.team1_id}
          isWinner={match.winner_id === match.team1_id && match.winner_id !== null}
          isLoser={match.winner_id !== null && match.winner_id !== match.team1_id}
        />
        <TeamRow
          name={team2Name}
          teamId={match.team2_id}
          isWinner={match.winner_id === match.team2_id && match.winner_id !== null}
          isLoser={match.winner_id !== null && match.winner_id !== match.team2_id}
        />
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="mt-2 flex gap-1">
          {isReady && match.status === "pending" && (
            <button
              onClick={() => onStartVeto(match)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider text-orbital-purple"
            >
              <Swords size={10} /> VETO
            </button>
          )}
          {isLive && match.team1_id && match.team2_id && (
            <>
              <button
                onClick={() => onSetWinner(match.id, match.team1_id!)}
                className="flex-1 px-2 py-1.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-success truncate"
              >
                {team1Name} W
              </button>
              <button
                onClick={() => onSetWinner(match.id, match.team2_id!)}
                className="flex-1 px-2 py-1.5 border border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-success truncate"
              >
                {team2Name} W
              </button>
            </>
          )}
          {match.match_id && (
            <Link
              href={`/partidas/${match.match_id}`}
              className="px-2 py-1.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim hover:text-orbital-purple"
            >
              #{match.match_id}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function TeamRow({ name, teamId, isWinner, isLoser }: { name: string; teamId: number | null; isWinner: boolean; isLoser: boolean }) {
  const isTBD = !teamId || name === "TBD" || name === "A definir";
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 transition-colors ${
      isWinner ? "bg-orbital-success/10 border-l-2 border-orbital-success" : isLoser ? "bg-[#0A0A0A] opacity-40" : "bg-[#0A0A0A]"
    }`}>
      <Shield size={10} className={isWinner ? "text-orbital-success" : isTBD ? "text-orbital-text-dim/30" : "text-orbital-text-dim"} />
      <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] ${
        isTBD ? "text-orbital-text-dim/30 italic" : isWinner ? "text-orbital-success font-bold" : "text-orbital-text"
      }`}>
        {name}
      </span>
      {isWinner && <Check size={10} className="text-orbital-success ml-auto" />}
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
          <button onClick={onClose} className="p-2 text-orbital-text-dim hover:text-orbital-text">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Team Selection - Who vetoes first */}
          {!vetoFirstTeam && (
            <div className="space-y-3">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple text-center">
                QUEM COMEÇA O VETO?
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
                  VETO CONCLUÍDO
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
