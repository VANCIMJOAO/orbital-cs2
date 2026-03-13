"use client";

import { motion } from "framer-motion";
import { Swords, Users, Server, Calendar, ArrowRight, BarChart3, Trophy, Globe, UserCheck, Radio } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Match, Team, Season, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";

const quickLinks = [
  { href: "/admin/partidas", label: "Criar Partida", icon: Swords, desc: "Configurar e iniciar uma nova partida", color: "text-orbital-success" },
  { href: "/admin/times", label: "Gerenciar Times", icon: Users, desc: "Criar, editar ou remover times", color: "text-orbital-purple" },
  { href: "/admin/servidores", label: "Gerenciar Servidores", icon: Server, desc: "Adicionar e configurar servidores CS2", color: "text-orbital-warning" },
  { href: "/admin/seasons", label: "Gerenciar Seasons", icon: Calendar, desc: "Criar e configurar temporadas", color: "text-orbital-live" },
];

interface Metrics {
  totalMatches: number;
  liveMatches: number;
  finishedMatches: number;
  totalTeams: number;
  totalServers: number;
  totalSeasons: number;
  uniquePlayers: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [matchesRes, teamsRes, serversRes, seasonsRes, leaderboardRes, tournamentsRes] = await Promise.all([
          fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({ matches: [] })),
          fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
          fetch("/api/servers", { credentials: "include" }).then(r => r.json()).catch(() => ({ servers: [] })),
          fetch("/api/seasons", { credentials: "include" }).then(r => r.json()).catch(() => ({ seasons: [] })),
          fetch("/api/leaderboard", { credentials: "include" }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
          fetch("/api/tournaments").then(r => r.json()).catch(() => ({ tournaments: [] })),
        ]);
        const allTournaments: Tournament[] = tournamentsRes.tournaments || [];
        setActiveTournaments(allTournaments.filter(t => t.status !== "finished"));
        const matches: Match[] = matchesRes.matches || [];
        const teams: Team[] = teamsRes.teams || [];
        const servers = serversRes.servers || [];
        const seasons: Season[] = seasonsRes.seasons || [];
        const leaderboard = leaderboardRes.leaderboard || [];

        setMetrics({
          totalMatches: matches.length,
          liveMatches: matches.filter(m => getStatusType(m) === "live").length,
          finishedMatches: matches.filter(m => getStatusType(m) === "finished").length,
          totalTeams: teams.length,
          totalServers: servers.length,
          totalSeasons: seasons.length,
          uniquePlayers: leaderboard.length,
        });
      } catch { /* */ }
    }
    fetchMetrics();
  }, []);

  const metricCards = metrics ? [
    { label: "PARTIDAS", value: metrics.totalMatches, icon: Swords, color: "text-orbital-purple" },
    { label: "AO VIVO", value: metrics.liveMatches, icon: BarChart3, color: "text-orbital-live" },
    { label: "FINALIZADAS", value: metrics.finishedMatches, icon: Trophy, color: "text-orbital-success" },
    { label: "TIMES", value: metrics.totalTeams, icon: Users, color: "text-orbital-purple" },
    { label: "SERVIDORES", value: metrics.totalServers, icon: Globe, color: "text-orbital-warning" },
    { label: "JOGADORES", value: metrics.uniquePlayers, icon: UserCheck, color: "text-orbital-text" },
    { label: "SEASONS", value: metrics.totalSeasons, icon: Calendar, color: "text-orbital-live" },
  ] : [];

  return (
    <div>
      {/* Welcome */}
      <HudCard label="DASHBOARD" className="mb-6">
        <div className="py-2">
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-orbital-text tracking-wider">
            Olá, {user?.name}
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Gerencie partidas, times, servidores e seasons da ORBITAL ROXA.
          </p>
        </div>
      </HudCard>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {metricCards.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-orbital-card border border-orbital-border p-4 text-center"
              >
                <Icon size={16} className={`${m.color} mx-auto mb-2`} />
                <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">
                  {m.value}
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim mt-1">
                  {m.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Mission Control Shortcuts */}
      {activeTournaments.length > 0 && (
        <div className="mb-6 space-y-2">
          {activeTournaments.map((t, i) => {
            const finished = t.matches.filter(m => m.status === "finished").length;
            const total = t.matches.length;
            const liveMatch = t.matches.find(m => m.status === "live");
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Link href={`/admin/campeonato/${t.id}`} className="block group">
                  <div className={`relative border p-4 transition-all duration-300 ${
                    t.status === "active"
                      ? "bg-orbital-live/5 border-orbital-live/30 hover:border-orbital-live/60"
                      : "bg-orbital-purple/5 border-orbital-purple/20 hover:border-orbital-purple/50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
                          t.status === "active" ? "bg-orbital-live/10 border-orbital-live/30" : "bg-orbital-purple/10 border-orbital-purple/20"
                        }`}>
                          <Radio size={18} className={t.status === "active" ? "text-orbital-live" : "text-orbital-purple"} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider truncate">
                              {t.name}
                            </span>
                            {liveMatch && (
                              <span className="flex items-center gap-1 font-[family-name:var(--font-orbitron)] text-[0.45rem] text-orbital-live animate-pulse shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-orbital-live shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                            Mission Control — {finished}/{total} partidas
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link, i) => {
          const Icon = link.icon;
          return (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            >
              <Link href={link.href} className="block group">
                <div className="relative bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all duration-300 p-5">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center">
                        <Icon size={18} className={link.color} />
                      </div>
                      <div>
                        <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                          {link.label}
                        </h3>
                        <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-0.5">
                          {link.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors mt-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
