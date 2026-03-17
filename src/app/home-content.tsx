"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Swords, Users, Activity, ChevronRight, Calendar, Eye, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { MatchCard } from "@/components/match-card";
import { Match } from "@/lib/api";
import { Tournament } from "@/lib/tournament";

type MapScoresMap = Record<number, { team1_score: number; team2_score: number; map_name: string }[]>;

interface HomeContentProps {
  tournaments: Tournament[];
  liveMatches: Match[];
  recentMatches: Match[];
  totalMatches: number;
  totalPlayers: number;
  teamsMap?: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }>;
  mapScoresMap?: MapScoresMap;
}

export function HomeContent({ tournaments, liveMatches, recentMatches, totalMatches, totalPlayers, teamsMap, mapScoresMap }: HomeContentProps) {
  const hasLive = liveMatches.length > 0;

  // Sort tournaments: active first, then pending, then finished
  const sortedTournaments = [...tournaments].sort((a, b) => {
    const order = { active: 0, pending: 1, finished: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  // Featured tournament: active or pending
  const featuredTournament = tournaments.find(t => t.status === "active") || tournaments.find(t => t.status === "pending") || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 overflow-x-hidden">
      {/* ── 1. Hero ── */}
      <section className="py-16 sm:py-24 text-center relative overflow-hidden">
        {/* Background orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,200vw)] h-[400px] bg-orbital-purple/5 blur-[140px] rounded-full pointer-events-none" />
        {/* Secondary glow */}
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-orbital-purple/[0.02] blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-[40%] right-[15%] w-[250px] h-[250px] bg-orbital-purple/[0.03] blur-[120px] rounded-full pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative">
          {/* Decorative lines */}
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
            Plataforma de Torneios CS2
          </p>

          {/* Live indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {hasLive ? (
              <motion.span
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 bg-orbital-live/10 border border-orbital-live/30"
              >
                <span className="w-2 h-2 rounded-full bg-orbital-live shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-live">
                  {liveMatches.length} PARTIDA{liveMatches.length > 1 ? "S" : ""} AO VIVO
                </span>
              </motion.span>
            ) : (
              <>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">SYS::ONLINE</span>
                <span className="status-dot status-live" />
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── 2. Active Tournament CTA ── */}
      {featuredTournament && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <FeaturedTournamentCard tournament={featuredTournament} teamsMap={teamsMap} />
        </motion.section>
      )}

      {/* ── 3. Platform Stats ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
      >
        <HudCard className="text-center" delay={0.1}><StatBox label="Campeonatos" value={tournaments.length} /></HudCard>
        <HudCard className="text-center" delay={0.2}><StatBox label="Partidas" value={totalMatches} /></HudCard>
        <HudCard className="text-center" delay={0.3}><StatBox label="Jogadores" value={totalPlayers} /></HudCard>
        <HudCard className="text-center" delay={0.4}><StatBox label="Ao Vivo" value={liveMatches.length} /></HudCard>
      </motion.section>

      {/* ── 4. Live Matches ── */}
      {hasLive && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
          <div className="grid gap-4">
            {liveMatches.map((match, i) => (
              <div key={match.id} className="relative">
                {/* Red glow around live match */}
                <div className="absolute -inset-1 bg-orbital-live/5 blur-md rounded-sm pointer-events-none" />
                <div className="relative">
                  <MatchCard match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.1} />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── 5. Recent Matches ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-12"
      >
        <SectionHeader icon={Swords} title="PARTIDAS RECENTES" href="/partidas" />
        {recentMatches.length > 0 ? (
          <div className="grid gap-3">
            {recentMatches.map((match, i) => (
              <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.08} />
            ))}
          </div>
        ) : (
          <HudCard>
            <p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-sm py-4">
              Nenhuma partida finalizada ainda
            </p>
          </HudCard>
        )}
      </motion.section>

      {/* ── 6. All Tournaments ── */}
      {sortedTournaments.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <SectionHeader icon={Trophy} title="CAMPEONATOS" href="/campeonatos" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} teamsMap={teamsMap} delay={0.6 + i * 0.08} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ── 7. Quick Links ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickLink href="/campeonatos" icon={Trophy} label="CAMPEONATOS" desc="Todos os torneios" delay={0.1} />
          <QuickLink href="/partidas" icon={Swords} label="PARTIDAS" desc="Todas as partidas" delay={0.2} />
          <QuickLink href="/leaderboard" icon={BarChart3} label="RANKING" desc="Classificação geral" delay={0.3} />
          <QuickLink href="/highlights" icon={Sparkles} label="HIGHLIGHTS" desc="Melhores jogadas" delay={0.4} />
        </div>
      </motion.section>
    </div>
  );
}

// ── Featured Tournament CTA ──
function FeaturedTournamentCard({ tournament: t, teamsMap }: { tournament: Tournament; teamsMap?: Record<number, { name: string; logo: string | null }> }) {
  const finished = t.matches.filter(m => m.status === "finished").length;
  const total = t.matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
  const isLive = t.status === "active";
  const isFinished = t.status === "finished";

  // Check for champion
  const gf = t.matches.find(m => m.id === "GF");
  const champion = isFinished && gf?.winner_id ? t.teams.find(tm => tm.id === gf.winner_id) : null;

  // Format date
  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      const [year, month, day] = d.split("-").map(Number);
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      return `${day} ${months[month - 1]} ${year}`;
    } catch { return d; }
  };

  return (
    <Link href={`/campeonato/${t.id}`} className="block group">
      <div className={`relative overflow-hidden border transition-all duration-300 hover:border-orbital-purple/40 ${
        isLive
          ? "border-orbital-live/30 bg-gradient-to-r from-orbital-live/[0.04] via-orbital-card to-orbital-live/[0.04]"
          : "border-orbital-purple/20 bg-gradient-to-r from-orbital-purple/[0.04] via-orbital-card to-orbital-purple/[0.04]"
      }`}>
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/50 to-transparent" />
        {isLive && <div className="absolute inset-0 bg-orbital-live/[0.02] animate-pulse pointer-events-none" />}

        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-orbital-purple/50" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-orbital-purple/50" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-orbital-purple/50" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-orbital-purple/50" />

        <div className="relative p-6 sm:p-8">
          {/* Status + label */}
          <div className="flex items-center gap-2 mb-4">
            {isLive ? (
              <span className="flex items-center gap-2 px-2.5 py-1 bg-orbital-live/10 border border-orbital-live/30">
                <span className="w-2 h-2 rounded-full bg-orbital-live animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-live">AO VIVO</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 px-2.5 py-1 bg-orbital-purple/10 border border-orbital-purple/30">
                <Trophy size={10} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple">DESTAQUE</span>
              </span>
            )}
          </div>

          {/* Tournament name */}
          <h2 className="font-[family-name:var(--font-orbitron)] text-xl sm:text-2xl font-bold tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors mb-3">
            {t.name}
          </h2>

          {t.description && (
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mb-4 max-w-lg">
              {t.description}
            </p>
          )}

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            {t.start_date && (
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                <Calendar size={11} className="text-orbital-purple" />
                {formatDate(t.start_date)}{t.end_date ? ` — ${formatDate(t.end_date)}` : ""}
              </div>
            )}
            <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
              <Users size={11} className="text-orbital-purple" />
              {t.teams.length} times
            </div>
            <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
              <Swords size={11} className="text-orbital-purple" />
              {finished}/{total} partidas
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">PROGRESSO</span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple font-bold">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-orbital-border overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-orbital-purple"
                style={{ boxShadow: "0 0 8px rgba(168,85,247,0.4)" }}
              />
            </div>
          </div>

          {/* Champion mini-banner */}
          {champion && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/[0.06] border border-yellow-500/20 mb-4">
              <Trophy size={14} className="text-yellow-400 shrink-0" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-yellow-400/80">CAMPEAO:</span>
              <span className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-yellow-400">{champion.name}</span>
            </div>
          )}

          {/* CTA */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 group-hover:border-orbital-purple/60 group-hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple">
            VER CAMPEONATO <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Tournament Card (for the grid) ──
function TournamentCard({ tournament: t, teamsMap, delay }: { tournament: Tournament; teamsMap?: Record<number, { name: string; logo: string | null }>; delay: number }) {
  const finished = t.matches.filter(m => m.status === "finished").length;
  const total = t.matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  const gf = t.matches.find(m => m.id === "GF");
  const champion = t.status === "finished" && gf?.winner_id ? t.teams.find(tm => tm.id === gf.winner_id) : null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      const [, month, day] = d.split("-").map(Number);
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      return `${day} ${months[month - 1]}`;
    } catch { return d; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link href={`/campeonato/${t.id}`} className="block group">
        <div className={`relative bg-orbital-card border hover:border-orbital-purple/30 transition-all duration-300 h-full ${
          t.status === "active" ? "border-l-2 border-l-orbital-live border-orbital-border" :
          t.status === "finished" ? "border-orbital-success/20" :
          "border-orbital-border"
        }`}>
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="p-5">
            {/* Status badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`status-dot ${
                  t.status === "active" ? "status-live" :
                  t.status === "finished" ? "status-finished" :
                  "status-upcoming"
                }`} />
                <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] uppercase ${
                  t.status === "active" ? "text-orbital-live" :
                  t.status === "finished" ? "text-orbital-text-dim" :
                  "text-orbital-warning"
                }`}>
                  {t.status === "active" ? "AO VIVO" : t.status === "finished" ? "FINALIZADO" : "PENDENTE"}
                </span>
              </div>
            </div>

            {/* Tournament name */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 border flex items-center justify-center shrink-0 ${
                t.status === "active" ? "bg-orbital-live/10 border-orbital-live/30" : "bg-orbital-purple/10 border-orbital-purple/20"
              }`}>
                <Trophy size={16} className={t.status === "active" ? "text-orbital-live" : "text-orbital-purple"} />
              </div>
              <div className="min-w-0">
                <div className="font-[family-name:var(--font-orbitron)] text-sm font-semibold tracking-wide text-orbital-text group-hover:text-orbital-purple transition-colors truncate">
                  {t.name}
                </div>
                {t.start_date && (
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-0.5">
                    {formatDate(t.start_date)}{t.end_date ? ` — ${formatDate(t.end_date)}` : ""}
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                <Users size={10} /> {t.teams.length} times
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                {finished}/{total} partidas
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-orbital-border mb-3 overflow-hidden">
              <div className="h-full bg-orbital-purple transition-all" style={{ width: `${progress}%` }} />
            </div>

            {/* Champion banner */}
            {champion && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/[0.05] border border-yellow-500/15">
                <Trophy size={10} className="text-yellow-400 shrink-0" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.1em] text-yellow-400/80">CAMPEAO</span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-yellow-400 font-bold truncate">{champion.name}</span>
              </div>
            )}

            {/* View link */}
            <div className="flex items-center justify-end mt-3">
              <Eye size={13} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Shared: SectionHeader ──
function SectionHeader({ icon: Icon, title, href, accent }: { icon: React.ElementType; title: string; href?: string; accent?: "live" }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Icon size={16} className={accent === "live" ? "text-orbital-live" : "text-orbital-purple"} />
        <h2 className={`font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] ${accent === "live" ? "text-orbital-live" : "text-orbital-purple"}`}>{title}</h2>
        <div className="h-[1px] w-12 bg-gradient-to-r from-orbital-purple/40 to-transparent" />
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-[0.65rem]">
          Ver mais <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── Shared: QuickLink ──
function QuickLink({ href, icon: Icon, label, desc, delay }: { href: string; icon: React.ElementType; label: string; desc: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
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
