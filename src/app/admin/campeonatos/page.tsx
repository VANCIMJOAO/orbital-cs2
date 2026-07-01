"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Check, AlertCircle, ChevronUp, Trophy, Trash2, Eye, ArrowRight, ArrowLeft, Users, Radio, ClipboardList, Pencil } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Team, Season } from "@/lib/api";
import {
  Tournament,
  TournamentTeam,
  generateDoubleEliminationBracket,
  generateSwissInitialRound,
  getDefaultMapPool,
} from "@/lib/tournament";
import { getTargetTournament, buildConfirmedTeams, isTeamConfirmed, type InscricaoLite } from "@/lib/confirmados";
import { MAP_IMAGES } from "@/lib/maps";

export default function AdminCampeonatos() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [inscricoes, setInscricoes] = useState<InscricaoLite[]>([]);
  const [loading, setLoading] = useState(true);

  // "Abrir inscrições": cria campeonato pending sem bracket; "finalizar": monta o bracket depois
  const [finalizeId, setFinalizeId] = useState<string | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [openSubmitting, setOpenSubmitting] = useState(false);
  // Edição de campeonato existente (infos + map pool, SEM tocar em times/bracket)
  const [editId, setEditId] = useState<string | null>(null);

  // Wizard state
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [description, setDescription] = useState("");
  const [spectatorAuth, setSpectatorAuth] = useState("76561198806637089;ORBITAL ROXA");
  const [format, setFormat] = useState<"double_elimination" | "swiss">("double_elimination");
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [mapPool, setMapPool] = useState<string[]>(getDefaultMapPool());
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tournamentsRes, teamsRes, seasonsRes, inscRes] = await Promise.all([
        fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
        fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
        fetch("/api/seasons", { credentials: "include" }).then(r => r.json()).catch(() => ({ seasons: [] })),
        fetch("/api/inscricao", { credentials: "include" }).then(r => r.json()).catch(() => ({ inscricoes: [] })),
      ]);
      setTournaments(tournamentsRes.tournaments || []);
      setTeams(teamsRes.teams || []);
      setSeasons(seasonsRes.seasons || []);
      setInscricoes(inscRes.inscricoes || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Times confirmados (selo INSCRITO no seletor). Ao finalizar um campeonato,
  // usa os inscritos DELE; senão, do camp alvo (ativo/aberto).
  const campForSelos = finalizeId
    ? (tournaments.find(t => t.id === finalizeId) ?? null)
    : getTargetTournament(tournaments);
  const confirmedTeams = buildConfirmedTeams(inscricoes, campForSelos?.id ?? null);
  const teamInscrito = (team: Team) => isTeamConfirmed(team, confirmedTeams);

  const toggleTeam = (teamId: number) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : prev.length < requiredTeams.max ? [...prev, teamId] : prev
    );
  };

  // Seleciona de uma vez todos os times inscritos no camp ativo (respeitando o máximo)
  const selectInscritos = () => {
    const inscritoIds = teams.filter(teamInscrito).map(t => t.id);
    setSelectedTeams(prev => {
      const merged = [...prev];
      for (const id of inscritoIds) {
        if (!merged.includes(id) && merged.length < requiredTeams.max) merged.push(id);
      }
      return merged;
    });
  };

  const toggleMap = (map: string) => {
    setMapPool(prev =>
      prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map]
    );
  };

  const requiredTeams = format === "swiss" ? { min: 8, max: 16 } : { min: 8, max: 8 };

  const canAdvance = (step: number) => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) {
      return selectedTeams.length >= requiredTeams.min && selectedTeams.length <= requiredTeams.max && selectedTeams.length % 2 === 0;
    }
    if (step === 2) return mapPool.length >= 7;
    return true;
  };

  // Abre um campeonato só pra receber inscrições: pending, sem times nem bracket.
  // O bracket é montado depois ("MONTAR BRACKET") com os times confirmados.
  const openInscricoes = async () => {
    if (!name.trim()) { setFeedback({ type: "error", msg: "Dê um nome ao campeonato." }); return; }
    setOpenSubmitting(true);
    setFeedback(null);
    try {
      const tournament: Tournament = {
        id: `t-${Date.now()}`,
        name: name.trim(),
        season_id: seasonId ? parseInt(seasonId) : null,
        server_id: null,
        format: "double_elimination",
        mode: "presencial",
        teams: [],
        matches: [],
        map_pool: mapPool.length >= 7 ? mapPool : getDefaultMapPool(),
        players_per_team: 5,
        created_at: new Date().toISOString(),
        status: "pending",
        current_match_id: null,
        start_date: startDate || null,
        end_date: endDate || null,
        location: location || null,
        prize_pool: prizePool || null,
        description: description || null,
        spectator_auth: spectatorAuth || null,
      };
      const res = await fetch("/api/tournaments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournament),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || `Erro ao abrir inscrições (${res.status})` });
        setOpenSubmitting(false);
        return;
      }
      setFeedback({ type: "success", msg: `Inscrições abertas para "${tournament.name}"! Já aparece no formulário /inscricao.` });
      setName(""); setSeasonId(""); setStartDate(""); setEndDate(""); setLocation(""); setPrizePool(""); setDescription("");
      await fetchData();
      setTimeout(() => { setShowOpen(false); }, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao abrir inscrições" });
    }
    setOpenSubmitting(false);
  };

  // Pré-carrega o wizard pra montar o bracket de um campeonato já aberto (mantém o mesmo id).
  const startFinalize = (t: Tournament) => {
    setFinalizeId(t.id);
    setName(t.name);
    setSeasonId(t.season_id ? String(t.season_id) : "");
    setStartDate(t.start_date || "");
    setEndDate(t.end_date || "");
    setLocation(t.location || "");
    setPrizePool(t.prize_pool || "");
    setDescription(t.description || "");
    setFormat(t.format);
    setMapPool(t.map_pool?.length ? t.map_pool : getDefaultMapPool());
    setSelectedTeams(t.teams.map(tt => tt.id));
    setShowOpen(false);
    setFeedback(null);
    setShowCreate(true);
    setWizardStep(1); // pula direto pra seleção de times
  };

  // Edita infos + map pool de um campeonato existente SEM tocar em times/bracket/status.
  const startEdit = (t: Tournament) => {
    setEditId(t.id);
    setName(t.name);
    setSeasonId(t.season_id ? String(t.season_id) : "");
    setStartDate(t.start_date || "");
    setEndDate(t.end_date || "");
    setLocation(t.location || "");
    setPrizePool(t.prize_pool || "");
    setDescription(t.description || "");
    setSpectatorAuth(t.spectator_auth || "");
    setMapPool(t.map_pool?.length ? t.map_pool : getDefaultMapPool());
    setShowCreate(false);
    setFinalizeId(null);
    setFeedback(null);
    setShowOpen(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditSave = async () => {
    const existing = tournaments.find(t => t.id === editId);
    if (!existing) return;
    if (!name.trim()) { setFeedback({ type: "error", msg: "Dê um nome ao campeonato." }); return; }
    if (mapPool.length < 7) { setFeedback({ type: "error", msg: "Map pool precisa de pelo menos 7 mapas (veto BO1/BO3)." }); return; }
    setOpenSubmitting(true);
    setFeedback(null);
    try {
      // Merge: só infos + map pool. Times, bracket, status, formato etc. ficam intactos.
      const updated: Tournament = {
        ...existing,
        name: name.trim(),
        season_id: seasonId ? parseInt(seasonId) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        location: location || null,
        prize_pool: prizePool || null,
        description: description || null,
        spectator_auth: spectatorAuth || null,
        map_pool: mapPool,
      };
      const res = await fetch("/api/tournaments", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || `Erro ao salvar (${res.status})` });
        setOpenSubmitting(false);
        return;
      }
      setFeedback({ type: "success", msg: `"${updated.name}" atualizado!` });
      await fetchData();
      setTimeout(() => { setShowOpen(false); setEditId(null); }, 1200);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao salvar" });
    }
    setOpenSubmitting(false);
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

      const actualFormat = format;

      let matches: ReturnType<typeof generateDoubleEliminationBracket>;
      let swissRecords: Tournament["swiss_records"] = undefined;

      if (actualFormat === "swiss") {
        const swiss = generateSwissInitialRound(tournamentTeams);
        matches = swiss.matches;
        swissRecords = swiss.records;
      } else {
        matches = generateDoubleEliminationBracket(tournamentTeams);
      }

      // Modo finalizar: mantém o mesmo id (preserva o vínculo das inscrições) e dá PUT
      const existing = finalizeId ? tournaments.find(t => t.id === finalizeId) : null;

      const tournament: Tournament = {
        id: finalizeId || `t-${Date.now()}`,
        name: name.trim(),
        season_id: seasonId ? parseInt(seasonId) : null,
        server_id: null,
        format: actualFormat,
        mode: "presencial",
        teams: tournamentTeams,
        matches,
        map_pool: mapPool,
        players_per_team: 5,
        created_at: existing?.created_at || new Date().toISOString(),
        status: "pending",
        current_match_id: null,
        ...(swissRecords ? { swiss_records: swissRecords, swiss_round: 1, swiss_advance_wins: 3, swiss_eliminate_losses: 3 } : {}),
        start_date: startDate || null,
        end_date: endDate || null,
        location: location || null,
        prize_pool: prizePool || null,
        description: description || null,
        spectator_auth: spectatorAuth || null,
      };

      const res = await fetch("/api/tournaments", {
        method: finalizeId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tournament),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || `Erro ao salvar campeonato (${res.status})` });
        setSubmitting(false);
        return;
      }

      setFeedback({ type: "success", msg: finalizeId ? `Bracket de "${tournament.name}" montado!` : `Campeonato "${tournament.name}" criado com sucesso!` });
      setFinalizeId(null);
      setName("");
      setSelectedTeams([]);
      setMapPool(getDefaultMapPool());
      setSeasonId("");
      setStartDate("");
      setEndDate("");
      setLocation("");
      setPrizePool("");
      setDescription("");
      setFormat("double_elimination");
      await fetchData();
      setTimeout(() => { setShowCreate(false); setWizardStep(0); }, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao criar campeonato" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este campeonato? Esta ação é irreversível.")) return;
    const res = await fetch("/api/tournaments", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      setFeedback({ type: "error", msg: "Erro ao deletar campeonato" });
      return;
    }
    await fetchData();
  };

  const inputClass = "w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors";
  const labelClass = "block font-[family-name:var(--font-russo)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2";

  // Todos os mapas com imagem ficam selecionáveis no wizard (inclui Cache,
  // Overpass, Train — não só o active duty do getDefaultMapPool)
  const allMaps = Object.keys(MAP_IMAGES).sort();

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
        <h2 className="font-[family-name:var(--font-russo)] text-sm font-bold text-orbital-text tracking-wider">
          CAMPEONATOS ({tournaments.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !showOpen;
              if (next) {
                // abre limpo (não herda valores de uma edição anterior)
                setEditId(null); setName(""); setSeasonId(""); setStartDate(""); setEndDate("");
                setLocation(""); setPrizePool(""); setDescription(""); setMapPool(getDefaultMapPool());
                setSpectatorAuth("76561198806637089;ORBITAL ROXA");
              } else {
                setEditId(null);
              }
              setShowOpen(next); setShowCreate(false); setFinalizeId(null); setFeedback(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-success/10 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-success"
          >
            {showOpen ? <ChevronUp size={14} /> : <ClipboardList size={14} />}
            {showOpen ? "FECHAR" : "ABRIR INSCRIÇÕES"}
          </button>
          <button
            onClick={() => {
              if (showCreate) { setShowCreate(false); return; }
              setFinalizeId(null); setName(""); setSelectedTeams([]); setMapPool(getDefaultMapPool());
              setSeasonId(""); setStartDate(""); setEndDate(""); setLocation(""); setPrizePool(""); setDescription("");
              setFormat("double_elimination"); setShowOpen(false); setFeedback(null); setWizardStep(0); setShowCreate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            {showCreate ? <ChevronUp size={14} /> : <Plus size={14} />}
            {showCreate ? "FECHAR" : "NOVO CAMPEONATO"}
          </button>
        </div>
      </div>

      {/* Abrir inscrições (novo) / Editar campeonato existente */}
      {showOpen && (
        <HudCard label={editId ? `EDITAR — ${tournaments.find(t => t.id === editId)?.name ?? ""}` : "ABRIR INSCRIÇÕES"} className="mb-6">
          <div className="space-y-4 py-2">
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/70">
              {editId ? (
                <>Edita infos e map pool. <span className="text-orbital-warning">Times, bracket e status não são alterados.</span></>
              ) : (
                <>Cria o campeonato já aberto pra receber inscrições em <span className="text-orbital-purple">/inscricao</span>, sem os times.
                Depois você monta o bracket com os confirmados clicando em <span className="text-orbital-success">MONTAR BRACKET</span>.</>
              )}
            </p>
            <div>
              <label className={labelClass}>NOME DO CAMPEONATO</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ORBITAL ROXA CUP #2" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
            </div>
            <div>
              <label className={labelClass}>SEASON (opcional)</label>
              <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className={inputClass}>
                <option value="">Nenhuma</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>DATA INÍCIO (opcional)</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DATA FIM (opcional)</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>LOCAL (opcional)</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Ribeirão Preto - SP" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
              </div>
              <div>
                <label className={labelClass}>PREMIAÇÃO (opcional)</label>
                <input type="text" value={prizePool} onChange={e => setPrizePool(e.target.value)} placeholder="Ex: R$ 2.000" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>DESCRIÇÃO (opcional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição breve do campeonato..." rows={2} className={`${inputClass} placeholder:text-orbital-text-dim/50 resize-none`} />
            </div>
            <div>
              <label className={labelClass}>SPECTATOR AUTH (SteamID64;Nome)</label>
              <input type="text" value={spectatorAuth} onChange={e => setSpectatorAuth(e.target.value)} placeholder="76561198806637089;ORBITAL ROXA" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50 mt-1">SteamID64 da conta que fará a transmissão ao vivo</p>
            </div>
            <div>
              <label className={labelClass}>
                MAP POOL <span className="text-orbital-purple">({mapPool.length}/{allMaps.length})</span> — mínimo 7
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {allMaps.map(map => (
                  <button
                    key={map} type="button" onClick={() => toggleMap(map)}
                    className={`px-3 py-2.5 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
                      mapPool.includes(map)
                        ? "bg-orbital-purple/20 border-orbital-purple/50 text-orbital-purple"
                        : "bg-orbital-bg border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                    }`}
                  >
                    {map.replace("de_", "").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {feedback && (
              <div className={`flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs ${
                feedback.type === "success" ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success" : "bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger"
              }`}>
                {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                {feedback.msg}
              </div>
            )}
            <button
              onClick={editId ? handleEditSave : openInscricoes}
              disabled={openSubmitting || !name.trim() || mapPool.length < 7}
              className="flex items-center gap-2 px-6 py-2.5 bg-orbital-success/15 border border-orbital-success/40 hover:border-orbital-success transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-success disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {openSubmitting ? <Loader2 size={14} className="animate-spin" /> : editId ? <Check size={14} /> : <ClipboardList size={14} />}
              {openSubmitting ? "SALVANDO..." : editId ? "SALVAR ALTERAÇÕES" : "ABRIR INSCRIÇÕES"}
            </button>
          </div>
        </HudCard>
      )}

      {/* Create Wizard */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <HudCard label={finalizeId ? `MONTAR BRACKET — ${name}` : "CRIAR CAMPEONATO"} className="mb-6">
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
                        <span className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] hidden sm:inline">
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
                        className={`${inputClass} placeholder:text-orbital-text-dim/50`}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>SEASON (opcional)</label>
                      <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className={inputClass}>
                        <option value="">Nenhuma</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>DATA INÍCIO</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>DATA FIM</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>LOCALIZAÇÃO (opcional)</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: São Paulo, BR" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
                      </div>
                      <div>
                        <label className={labelClass}>PREMIAÇÃO (opcional)</label>
                        <input type="text" value={prizePool} onChange={e => setPrizePool(e.target.value)} placeholder="Ex: R$ 5.000" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>DESCRIÇÃO (opcional)</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição breve do campeonato..." rows={2} className={`${inputClass} placeholder:text-orbital-text-dim/50 resize-none`} />
                    </div>
                    <div>
                      <label className={labelClass}>SPECTATOR AUTH (SteamID64;Nome)</label>
                      <input type="text" value={spectatorAuth} onChange={e => setSpectatorAuth(e.target.value)} placeholder="76561198806637089;ORBITAL ROXA" className={`${inputClass} placeholder:text-orbital-text-dim/50`} />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50 mt-1">SteamID64 da conta que fará a transmissão ao vivo</p>
                    </div>
                    <div className="bg-[#0A0A0A] border border-orbital-border p-4">
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] mb-2 text-orbital-purple">
                        FORMATO
                      </div>
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
                        SELECIONAR TIMES <span className="text-orbital-purple">({selectedTeams.length}/{format === "swiss" ? `${requiredTeams.min}-${requiredTeams.max}` : requiredTeams.min})</span>
                      </label>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/60 mb-3">
                        {format === "swiss"
                          ? `Selecione entre ${requiredTeams.min} e ${requiredTeams.max} times (número par).`
                          : "Selecione os 8 times participantes."}
                      </p>

                      {/* Atalho: puxar os times inscritos no campeonato */}
                      {campForSelos && teams.some(teamInscrito) && (
                        <button
                          type="button"
                          onClick={selectInscritos}
                          className="flex items-center gap-2 mb-3 px-3 py-2 bg-orbital-success/10 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-success"
                        >
                          <Plus size={12} />
                          Selecionar inscritos do {campForSelos.name} ({teams.filter(teamInscrito).length})
                        </button>
                      )}


                      {/* Selected teams with seed order */}
                      {selectedTeams.length > 0 && (
                        <div className="mb-4 space-y-1">
                          <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple mb-2">
                            TIMES SELECIONADOS
                          </div>
                          {selectedTeams.map((teamId) => {
                            const team = teams.find(t => t.id === teamId);
                            if (!team) return null;
                            return (
                              <div key={teamId} className="flex items-center gap-2 px-3 py-2 bg-orbital-purple/5 border border-orbital-purple/20">
                                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text flex-1">{team.name}</span>
                                {teamInscrito(team) && (
                                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] px-1 py-px bg-orbital-success/10 text-orbital-success border border-orbital-success/30">INSCRITO</span>
                                )}
                                <div className="flex items-center gap-1">
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
                            disabled={selectedTeams.length >= requiredTeams.max}
                            className="flex items-center gap-3 p-3 border text-left transition-all bg-[#0A0A0A] border-orbital-border hover:border-orbital-purple/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Users size={14} className="text-orbital-text-dim" />
                            <div>
                              <div className="font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-text">
                                {team.name}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {team.tag && (
                                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">[{team.tag}]</span>
                                )}
                                {teamInscrito(team) && (
                                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] px-1 py-px bg-orbital-success/10 text-orbital-success border border-orbital-success/30">INSCRITO</span>
                                )}
                              </div>
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
                        MAP POOL <span className="text-orbital-purple">({mapPool.length}/{allMaps.length})</span>
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
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">RESUMO DO CAMPEONATO</div>

                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim space-y-2">
                        <p><span className="text-orbital-text">Nome:</span> {name}</p>
                        <p><span className="text-orbital-text">Formato:</span> {format === "swiss" ? `Swiss System — ${selectedTeams.length} times` : "Eliminação Dupla — 8 times"}</p>
                        <p><span className="text-orbital-text">Partidas:</span> {format === "swiss" ? `~${Math.ceil(selectedTeams.length / 2) * 5} partidas (5 rounds)` : "12x BO1 + 1x BO3 (Grand Final)"}</p>
                        <p><span className="text-orbital-text">Map Pool:</span> {mapPool.map(m => m.replace("de_", "")).join(", ")}</p>
                        {startDate && <p><span className="text-orbital-text">Período:</span> {startDate}{endDate ? ` — ${endDate}` : ""}</p>}
                        {location && <p><span className="text-orbital-text">Local:</span> {location}</p>}
                        {prizePool && <p><span className="text-orbital-text">Premiação:</span> {prizePool}</p>}
                      </div>

                      <div className="border-t border-orbital-border pt-3">
                        <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-text-dim mb-2">CHAVEAMENTO</div>
                        <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                          Os confrontos das quartas de final serão sorteados aleatoriamente ao criar o campeonato.
                        </p>
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
                  className="flex items-center gap-2 px-4 py-2.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-text-dim disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={14} /> VOLTAR
                </button>

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => s + 1)}
                    disabled={!canAdvance(wizardStep)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orbital-purple/15 border border-orbital-purple/40 hover:border-orbital-purple transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    PRÓXIMO <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 hover:border-orbital-purple transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                    {submitting ? "SALVANDO..." : finalizeId ? "MONTAR BRACKET" : "CRIAR CAMPEONATO"}
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
          // Campeonato aberto pra inscrições: pending e ainda sem bracket
          const isOpen = t.status === "pending" && t.matches.length === 0;
          const inscritosCount = inscricoes.filter(
            ins => ins.tournament_id === t.id && (ins.status === "aprovado" || ins.status === "pago")
          ).length;

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
                        className="font-[family-name:var(--font-russo)] text-xs font-bold text-orbital-text tracking-wider hover:text-orbital-purple transition-colors"
                      >
                        {t.name}
                      </Link>
                      <span className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider ${
                        t.status === "active" ? "text-orbital-live" : t.status === "finished" ? "text-orbital-success" : isOpen ? "text-orbital-success" : "text-orbital-warning"
                      }`}>
                        {t.status === "active" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse mr-1" />}
                        {t.status === "active" ? "EM ANDAMENTO" : t.status === "finished" ? "FINALIZADO" : isOpen ? "INSCRIÇÕES ABERTAS" : "PENDENTE"}
                      </span>
                    </div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                      {isOpen
                        ? `${inscritosCount} ${inscritosCount === 1 ? "time confirmado" : "times confirmados"} — bracket ainda não montado`
                        : `${t.teams.length} times — ${finished}/${total} partidas — ${progress}%`}
                    </div>
                    {/* Progress bar */}
                    <div className="w-32 h-1 bg-orbital-border mt-1.5">
                      <div className="h-full bg-orbital-purple transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isOpen && (
                    <button
                      onClick={() => startFinalize(t)}
                      className="flex items-center gap-1.5 px-3 py-2 mr-1 bg-orbital-success/10 border border-orbital-success/30 hover:border-orbital-success/60 transition-all font-[family-name:var(--font-russo)] text-[0.55rem] tracking-wider text-orbital-success"
                      title="Montar o bracket com os times confirmados"
                    >
                      <Trophy size={12} /> MONTAR BRACKET
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(t)}
                    className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors"
                    title="Editar infos e map pool"
                  >
                    <Pencil size={14} />
                  </button>
                  <Link
                    href={`/admin/campeonato/${t.id}`}
                    className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors"
                    title="Mission Control"
                  >
                    <Radio size={14} />
                  </Link>
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
