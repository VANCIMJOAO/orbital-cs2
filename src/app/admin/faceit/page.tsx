"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Gamepad2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Download,
  Crosshair,
  Trophy,
  Swords,
  Clock,
  Link2,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
  Unlink,
} from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { useEffect, useState, useCallback } from "react";
import type { MappedMatch, MappedPlayerStats } from "@/lib/faceit-mapper";

interface ChampionshipInfo {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  slots: number;
  current_subscriptions?: number;
  game?: string;
  region?: string;
  faceit_url?: string;
}

interface ChampionshipRow {
  championship_id: string;
  tournament_id: string | null;
  name: string;
  status: string;
  data: ChampionshipInfo;
}

interface ChampionshipTeamMember {
  faceit_id: string;
  nickname: string;
  steam_id: string;
  steam_name: string;
  avatar: string;
  skill_level: number;
  elo: number;
  country: string;
}

interface ChampionshipTeam {
  faceit_team_id: string;
  name: string;
  tag: string;
  members: ChampionshipTeamMember[];
  status: string;
}

interface TournamentOption {
  id: string;
  name: string;
  mode: string;
  status: string;
  faceit_championship_id?: string | null;
}

type FeedbackMsg = { type: "success" | "error"; msg: string } | null;

export default function AdminFaceit() {
  // ── State ──
  const [championships, setChampionships] = useState<ChampionshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMsg>(null);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);

  // Expanded championship state
  const [expandedChamp, setExpandedChamp] = useState<string | null>(null);
  const [champMatches, setChampMatches] = useState<Record<string, MappedMatch[]>>({});
  const [champTeams, setChampTeams] = useState<Record<string, ChampionshipTeam[]>>({});
  const [champLoading, setChampLoading] = useState<Record<string, boolean>>({});

  // ── Data fetching ──
  const fetchChampionships = useCallback(async () => {
    try {
      const res = await fetch("/api/faceit/match?championships=1", { credentials: "include" });
      const data = await res.json();
      setChampionships(data.championships || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      setTournaments(
        (data.tournaments || []).map((t: TournamentOption) => ({
          id: t.id,
          name: t.name,
          mode: t.mode,
          status: t.status,
          faceit_championship_id: t.faceit_championship_id,
        }))
      );
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetchChampionships();
    fetchTournaments();
  }, [fetchChampionships, fetchTournaments]);

  // ── Adicionar championship ──
  const handleAddChampionship = async () => {
    const id = addingId.trim();
    if (!id) return;
    setAdding(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/faceit/championship/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar championship");

      // Salvar no DB
      const saveRes = await fetch("/api/faceit/match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_championship",
          championship_id: id,
          name: data.championship.name,
          data: data.championship,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Erro ao salvar");
      }

      setFeedback({ type: "success", msg: `Championship vinculado: ${data.championship.name}` });
      setAddingId("");
      fetchChampionships();
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
    setAdding(false);
  };

  // ── Expandir championship (carregar matches + teams) ──
  const toggleChampionship = async (champId: string) => {
    if (expandedChamp === champId) {
      setExpandedChamp(null);
      return;
    }
    setExpandedChamp(champId);

    if (champMatches[champId] && champTeams[champId]) return; // já carregado

    setChampLoading((prev) => ({ ...prev, [champId]: true }));
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        fetch(`/api/faceit/championship/${champId}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/faceit/championship/${champId}/teams`, { credentials: "include" }).then((r) => r.json()),
      ]);
      setChampMatches((prev) => ({ ...prev, [champId]: matchesRes.matches || [] }));
      setChampTeams((prev) => ({ ...prev, [champId]: teamsRes.teams || [] }));
    } catch {
      setChampMatches((prev) => ({ ...prev, [champId]: [] }));
      setChampTeams((prev) => ({ ...prev, [champId]: [] }));
    }
    setChampLoading((prev) => ({ ...prev, [champId]: false }));
  };

  // ── Refresh matches de um championship ──
  const refreshChampMatches = async (champId: string) => {
    setChampLoading((prev) => ({ ...prev, [champId]: true }));
    try {
      const res = await fetch(`/api/faceit/championship/${champId}`, { credentials: "include" });
      const data = await res.json();
      setChampMatches((prev) => ({ ...prev, [champId]: data.matches || [] }));
    } catch { /* */ }
    setChampLoading((prev) => ({ ...prev, [champId]: false }));
  };

  // ── Vincular a tournament interno ──
  const linkToTournament = async (champId: string, tournamentId: string) => {
    try {
      const res = await fetch("/api/faceit/match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link_championship",
          championship_id: champId,
          tournament_id: tournamentId,
        }),
      });
      if (!res.ok) throw new Error("Erro ao vincular");
      fetchChampionships();
    } catch { /* */ }
  };

  // ── Remover championship ──
  const removeChampionship = async (champId: string) => {
    try {
      const res = await fetch("/api/faceit/match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_championship",
          championship_id: champId,
        }),
      });
      if (res.ok) {
        fetchChampionships();
        if (expandedChamp === champId) setExpandedChamp(null);
      }
    } catch { /* */ }
  };

  // ── Helpers ──
  const statusColors: Record<string, string> = {
    live: "text-red-400",
    finished: "text-green-400",
    cancelled: "text-orbital-text-dim",
    pending: "text-yellow-400",
  };

  const statusLabels: Record<string, string> = {
    live: "AO VIVO",
    finished: "FINALIZADA",
    cancelled: "CANCELADA",
    pending: "PENDENTE",
  };

  const onlineTournaments = tournaments.filter((t) => t.mode === "online" && t.status !== "finished");

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text flex items-center gap-2">
            <Gamepad2 size={20} className="text-[#FF5500]" />
            FACEIT CAMPEONATOS
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Gerenciar campeonatos Faceit vinculados
          </p>
        </div>
        <button
          onClick={() => { fetchChampionships(); fetchTournaments(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-orbital-border hover:border-orbital-purple/40 transition-all font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-text"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {/* ═══ VINCULAR CHAMPIONSHIP ═══ */}
      <HudCard>
        <div className="p-5">
          <h2 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text mb-4 flex items-center gap-2">
            <Plus size={14} className="text-orbital-purple" />
            VINCULAR CHAMPIONSHIP
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-1 block">
                Championship ID da Faceit
              </label>
              <input
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={addingId}
                onChange={(e) => setAddingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChampionship()}
                className="w-full bg-black/40 border border-orbital-border px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/50 focus:border-orbital-purple/50 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleAddChampionship}
              disabled={adding || !addingId.trim()}
              className="self-end px-5 py-2 bg-[#FF5500]/10 border border-[#FF5500]/30 hover:border-[#FF5500]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-orbitron)] text-xs text-[#FF5500] flex items-center gap-2"
            >
              {adding ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              VINCULAR
            </button>
          </div>

          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50 mt-3">
            Cole o championship ID da URL da Faceit (ex: faceit.com/pt/championship/<span className="text-orbital-text-dim">abc123...</span>)
          </p>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 flex items-center gap-2 text-xs font-[family-name:var(--font-jetbrains)] ${
                  feedback.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {feedback.type === "success" ? <Check size={12} /> : <AlertCircle size={12} />}
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </HudCard>

      {/* ═══ LISTA DE CHAMPIONSHIPS ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-orbital-purple" />
        </div>
      ) : championships.length === 0 ? (
        <HudCard>
          <div className="p-12 text-center">
            <Trophy size={32} className="text-orbital-text-dim/20 mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
              Nenhum campeonato Faceit vinculado
            </p>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50 mt-1">
              Use o formulário acima para vincular um championship
            </p>
          </div>
        </HudCard>
      ) : (
        <div className="space-y-3">
          {championships.map((champ) => {
            const isExpanded = expandedChamp === champ.championship_id;
            const matches = champMatches[champ.championship_id] || [];
            const teams = champTeams[champ.championship_id] || [];
            const isLoading = champLoading[champ.championship_id] || false;
            const linkedTournament = tournaments.find((t) => t.id === champ.tournament_id);
            const finishedCount = matches.filter((m) => m.status === "finished").length;
            const liveCount = matches.filter((m) => m.status === "live").length;

            return (
              <motion.div
                key={champ.championship_id}
                layout
                className="bg-orbital-card border border-orbital-border hover:border-orbital-border/80 transition-colors"
              >
                {/* Championship Header */}
                <button
                  onClick={() => toggleChampionship(champ.championship_id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-orbital-text-dim shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-orbital-text-dim shrink-0" />
                  )}

                  <Trophy size={16} className="text-[#FF5500] shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-orbital-text truncate">
                      {champ.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {linkedTournament ? (
                        <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple">
                          <Link2 size={8} /> {linkedTournament.name}
                        </span>
                      ) : (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50">
                          Sem campeonato vinculado
                        </span>
                      )}
                      {isExpanded && matches.length > 0 && (
                        <>
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                            {matches.length} partidas
                          </span>
                          {finishedCount > 0 && (
                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-green-400/70">
                              {finishedCount} finalizadas
                            </span>
                          )}
                          {liveCount > 0 && (
                            <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-red-400">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              {liveCount} ao vivo
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {champ.data?.faceit_url && (
                    <a
                      href={champ.data.faceit_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#FF5500]/50 hover:text-[#FF5500] transition-colors shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-orbital-border/30 pt-3 space-y-4">
                        {/* Actions bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Vincular a tournament */}
                          <div className="flex items-center gap-2">
                            <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                              Campeonato:
                            </label>
                            <select
                              value={champ.tournament_id || ""}
                              onChange={(e) => linkToTournament(champ.championship_id, e.target.value)}
                              className="bg-black/40 border border-orbital-border px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text focus:border-orbital-purple/50 focus:outline-none"
                            >
                              <option value="">Sem vínculo</option>
                              {onlineTournaments.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); refreshChampMatches(champ.championship_id); }}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5500]/10 border border-[#FF5500]/30 hover:border-[#FF5500]/60 disabled:opacity-40 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-[#FF5500]"
                            >
                              {isLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                              ATUALIZAR
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeChampionship(champ.championship_id); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-red-400"
                            >
                              <Trash2 size={10} /> REMOVER
                            </button>
                          </div>
                        </div>

                        {isLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-orbital-purple" />
                          </div>
                        ) : (
                          <>
                            {/* ── Times inscritos ── */}
                            {teams.length > 0 && (
                              <TeamsSection
                                teams={teams}
                                championshipId={champ.championship_id}
                              />
                            )}

                            {/* ── Stats resumo ── */}
                            {matches.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: "Total", value: matches.length, icon: Swords },
                                  { label: "Finalizadas", value: finishedCount, icon: Check },
                                  { label: "Ao Vivo", value: liveCount, icon: Clock },
                                  { label: "Com Demo", value: matches.filter((m) => m.demo_urls.length > 0).length, icon: Download },
                                ].map((s) => (
                                  <div key={s.label} className="bg-black/20 border border-orbital-border/30 p-2">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <s.icon size={10} className="text-orbital-text-dim/50" />
                                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{s.label}</span>
                                    </div>
                                    <span className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text">{s.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ── Lista de partidas ── */}
                            {matches.length > 0 ? (
                              <MatchesList matches={matches} />
                            ) : (
                              <div className="py-6 text-center">
                                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50">
                                  Nenhuma partida encontrada neste championship
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Meta info */}
                        <div className="pt-2 border-t border-orbital-border/10">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/40 select-all">
                            {champ.championship_id}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ Teams Section ═══
function TeamsSection({
  teams,
  championshipId,
}: {
  teams: ChampionshipTeam[];
  championshipId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<FeedbackMsg>(null);

  const handleImportTeams = async () => {
    setImporting(true);
    setImportFeedback(null);
    try {
      const payload = teams.map((t) => ({
        name: t.name,
        tag: t.tag,
        members: t.members
          .filter((m) => m.steam_id)
          .map((m) => ({ steam_id: m.steam_id, nickname: m.nickname })),
      }));

      const res = await fetch("/api/faceit/import-teams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");

      const { summary } = data;
      setImportFeedback({
        type: "success",
        msg: `${summary.created} criados, ${summary.existing} já existiam${summary.errors ? `, ${summary.errors} erros` : ""}`,
      });
    } catch (err) {
      setImportFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
    setImporting(false);
  };

  return (
    <div className="bg-black/20 border border-orbital-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        <Users size={14} className="text-orbital-purple shrink-0" />
        <span className="font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider text-orbital-text">
          {teams.length} TIMES INSCRITOS
        </span>
        {expanded ? (
          <ChevronDown size={12} className="text-orbital-text-dim ml-auto" />
        ) : (
          <ChevronRight size={12} className="text-orbital-text-dim ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Import button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportTeams}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 disabled:opacity-40 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple"
                >
                  {importing ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                  IMPORTAR TODOS PRO G5API
                </button>
                {importFeedback && (
                  <span className={`text-[0.65rem] font-[family-name:var(--font-jetbrains)] flex items-center gap-1 ${
                    importFeedback.type === "success" ? "text-green-400" : "text-red-400"
                  }`}>
                    {importFeedback.type === "success" ? <Check size={10} /> : <AlertCircle size={10} />}
                    {importFeedback.msg}
                  </span>
                )}
              </div>

              {/* Teams grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {teams.map((team) => (
                  <div
                    key={team.faceit_team_id}
                    className="bg-black/30 border border-orbital-border/20 p-2"
                  >
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-text mb-1.5 flex items-center gap-1.5">
                      <Shield size={10} className="text-[#FF5500]/60" />
                      {team.name}
                      <span className="text-orbital-text-dim/40 font-[family-name:var(--font-jetbrains)]">
                        [{team.tag}]
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {team.members.map((m) => (
                        <div key={m.faceit_id} className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/70">
                          <span className="text-[#FF5500]/50 w-5 text-right">Lv{m.skill_level}</span>
                          <span className="text-orbital-text truncate">{m.nickname}</span>
                          {m.steam_id && (
                            <a
                              href={`/perfil/${m.steam_id}`}
                              className="text-orbital-purple/40 hover:text-orbital-purple transition-colors ml-auto shrink-0"
                            >
                              <Link2 size={8} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ Matches List ═══
function MatchesList({ matches }: { matches: MappedMatch[] }) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    live: "text-red-400",
    finished: "text-green-400",
    cancelled: "text-orbital-text-dim",
    pending: "text-yellow-400",
  };

  const statusLabels: Record<string, string> = {
    live: "AO VIVO",
    finished: "FINALIZADA",
    cancelled: "CANCELADA",
    pending: "PENDENTE",
  };

  return (
    <div className="space-y-1">
      <div className="font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider text-orbital-text-dim mb-2 flex items-center gap-2">
        <Swords size={12} className="text-orbital-purple" />
        PARTIDAS
      </div>
      {matches.map((match) => {
        const isExpanded = expandedMatch === match.faceit_match_id;
        return (
          <div
            key={match.faceit_match_id}
            className="bg-black/20 border border-orbital-border/20"
          >
            <button
              onClick={() => setExpandedMatch(isExpanded ? null : match.faceit_match_id)}
              className="w-full px-3 py-2 flex items-center gap-3 text-left"
            >
              {/* Status */}
              <div className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider w-20 shrink-0 ${statusColors[match.status]}`}>
                {match.status === "live" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />
                )}
                {statusLabels[match.status] || match.status.toUpperCase()}
              </div>

              {/* Teams */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${match.winner === "team1" ? "text-green-400" : "text-orbital-text"}`}>
                    {match.team1_name}
                  </span>
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] text-orbital-text-dim shrink-0">
                    {match.team1_score} — {match.team2_score}
                  </span>
                  <span className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${match.winner === "team2" ? "text-green-400" : "text-orbital-text"}`}>
                    {match.team2_name}
                  </span>
                </div>
                {match.maps.length > 0 && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {match.maps.map((m, i) => (
                      <span key={i} className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50">
                        {m.map_name.replace("de_", "")} {m.team1_score}-{m.team2_score}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50 shrink-0">
                {match.end_time
                  ? new Date(match.end_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  : match.start_time
                  ? new Date(match.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  : "—"}
              </div>

              {/* Faceit link */}
              {match.faceit_url && (
                <a
                  href={match.faceit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#FF5500]/50 hover:text-[#FF5500] transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </button>

            {/* Expanded match details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 border-t border-orbital-border/10 pt-2">
                    {match.maps.map((map, mi) => {
                      const team1Ids = new Set(match.players.team1.map((p) => p.faceit_id));
                      const team1Stats = map.player_stats.filter((p) => team1Ids.has(p.faceit_id)).sort((a, b) => b.kills - a.kills);
                      const team2Stats = map.player_stats.filter((p) => !team1Ids.has(p.faceit_id)).sort((a, b) => b.kills - a.kills);

                      const headerRow = (
                        <tr className="text-orbital-text-dim/50 border-b border-orbital-border/20">
                          <th className="text-left py-1 pr-3">Player</th>
                          <th className="text-center px-1.5">K</th>
                          <th className="text-center px-1.5">D</th>
                          <th className="text-center px-1.5">A</th>
                          <th className="text-center px-1.5">ADR</th>
                          <th className="text-center px-1.5">HS%</th>
                          <th className="text-center px-1.5">KDR</th>
                          <th className="text-center px-1.5 hidden sm:table-cell">Entry</th>
                          <th className="text-center px-1.5 hidden sm:table-cell">Clutch</th>
                        </tr>
                      );

                      const renderPlayerRow = (p: MappedPlayerStats, pi: number) => (
                        <tr key={pi} className="border-b border-orbital-border/10 text-orbital-text">
                          <td className="py-1 pr-3">{p.nickname}</td>
                          <td className="text-center px-1.5 text-green-400">{p.kills}</td>
                          <td className="text-center px-1.5 text-red-400/70">{p.deaths}</td>
                          <td className="text-center px-1.5">{p.assists}</td>
                          <td className={`text-center px-1.5 ${p.adr >= 80 ? "text-orbital-purple" : ""}`}>{p.adr.toFixed(1)}</td>
                          <td className="text-center px-1.5">{p.headshot_pct}%</td>
                          <td className={`text-center px-1.5 ${p.kdr >= 1.2 ? "text-green-400" : p.kdr < 0.8 ? "text-red-400/70" : ""}`}>{p.kdr.toFixed(2)}</td>
                          <td className="text-center px-1.5 hidden sm:table-cell">{p.first_kills}</td>
                          <td className="text-center px-1.5 hidden sm:table-cell">{p.clutch_kills}</td>
                        </tr>
                      );

                      return (
                        <div key={mi} className="mb-3 last:mb-0">
                          <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim mb-2 flex items-center gap-2">
                            <Crosshair size={10} className="text-orbital-purple" />
                            {map.map_name.replace("de_", "").toUpperCase()} — {map.team1_score}:{map.team2_score}
                          </div>

                          {/* Team 1 */}
                          <div className="mb-2">
                            <div className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider mb-1 flex items-center gap-1 ${map.winner === "team1" ? "text-green-400" : "text-orbital-text-dim"}`}>
                              {map.winner === "team1" && <Trophy size={8} />}
                              {match.team1_name}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[0.55rem] font-[family-name:var(--font-jetbrains)]">
                                <thead>{headerRow}</thead>
                                <tbody>{team1Stats.map(renderPlayerRow)}</tbody>
                              </table>
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div>
                            <div className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider mb-1 flex items-center gap-1 ${map.winner === "team2" ? "text-green-400" : "text-orbital-text-dim"}`}>
                              {map.winner === "team2" && <Trophy size={8} />}
                              {match.team2_name}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[0.55rem] font-[family-name:var(--font-jetbrains)]">
                                <thead>{headerRow}</thead>
                                <tbody>{team2Stats.map(renderPlayerRow)}</tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Match actions */}
                    <MatchActions match={match} />

                    {/* Match ID */}
                    <div className="mt-2 pt-1 border-t border-orbital-border/10">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/40 select-all">
                        {match.faceit_match_id}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ═══ Match Actions ═══
function MatchActions({ match }: { match: MappedMatch }) {
  const [feedback, setFeedback] = useState<FeedbackMsg>(null);
  const [loadingSync, setLoadingSync] = useState(false);

  const handleSync = async () => {
    setLoadingSync(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/faceit/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceit_match_id: match.faceit_match_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setFeedback({ type: "success", msg: `Sincronizado: G5API match #${data.g5_match_id}` });
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro" });
    }
    setLoadingSync(false);
  };

  if (match.status !== "finished" || match.maps.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-orbital-border/10">
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={loadingSync}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 disabled:opacity-40 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple"
        >
          {loadingSync ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
          SYNC G5API
        </button>
        {feedback && (
          <span className={`text-[0.65rem] font-[family-name:var(--font-jetbrains)] flex items-center gap-1 ${
            feedback.type === "success" ? "text-green-400" : "text-red-400"
          }`}>
            {feedback.type === "success" ? <Check size={10} /> : <AlertCircle size={10} />}
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  );
}
