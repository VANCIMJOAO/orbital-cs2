"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Swords, Users, Activity, ChevronRight, MapPin, Calendar, DollarSign, Shield } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { MatchCard } from "@/components/match-card";
import { Match } from "@/lib/api";
import { Tournament, getTeamName } from "@/lib/tournament";

// Map screenshot URLs (Steam CDN)
const MAP_IMAGES: Record<string, string> = {
  de_ancient: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_ancient.png",
  de_anubis: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_anubis.png",
  de_dust2: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_dust2.png",
  de_inferno: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_inferno.png",
  de_mirage: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_mirage.png",
  de_nuke: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_nuke.png",
  de_overpass: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_overpass.png",
  de_vertigo: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_vertigo.png",
  de_train: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/maps/de_train.png",
};

function TeamLogo({ logo, size = 32, className = "" }: { logo: string | null | undefined; size?: number; className?: string }) {
  if (!logo) return <Shield size={size * 0.6} className="text-orbital-text-dim" />;
  return <img src={logo} alt="" width={size} height={size} className={`object-contain ${className}`} />;
}

interface HomeContentProps {
  tournament: Tournament | null;
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  totalMatches: number;
  teamCount: number;
  teamsMap?: Record<number, { name: string; logo: string | null }>;
}

export function HomeContent({ tournament, liveMatches, recentMatches, upcomingMatches, totalMatches, teamCount, teamsMap }: HomeContentProps) {
  if (tournament) {
    return <TournamentHome tournament={tournament} liveMatches={liveMatches} recentMatches={recentMatches} teamsMap={teamsMap} />;
  }

  return <DefaultHome liveMatches={liveMatches} recentMatches={recentMatches} upcomingMatches={upcomingMatches} totalMatches={totalMatches} teamCount={teamCount} teamsMap={teamsMap} />;
}

