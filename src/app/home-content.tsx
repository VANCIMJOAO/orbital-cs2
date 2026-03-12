"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Swords, Users, Activity, ChevronRight, MapPin, Calendar, DollarSign, Shield } from "lucide-react";
import Link from "next/link";
import { HudCard, StatBox } from "@/components/hud-card";
import { MatchCard } from "@/components/match-card";
import { Match } from "@/lib/api";
import { Tournament, getTeamName } from "@/lib/tournament";

// Map screenshot URLs (GitHub: ghostcap-gaming/cs2-map-images)
const MAP_IMAGES: Record<string, string> = {
  de_ancient: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_ancient.png",
  de_anubis: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_anubis.png",
  de_dust2: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_dust2.png",
  de_inferno: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_inferno.png",
  de_mirage: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_mirage.png",
  de_nuke: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_nuke.png",
  de_overpass: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_overpass.png",
  de_vertigo: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_vertigo.png",
  de_train: "https://raw.githubusercontent.com/ghostcap-gaming/cs2-map-images/main/cs2/de_train.png",
};

function TeamLogo({ logo, size = 32, className = "" }: { logo: string | null | undefined; size?: number; className?: string }) {
  if (!logo) return <Shield size={size * 0.6} className="text-orbital-text-dim" />;
  return <img src={logo} alt="" width={size} height={size} className={`object-contain ${className}`} />;
}

export type MapScoresMap = Record<number, { team1_score: number; team2_score: number; map_name: string }[]>;

interface HomeContentProps {
  tournament: Tournament | null;
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  totalMatches: number;
  teamCount: number;
  teamsMap?: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }>;
  mapScoresMap?: MapScoresMap;
}

export function HomeContent({ tournament, liveMatches, recentMatches, upcomingMatches, totalMatches, teamCount, teamsMap, mapScoresMap }: HomeContentProps) {
  if (tournament) {
    return <TournamentHome tournament={tournament} liveMatches={liveMatches} recentMatches={recentMatches} teamsMap={teamsMap} mapScoresMap={mapScoresMap} />;
  }

  return <DefaultHome liveMatches={liveMatches} recentMatches={recentMatches} upcomingMatches={upcomingMatches} totalMatches={totalMatches} teamCount={teamCount} teamsMap={teamsMap} mapScoresMap={mapScoresMap} />;
}

