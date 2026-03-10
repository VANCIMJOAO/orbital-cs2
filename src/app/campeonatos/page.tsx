"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Eye, Users } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { Tournament } from "@/lib/tournament";

export default function CampeonatosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      setTournaments(data.tournaments || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const active = tournaments.filter(t => t.status === "active");
  const pending = tournaments.filter(t => t.status === "pending");
  const finished = tournaments.filter(t => t.status === "finished");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            CAMPEONATOS
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {tournaments.length} campeonatos registrados
        </p>
      </motion.div>

      {/* Active Tournaments */}
      {active.length > 0 && (
        <Section title="AO VIVO" tournaments={active} delay={0.1} />
      )}

      {/* Pending Tournaments */}
      {pending.length > 0 && (
        <Section title="PENDENTES" tournaments={pending} delay={0.2} />
      )}

      {/* Finished Tournaments */}
      {finished.length > 0 && (
        <Section title="FINALIZADOS" tournaments={finished} delay={0.3} />
      )}

      {tournaments.length === 0 && (
        <HudCard className="text-center py-16">
          <Trophy size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Nenhum campeonato encontrado
          </p>
        </HudCard>
      )}
    </div>
  );
}

function Section({ title, tournaments, delay }: { title: string; tournaments: Tournament[]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-8"
    >
      <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-text-dim mb-3">
        {title}
      </div>
      <div className="grid gap-3">
        {tournaments.map((t, i) => (
          <TournamentCard key={t.id} tournament={t} delay={delay + i * 0.05} />
        ))}
      </div>
    </motion.div>
  );
}

function TournamentCard({ tournament: t, delay }: { tournament: Tournament; delay: number }) {
  const finished = t.matches.filter(m => m.status === "finished").length;
  const total = t.matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  const winner = t.status === "finished"
    ? t.matches.find(m => m.id === "GF")?.winner_id
    : null;
  const winnerTeam = winner ? t.teams.find(tm => tm.id === winner) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={`/campeonato/${t.id}`} className="block group">
        <div className={`relative bg-orbital-card border hover:border-orbital-purple/30 transition-all duration-300 ${
          t.status === "active" ? "border-l-2 border-l-orbital-live border-orbital-border glow-purple-sm" :
          t.status === "finished" ? "border-orbital-success/20" :
          "border-orbital-border"
        }`}>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`status-dot ${
                  t.status === "active" ? "status-live" :
                  t.status === "finished" ? "status-finished" :
                  "status-upcoming"
                }`} />
                <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] uppercase ${
                  t.status === "active" ? "text-orbital-live" :
                  t.status === "finished" ? "text-orbital-text-dim" :
                  "text-orbital-warning"
                }`}>
                  {t.status === "active" ? "AO VIVO" : t.status === "finished" ? "FINALIZADO" : "PENDENTE"}
                </span>
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                Eliminação Dupla
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
                  t.status === "active" ? "bg-orbital-live/10 border-orbital-live/30" : "bg-orbital-purple/10 border-orbital-purple/20"
                }`}>
                  <Trophy size={18} className={t.status === "active" ? "text-orbital-live" : "text-orbital-purple"} />
                </div>
                <div>
                  <div className="font-[family-name:var(--font-orbitron)] text-sm font-semibold tracking-wide text-orbital-text group-hover:text-orbital-purple transition-colors">
                    {t.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      <Users size={10} /> {t.teams.length} times
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      {finished}/{total} partidas
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {winnerTeam && (
                  <div className="text-right">
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-success">CAMPEÃO</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-success font-bold">
                      {winnerTeam.name}
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-end gap-1">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple font-bold">
                    {progress}%
                  </span>
                  <div className="w-20 h-1 bg-orbital-border">
                    <div className="h-full bg-orbital-purple transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <Eye size={14} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