// ── Tournament-focused homepage ──
function TournamentHome({ tournament: t, liveMatches, recentMatches, teamsMap }: {
  tournament: Tournament;
  liveMatches: Match[];
  recentMatches: Match[];
  teamsMap?: Record<number, { name: string; logo: string | null }>;
}) {
  const finished = t.matches.filter(m => m.status === "finished").length;
  const total = t.matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
  const isLive = t.status === "active";
  const isFinished = t.status === "finished";

  const gf = t.matches.find(m => m.id === "GF");
  const champion = isFinished && gf?.winner_id ? t.teams.find(tm => tm.id === gf.winner_id) : null;

  // Current/next match
  const liveMatch = t.matches.find(m => m.status === "live");
  const nextMatch = t.matches.find(m => m.status === "pending" && m.team1_id && m.team2_id);

  // Filter matches: ONLY those created by this tournament (by match_id stored in bracket)
  const tournamentMatchIds = new Set(t.matches.filter(m => m.match_id).map(m => m.match_id!));
  const tournamentRecentMatches = recentMatches.filter(m => tournamentMatchIds.has(m.id));

  // Format date
  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
    } catch { return d; }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      {/* Hero Banner */}
      <section className="relative py-12 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-orbital-purple/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-orbital-purple/[0.03] blur-[150px] rounded-full pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative text-center">
          {/* Status badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {isLive && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-orbital-live/10 border border-orbital-live/30">
                <span className="w-2 h-2 rounded-full bg-orbital-live animate-pulse" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-live">AO VIVO</span>
              </span>
            )}
            {isFinished && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-orbital-success/10 border border-orbital-success/30">
                <Trophy size={12} className="text-orbital-success" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-success">FINALIZADO</span>
              </span>
            )}
            {!isLive && !isFinished && (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-orbital-warning/10 border border-orbital-warning/30">
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-warning">EM BREVE</span>
              </span>
            )}
          </div>

          {/* Tournament name */}
          <h1 className="font-[family-name:var(--font-orbitron)] text-3xl sm:text-5xl font-black tracking-wider mb-3">
            <span className="text-orbital-purple glow-purple-text">{t.name}</span>
          </h1>

          {t.description && (
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim max-w-xl mx-auto mb-4">
              {t.description}
            </p>
          )}

          {/* Event info pills */}
          <div className="flex items-center justify-center gap-4 flex-wrap mt-4">
            {t.start_date && (
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                <Calendar size={12} className="text-orbital-purple" />
                {formatDate(t.start_date)}{t.end_date ? ` — ${formatDate(t.end_date)}` : ""}
              </div>
            )}
            {t.prize_pool && (
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                <DollarSign size={12} className="text-orbital-purple" />
                {t.prize_pool}
              </div>
            )}
            {t.location && (
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                <MapPin size={12} className="text-orbital-purple" />
                {t.location}
              </div>
            )}
            <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
              <Users size={12} className="text-orbital-purple" />
              {t.teams.length} times
            </div>
            <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
              <Swords size={12} className="text-orbital-purple" />
              Eliminação Dupla
            </div>
          </div>

          {/* Champion banner */}
          {champion && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-orbital-success/10 border border-orbital-success/30">
              <Trophy size={20} className="text-orbital-success" />
              <div>
                <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-success">CAMPEÃO</div>
                <div className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-orbital-success">{champion.name}</div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Stats Row */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <HudCard className="text-center" delay={0.1}>
          <StatBox label="Partidas" value={`${finished}/${total}`} />
        </HudCard>
        <HudCard className="text-center" delay={0.2}>
          <StatBox label="Progresso" value={`${progress}%`} />
        </HudCard>
        <HudCard className="text-center" delay={0.3}>
          <StatBox label="Times" value={t.teams.length} />
        </HudCard>
        <HudCard className="text-center" delay={0.4}>
          <StatBox label="Formato" value="BO1/BO3" />
        </HudCard>
      </motion.section>

      {/* Live / Next Match */}
      {(liveMatch || nextMatch) && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
          <SectionHeader icon={Activity} title={liveMatch ? "PARTIDA AO VIVO" : "PRÓXIMA PARTIDA"} accent={liveMatch ? "live" : undefined} />
          {(() => {
            const m = liveMatch || nextMatch!;
            const team1 = getTeamName(t, m.team1_id);
            const team2 = getTeamName(t, m.team2_id);
            const team1Logo = m.team1_id ? teamsMap?.[m.team1_id]?.logo : null;
            const team2Logo = m.team2_id ? teamsMap?.[m.team2_id]?.logo : null;
            return (
              <Link href={`/campeonato/${t.id}`}>
                <div className={`relative bg-orbital-card border p-6 hover:border-orbital-purple/30 transition-all ${
                  liveMatch ? "border-orbital-live/30 glow-purple-sm" : "border-orbital-border"
                }`}>
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 justify-end">
                      <span className="font-[family-name:var(--font-orbitron)] text-sm sm:text-base font-bold text-orbital-text text-right">{team1}</span>
                      <div className="w-10 h-10 border border-orbital-border flex items-center justify-center bg-[#0A0A0A] shrink-0">
                        <TeamLogo logo={team1Logo} size={32} className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="px-6 text-center">
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mb-1">{m.label}</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                        {liveMatch ? (
                          <span className="text-orbital-live font-bold">LIVE</span>
                        ) : (
                          "vs"
                        )}
                      </div>
                      {m.map && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple mt-1">
                          {m.map.replace("de_", "").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 border border-orbital-border flex items-center justify-center bg-[#0A0A0A] shrink-0">
                        <TeamLogo logo={team2Logo} size={32} className="w-8 h-8" />
                      </div>
                      <span className="font-[family-name:var(--font-orbitron)] text-sm sm:text-base font-bold text-orbital-text">{team2}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })()}
        </motion.section>
      )}

      {/* Bracket Preview */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-10">
        <SectionHeader icon={Swords} title="BRACKET" href={`/campeonato/${t.id}`} />
        <HudCard className="p-5">
          <BracketPreview tournament={t} />
          <div className="text-center mt-4">
            <Link href={`/campeonato/${t.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple">
              VER BRACKET COMPLETO <ChevronRight size={12} />
            </Link>
          </div>
        </HudCard>
      </motion.section>

      {/* Teams Grid */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-10">
        <SectionHeader icon={Users} title="TIMES PARTICIPANTES" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {t.teams.map((team, i) => {
            const logo = teamsMap?.[team.id]?.logo;
            const teamMatches = t.matches.filter(m => m.status === "finished" && (m.team1_id === team.id || m.team2_id === team.id));
            const losses = teamMatches.filter(m => m.winner_id !== null && m.winner_id !== team.id).length;
            const eliminated = losses >= 2;
            const isChampion = champion?.id === team.id;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className={`bg-orbital-card border p-4 text-center transition-all ${
                  isChampion ? "border-orbital-success/40 bg-orbital-success/5" :
                  eliminated ? "border-orbital-border opacity-50" :
                  "border-orbital-border hover:border-orbital-purple/30"
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2 border border-orbital-border flex items-center justify-center bg-[#0A0A0A]">
                  <TeamLogo logo={logo} size={32} className="w-8 h-8" />
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text truncate">
                  {team.name}
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim mt-0.5">
                  [{team.tag}]
                </div>
                {isChampion && (
                  <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-success mt-1">CAMPEÃO</div>
                )}
                {eliminated && !isChampion && (
                  <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-danger mt-1">ELIMINADO</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Map Pool */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-10">
        <SectionHeader icon={Crosshair} title="MAP POOL" />
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {t.map_pool.map((map, i) => (
            <motion.div
              key={map}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="relative bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all overflow-hidden group"
            >
              <div className="aspect-[16/10] relative bg-[#0A0A0A] overflow-hidden">
                {MAP_IMAGES[map] ? (
                  <img
                    src={MAP_IMAGES[map]}
                    alt={map}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Crosshair size={20} className="text-orbital-purple/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-2 text-center">
                <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors">
                  {map.replace("de_", "").toUpperCase()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Tournament Matches from G5API */}
      <section className="mb-10">
        <SectionHeader icon={Swords} title="RESULTADOS" href="/partidas" />
        {tournamentRecentMatches.length > 0 ? (
          <div className="grid gap-3">
            {tournamentRecentMatches.slice(0, 5).map((match, i) => (
              <MatchCard key={match.id} match={match} teamsMap={teamsMap} delay={i * 0.08} />
            ))}
          </div>
        ) : (
          <HudCard>
            <p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-sm py-4">
              Nenhuma partida finalizada ainda neste campeonato
            </p>
          </HudCard>
        )}
      </section>

      {/* Live G5API matches (only tournament ones) */}
      {(() => {
        const tournamentLiveMatches = liveMatches.filter(m => tournamentMatchIds.has(m.id));
        return tournamentLiveMatches.length > 0 ? (
          <section className="mb-10">
            <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
            <div className="grid gap-3">
              {tournamentLiveMatches.map((match, i) => (
                <MatchCard key={match.id} match={match} teamsMap={teamsMap} delay={i * 0.1} />
              ))}
            </div>
          </section>
        ) : null;
      })()}

      {/* Quick Links */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink href={`/campeonato/${t.id}`} icon={Trophy} label="VER BRACKET" desc="Bracket completo do campeonato" delay={0.1} />
          <QuickLink href="/partidas" icon={Swords} label="PARTIDAS" desc="Todas as partidas registradas" delay={0.2} />
          <QuickLink href="/leaderboard" icon={Activity} label="RANKING" desc="Classificação dos jogadores" delay={0.3} />
        </div>
      </section>
    </div>
  );
}

// ── Bracket Preview (simplified visual) ──
function BracketPreview({ tournament: t }: { tournament: Tournament }) {
  const winnerQFs = t.matches.filter(m => m.bracket === "winner" && m.round === 1);
  const winnerSFs = t.matches.filter(m => m.bracket === "winner" && m.round === 2);
  const wf = t.matches.find(m => m.id === "WF");
  const gf = t.matches.find(m => m.id === "GF");

  const MatchSlot = ({ match }: { match: typeof t.matches[0] | undefined }) => {
    if (!match) return null;
    const team1 = getTeamName(t, match.team1_id);
    const team2 = getTeamName(t, match.team2_id);
    const isLive = match.status === "live";
    const isDone = match.status === "finished";

    return (
      <div className={`border px-2.5 py-1.5 text-[0.6rem] font-[family-name:var(--font-jetbrains)] space-y-0.5 ${
        isLive ? "border-orbital-live/40 bg-orbital-live/5" :
        isDone ? "border-orbital-success/20 bg-orbital-success/5" :
        "border-orbital-border bg-[#0A0A0A]"
      }`}>
        <div className={`flex items-center justify-between ${isDone && match.winner_id === match.team1_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
          <span className="truncate max-w-[80px]">{team1}</span>
          {isLive && <span className="text-orbital-live text-[0.45rem]">LIVE</span>}
        </div>
        <div className={`flex items-center justify-between ${isDone && match.winner_id === match.team2_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
          <span className="truncate max-w-[80px]">{team2}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-4 gap-4 mb-3">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim text-center">QUARTAS</div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim text-center">SEMIFINAL</div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim text-center">FINAL</div>
          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple text-center">GRAND FINAL</div>
        </div>
        <div className="grid grid-cols-4 gap-4 items-center">
          <div className="space-y-2">
            {winnerQFs.map(m => <MatchSlot key={m.id} match={m} />)}
          </div>
          <div className="space-y-6">
            {winnerSFs.map(m => <MatchSlot key={m.id} match={m} />)}
          </div>
          <div className="flex items-center justify-center">
            <MatchSlot match={wf} />
          </div>
          <div className="flex items-center justify-center">
            <div className={`border-2 px-3 py-2 ${gf?.status === "live" ? "border-orbital-live/50 bg-orbital-live/5" : gf?.status === "finished" ? "border-orbital-success/30 bg-orbital-success/5" : "border-orbital-purple/30 bg-orbital-purple/5"}`}>
              {gf ? (
                <div className="text-[0.6rem] font-[family-name:var(--font-jetbrains)] space-y-0.5">
                  <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-orbital-purple mb-1 text-center">GRAND FINAL</div>
                  <div className={`${gf.status === "finished" && gf.winner_id === gf.team1_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
                    {getTeamName(t, gf.team1_id)}
                  </div>
                  <div className={`${gf.status === "finished" && gf.winner_id === gf.team2_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"}`}>
                    {getTeamName(t, gf.team2_id)}
                  </div>
                </div>
              ) : (
                <div className="text-orbital-text-dim text-[0.6rem]">TBD</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Default homepage (no tournament) ──
function DefaultHome({ liveMatches, recentMatches, upcomingMatches, totalMatches, teamCount, teamsMap }: Omit<HomeContentProps, "tournament">) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      <section className="py-16 sm:py-24 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orbital-purple/5 blur-[120px] rounded-full pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative">
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

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <HudCard className="text-center" delay={0.1}><StatBox label="Partidas" value={totalMatches} /></HudCard>
        <HudCard className="text-center" delay={0.2}><StatBox label="Ao Vivo" value={liveMatches.length} /></HudCard>
        <HudCard className="text-center" delay={0.3}><StatBox label="Times" value={teamCount} /></HudCard>
        <HudCard className="text-center" delay={0.4}><StatBox label="Pendentes" value={upcomingMatches.length} /></HudCard>
      </motion.section>

      {liveMatches.length > 0 && (
        <section className="mb-12">
          <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
          <div className="grid gap-4">{liveMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} delay={i * 0.1} />)}</div>
        </section>
      )}

      <section className="mb-12">
        <SectionHeader icon={Swords} title="PARTIDAS RECENTES" href="/partidas" />
        {recentMatches.length > 0 ? (
          <div className="grid gap-3">{recentMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} delay={i * 0.08} />)}</div>
        ) : (
          <HudCard><p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-sm">Nenhuma partida finalizada ainda</p></HudCard>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section className="mb-12">
          <SectionHeader icon={Crosshair} title="PRÓXIMAS PARTIDAS" />
          <div className="grid gap-3">{upcomingMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} delay={i * 0.08} />)}</div>
        </section>
      )}

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

// ── Shared components ──
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
