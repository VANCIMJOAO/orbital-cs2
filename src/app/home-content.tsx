"use client";

import { motion } from "framer-motion";
import { Crosshair, Swords, Users, Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { MatchCard } from "@/components/match-card";
import { Match } from "@/lib/api";

interface HomeContentProps {
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  totalMatches: number;
  teamCount: number;
}

export function HomeContent({ liveMatches, recentMatches, upcomingMatches, totalMatches, teamCount }: HomeContentProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 text-center relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orbital-purple/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-orbital-purple/60" />
            <Crosshair className="text-orbital-purple" size={20} />
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-orbital-purple/60" />
          </div>

          <h1 className="font-[family-name:var(--font-orbitron)] text-4xl sm:text-6xl font-black tracking-wider mb-4">
            <span className="text-orbital-purple glow-purple-text">ORBITAL</span>{" "}
            <span className="text-orbital-text">ROXA</span>
          </h1>

          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim tracking-widest uppercase mb-2">
            Counter-Strike 2 Tournament Platform
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">SYS::ONLINE</span>
            <span className="status-dot status-live" />
          </div>
        </motion.div>
      </section>

      {/* Stats Row */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
      >
        <HudCard className="text-center" delay={0.1}>
          <StatBox label="Partidas" value={totalMatches} />
        </HudCard>
        <HudCard className="text-center" delay={0.2}>
          <StatBox label="Ao Vivo" value={liveMatches.length} />
        </HudCard>
        <HudCard className="text-center" delay={0.3}>
          <StatBox label="Times" value={teamCount} />
        </HudCard>
        <HudCard className="text-center" delay={0.4}>
          <StatBox label="Pendentes" value={upcomingMatches.length} />
        </HudCard>
      </motion.section>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section className="mb-12">
          <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
          <div className="grid gap-4">
            {liveMatches.map((match, i) => (
              <MatchCard key={match.id} match={match} delay={i * 0.1} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Matches */}
      <section className="mb-12">
        <SectionHeader icon={Swords} title="PARTIDAS RECENTES" href="/partidas" />
        {recentMatches.length > 0 ? (
          <div className="grid gap-3">
            {recentMatches.map((match, i) => (
              <MatchCard key={match.id} match={match} delay={i * 0.08} />
            ))}
          </div>
        ) : (
          <HudCard>
            <p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-sm">
              Nenhuma partida finalizada ainda
            </p>
          </HudCard>
        )}
      </section>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <section className="mb-12">
          <SectionHeader icon={Crosshair} title="PRÓXIMAS PARTIDAS" />
          <div className="grid gap-3">
            {upcomingMatches.map((match, i) => (
              <MatchCard key={match.id} match={match} delay={i * 0.08} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink href="/partidas" icon={Swords} label="VER PARTIDAS" desc="Todas as partidas do campeonato" delay={0.1} />
          <QuickLink href="/times" icon={Users} label="VER TIMES" desc="Times registrados" delay={0.2} />
          <QuickLink href="/leaderboard" icon={Activity} label="RANKING" desc="Classificação dos jogadores" delay={0.3} />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, href, accent }: {
  icon: React.ElementType;
  title: string;
  href?: string;
  accent?: "live";
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Icon size={16} className={accent === "live" ? "text-orbital-live" : "text-orbital-purple"} />
        <h2 className={`font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] ${
          accent === "live" ? "text-orbital-live" : "text-orbital-purple"
        }`}>
          {title}
        </h2>
        <div className="h-[1px] w-12 bg-gradient-to-r from-orbital-purple/40 to-transparent" />
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-[0.65rem]">
          Ver todas <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, desc, delay }: {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link href={href} className="block group">
        <div className="bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all p-5 relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Icon size={20} className="text-orbital-purple mb-3" />
          <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em] text-orbital-text mb-1">{label}</h3>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}
