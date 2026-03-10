"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Check, AlertCircle, ChevronUp, Trophy, Trash2, Eye, ArrowRight, ArrowLeft, Users, GripVertical } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Team, Season } from "@/lib/api";
import {
  Tournament,
  TournamentTeam,
  generateDoubleEliminationBracket,
  getDefaultMapPool,
} from "@/lib/tournament";

export default function AdminCampeonatos() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [mapPool, setMapPool] = useState<string[]>(getDefaultMapPool());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tournamentsRes, teamsRes, seasonsRes] = await Promise.all([
        fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
        fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
        fetch("/api/seasons", { credentials: "include" }).then(r => r.json()).catch(() => ({ seasons: [] })),
      ]);
      setTournaments(tournamentsRes.tournaments || []);
      setTeams(teamsRes.teams || []);
      setSeasons(seasonsRes.seasons || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTeam = (teamId: number) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : prev.length < 8 ? [...prev, teamId] : prev
    );
  };

  const moveTeam = (index: number, direction: -1 | 1) => {
    const newTeams = [...selectedTeams];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newTeams.length) return;
    [newTeams[index], newTeams[newIndex]] = [newTeams[newIndex], newTeams[index]];
    setSelectedTeams(newTeams);
  };

  const toggleMap = (map: string) => {
    setMapPool(prev =>
      prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map]
    );
  };

  const canAdvance = (step: number) => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return selectedTeams.length === 8;
    if (step === 2) return mapPool.length >= 7;
    return true;
  };

  const handleCreate = async () => {
    if (!canAdvance(0) || !canAdvance(1) || !canAdvance(2)) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const tournamentTeams: TournamentTeam[] = selectedTeams.map((teamId, i) => {
        const team = teams.find(t => t.id === teamId)!;
        return { id: team.id, name: team.name, tag: team.tag || "", seed: i + 1 };
      });

      const matches = generateDoubleEliminationBracket(tournamentTeams);

      const tournament: Tournament = {
        id: `t-${Date.now()}`,
        name: name.trim(),
        season_id: seasonId ? parseInt(seasonId) : null,
        server_id: null,
        format: "double_elimination",
        teams: tournamentTeams,
        matches,
        map_pool: mapPool,
        players_per_team: 5,
        created_at: new Date().toISOString(),
        status: "pending",
        current_match_id: null,
      };

      await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournament),
      });

      setFeedback({ type: "success", msg: `Campeonato "${tournament.name}" criado com sucesso!` });
      setName("");
      setSelectedTeams([]);
      setMapPool(getDefaultMapPool());
      setSeasonId("");
      await fetchData();
      setTimeout(() => { setShowCreate(false); setWizardStep(0); }, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao criar campeonato" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este campeonato? Esta ação é irreversível.")) return;
    await fetch("/api/tournaments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  };

  const inputClass = "w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors";
  const labelClass = "block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2";

  const allMaps = getDefaultMapPool();

  const wizardSteps = [
    { label: "INFO", num: 1 },
    { label: "TIMES", num: 2 },
    { label: "MAPAS", num: 3 },
    { label: "CONFIRMAR", num: 4 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
          CAMPEONATOS ({tournaments.length})
        </h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setFeedback(null); setWizardStep(0); }}
          className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
        >
          {showCreate ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showCreate ? "FECHAR" : "NOVO CAMPEONATO"}
        </button>
      </div>

      {/* Create Wizard */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <HudCard label="CRIAR CAMPEONATO" className="mb-6">
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-8 pt-2">
                {wizardSteps.map((step, i) => {
                  const isActive = i === wizardStep;
                  const isDone = i < wizardStep;
                  return (
                    <div key={step.label} className="flex items-center flex-1">
                      <button
                        type="button"
                        onClick={() => { if (isDone) setWizardStep(i); }}
                        className={`flex items-center gap-2 px-3 py-2 border transition-all ${
                          isActive
                            ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                            : isDone
                              ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success cursor-pointer"
                              : "bg-transparent border-orbital-border text-orbital-text-dim"
                        }`}
                      >
                        {isDone ? <Check size={14} /> : <span className="font-[family-name:var(--font-jetbrains)] text-xs">{step.num}</span>}
                        <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] hidden sm:inline">
                          {step.label}
                        </span>
                      </button>
                      {i < wizardSteps.length - 1 && (
                        <div className={`flex-1 h-[1px] mx-1 ${i < wizardStep ? "bg-orbital-success/40" : "bg-orbital-border"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 0: Info */}
                {wizardStep === 0 && (
                  <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className={labelClass}>NOME DO CAMPEONATO</label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Ex: ORBITAL CUP #1"
                        className={`${inputClass} placeholder:text-orbital-text-dim/30`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>SEASON (opcional)</label>
                      <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className={inputClass}>
                        <option value="">Nenhuma</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orbital-border p-4">
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-2">FORMATO</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim space-y-1">
                        <p>Eliminação dupla (Winner + Lower bracket)</p>
                        <p>8 times — Perdeu 2 = eliminado</p>
                        <p>Todas as partidas BO1, Grand Final BO3</p>
                        <p>13 partidas no total</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Teams */}
                {wizardStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        SELECIONAR 8 TIMES <span className="text-orbital-purple">({selectedTeams.length}/8)</span>
                      </label>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/60 mb-3">
                        A ordem define o seed (1-8). Arraste para reordenar.
                      </p>

                      {/* Selected teams with seed order */}
                      {selectedTeams.length > 0 && (
                        <div className="mb-4 space-y-1">
                          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-2">
                            SEED ORDER
                          </div>
                          {selectedTeams.map((teamId, i) => {
                            const team = teams.find(t => t.id === teamId);
                            if (!team) return null;
                            return (
                              <div key={teamId} className="flex items-center gap-2 px-3 py-2 bg-orbital-purple/5 border border-orbital-purple/20">
                                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple w-5 text-center">#{i + 1}</span>
                                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text flex-1">{team.name}</span>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => moveTeam(i, -1)} disabled={i === 0} className="p-1 text-orbital-text-dim hover:text-orbital-purple disabled:opacity-20">
                                    <GripVertical size={10} className="rotate-180" />
                                  </button>
                                  <button type="button" onClick={() => moveTeam(i, 1)} disabled={i === selectedTeams.length - 1} className="p-1 text-orbital-text-dim hover:text-orbital-purple disabled:opacity-20">
                                    <GripVertical size={10} />
                                  </button>
                                  <button type="button" onClick={() => toggleTeam(teamId)} className="p-1 text-orbital-text-dim hover:text-orbital-danger">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Available teams */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teams.filter(t => !selectedTeams.includes(t.id)).map(team => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => toggleTeam(team.id)}
                            disabled={selectedTeams.length >= 8}
                            className="flex items-center gap-3 p-3 border text-left transition-all bg-[#0A0A0A] border-orbital-border hover:border-orbital-purple/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Users size={14} className="text-orbital-text-dim" />
                            <div>
                              <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text">
                                {team.name}
                              </div>
                              {team.tag && (
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">[{team.tag}]</span>
                              )}
                            </div>
                            <Plus size={12} className="ml-auto text-orbital-text-dim" />
                          </button>
                        ))}
                      </div>

                      {teams.length < 8 && (
                        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-danger mt-2">
                          Você precisa de pelo menos 8 times cadastrados. Atualmente tem {teams.length}.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Map Pool */}
                {wizardStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        MAP POOL <span className="text-orbital-purple">({mapPool.length}/9)</span>
                      </label>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/60 mb-3">
                        Mínimo 7 mapas para BO1 (6 bans + 1 pick) e BO3 (6 ações + 1 decider)
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {allMaps.map(map => (
                          <button
                            key={map} type="button" onClick={() => toggleMap(map)}
                            className={`px-3 py-2.5 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
                              mapPool.includes(map)
                                ? "bg-orbital-purple/20 border-orbital-purple/50 text-orbital-purple"
                                : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                            }`}
                          >
                            {map.replace("de_", "").toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Confirm */}
                {wizardStep === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-4">
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple">RESUMO DO CAMPEONATO</div>

                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim space-y-2">
                        <p><span className="text-orbital-text">Nome:</span> {name}</p>
                        <p><span className="text-orbital-text">Formato:</span> Eliminação Dupla — 8 times</p>
                        <p><span className="text-orbital-text">Partidas:</span> 12x BO1 + 1x BO3 (Grand Final)</p>
                        <p><span className="text-orbital-text">Map Pool:</span> {mapPool.map(m => m.replace("de_", "")).join(", ")}</p>
                      </div>

                      <div className="border-t border-orbital-border pt-3">
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-2">CHAVEAMENTO (SEED)</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            [0, 7], [1, 6], [2, 5], [3, 4]
                          ].map(([a, b], i) => {
                            const teamA = teams.find(t => t.id === selectedTeams[a]);
                            const teamB = teams.find(t => t.id === selectedTeams[b]);
                            return (
                              <div key={i} className="flex items-center gap-2 px-3 py-2 border border-orbital-border">
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple">QF{i + 1}</span>
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">
                                  #{a + 1} {teamA?.name || "?"} <span className="text-orbital-text-dim">vs</span> #{b + 1} {teamB?.name || "?"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feedback */}
              {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs mt-4 ${
                  feedback.type === "success" ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success" : "bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger"
                }`}>
                  {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                  {feedback.msg}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pb-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s - 1)}
                  disabled={wizardStep === 0}
                  className="flex items-center gap-2 px-4 py-2.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={14} /> VOLTAR
                </button>

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => s + 1)}
                    disabled={!canAdvance(wizardStep)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orbital-purple/15 border border-orbital-purple/40 hover:border-orbital-purple transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    PRÓXIMO <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 hover:border-orbital-purple transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                    {submitting ? "CRIANDO..." : "CRIAR CAMPEONATO"}
                  </button>
                )}
              </div>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tournament List */}
      <div className="space-y-2">
        {tournaments.map((t, i) => {
          const finished = t.matches.filter(m => m.status === "finished").length;
          const total = t.matches.length;
          const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-orbital-card border p-4 hover:border-orbital-purple/20 transition-colors ${
                t.status === "active" ? "border-orbital-live/30" : "border-orbital-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
                    t.status === "active" ? "bg-orbital-live/10 border-orbital-live/30" : "bg-orbital-purple/10 border-orbital-purple/20"
                  }`}>
                    <Trophy size={16} className={t.status === "active" ? "text-orbital-live" : "text-orbital-purple"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/campeonato/${t.id}`}
                        className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider hover:text-orbital-purple transition-colors"
                      >
                        {t.name}
                      </Link>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider ${
                        t.status === "active" ? "text-orbital-live" : t.status === "finished" ? "text-orbital-success" : "text-orbital-warning"
                      }`}>
                        {t.status === "active" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse mr-1" />}
                        {t.status === "active" ? "EM ANDAMENTO" : t.status === "finished" ? "FINALIZADO" : "PENDENTE"}
                      </span>
                    </div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                      {t.teams.length} times — {finished}/{total} partidas — {progress}%
                    </div>
                    {/* Progress bar */}
                    <div className="w-32 h-1 bg-orbital-border mt-1.5">
                      <div className="h-full bg-orbital-purple transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Link
                    href={`/campeonato/${t.id}`}
                    className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors"
                    title="Ver bracket"
                  >
                    <Eye size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors"
                    title="Deletar campeonato"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {tournaments.length === 0 && (
          <HudCard className="text-center py-8">
            <Trophy size={24} className="text-orbital-border mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhum campeonato cadastrado</p>
          </HudCard>
        )}
      </div>
    </div>
  );
}
