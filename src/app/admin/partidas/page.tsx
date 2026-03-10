"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Check, AlertCircle, Trash2, Ban, Flag, ChevronUp, Swords, ArrowRight, ArrowLeft, Server as ServerIcon, Users as UsersIcon, Map as MapIcon, Settings } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Match, Team, Server, Season, createMatch, updateMatch, deleteMatch, getServers, getStatusText, getStatusType } from "@/lib/api";

const CS2_MAPS = [
  "de_ancient", "de_anubis", "de_dust2", "de_inferno",
  "de_mirage", "de_nuke", "de_overpass", "de_vertigo",
  "de_train",
];

export default function AdminPartidas() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [serverId, setServerId] = useState("");
  const [numMaps, setNumMaps] = useState("1");
  const [skipVeto, setSkipVeto] = useState(false);
  const [vetoFirst, setVetoFirst] = useState("team1");
  const [sideType, setSideType] = useState("standard");
  const [playersPerTeam, setPlayersPerTeam] = useState("5");
  const [minReady, setMinReady] = useState("5");
  const [seasonId, setSeasonId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);

  const [wizardStep, setWizardStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const wizardSteps = [
    { label: "SERVIDOR", icon: ServerIcon },
    { label: "TIMES", icon: UsersIcon },
    { label: "MAPAS", icon: MapIcon },
    { label: "CONFIG", icon: Settings },
  ];

  const canAdvance = (step: number) => {
    if (step === 0) return !!serverId;
    if (step === 1) return !!team1Id && !!team2Id && team1Id !== team2Id;
    if (step === 2) return !skipVeto || selectedMaps.length >= parseInt(numMaps);
    return true;
  };

  const safeFetch = async (url: string) => {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) return {};
    return r.json();
  };

  const fetchData = async () => {
    try {
      const [matchesRes, teamsRes, serversRes, seasonsRes] = await Promise.all([
        safeFetch("/api/matches"),
        safeFetch("/api/teams"),
        getServers().catch(() => ({ servers: [] })),
        safeFetch("/api/seasons"),
      ]);
      setMatches(matchesRes.matches || []);
      setTeams(teamsRes.teams || []);
      setServers(serversRes.servers || []);
      setSeasons(seasonsRes.seasons || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleMap = (map: string) => {
    setSelectedMaps(prev =>
      prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!team1Id || !team2Id || !serverId) {
      setFeedback({ type: "error", msg: "Selecione os dois times e um servidor." });
      return;
    }
    if (team1Id === team2Id) {
      setFeedback({ type: "error", msg: "Selecione dois times diferentes." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createMatch({
        team1_id: parseInt(team1Id),
        team2_id: parseInt(team2Id),
        server_id: parseInt(serverId),
        num_maps: parseInt(numMaps),
        max_maps: parseInt(numMaps),
        skip_veto: skipVeto,
        veto_first: vetoFirst,
        side_type: sideType,
        players_per_team: parseInt(playersPerTeam),
        min_player_ready: parseInt(minReady),
        season_id: seasonId ? parseInt(seasonId) : undefined,
        title: title || undefined,
        maplist: selectedMaps.length > 0 ? selectedMaps : undefined,
      });
      setFeedback({ type: "success", msg: `Partida #${result.match.id} criada com sucesso!` });
      setTeam1Id(""); setTeam2Id(""); setServerId(""); setTitle(""); setSelectedMaps([]);
      await fetchData();
      setTimeout(() => setShowCreate(false), 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao criar partida" });
    }
    setSubmitting(false);
  };

  const handleCancel = async (match: Match) => {
    if (!confirm(`Cancelar partida #${match.id}?`)) return;
    setActionLoading(match.id);
    try {
      await updateMatch({ match_id: match.id, cancelled: true });
      await fetchData();
    } catch {
      alert("Erro ao cancelar partida");
    }
    setActionLoading(null);
  };

  const handleForfeit = async (match: Match, winnerId: number) => {
    const teamName = winnerId === match.team1_id ? match.team1_string : match.team2_string;
    if (!confirm(`Dar W.O. para "${teamName || `Time ${winnerId}`}"?`)) return;
    setActionLoading(match.id);
    try {
      await updateMatch({ match_id: match.id, forfeit: true, winner: winnerId });
      await fetchData();
    } catch {
      alert("Erro ao aplicar forfeit");
    }
    setActionLoading(null);
  };

  const handleDelete = async (match: Match) => {
    if (!match.cancelled && !match.end_time) {
      alert("Cancele a partida antes de deletar.");
      return;
    }
    if (!confirm(`Deletar partida #${match.id}? Esta ação é irreversível.`)) return;
    setActionLoading(match.id);
    try {
      await deleteMatch(match.id);
      await fetchData();
    } catch {
      alert("Erro ao deletar partida");
    }
    setActionLoading(null);
  };

  const getTeamName = (teamId: number, fallback: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || fallback || `Time ${teamId}`;
  };

  const inputClass = "w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors";
  const labelClass = "block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sort: live first, then pending, then finished
  const sortedMatches = [...matches].sort((a, b) => {
    const order = (m: Match) => {
      const st = getStatusType(m);
      if (st === "live") return 0;
      if (st === "upcoming") return 1;
      if (st === "finished") return 2;
      return 3;
    };
    return order(a) - order(b) || b.id - a.id;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
          PARTIDAS ({matches.length})
        </h2>
        <button
          onClick={() => { setShowCreate(!showCreate); setFeedback(null); setWizardStep(0); }}
          className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
        >
          {showCreate ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showCreate ? "FECHAR" : "NOVA PARTIDA"}
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
            <HudCard label="CRIAR PARTIDA" className="mb-6">
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-8 pt-2">
                {wizardSteps.map((step, i) => {
                  const StepIcon = step.icon;
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
                        {isDone ? <Check size={14} /> : <StepIcon size={14} />}
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

              <form onSubmit={handleCreate}>
                <AnimatePresence mode="wait">
                  {/* Step 0: Servidor */}
                  {wizardStep === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div>
                        <label className={labelClass}>SERVIDOR</label>
                        <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/60 mb-3">
                          Selecione o servidor CS2 onde a partida será jogada
                        </p>
                        <div className="grid gap-2">
                          {servers.map(s => (
                            <button
                              key={s.id} type="button"
                              onClick={() => setServerId(String(s.id))}
                              className={`flex items-center gap-3 p-4 border text-left transition-all ${
                                serverId === String(s.id)
                                  ? "bg-orbital-purple/10 border-orbital-purple/50"
                                  : "bg-[#0A0A0A] border-orbital-border hover:border-orbital-purple/30"
                              }`}
                            >
                              <ServerIcon size={16} className={serverId === String(s.id) ? "text-orbital-purple" : "text-orbital-text-dim"} />
                              <div>
                                <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">
                                  {s.display_name}
                                </div>
                                <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                                  {s.ip_string}:{s.port}
                                </div>
                              </div>
                              {serverId === String(s.id) && <Check size={14} className="text-orbital-purple ml-auto" />}
                            </button>
                          ))}
                          {servers.length === 0 && (
                            <p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-xs py-6">
                              Nenhum servidor cadastrado. <Link href="/admin/servidores" className="text-orbital-purple hover:underline">Adicionar servidor</Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 1: Times */}
                  {wizardStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>TIME 1</label>
                          <select value={team1Id} onChange={e => setTeam1Id(e.target.value)} className={inputClass}>
                            <option value="">Selecionar time...</option>
                            {teams.filter(t => String(t.id) !== team2Id).map(t => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>TIME 2</label>
                          <select value={team2Id} onChange={e => setTeam2Id(e.target.value)} className={inputClass}>
                            <option value="">Selecionar time...</option>
                            {teams.filter(t => String(t.id) !== team1Id).map(t => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                          </select>
                        </div>
                      </div>
                      {team1Id && team2Id && team1Id === team2Id && (
                        <div className="flex items-center gap-2 px-4 py-3 border bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger font-[family-name:var(--font-jetbrains)] text-xs">
                          <AlertCircle size={14} /> Selecione dois times diferentes.
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 2: Mapas */}
                  {wizardStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div>
                        <label className={labelClass}>FORMATO</label>
                        <div className="flex gap-2">
                          {[{ v: "1", l: "BO1" }, { v: "3", l: "BO3" }, { v: "5", l: "BO5" }].map(f => (
                            <button
                              key={f.v} type="button"
                              onClick={() => setNumMaps(f.v)}
                              className={`px-5 py-2.5 border font-[family-name:var(--font-orbitron)] text-xs tracking-wider transition-all ${
                                numMaps === f.v
                                  ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                                  : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                              }`}
                            >
                              {f.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer mb-4">
                          <input type="checkbox" checked={skipVeto} onChange={e => setSkipVeto(e.target.checked)} className="w-4 h-4 accent-orbital-purple" />
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">Pular veto (escolher mapas manualmente)</span>
                        </label>
                      </div>

                      {!skipVeto && (
                        <div>
                          <label className={labelClass}>VETO PRIMEIRO</label>
                          <select value={vetoFirst} onChange={e => setVetoFirst(e.target.value)} className={inputClass}>
                            <option value="team1">Time 1{team1Id ? ` - ${teams.find(t => String(t.id) === team1Id)?.name}` : ""}</option>
                            <option value="team2">Time 2{team2Id ? ` - ${teams.find(t => String(t.id) === team2Id)?.name}` : ""}</option>
                          </select>
                        </div>
                      )}

                      {skipVeto && (
                        <div>
                          <label className={`${labelClass} mb-3`}>
                            SELECIONAR MAPAS {selectedMaps.length > 0 && <span className="text-orbital-purple">({selectedMaps.length}/{numMaps})</span>}
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {CS2_MAPS.map(map => (
                              <button
                                key={map} type="button" onClick={() => toggleMap(map)}
                                className={`px-3 py-2.5 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
                                  selectedMaps.includes(map)
                                    ? "bg-orbital-purple/20 border-orbital-purple/50 text-orbital-purple"
                                    : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                                }`}
                              >
                                {map.replace("de_", "").toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3: Config */}
                  {wizardStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>LADO</label>
                          <select value={sideType} onChange={e => setSideType(e.target.value)} className={inputClass}>
                            <option value="standard">Knife</option>
                            <option value="always_knife">Sempre Knife</option>
                            <option value="never_knife">Sem Knife</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>JOGADORES</label>
                          <select value={playersPerTeam} onChange={e => { setPlayersPerTeam(e.target.value); setMinReady(e.target.value); }} className={inputClass}>
                            <option value="1">1v1</option>
                            <option value="2">2v2</option>
                            <option value="3">3v3</option>
                            <option value="5">5v5</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>SEASON</label>
                          <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className={inputClass}>
                            <option value="">Nenhuma</option>
                            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>TÍTULO (opcional)</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Grand Final - Season 1" className={`${inputClass} placeholder:text-orbital-text-dim/30`} />
                      </div>

                      {/* Summary */}
                      <div className="bg-[#0A0A0A] border border-orbital-border p-4 space-y-2">
                        <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-3">RESUMO</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim space-y-1">
                          <p><span className="text-orbital-text">Servidor:</span> {servers.find(s => String(s.id) === serverId)?.display_name || "—"}</p>
                          <p><span className="text-orbital-text">Time 1:</span> {teams.find(t => String(t.id) === team1Id)?.name || "—"}</p>
                          <p><span className="text-orbital-text">Time 2:</span> {teams.find(t => String(t.id) === team2Id)?.name || "—"}</p>
                          <p><span className="text-orbital-text">Formato:</span> BO{numMaps}</p>
                          <p><span className="text-orbital-text">Veto:</span> {skipVeto ? `Sem veto — ${selectedMaps.join(", ") || "nenhum mapa"}` : `Veto (${vetoFirst === "team1" ? "Time 1" : "Time 2"} primeiro)`}</p>
                          <p><span className="text-orbital-text">Jogadores:</span> {playersPerTeam}v{playersPerTeam}</p>
                          {title && <p><span className="text-orbital-text">Título:</span> {title}</p>}
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
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 hover:border-orbital-purple transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {submitting ? "CRIANDO..." : "CRIAR PARTIDA"}
                    </button>
                  )}
                </div>
              </form>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match List */}
      <div className="space-y-2">
        {sortedMatches.map((match, i) => {
          const statusType = getStatusType(match);
          const statusText = getStatusText(match);
          const isActive = statusType === "live" || statusType === "upcoming";
          const statusColor = statusType === "live" ? "text-orbital-live" : statusType === "upcoming" ? "text-orbital-warning" : statusType === "cancelled" ? "text-orbital-danger" : "text-orbital-text-dim";

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-orbital-card border p-4 hover:border-orbital-purple/20 transition-colors ${
                statusType === "live" ? "border-orbital-live/30" : "border-orbital-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
                    statusType === "live" ? "bg-orbital-live/10 border-orbital-live/30" : "bg-orbital-purple/10 border-orbital-purple/20"
                  }`}>
                    <Swords size={16} className={statusType === "live" ? "text-orbital-live" : "text-orbital-purple"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/partidas/${match.id}`} className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider hover:text-orbital-purple transition-colors">
                        #{match.id}
                      </Link>
                      <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider ${statusColor}`}>
                        {statusType === "live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse mr-1" />}
                        {statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem]">
                      <span className={`${match.winner === match.team1_id ? "text-orbital-success font-bold" : "text-orbital-text-dim"}`}>
                        {getTeamName(match.team1_id, match.team1_string)}
                      </span>
                      <span className="text-orbital-text-dim mx-1">
                        {match.team1_score} - {match.team2_score}
                      </span>
                      <span className={`${match.winner === match.team2_id ? "text-orbital-success font-bold" : "text-orbital-text-dim"}`}>
                        {getTeamName(match.team2_id, match.team2_string)}
                      </span>
                    </div>
                    {match.title && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/50 block mt-0.5 truncate">
                        {match.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {actionLoading === match.id ? (
                    <Loader2 size={14} className="animate-spin text-orbital-text-dim" />
                  ) : (
                    <>
                      {isActive && (
                        <>
                          <button
                            onClick={() => handleCancel(match)}
                            className="p-2 text-orbital-text-dim hover:text-orbital-warning transition-colors"
                            title="Cancelar partida"
                          >
                            <Ban size={14} />
                          </button>
                          <button
                            onClick={() => handleForfeit(match, match.team1_id)}
                            className="p-2 text-orbital-text-dim hover:text-orbital-success transition-colors"
                            title={`W.O. para ${getTeamName(match.team1_id, match.team1_string)}`}
                          >
                            <Flag size={14} />
                          </button>
                        </>
                      )}
                      {(match.cancelled || match.end_time) && (
                        <button
                          onClick={() => handleDelete(match)}
                          className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors"
                          title="Deletar partida"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {matches.length === 0 && (
          <HudCard className="text-center py-8">
            <Swords size={24} className="text-orbital-border mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhuma partida cadastrada</p>
          </HudCard>
        )}
      </div>
    </div>
  );
}