// ── Tournament-focused homepage ──
function TournamentHome({ tournament: t, liveMatches, recentMatches, teamsMap, mapScoresMap }: {
  tournament: Tournament;
  liveMatches: Match[];
  recentMatches: Match[];
  teamsMap?: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }>;
  mapScoresMap?: MapScoresMap;
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
              <span className="flex items-center gap-2 px-3 py-1.5 bg-orbital-live/10 border border-orbital-live/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-orbital-live shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
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
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <HudCard className="text-center" delay={0.1}>
          <StatBox label="Partidas" value={`${finished}/${total}`} />
        </HudCard>
        <HudCard className="text-center" delay={0.2}>
          <StatBox label="Progresso" value={`${progress}%`} />
          {/* Progress bar */}
          <div className="mt-2 mx-3 mb-1">
            <div className="h-1.5 bg-orbital-border/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-orbital-purple to-orbital-purple/60 rounded-full"
              />
            </div>
          </div>
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
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <SectionHeader icon={Activity} title={liveMatch ? "PARTIDA AO VIVO" : "PRÓXIMA PARTIDA"} accent={liveMatch ? "live" : undefined} />
          {(() => {
            const m = liveMatch || nextMatch!;
            const team1 = getTeamName(t, m.team1_id);
            const team2 = getTeamName(t, m.team2_id);
            const team1Logo = m.team1_id ? teamsMap?.[m.team1_id]?.logo : null;
            const team2Logo = m.team2_id ? teamsMap?.[m.team2_id]?.logo : null;
            const isPending = !liveMatch;
            return (
              <Link href={`/campeonato/${t.id}`}>
                <div className={`relative overflow-hidden border p-6 hover:border-orbital-purple/30 transition-all ${
                  liveMatch
                    ? "border-orbital-live/30 bg-gradient-to-r from-orbital-live/5 via-orbital-card to-orbital-live/5"
                    : "border-orbital-purple/20 bg-gradient-to-r from-orbital-purple/5 via-orbital-card to-orbital-purple/5"
                }`}>
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/40 to-transparent" />
                  {liveMatch && <div className="absolute inset-0 bg-orbital-live/[0.02] animate-pulse pointer-events-none" />}
                  <div className="relative flex items-center justify-between">
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
                          <span className="inline-flex items-center gap-1.5 text-orbital-live font-bold">
                            <span className="w-2 h-2 rounded-full bg-orbital-live animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            AO VIVO
                          </span>
                        ) : isPending ? (
                          <span className="text-orbital-purple/60 text-[0.6rem] font-[family-name:var(--font-orbitron)] tracking-widest animate-pulse">AGUARDANDO</span>
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
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
        <SectionHeader icon={Swords} title="BRACKET" href={`/campeonato/${t.id}`} />
        <HudCard className="p-5">
          <BracketPreview tournament={t} mapScoresMap={mapScoresMap} />
          <div className="text-center mt-4">
            <Link href={`/campeonato/${t.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple">
              VER BRACKET COMPLETO <ChevronRight size={12} />
            </Link>
          </div>
        </HudCard>
      </motion.section>

      {/* Teams Grid */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8">
        <SectionHeader icon={Users} title="TIMES PARTICIPANTES" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {t.teams.map((team, i) => {
            const logo = teamsMap?.[team.id]?.logo;
            const players = teamsMap?.[team.id]?.players || [];
            const teamMatches = t.matches.filter(m => m.status === "finished" && (m.team1_id === team.id || m.team2_id === team.id));
            const losses = teamMatches.filter(m => m.winner_id !== null && m.winner_id !== team.id).length;
            const eliminated = losses >= 2;
            const isChampion = champion?.id === team.id;

            const borderClass = isChampion ? "border-orbital-success/40" : eliminated ? "border-orbital-border" : "border-orbital-border";

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className={`group [perspective:600px] ${eliminated ? "opacity-50" : ""}`}
              >
                <div className="relative w-full h-[220px] transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                  {/* Front */}
                  <div className={`absolute inset-0 [backface-visibility:hidden] bg-orbital-card border ${borderClass} ${isChampion ? "bg-orbital-success/5" : ""} p-5 flex flex-col items-center justify-center hover:border-orbital-purple/40 hover:scale-[1.02] transition-all duration-300`}>
                    <div className="w-14 h-14 mb-3 border border-orbital-border flex items-center justify-center bg-[#0A0A0A]">
                      <TeamLogo logo={logo} size={40} className="w-10 h-10" />
                    </div>
                    <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text truncate max-w-full">
                      {team.name}
                    </div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">
                      [{team.tag}]
                    </div>
                    {isChampion && (
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-success mt-2">CAMPEÃO</div>
                    )}
                    {eliminated && !isChampion && (
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-danger mt-2">ELIMINADO</div>
                    )}
                  </div>

                  {/* Back */}
                  <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#0D0D0D] border border-orbital-purple/30 flex flex-col`}>
                    <div className="px-4 py-2 border-b border-orbital-purple/20 bg-orbital-purple/10 flex items-center justify-between">
                      <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple">LINEUP</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">{team.tag}</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-2 gap-1">
                      {players.map((p) => (
                        <Link key={p.steamId} href={`/perfil/${p.steamId}`} className="flex items-center gap-2.5 px-4 py-1 hover:bg-orbital-purple/10 transition-colors">
                          <img src="https://www.hltv.org/img/static/flags/30x20/BR.gif" alt="BR" className="w-5 h-3.5 object-contain" />
                          <span className={`font-[family-name:var(--font-jetbrains)] text-xs ${p.captain ? "text-orbital-purple font-bold" : "text-orbital-text hover:text-orbital-purple"} transition-colors`}>
                            {p.name}
                          </span>
                          {p.captain === 1 && (
                            <span className="text-[0.45rem] text-orbital-purple font-[family-name:var(--font-orbitron)] ml-auto">CAP</span>
                          )}
                        </Link>
                      ))}
                      {players.length === 0 && (
                        <div className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-xs">
                          Sem jogadores
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Map Pool */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-8">
        <SectionHeader icon={Crosshair} title="MAP POOL" />
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {t.map_pool.map((map, i) => (
            <motion.div
              key={map}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="relative border border-orbital-border hover:border-orbital-purple/40 transition-all overflow-hidden group"
            >
              <div className="aspect-[16/12] relative bg-[#0A0A0A] overflow-hidden">
                {MAP_IMAGES[map] ? (
                  <img
                    src={MAP_IMAGES[map]}
                    alt={map}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Crosshair size={20} className="text-orbital-purple/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                  <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider text-white/90 group-hover:text-orbital-purple transition-colors drop-shadow-lg">
                    {map.replace("de_", "").toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Tournament Matches from G5API */}
      <section className="mb-8">
        <SectionHeader icon={Swords} title="RESULTADOS" href="/partidas" />
        {tournamentRecentMatches.length > 0 ? (
          <div className="grid gap-3">
            {tournamentRecentMatches.slice(0, 5).map((match, i) => (
              <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.08} />
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
          <section className="mb-8">
            <SectionHeader icon={Activity} title="AO VIVO" accent="live" />
            <div className="grid gap-3">
              {tournamentLiveMatches.map((match, i) => (
                <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.1} />
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

// ── Bracket Preview (with connectors) ──
function BracketPreview({ tournament: t, mapScoresMap }: { tournament: Tournament; mapScoresMap?: MapScoresMap }) {
  const winnerQFs = t.matches.filter(m => m.bracket === "winner" && m.round === 1);
  const winnerSFs = t.matches.filter(m => m.bracket === "winner" && m.round === 2);
  const wf = t.matches.find(m => m.id === "WF");
  const gf = t.matches.find(m => m.id === "GF");

  const isTBD = (name: string) => name === "TBD" || name === "A definir";

  const TeamRow = ({ name, score, isWinner, isLive }: { name: string; score?: number; isWinner: boolean; isLive?: boolean }) => (
    <div className={`flex items-center justify-between px-2.5 py-1 ${isWinner ? "bg-orbital-success/10" : ""}`}>
      <span className={`truncate text-[0.6rem] font-[family-name:var(--font-jetbrains)] ${
        isWinner ? "text-orbital-success font-bold" : isTBD(name) ? "text-orbital-text-dim/30 italic" : "text-orbital-text-dim"
      }`}>
        {name}
      </span>
      <div className="flex items-center gap-1.5">
        {isLive && <span className="flex items-center gap-1 text-orbital-live text-[0.45rem] font-[family-name:var(--font-orbitron)]"><span className="status-dot status-live" /> LIVE</span>}
        {score !== undefined && (
          <span className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] font-bold ${
            isWinner ? "text-orbital-success" : "text-orbital-text-dim"
          }`}>{score}</span>
        )}
      </div>
    </div>
  );

  const MatchSlot = ({ match, isGrandFinal }: { match: typeof t.matches[0] | undefined; isGrandFinal?: boolean }) => {
    if (!match) return null;
    const team1 = getTeamName(t, match.team1_id);
    const team2 = getTeamName(t, match.team2_id);
    const isLive = match.status === "live";
    const isDone = match.status === "finished";
    const hasLink = match.match_id != null;
    const bothTBD = isTBD(team1) && isTBD(team2);

    const content = (
      <div className={`border overflow-hidden ${hasLink ? "cursor-pointer hover:border-orbital-purple/40 transition-colors" : ""} ${
        isGrandFinal ? "border-2 " : ""
      }${
        isLive ? "border-orbital-live/40 bg-orbital-live/5" :
        isDone ? "border-orbital-success/20 bg-[#0A0A0A]" :
        isGrandFinal && bothTBD ? "border-orbital-border/40 bg-[#0A0A0A] opacity-50" :
        isGrandFinal ? "border-orbital-purple/40 bg-orbital-purple/5" :
        "border-orbital-border/60 bg-[#0A0A0A]"
      }`}>
        {isGrandFinal && (
          <div className={`px-2.5 py-0.5 text-center border-b ${bothTBD ? "bg-orbital-border/10 border-orbital-border/20" : "bg-orbital-purple/15 border-orbital-purple/20"}`}>
            <span className={`font-[family-name:var(--font-orbitron)] text-[0.4rem] tracking-[0.2em] ${bothTBD ? "text-orbital-text-dim/40" : "text-orbital-purple"}`}>GRAND FINAL</span>
          </div>
        )}
        {(() => {
          const scores = match.match_id ? mapScoresMap?.[match.match_id] : undefined;
          const t1Score = scores?.[0]?.team1_score;
          const t2Score = scores?.[0]?.team2_score;
          return (
            <>
              <TeamRow name={team1} score={t1Score} isWinner={isDone && match.winner_id === match.team1_id} isLive={isLive} />
              <div className="h-px bg-orbital-border/30" />
              <TeamRow name={team2} score={t2Score} isWinner={isDone && match.winner_id === match.team2_id} />
            </>
          );
        })()}
      </div>
    );

    if (hasLink) {
      return <Link href={`/partidas/${match.match_id}`} className="block">{content}</Link>;
    }
    return content;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Round labels */}
        <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] items-center mb-3">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim text-center">QUARTAS</div>
          <div />
          <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim text-center">SEMIFINAL</div>
          <div />
          <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-text-dim text-center">FINAL</div>
          <div />
          <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.2em] text-orbital-purple text-center">GRAND FINAL</div>
        </div>

        {/* Bracket grid with connectors */}
        <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] items-center">
          {/* QFs */}
          <div className="space-y-3">
            {winnerQFs.map(m => <MatchSlot key={m.id} match={m} />)}
          </div>

          {/* QF → SF connectors */}
          <div className="flex flex-col justify-around h-full">
            {[0, 1].map(i => (
              <svg key={i} width="24" height="48" viewBox="0 0 24 48" className="text-orbital-purple/25">
                <path d="M0,12 L12,12 L12,24 L24,24 M0,36 L12,36 L12,24" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            ))}
          </div>

          {/* SFs */}
          <div className="space-y-8 flex flex-col justify-center">
            {winnerSFs.map(m => <MatchSlot key={m.id} match={m} />)}
          </div>

          {/* SF → Final connector */}
          <div className="flex items-center justify-center h-full">
            <svg width="24" height="80" viewBox="0 0 24 80" className="text-orbital-purple/25">
              <path d="M0,20 L12,20 L12,40 L24,40 M0,60 L12,60 L12,40" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          {/* Final */}
          <div className="flex items-center justify-center">
            <div className="w-full"><MatchSlot match={wf} /></div>
          </div>

          {/* Final → GF connector */}
          <div className="flex items-center justify-center">
            <svg width="24" height="4" viewBox="0 0 24 4" className="text-orbital-purple/25">
              <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          {/* Grand Final */}
          <div className="flex items-center justify-center">
            <div className="w-full"><MatchSlot match={gf} isGrandFinal /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Default homepage (no tournament) ──
function DefaultHome({ liveMatches, recentMatches, upcomingMatches, totalMatches, teamCount, teamsMap, mapScoresMap }: Omit<HomeContentProps, "tournament">) {
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
          <div className="grid gap-4">{liveMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.1} />)}</div>
        </section>
      )}

      <section className="mb-12">
        <SectionHeader icon={Swords} title="PARTIDAS RECENTES" href="/partidas" />
        {recentMatches.length > 0 ? (
          <div className="grid gap-3">{recentMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.08} />)}</div>
        ) : (
          <HudCard><p className="text-center text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-sm">Nenhuma partida finalizada ainda</p></HudCard>
        )}
      </section>

      {upcomingMatches.length > 0 && (
        <section className="mb-12">
          <SectionHeader icon={Crosshair} title="PRÓXIMAS PARTIDAS" />
          <div className="grid gap-3">{upcomingMatches.map((match, i) => <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.08} />)}</div>
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
