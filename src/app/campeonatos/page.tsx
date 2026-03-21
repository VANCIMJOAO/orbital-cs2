"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, MapPin, Calendar, Swords, Crown, ChevronRight, DollarSign, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HudCard } from "@/components/hud-card";
import { Tournament, getTeamName } from "@/lib/tournament";
import { getTeams } from "@/lib/api";

type TeamsMap = Record<number, { name: string; logo: string | null }>;

export default function CampeonatosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamsMap, setTeamsMap] = useState<TeamsMap>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "finished">("all");
  const [filterFormat, setFilterFormat] = useState<"all" | "double_elimination" | "single_elimination">("all");

  const fetchData = useCallback(async () => {
    try {
      const [tourRes, teamsRes] = await Promise.all([
        fetch("/api/tournaments").then(r => r.json()),
        getTeams(),
      ]);
      setTournaments(tourRes.tournaments || []);
      const map: TeamsMap = {};
      (teamsRes.teams || []).forEach((t: { id: number; name: string; logo: string | null }) => {
        map[t.id] = { name: t.name, logo: t.logo };
      });
      setTeamsMap(map);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = tournaments.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterFormat !== "all") {
      const fmt = t.format || "double_elimination";
      if (fmt !== filterFormat) return false;
    }
    return true;
  });

  const active = filtered.filter(t => t.status === "active");
  const pending = filtered.filter(t => t.status === "pending");
  const finished = filtered.filter(t => t.status === "finished");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={22} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-bold tracking-wider text-orbital-text">
            CAMPEONATOS
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {tournaments.length} {tournaments.length === 1 ? "campeonato registrado" : "campeonatos registrados"}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-4 mb-8"
      >
        {/* Status filter */}
        <div className="flex items-center gap-1">
          <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mr-2">STATUS</span>
          {([
            { value: "all", label: "Todos" },
            { value: "active", label: "Ao Vivo" },
            { value: "pending", label: "Em Breve" },
            { value: "finished", label: "Finalizados" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] border transition-all ${
                filterStatus === opt.value
                  ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                  : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Format filter */}
        <div className="flex items-center gap-1">
          <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim mr-2">FORMATO</span>
          {([
            { value: "all", label: "Todos" },
            { value: "double_elimination", label: "Eliminação Dupla" },
            { value: "single_elimination", label: "Eliminação Simples" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterFormat(opt.value)}
              className={`px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] border transition-all ${
                filterFormat === opt.value
                  ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                  : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Active */}
      {active.length > 0 && (
        <Section title="AO VIVO" color="text-red-500" tournaments={active} teamsMap={teamsMap} delay={0.1} />
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <Section title="EM BREVE" color="text-yellow-500" tournaments={pending} teamsMap={teamsMap} delay={0.2} />
      )}

      {/* Finished */}
      {finished.length > 0 && (
        <Section title="FINALIZADOS" color="text-emerald-500" tournaments={finished} teamsMap={teamsMap} delay={0.3} />
      )}

      {filtered.length === 0 && (
        <HudCard className="text-center py-16">
          <Trophy size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            {tournaments.length === 0 ? "Nenhum campeonato encontrado" : "Nenhum campeonato corresponde aos filtros"}
          </p>
          {tournaments.length > 0 && (
            <button
              onClick={() => { setFilterStatus("all"); setFilterFormat("all"); }}
              className="mt-3 px-4 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple border border-orbital-purple/30 hover:bg-orbital-purple/10 transition-all"
            >
              LIMPAR FILTROS
            </button>
          )}
        </HudCard>
      )}
    </div>
  );
}

function Section({ title, color, tournaments, teamsMap, delay }: { title: string; color: string; tournaments: Tournament[]; teamsMap: TeamsMap; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-[1px] w-4 ${color === "text-red-500" ? "bg-red-500/40" : color === "text-yellow-500" ? "bg-yellow-500/40" : "bg-emerald-500/40"}`} />
        <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] ${color}`}>
          {title}
        </span>
        <div className={`h-[1px] flex-1 ${color === "text-red-500" ? "bg-red-500/15" : color === "text-yellow-500" ? "bg-yellow-500/15" : "bg-emerald-500/15"}`} />
      </div>
      <div className="grid gap-4">
        {tournaments.map((t, i) => (
          <TournamentCard key={t.id} tournament={t} teamsMap={teamsMap} delay={delay + i * 0.05} />
        ))}
      </div>
    </motion.div>
  );
}

function TournamentCard({ tournament: t, teamsMap, delay }: { tournament: Tournament; teamsMap: TeamsMap; delay: number }) {
  const finished = t.matches.filter(m => m.status === "finished").length;
  const total = t.matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  const gf = t.matches.find(m => m.bracket === "grand_final" || m.id === "GF");
  const winnerId = gf?.winner_id;
  const winnerTeam = winnerId ? t.teams.find(tm => tm.id === winnerId) : null;
  const winnerLogo = winnerId ? teamsMap[winnerId]?.logo : null;

  const formatLabel = t.format === "double_elimination" ? "Eliminação Dupla" : t.format || "Eliminação Dupla";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={`/campeonato/${t.id}`} className="block group">
        <div className="relative overflow-hidden border border-orbital-border hover:border-orbital-purple/30 transition-all duration-300">
          {/* Background image */}
          <div className="absolute inset-0">
            <img src="https://i.imgur.com/0irj00x.jpeg" alt="" className="w-full h-full object-cover opacity-20 group-hover:opacity-25 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/90 to-[#0A0A0A]/70" />
          </div>

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-orbital-purple/30" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-orbital-purple/30" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-orbital-purple/30" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-orbital-purple/30" />

          {/* Live indicator */}
          {t.status === "active" && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-red-500">LIVE</span>
            </div>
          )}

          <div className="relative p-6">
            {/* Top row: Status + Format */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {t.status === "finished" && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30">
                    <Trophy size={10} className="text-emerald-500" />
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-emerald-500">FINALIZADO</span>
                  </span>
                )}
                {t.status === "pending" && (
                  <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30">
                    <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-yellow-500">EM BREVE</span>
                  </span>
                )}
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                {formatLabel}
              </span>
            </div>

            {/* Tournament name + info */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <h2 className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl font-bold tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors mb-2">
                  {t.name}
                </h2>
                <div className="flex items-center gap-4 flex-wrap">
                  {t.start_date && (
                    <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      <Calendar size={11} className="text-orbital-purple/60" />
                      {new Date(t.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  )}
                  {t.location && (
                    <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      <MapPin size={11} className="text-orbital-purple/60" />
                      {t.location}
                    </span>
                  )}
                  {t.prize_pool && (
                    <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      <DollarSign size={11} className="text-orbital-purple/60" />
                      {t.prize_pool}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                    <Swords size={11} className="text-orbital-purple/60" />
                    {finished}/{total} partidas
                  </span>
                </div>
              </div>

              {/* Champion badge */}
              {winnerTeam && (
                <div className="flex items-center gap-3 shrink-0 px-4 py-3 bg-amber-500/5 border border-amber-500/30">
                  {winnerLogo && (
                    <Image src={winnerLogo} alt={winnerTeam.name} width={36} height={36} className="object-contain" unoptimized />
                  )}
                  <div>
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-amber-500/70">CAMPEÃO</div>
                    <div className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-wider text-amber-400">{winnerTeam.name}</div>
                  </div>
                  <Crown size={18} className="text-amber-500/40" />
                </div>
              )}
            </div>

            {/* Teams row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {t.teams.slice(0, 8).map(team => {
                  const logo = teamsMap[team.id]?.logo;
                  return (
                    <div
                      key={team.id}
                      className={`w-8 h-8 border flex items-center justify-center ${
                        winnerId === team.id ? "border-amber-500/40 bg-amber-500/10" : "border-orbital-border/50 bg-white/[0.02]"
                      }`}
                      title={team.name}
                    >
                      {logo ? (
                        <Image src={logo} alt={team.name} width={22} height={22} className="object-contain" unoptimized />
                      ) : (
                        <Users size={12} className="text-orbital-text-dim/30" />
                      )}
                    </div>
                  );
                })}
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim ml-2">
                  {t.teams.length} times
                </span>
              </div>

              {/* Progress + arrow */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple font-bold">
                    {progress}%
                  </span>
                  <div className="w-24 h-1 bg-orbital-border">
                    <div className="h-full bg-gradient-to-r from-orbital-purple to-orbital-purple-bright transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <ChevronRight size={16} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
