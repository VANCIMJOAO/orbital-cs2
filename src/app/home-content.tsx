"use client";

import { motion, AnimatePresence, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Match, LeaderboardEntry, getStatusType } from "@/lib/api";
import { Tournament } from "@/lib/tournament";
import { MapScoresMap } from "@/components/bracket";
import { MAP_IMAGES } from "@/lib/maps";
import { IntroLoader } from "@/components/intro-loader";

/* ═══════════════════════════════════════════════════════════════════════
   ORBITAL ROXA — Home v2 (DO ZERO)
   Estilo: Exaggerated Minimalism · Russo One + Chakra Petch
   Paleta: preto #0A0A0C / off-white #F4F2F7 / acento violeta #7C5CFF
   Mesmo contrato de props do page.tsx (dados reais, backend intacto).
   ═══════════════════════════════════════════════════════════════════════ */

export interface HomeContentProps {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  liveMatches: Match[];
  recentMatches: Match[];
  upcomingMatches: Match[];
  totalMatches: number;
  teamCount: number;
  playerCount: number;
  topPlayers: LeaderboardEntry[];
  teamsMap?: Record<number, { name: string; logo: string | null; players?: { name: string; steamId: string; captain: number }[] }>;
  mapScoresMap?: MapScoresMap;
  matchTournamentMap?: Record<number, { id: string; name: string }>;
  seasonToTour?: Record<number, { id: string; name: string }>;
  recapMvp?: { steamId: string; name: string; average_rating: number } | null;
  inscritosCount?: Record<string, number>;
}

type TourRef = { id: string; name: string } | null;
type HeroSlide = {
  key: string;
  mode: "live" | "soon" | "recap" | "idle";
  title: string;
  match?: Match;
  tourRef?: TourRef;
  tour?: Tournament;
  mvp?: { steamId: string; name: string; average_rating: number } | null;
};

const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };
const fmtDate = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }) : "";
const cleanTitle = (t?: string | null) => (t && !t.includes("{") ? t : "");
// Data do campeonato p/ exibição: ISO "2026-07-12" -> "12/07/2026" (ou mantém se já formatada)
const fmtTourDate = (d?: string | null) => {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};
function championOf(t: Tournament) {
  const gf = t.matches.find((m) => m.id === "GF");
  return gf?.winner_id ? t.teams.find((tm) => tm.id === gf.winner_id) || null : null;
}

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

export function HomeContent({
  tournaments, activeTournament, liveMatches, recentMatches, upcomingMatches,
  totalMatches, teamCount, playerCount, topPlayers, teamsMap, mapScoresMap,
  matchTournamentMap, seasonToTour, recapMvp, inscritosCount,
}: HomeContentProps) {
  const tourOf = (m: Match): TourRef =>
    matchTournamentMap?.[m.id] || (m.season_id != null ? seasonToTour?.[m.season_id] : undefined) || null;

  const upcomingAndLive = [...liveMatches, ...upcomingMatches];

  // slides do hero: cada edição em foco vira um slide (ao vivo > em breve > encerrados)
  const liveM = liveMatches[0] || null;
  const activeTour = tournaments.find((x) => x.status === "active") || null;
  const slides: HeroSlide[] = [];
  if (liveM) slides.push({ key: "live", mode: "live", title: activeTour?.name || tourOf(liveM)?.name || "Ao vivo", match: liveM, tourRef: tourOf(liveM) });
  tournaments
    .filter((x) => x.status !== "active" && x.status !== "finished")
    .sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"))
    .forEach((t) => slides.push({ key: "soon-" + t.id, mode: "soon", title: t.name, tour: t }));
  tournaments
    .filter((x) => x.status === "finished")
    .slice(0, 2)
    .forEach((t, i) => slides.push({ key: "recap-" + t.id, mode: "recap", title: t.name, tour: t, mvp: i === 0 ? recapMvp : null }));
  if (slides.length === 0) slides.push({ key: "idle", mode: "idle", title: "ORBITAL ROXA" });

  // esteira de campeonatos: ao vivo > em breve > encerrados
  const rail = [
    ...tournaments.filter((x) => x.status === "active"),
    ...tournaments.filter((x) => x.status !== "active" && x.status !== "finished")
      .sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999")),
    ...tournaments.filter((x) => x.status === "finished"),
  ].slice(0, 8);

  return (
    <div className="ovr">
      <IntroLoader />
      <style>{CSS}</style>
      <div className="ovr-aura" aria-hidden />
      <div className="ovr-hero-img" aria-hidden>
        <img src="https://i.imgur.com/0irj00x.jpeg" alt="" onError={onImgErr} />
      </div>

      {/* ════════ HERO (slider de campeonatos) ════════ */}
      <section className="ovr-hero">
        <HeroSlider slides={slides} teamsMap={teamsMap} inscritosCount={inscritosCount} />
      </section>

      {/* ════════ 01 · CAMPEONATOS (esteira — todas as edições) ════════ */}
      {rail.length > 0 && (
        <Block num="01" title="Campeonatos" href="/campeonatos" hrefLabel="Todas as edições">
          <div className="ovr-rail">
            {rail.map((tour, i) => {
              const champ = championOf(tour);
              const champLogo = champ ? teamsMap?.[champ.id]?.logo : null;
              const done = tour.matches.filter((m) => m.status === "finished").length;
              const total = tour.matches.length;
              const state = tour.status === "active" ? "live" : tour.status === "finished" ? "done" : "soon";
              return (
                <motion.div key={tour.id} {...fade(i * 0.05)}>
                  <Link href={state === "soon" ? "/inscricao" : `/campeonato/${tour.id}`} className={`ovr-ev ${state}`}>
                    <div className="ovr-ev-glow" aria-hidden />
                    <div className="ovr-ev-badge">
                      {state === "live" && <span className="ovr-livedot sm" />}
                      {state === "live" ? "Ao vivo" : state === "soon" ? `Em breve${tour.start_date ? ` · ${fmtTourDate(tour.start_date)}` : ""}` : "Encerrado"}
                    </div>
                    <div className="ovr-ev-name">{tour.name}</div>
                    <div className="ovr-ev-meta">{tour.teams.length || (inscritosCount?.[tour.id] ?? 0)} times{total > 0 ? ` · ${done}/${total} partidas` : ""}</div>
                    <div className="ovr-ev-foot">
                      {state === "live" && total > 0 && <div className="ovr-ev-prog"><i style={{ width: `${Math.round((done / total) * 100)}%` }} /></div>}
                      {state === "soon" && <span className="ovr-ev-mini">Inscrever time</span>}
                      {state === "done" && champ && (
                        <div className="ovr-ev-champ">
                          <div className="ovr-ev-clogo"><span>{initial(champ.name)}</span>{champLogo && <img src={champLogo} alt="" onError={onImgErr} />}</div>
                          <div className="ovr-ev-ctxt"><span><Trophy /> Campeão</span><b>{champ.name}</b></div>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Block>
      )}

      {/* ════════ 02 + 03 · PARTIDAS (duas divs no mesmo bloco) ════════ */}
      <div className="ovr-2col">
        <Block num="02" title="Próximas & ao vivo" href="/partidas" hrefLabel="Todas as partidas">
          {upcomingAndLive.length === 0 ? <Empty>Nenhuma partida agendada</Empty> : (
            <div className="ovr-rows">
              {upcomingAndLive.slice(0, 6).map((m, i) => <MatchRow key={m.id} m={m} maps={mapScoresMap?.[m.id]} teamsMap={teamsMap} tour={tourOf(m)} i={i} />)}
            </div>
          )}
        </Block>

        <Block num="03" title="Resultados" href="/partidas" hrefLabel="Todos os resultados">
          {recentMatches.length === 0 ? <Empty>Nenhum resultado ainda</Empty> : (
            <div className="ovr-rows">
              {recentMatches.slice(0, 6).map((m, i) => <MatchRow key={m.id} m={m} maps={mapScoresMap?.[m.id]} teamsMap={teamsMap} tour={tourOf(m)} i={i} />)}
            </div>
          )}
        </Block>
      </div>

      {/* ════════ 03 · RANKING ════════ */}
      <Block num="04" title="Ranking" href="/leaderboard" hrefLabel="Ranking completo">
        {topPlayers.length === 0 ? <Empty>Sem dados de ranking</Empty> : (
          <div className="ovr-board">
            {topPlayers.map((p, i) => {
              const r = p.average_rating || 0;
              const pct = Math.max(8, Math.min(100, (r / 1.6) * 100));
              // heatmap de rating (barra + nota) + cor do rank por posição (pódio)
              const tier = r >= 1.2 ? "t-hi" : r >= 1.0 ? "t-gd" : r >= 0.85 ? "t-or" : "t-lo";
              const pos = i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : "";
              return (
                <motion.div key={p.steamId} {...fade(i * 0.04)}>
                  <Link href={`/perfil/${p.steamId}`} className={`ovr-prow ${i < 3 ? "top" : ""} ${tier} ${pos}`}>
                    <div className="ovr-prank">{String(i + 1).padStart(2, "0")}</div>
                    <div className="ovr-pav"><span>{initial(p.name)}</span><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" onError={onImgErr} /></div>
                    <div className="ovr-pname">{p.name}</div>
                    <div className="ovr-pbar"><i style={{ width: `${pct}%` }} /></div>
                    <div className="ovr-prt">{r.toFixed(2)}</div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </Block>

      {/* ════════ STATS ════════ */}
      <section className="ovr-stats">
        <Stat n={tournaments.length} l="Campeonatos" />
        <Stat n={totalMatches} l="Partidas" />
        <Stat n={playerCount} l="Jogadores" />
        <Stat n={teamCount} l="Times" />
      </section>

      {/* ════════ 04 · HIGHLIGHTS ════════ */}
      <Block num="05" title="Highlights">
        <Link href="/highlights" className="ovr-hl">
          <div>
            <div className="ovr-hl-t">Os melhores momentos, em vídeo.</div>
            <div className="ovr-hl-s">Clutchs, aces e retakes recortados automaticamente das partidas.</div>
          </div>
          <span className="ovr-hl-go">Ver highlights →</span>
        </Link>
      </Block>

      {/* ════════ FOOTER ════════ */}
      <footer className="ovr-foot">
        <div className="ovr-foot-brand">ORBITAL <span className="acc">ROXA</span></div>
        <div className="ovr-foot-links">
          <Link href="/campeonatos">Campeonatos</Link>
          <Link href="/partidas">Partidas</Link>
          <Link href="/leaderboard">Ranking</Link>
          <Link href="/highlights">Highlights</Link>
        </div>
        <div className="ovr-foot-cop">© ORBITAL ROXA · plataforma de campeonatos CS2 · orbitalroxa.com.br</div>
      </footer>
    </div>
  );
}

/* ── sub-componentes ──────────────────────────────────────────────── */
const NUM_COLOR: Record<string, string> = { "01": "c-or", "02": "c-cy", "03": "c-gr", "04": "c-gd", "05": "c-pk" };
function Block({ num, title, href, hrefLabel, children }: { num: string; title: string; href?: string; hrefLabel?: string; children: React.ReactNode }) {
  return (
    <section className="ovr-block">
      <motion.div className={`ovr-bhead ${NUM_COLOR[num] || ""}`} {...fade()}>
        <div className="ovr-bhead-l">
          <span className="ovr-bnum">{num}</span>
          <h2 className="ovr-btitle">{title}</h2>
        </div>
        {href && <Link href={href} className="ovr-bmore">{hrefLabel} →</Link>}
      </motion.div>
      {children}
    </section>
  );
}

function FeatTeam({ name, logo, win, right }: { name?: string; logo?: string | null; win?: boolean; right?: boolean }) {
  return (
    <div className={`ovr-feat-team ${right ? "r" : ""}`}>
      <div className="ovr-feat-logo"><span>{initial(name)}</span>{logo && <img src={logo} alt="" onError={onImgErr} />}</div>
      <div className={`ovr-feat-name ${win ? "w" : ""}`}>{name || "TBD"}</div>
    </div>
  );
}

function MatchRow({ m, maps, teamsMap, tour, i }: { m: Match; maps?: { team1_score: number; team2_score: number; map_name: string }[]; teamsMap?: HomeContentProps["teamsMap"]; tour?: TourRef; i: number }) {
  const st = getStatusType(m);
  const logo1 = teamsMap?.[m.team1_id]?.logo || null;
  const logo2 = teamsMap?.[m.team2_id]?.logo || null;
  const mapImg = maps && maps.length > 0 ? MAP_IMAGES[maps[0].map_name] : null;
  return (
    <motion.div {...fade(i * 0.03)}>
      <Link href={`/partidas/${m.id}`} className={`ovr-rowwrap ${st === "live" ? "live" : ""} ${mapImg ? "has-map" : ""}`}
        style={mapImg ? ({ "--map": `url("${mapImg}")` } as React.CSSProperties) : undefined}>
        <div className="ovr-row">
          <span className={`ovr-row-st ${st}`}>{st === "live" ? <><span className="ovr-livedot sm" />LIVE</> : st === "upcoming" ? "SOON" : "FIM"}</span>
          <span className="ovr-row-team">
            <span className="ovr-row-logo"><span>{initial(m.team1_string)}</span>{logo1 && <img src={logo1} alt="" onError={onImgErr} />}</span>
            <span className={`ovr-row-name ${m.winner === m.team1_id ? "w" : ""}`}>{m.team1_string || "TBD"}</span>
          </span>
          <span className="ovr-row-score">
            {st === "upcoming" ? <i className="vs">×</i> : <><b className={m.winner === m.team1_id ? "w" : ""}>{m.team1_score}</b><i>:</i><b className={m.winner === m.team2_id ? "w" : ""}>{m.team2_score}</b></>}
          </span>
          <span className="ovr-row-team r">
            <span className="ovr-row-logo"><span>{initial(m.team2_string)}</span>{logo2 && <img src={logo2} alt="" onError={onImgErr} />}</span>
            <span className={`ovr-row-name ${m.winner === m.team2_id ? "w" : ""}`}>{m.team2_string || "TBD"}</span>
          </span>
          <span className="ovr-row-meta">
            {tour && <span className="ovr-row-tour">{tour.name}</span>}
            {`BO${m.max_maps || m.num_maps || 1}`}{fmtDate(m.end_time || m.start_time) ? ` — ${fmtDate(m.end_time || m.start_time)}` : ""}
          </span>
        </div>
        {maps && maps.length > 0 && (
          <div className="ovr-row-maps">
            {maps.map((ms, k) => (
              <span key={k} className="ovr-mapchip">
                <i className="ovr-map-nm">{ms.map_name.replace("de_", "").toUpperCase()}</i>
                <span className="ovr-map-sc">
                  <b className={ms.team1_score > ms.team2_score ? "w" : ""}>{ms.team1_score}</b>
                  <em>:</em>
                  <b className={ms.team2_score > ms.team1_score ? "w" : ""}>{ms.team2_score}</b>
                </span>
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(0, to, { duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{val}</span>;
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <motion.div className="ovr-stat" {...fade()}>
      <div className="ovr-stat-n"><CountUp to={n} /></div>
      <div className="ovr-stat-l">{l}</div>
    </motion.div>
  );
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="ovr-empty">{children}</div>; }
function Trophy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

/* ── hero slider de campeonatos ──────────────────────────────────── */
function splitTitle(name: string) {
  const parts = (name || "").trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : "";
  return { head: parts.join(" "), last };
}

function HeroSlider({ slides, teamsMap, inscritosCount }: { slides: HeroSlide[]; teamsMap?: HomeContentProps["teamsMap"]; inscritosCount?: Record<string, number> }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 7000);
    return () => clearInterval(t);
  }, [n, paused]);
  const safe = Math.min(idx, n - 1);
  const s = slides[safe];
  const { head, last } = splitTitle(s.title);
  return (
    <div className="ovr-hslider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence mode="wait">
        <motion.div key={s.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <div className="ovr-eyebrow">
            {s.mode === "live" && <span className="ovr-livedot" />}
            {s.mode === "soon" && <span className="ovr-livedot soon" />}
            <span>
              {s.mode === "live" ? "Ao vivo agora"
                : s.mode === "soon" ? `Próximo campeonato${s.tour?.start_date ? ` · ${fmtTourDate(s.tour.start_date)}` : ""}`
                : s.mode === "recap" ? "Última edição"
                : "Plataforma de campeonatos CS2"}
            </span>
          </div>
          <h1 className="ovr-h1">
            {s.mode === "idle" ? <>ORBITAL <span className="acc">ROXA</span></> : <>{head}{last ? <> <span className="acc">{last}</span></> : null}</>}
          </h1>
          <p className="ovr-lead">
            {s.mode === "live" ? "A edição está rolando. Acompanhe os confrontos ao vivo, ranking e melhores momentos."
              : s.mode === "soon" ? "Inscrições abertas. Garanta a vaga do seu time antes que esgote."
              : s.mode === "recap" ? "Reviva os melhores momentos da última edição e veja quem levantou a taça."
              : "Campeonatos de Counter-Strike 2 com stats ao vivo, ranking e highlights. Ribeirão Preto / SP."}
          </p>
          {s.mode === "live" && s.match && <FeaturedMatch m={s.match} teamsMap={teamsMap} tour={s.tourRef ?? null} />}
          {s.mode === "soon" && s.tour && <UpcomingTournament tour={s.tour} inscritos={inscritosCount?.[s.tour.id] ?? 0} />}
          {s.mode === "recap" && s.tour && (
            <div className="ovr-recap-row">
              <RecapTournament tour={s.tour} teamsMap={teamsMap} />
              {s.mvp && <MvpCard mvp={s.mvp} />}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {n > 1 && (
        <div className="ovr-hslider-nav">
          {slides.map((sl, i) => (
            <button key={sl.key} type="button" className={`ovr-hdot ${i === safe ? "on" : ""}`} onClick={() => setIdx(i)} aria-label={`Campeonato ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── hero adaptativo: 3 modos ─────────────────────────────────────── */
function FeaturedMatch({ m, teamsMap, tour }: { m: Match; teamsMap?: HomeContentProps["teamsMap"]; tour: TourRef }) {
  const st = getStatusType(m);
  return (
    <motion.div className="ovr-feature" {...fade(0.22)}>
      <div className="ovr-feat-head">
        <span className={`ovr-feat-st ${st}`}>
          {st === "live" && <span className="ovr-livedot sm" />}
          {st === "live" ? "AO VIVO" : st === "upcoming" ? "PRÓXIMA" : "RESULTADO"}
        </span>
        <span className="ovr-feat-meta">{tour ? tour.name : cleanTitle(m.title) || `Melhor de ${m.max_maps || m.num_maps || 1}`}</span>
      </div>
      <div className="ovr-feat-body">
        <FeatTeam name={m.team1_string} logo={teamsMap?.[m.team1_id]?.logo} win={m.winner === m.team1_id} />
        <div className="ovr-feat-score">
          {st === "upcoming" ? <span className="vs">VS</span> : <><b className={m.winner === m.team1_id ? "w" : ""}>{m.team1_score}</b><i>:</i><b className={m.winner === m.team2_id ? "w" : ""}>{m.team2_score}</b></>}
        </div>
        <FeatTeam name={m.team2_string} logo={teamsMap?.[m.team2_id]?.logo} win={m.winner === m.team2_id} right />
      </div>
      <div className="ovr-feat-cta">
        <Link href={`/partidas/${m.id}`} className="ovr-btn primary">{st === "live" ? "Assistir agora" : "Ver partida"}</Link>
        {tour && <Link href={`/campeonato/${tour.id}`} className="ovr-btn">Ver campeonato</Link>}
      </div>
    </motion.div>
  );
}

function UpcomingTournament({ tour, inscritos = 0 }: { tour: Tournament; inscritos?: number }) {
  const fmt = tour.format === "swiss" ? "Suíço" : "Eliminação dupla";
  const vagas = tour.format === "swiss" ? 16 : 8;
  // Antes do bracket: usa inscrições; depois: usa os times do bracket
  const preenchidas = tour.teams.length || inscritos;
  return (
    <motion.div className="ovr-feature" {...fade(0.22)}>
      <div className="ovr-feat-head">
        <span className="ovr-feat-st upcoming">EM BREVE</span>
        <span className="ovr-feat-meta">Inscrições abertas</span>
      </div>
      <div className="ovr-soon">
        <div className="ovr-soon-name">{tour.name}</div>
        <div className="ovr-soon-info">
          {tour.start_date && <span><b>{fmtTourDate(tour.start_date)}</b>data</span>}
          {tour.location && <span><b>{tour.location}</b>local</span>}
          <span><b>{fmt}</b>formato</span>
          <span><b>{preenchidas}/{vagas}</b>vagas</span>
        </div>
      </div>
      <div className="ovr-feat-cta">
        <Link href="/inscricao" className="ovr-btn primary">Inscrever time</Link>
        <Link href={`/campeonato/${tour.id}`} className="ovr-btn">Ver campeonato</Link>
      </div>
    </motion.div>
  );
}

function RecapTournament({ tour, teamsMap }: { tour: Tournament; teamsMap?: HomeContentProps["teamsMap"] }) {
  const gf = tour.matches.find((m) => m.id === "GF");
  const champ = championOf(tour);
  const champLogo = champ ? teamsMap?.[champ.id]?.logo : null;
  const runnerId = gf && champ ? (gf.team1_id === champ.id ? gf.team2_id : gf.team1_id) : null;
  const runner = runnerId != null ? tour.teams.find((x) => x.id === runnerId) || null : null;
  const runnerLogo = runner ? teamsMap?.[runner.id]?.logo : null;
  return (
    <motion.div className="ovr-feature ovr-champ" {...fade(0.22)}>
      <div className="ovr-feat-head">
        <span className="ovr-feat-st finished">ENCERRADO</span>
        <span className="ovr-feat-meta">{tour.teams.length} times{runner ? " · Grande final" : ""}</span>
      </div>
      <div className="ovr-recap2">
        <div className="ovr-rc-item">
          <div className="ovr-rc-logo gold"><span>{champ ? initial(champ.name) : "?"}</span>{champLogo && <img src={champLogo} alt="" onError={onImgErr} />}</div>
          <div className="ovr-rc-txt">
            <div className="ovr-rc-tag gold"><Trophy /> Campeão</div>
            <div className="ovr-rc-name">{champ ? champ.name : "—"}</div>
          </div>
        </div>
        {runner && (
          <div className="ovr-rc-item">
            <div className="ovr-rc-logo"><span>{initial(runner.name)}</span>{runnerLogo && <img src={runnerLogo} alt="" onError={onImgErr} />}</div>
            <div className="ovr-rc-txt">
              <div className="ovr-rc-tag">Vice-campeão</div>
              <div className="ovr-rc-name dim">{runner.name}</div>
            </div>
          </div>
        )}
      </div>
      <div className="ovr-feat-cta">
        <Link href={`/campeonato/${tour.id}/recap`} className="ovr-btn primary">Ver recap</Link>
        <Link href={`/campeonato/${tour.id}`} className="ovr-btn">Ver campeonato</Link>
      </div>
    </motion.div>
  );
}

function MvpCard({ mvp }: { mvp: { steamId: string; name: string; average_rating: number } }) {
  return (
    <motion.div {...fade(0.28)} className="ovr-mvpcard-wrap">
      <Link href={`/perfil/${mvp.steamId}`} className="ovr-mvpcard">
        <div className="ovr-mvp-head">★ MVP da edição</div>
        <div className="ovr-mvp-av"><span>{initial(mvp.name)}</span><img src={`/api/steam/avatar-image/${mvp.steamId}`} alt="" onError={onImgErr} /></div>
        <div className="ovr-mvp-name">{mvp.name}</div>
        <div className="ovr-mvp-rating">{mvp.average_rating.toFixed(2)} <span>rating</span></div>
      </Link>
    </motion.div>
  );
}

/* ── estilos (escopado em .ovr) ───────────────────────────────────── */
const CSS = `
.ovr{
  --ovr-bg:#1B0F23; --ovr-bg2:#150A1D; --ovr-line:rgba(255,255,255,.09); --ovr-line2:rgba(255,255,255,.16);
  --ovr-tx:#F4F2F7; --ovr-dim:#86838F; --ovr-acc:#7C5CFF; --ovr-acc2:#A892FF; --ovr-live:#FF3B57;
  --ovr-up:#4ADE80; --ovr-down:#FB7185;
  --owp-or:#FF5A1F; --owp-or2:#FF8A3D; --owp-gold:#FFC24B; --owp-vio2:#A892FF;
  --owp-panel:#22132E; --owp-panel2:#2A1838; --owp-line-or:rgba(255,90,31,.32); --owp-faint:#6B5A7C; --owp-stroke:#241038;
  --owp-cy:#25D0E8; --owp-pk:#FF5C9D;
  --f-disp:var(--font-russo), sans-serif; --f-body:var(--font-chakra), sans-serif; --f-cond:var(--font-anton), sans-serif;
  position:relative; margin-top:-5rem; color:var(--ovr-tx);
  background:var(--ovr-bg);
  background-image:
    radial-gradient(120% 70% at 88% -4%, rgba(255,90,31,.14), transparent 52%),
    radial-gradient(90% 60% at 0% 2%, rgba(124,92,255,.13), transparent 55%);
  background-attachment:fixed;
  font-family:var(--f-body); overflow:hidden; padding:0 clamp(20px,5vw,72px);
}
.ovr *{ box-sizing:border-box; }
.ovr a{ text-decoration:none; color:inherit; }
.ovr .acc{ color:var(--ovr-acc); }
.ovr-livedot{ width:9px; height:9px; border-radius:50%; background:var(--ovr-live); display:inline-block; box-shadow:0 0 0 0 rgba(255,59,87,.6); animation:ovrpulse 1.5s infinite; }
.ovr-livedot.sm{ width:7px; height:7px; }
.ovr-livedot.soon{ background:var(--ovr-acc2); animation:none; box-shadow:none; }
/* hero slider */
.ovr-hslider{ position:relative; min-height:clamp(420px,54vh,580px); }
.ovr-hslider-nav{ position:absolute; right:0; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:11px; z-index:3; }
.ovr-hdot{ width:11px; height:11px; border-radius:50%; border:1px solid rgba(255,255,255,.32); background:transparent; cursor:pointer; padding:0; transition:height .2s, background .2s, border-color .2s; }
.ovr-hdot:hover{ border-color:var(--ovr-acc); }
.ovr-hdot.on{ height:28px; width:11px; border-radius:6px; background:var(--ovr-acc); border-color:var(--ovr-acc); }
@media(max-width:680px){
  .ovr-hslider-nav{ position:static; transform:none; flex-direction:row; gap:9px; margin-top:28px; }
  .ovr-hdot.on{ height:11px; width:28px; }
  /* hero: tira o vão gigante (100vh) e o padding enorme no mobile */
  .ovr-hero{ min-height:auto; padding:6.5rem 0 2.5rem; }
  .ovr-hslider{ min-height:auto; }
  .ovr-lead{ margin-top:18px; }
  /* recap campeão × vice: empilha em vez de espremer lado a lado */
  .ovr-recap2{ flex-direction:column; align-items:flex-start; gap:16px; }
  .ovr-recap2 .ovr-rc-item:last-child{ flex-direction:row; text-align:left; justify-content:flex-start; }
  .ovr-rc-name{ white-space:normal; }
}
@keyframes ovrpulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(255,59,87,.55);} 50%{ box-shadow:0 0 0 6px rgba(255,59,87,0);} }

/* ── VIDA: aurora viva + grain + pulso ── */
.ovr-aura{ position:absolute; top:0; left:0; right:0; height:94vh; z-index:0; pointer-events:none; overflow:hidden; }
.ovr-aura::before{ content:''; position:absolute; inset:-30%;
  background:
    radial-gradient(38% 44% at 22% 26%, rgba(124,92,255,.30), transparent 66%),
    radial-gradient(34% 40% at 82% 16%, rgba(168,130,255,.18), transparent 70%),
    radial-gradient(30% 38% at 58% 60%, rgba(91,70,200,.16), transparent 72%);
  filter:blur(40px); animation:ovr-aura 18s ease-in-out infinite alternate; }
.ovr-aura::after{ content:''; position:absolute; inset:0; opacity:.05; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
@keyframes ovr-aura{ 0%{ transform:translate3d(-3%,-2%,0) scale(1); } 100%{ transform:translate3d(4%,3%,0) scale(1.18); } }
.ovr-h1 .acc{ animation:ovr-breathe 4.5s ease-in-out infinite; }
@keyframes ovr-breathe{ 0%,100%{ text-shadow:0 0 30px rgba(124,92,255,.22); } 50%{ text-shadow:0 0 62px rgba(124,92,255,.52); } }
.ovr-tour:hover{ box-shadow:inset 0 0 50px rgba(124,92,255,.08); }
.ovr-feature{ box-shadow:0 40px 90px -50px rgba(124,92,255,.45); }
@media(prefers-reduced-motion:reduce){ .ovr-aura::before, .ovr-h1 .acc, .ovr-hero-img img, .ovr-scroll i{ animation:none; } }

/* HERO cinematográfico */
.ovr-hero-img{ position:absolute; top:0; left:0; right:0; width:100%; height:100vh; z-index:0; pointer-events:none; overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,#000 100%,transparent 100%); mask-image:linear-gradient(to bottom,#000 100%,transparent 100%); }
.ovr-hero-img img{ width:100%; height:100%; object-fit:cover; object-position:center 28%; filter:grayscale(1) contrast(1.1) brightness(.42); opacity:.34; animation:ovr-kenburns 24s ease-in-out infinite alternate; }
.ovr-hero-img::after{ content:''; position:absolute; inset:0; mix-blend-mode:color; background:linear-gradient(120deg,#FFC04C 0%,#FF8A2B 48%,#F2622E 100%); opacity:.62; }
.ovr-hero-img::before{ content:''; position:absolute; inset:0; z-index:1; background:linear-gradient(180deg, rgba(27,15,35,.55) 0%, rgba(27,15,35,.32) 45%, rgba(27,15,35,.95) 100%); }
@keyframes ovr-kenburns{ 0%{ transform:scale(1.02) translateY(0); } 100%{ transform:scale(1.14) translateY(-2%); } }
.ovr-scroll{ margin-top:auto; align-self:center; padding-top:48px; pointer-events:none; display:flex; flex-direction:column; align-items:center; gap:10px; }
.ovr-scroll span{ writing-mode:vertical-rl; font-family:var(--f-body); font-weight:600; font-size:10px; letter-spacing:.4em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-scroll i{ width:1px; height:46px; background:linear-gradient(var(--ovr-acc),transparent); animation:ovr-scrolldrop 1.8s ease-in-out infinite; }
@keyframes ovr-scrolldrop{ 0%{ transform:scaleY(.2); transform-origin:top; opacity:.3; } 50%{ transform:scaleY(1); opacity:1; } 100%{ transform:scaleY(.2); transform-origin:bottom; opacity:.3; } }
.ovr-hero{ position:relative; z-index:1; min-height:100vh; display:flex; flex-direction:column; justify-content:flex-start; padding:8rem 0 3rem; }
.ovr-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-family:var(--f-body); font-weight:600; font-size:13px; letter-spacing:.22em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2.7rem,8.7vw,8.2rem); line-height:.88; letter-spacing:-.03em; margin:24px 0 0; text-transform:uppercase; }
.ovr-lead{ max-width:46ch; margin:28px 0 0; font-size:clamp(15px,1.4vw,18px); line-height:1.6; color:#cfcdd6; }

.ovr-feature{ margin-top:clamp(2.5rem,5vh,4rem); max-width:900px; border:1px solid var(--ovr-line); background:rgba(12,12,18,.5); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
/* recap (campeão × vice) + card de MVP lado a lado */
.ovr-recap-row{ display:flex; gap:16px; align-items:stretch; flex-wrap:wrap; margin-top:clamp(2.5rem,5vh,4rem); max-width:1460px; }
.ovr-recap-row > *{ margin-top:0; }
.ovr-recap-row .ovr-feature{ flex:1 1 460px; max-width:none; }
.ovr-recap2{ display:flex; align-items:center; justify-content:space-between; gap:clamp(24px,4vw,56px); padding:clamp(24px,3.2vw,38px) clamp(20px,3.5vw,40px); flex-wrap:wrap; }
.ovr-recap2 .ovr-rc-item{ flex:1 1 0; }
.ovr-recap2 .ovr-rc-item:last-child{ justify-content:flex-end; flex-direction:row-reverse; text-align:right; }
.ovr-rc-item{ display:flex; align-items:center; gap:16px; min-width:0; }
.ovr-rc-txt{ min-width:0; }
.ovr-rc-logo{ position:relative; overflow:hidden; width:clamp(50px,6vw,72px); height:clamp(50px,6vw,72px); flex:0 0 auto; border:1px solid var(--ovr-line2); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:22px; color:var(--ovr-dim); }
.ovr-rc-logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; }
.ovr-rc-logo.gold{ border-color:rgba(245,197,66,.55); box-shadow:0 0 28px rgba(245,197,66,.2); }
.ovr-rc-tag{ display:flex; align-items:center; gap:7px; font-family:var(--f-body); font-weight:700; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-rc-tag.gold{ color:#F5C542; }
.ovr-rc-name{ font-family:var(--f-disp); font-size:clamp(20px,2.6vw,34px); text-transform:uppercase; letter-spacing:-.01em; color:#fff; margin-top:6px; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ovr-rc-name.dim{ color:var(--ovr-dim); }
.ovr-mvpcard-wrap{ flex:0 0 clamp(260px,26vw,360px); display:flex; }
.ovr-mvpcard{ position:relative; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:8px; padding:26px 20px; border:1px solid var(--ovr-line); background:linear-gradient(180deg,rgba(255,59,87,.1),rgba(12,12,18,.5)); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); transition:border-color .15s; }
.ovr-mvpcard:hover{ border-color:var(--ovr-live); }
.ovr-mvpcard::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--ovr-live),transparent); box-shadow:0 0 18px rgba(255,59,87,.6); }
.ovr-mvp-head{ font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:#FF7088; }
.ovr-mvp-av{ position:relative; overflow:hidden; width:74px; height:74px; border:1px solid rgba(255,59,87,.55); box-shadow:0 0 30px rgba(255,59,87,.35); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:24px; color:#FF7088; margin:4px 0; }
.ovr-mvp-av img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.ovr-mvp-name{ font-family:var(--f-disp); font-size:clamp(20px,2.4vw,28px); text-transform:uppercase; color:#fff; line-height:1; }
.ovr-mvp-rating{ font-family:var(--f-disp); font-size:20px; color:#FF7088; }
.ovr-mvp-rating span{ font-family:var(--f-body); font-weight:600; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ovr-dim); }
@media(max-width:560px){ .ovr-mvpcard-wrap{ flex:1 1 100%; } }
.ovr-feat-head{ display:flex; justify-content:space-between; align-items:center; padding:14px 22px; border-bottom:1px solid var(--ovr-line); }
.ovr-feat-st{ display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:12px; letter-spacing:.2em; }
.ovr-feat-st.live{ color:var(--ovr-live); } .ovr-feat-st.upcoming{ color:var(--ovr-acc2); } .ovr-feat-st.finished{ color:var(--ovr-dim); }
.ovr-feat-meta{ font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-feat-body{ display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:clamp(16px,4vw,60px); padding:clamp(28px,5vw,56px) clamp(20px,4vw,48px); }
.ovr-feat-team{ display:flex; align-items:center; gap:18px; min-width:0; }
.ovr-feat-team.r{ flex-direction:row-reverse; }
.ovr-feat-logo{ position:relative; overflow:hidden; width:clamp(48px,7vw,76px); height:clamp(48px,7vw,76px); flex:0 0 auto; border:1px solid var(--ovr-line2); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:24px; color:var(--ovr-dim); }
.ovr-feat-logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; }
.ovr-feat-name{ font-family:var(--f-disp); font-size:clamp(20px,3vw,40px); text-transform:uppercase; letter-spacing:-.01em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ovr-feat-name.w{ color:var(--ovr-acc); }
.ovr-feat-score{ font-family:var(--f-disp); font-size:clamp(40px,8vw,86px); line-height:1; display:flex; align-items:center; gap:clamp(8px,2vw,20px); white-space:nowrap; }
.ovr-feat-score i{ color:var(--ovr-dim); font-style:normal; }
.ovr-feat-score b{ font-weight:400; } .ovr-feat-score b.w{ color:var(--ovr-acc); }
.ovr-feat-score .vs{ font-size:clamp(20px,3vw,34px); color:var(--ovr-dim); letter-spacing:.1em; }
.ovr-feat-cta{ display:flex; gap:0; border-top:1px solid var(--ovr-line); }
.ovr-btn{ flex:1; text-align:center; font-family:var(--f-body); font-weight:700; font-size:13px; letter-spacing:.16em; text-transform:uppercase; padding:18px; cursor:pointer; transition:background .2s, color .2s; }
.ovr-btn + .ovr-btn{ border-left:1px solid var(--ovr-line); }
.ovr-btn:hover{ background:rgba(255,255,255,.04); }
.ovr-btn.primary{ background:var(--ovr-acc); color:#0A0A0C; }
.ovr-btn.primary:hover{ background:var(--ovr-acc2); }

/* hero "em breve" (próximo campeonato) */
.ovr-soon{ padding:clamp(26px,4vw,46px) clamp(20px,4vw,48px); }
.ovr-soon-name{ font-family:var(--f-disp); font-size:clamp(30px,6vw,68px); text-transform:uppercase; letter-spacing:-.02em; line-height:.95; color:#fff; }
.ovr-soon-info{ display:flex; flex-wrap:wrap; gap:clamp(20px,4vw,52px); margin-top:24px; }
.ovr-soon-info span{ display:flex; flex-direction:column; font-family:var(--f-body); font-weight:600; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--ovr-dim); gap:4px; }
.ovr-soon-info b{ font-family:var(--f-disp); font-weight:400; font-size:clamp(18px,2.4vw,26px); letter-spacing:0; color:var(--ovr-tx); }
/* hero "recap" (campeão da última edição) */
.ovr-recap-body{ display:flex; align-items:center; gap:22px; padding:clamp(26px,4vw,46px) clamp(20px,4vw,48px); }
.ovr-recap-logo{ position:relative; overflow:hidden; width:clamp(56px,8vw,88px); height:clamp(56px,8vw,88px); flex:0 0 auto; border:1px solid var(--ovr-line2); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:26px; color:var(--ovr-dim); }
.ovr-recap-logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:8px; }
.ovr-recap-label{ display:flex; align-items:center; gap:8px; font-family:var(--f-body); font-weight:700; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--ovr-acc2); }
.ovr-recap-name{ font-family:var(--f-disp); font-size:clamp(26px,4vw,46px); text-transform:uppercase; letter-spacing:-.01em; color:#fff; margin-top:6px; }
/* frufru dourado do bloco do campeão */
.ovr-champ{ position:relative; overflow:hidden; }
.ovr-champ > div{ position:relative; z-index:1; }
.ovr-champ::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; z-index:2;
  background:linear-gradient(90deg, transparent, #F5C542 30%, #FFE7A3 50%, #F5C542 70%, transparent);
  background-size:200% 100%; animation:ovr-shimmer 3.5s linear infinite; }
@keyframes ovr-shimmer{ 0%{ background-position:200% 0; } 100%{ background-position:-200% 0; } }
.ovr-champ::after{ content:''; position:absolute; top:-45%; right:-8%; width:48%; height:130%; z-index:0; pointer-events:none;
  background:radial-gradient(closest-side, rgba(245,197,66,.18), transparent 70%); }
.ovr-champ .ovr-recap-label{ color:#FFD45E; text-shadow:0 0 18px rgba(245,197,66,.4); }
.ovr-champ .ovr-recap-logo{ border-color:rgba(245,197,66,.55); box-shadow:0 0 30px rgba(245,197,66,.22); }
@media(prefers-reduced-motion:reduce){ .ovr-champ::before{ animation:none; } }
/* ═══ SEÇÕES — Overworld skin (hero acima permanece intacto) ═══ */
/* etiqueta do campeonato na linha de partida */
.ovr-row-tour{ color:var(--owp-vio2); margin-right:8px; }

/* BLOCK header — título lâmina */
.ovr-block{ position:relative; z-index:1; padding:clamp(3.5rem,8vh,7rem) 0 0; }
.ovr-2col{ display:grid; grid-template-columns:1fr 1fr; gap:clamp(28px,4vw,56px); align-items:start; }
@media(min-width:1025px){
  .ovr-2col .ovr-row{ grid-template-columns:44px 1fr clamp(70px,8vw,96px) 1fr 44px; }
  .ovr-2col .ovr-row-meta{ display:none; }
  .ovr-2col .ovr-row-team.r{ padding-left:0; }
}
@media(max-width:1024px){ .ovr-2col{ grid-template-columns:1fr; } }
.ovr-bhead{ display:flex; align-items:center; gap:13px; border-bottom:none; padding-bottom:0; margin-bottom:28px; }
.ovr-bhead::before{ content:''; flex:0 0 auto; width:0; height:0; border-style:solid; border-width:7px 0 7px 11px; border-color:transparent transparent transparent var(--owp-or); }
.ovr-bhead-l{ display:flex; align-items:baseline; gap:12px; }
.ovr-bnum{ font-family:var(--f-cond); font-weight:400; font-size:16px; letter-spacing:.04em; color:var(--owp-or2); }
.ovr-btitle{ font-family:var(--f-disp); font-weight:400; font-size:clamp(1.5rem,3.2vw,2.4rem); text-transform:uppercase; letter-spacing:.005em; line-height:.9; color:#fff; -webkit-text-stroke:2px var(--owp-stroke); paint-order:stroke fill; }
.ovr-bmore{ margin-left:auto; font-family:var(--f-cond); font-weight:400; font-size:13px; letter-spacing:.06em; text-transform:uppercase; color:var(--owp-or2); transition:color .15s; white-space:nowrap; }
.ovr-bmore:hover{ color:#fff; }

/* MATCH ROWS — painel angular */
.ovr-rows{ display:flex; flex-direction:column; background:var(--owp-panel); border:1px solid var(--ovr-line); }
.ovr-rowwrap{ position:relative; isolation:isolate; display:block; border-bottom:1px solid var(--ovr-line); transition:background .15s; cursor:pointer; }
.ovr-rowwrap.has-map::before{ content:''; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background:
    linear-gradient(90deg, #1B0F23 0%, transparent 34%, transparent 66%, #1B0F23 100%),
    linear-gradient(180deg, rgba(27,15,35,.82), rgba(27,15,35,.93)),
    var(--map) center 40% / cover no-repeat; }
.ovr-rowwrap.has-map:hover::before{ background:
    linear-gradient(90deg, #1B0F23 0%, transparent 34%, transparent 66%, #1B0F23 100%),
    linear-gradient(180deg, rgba(27,15,35,.7), rgba(27,15,35,.88)),
    var(--map) center 40% / cover no-repeat; }
.ovr-rowwrap:hover{ background:var(--owp-panel2); }
.ovr-rowwrap.live{ box-shadow:inset 3px 0 0 var(--ovr-live); }
.ovr-row{ display:grid; grid-template-columns:minmax(96px,160px) 1fr clamp(80px,9vw,116px) 1fr minmax(96px,160px); align-items:center; gap:clamp(8px,2vw,22px); padding:15px 16px; }
.ovr-row-maps{ display:flex; flex-wrap:wrap; justify-content:center; gap:16px; padding:0 8px 14px 8px; }
.ovr-mapchip{ display:inline-flex; flex-direction:column; align-items:center; gap:3px; }
.ovr-map-nm{ font-style:normal; font-family:var(--f-body); font-weight:700; font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-map-sc{ display:inline-flex; align-items:center; gap:5px; }
.ovr-mapchip em{ font-style:normal; color:var(--owp-faint); }
.ovr-mapchip b{ font-family:var(--f-cond); font-weight:400; font-size:15px; color:var(--ovr-tx); line-height:1; }
.ovr-mapchip b.w{ color:var(--owp-or); }
.ovr-row-st{ display:inline-flex; align-items:center; gap:6px; font-family:var(--f-body); font-weight:700; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--ovr-dim); }
.ovr-row-st.live{ color:var(--ovr-live); }
.ovr-row-team{ display:flex; align-items:center; gap:11px; min-width:0; }
.ovr-row-team.r{ flex-direction:row-reverse; justify-content:flex-start; }
.ovr-row-logo{ position:relative; overflow:hidden; width:30px; height:30px; flex:0 0 auto; border:1px solid var(--ovr-line2); background:var(--ovr-bg2); display:flex; align-items:center; justify-content:center; font-family:var(--f-cond); font-size:13px; color:var(--ovr-dim); }
.ovr-row-logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:3px; }
.ovr-row-name{ font-family:var(--f-cond); font-size:clamp(15px,1.7vw,20px); text-transform:uppercase; letter-spacing:.02em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; color:var(--ovr-tx); }
.ovr-row-name.w{ color:var(--owp-or); }
.ovr-row-score{ font-family:var(--f-cond); font-size:clamp(18px,2.2vw,24px); display:flex; justify-content:center; gap:8px; white-space:nowrap; font-variant-numeric:tabular-nums; color:var(--ovr-tx); }
.ovr-row-score i{ color:var(--owp-faint); font-style:normal; } .ovr-row-score i.vs{ font-size:16px; }
.ovr-row-score b{ font-weight:400; } .ovr-row-score b.w{ color:var(--owp-or); }
.ovr-row-meta{ font-family:var(--f-body); font-weight:500; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ovr-dim); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* RANKING BOARD — painel + barra skewada */
.ovr-board{ display:flex; flex-direction:column; background:var(--owp-panel); border:1px solid var(--ovr-line); }
.ovr-prow{ display:grid; grid-template-columns:54px 42px 1fr minmax(80px,240px) 60px; align-items:center; gap:clamp(12px,2vw,24px); padding:14px 16px; border-bottom:1px solid var(--ovr-line); transition:background .15s; cursor:pointer; }
.ovr-prow:hover{ background:var(--owp-panel2); }
.ovr-prank{ font-family:var(--f-disp); font-size:clamp(20px,2.2vw,28px); color:var(--owp-faint); }
.ovr-prow.top .ovr-prank{ color:var(--owp-or); }
.ovr-pav{ position:relative; overflow:hidden; width:38px; height:38px; border:1px solid var(--owp-line-or); background:#0d0712; display:flex; align-items:center; justify-content:center; font-family:var(--f-cond); font-size:14px; color:var(--owp-faint); clip-path:polygon(0 0,100% 0,100% 78%,78% 100%,0 100%); }
.ovr-pav img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.ovr-pname{ font-family:var(--f-cond); font-size:clamp(16px,1.7vw,20px); text-transform:uppercase; letter-spacing:.02em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; }
.ovr-pbar{ height:18px; background:#160c1f; position:relative; overflow:hidden; transform:skewX(-14deg); }
.ovr-pbar i{ position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg,var(--owp-or),var(--owp-or2)); }
.ovr-prt{ font-family:var(--f-cond); font-size:clamp(17px,1.9vw,22px); text-align:right; }

/* esteira de campeonatos (todas as edições) — cards angulares */
.ovr-rail{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; align-items:stretch; }
.ovr-rail > div{ display:flex; }
@media(max-width:1100px){ .ovr-rail{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px){ .ovr-rail{ grid-template-columns:1fr; } }
.ovr-ev{ position:relative; flex:1; display:flex; flex-direction:column; min-height:186px; padding:22px; border:1px solid var(--ovr-line); background:linear-gradient(160deg,var(--owp-panel),var(--ovr-bg2)); transition:transform .16s, border-color .16s; overflow:hidden; clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%); }
.ovr-ev:hover{ transform:translateY(-4px); border-color:var(--owp-line-or); }
.ovr-ev.live::before, .ovr-ev.done::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; z-index:2; }
.ovr-ev.live::before{ background:linear-gradient(90deg,transparent,var(--ovr-live),transparent); }
.ovr-ev.done::before{ background:linear-gradient(90deg,transparent,var(--owp-gold),transparent); }
.ovr-ev.soon::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; z-index:2; background:linear-gradient(90deg,transparent,var(--owp-vio2),transparent); }
.ovr-ev-glow{ position:absolute; inset:0; z-index:0; pointer-events:none; }
.ovr-ev.done .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 6%, rgba(255,194,75,.13), transparent 70%); }
.ovr-ev.live .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 6%, rgba(255,59,87,.14), transparent 70%); }
.ovr-ev.soon .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 6%, rgba(124,92,255,.14), transparent 70%); }
.ovr-ev-badge, .ovr-ev-name, .ovr-ev-meta, .ovr-ev-foot{ position:relative; z-index:1; }
.ovr-ev-badge{ display:inline-flex; align-items:center; gap:7px; font-family:var(--f-body); font-weight:700; font-size:10px; letter-spacing:.16em; text-transform:uppercase; }
.ovr-ev.live .ovr-ev-badge{ color:#FF8A9C; }
.ovr-ev.soon .ovr-ev-badge{ color:var(--owp-vio2); }
.ovr-ev.done .ovr-ev-badge{ color:var(--ovr-dim); }
.ovr-ev-name{ font-family:var(--f-cond); font-size:clamp(22px,1.9vw,28px); text-transform:uppercase; letter-spacing:.01em; line-height:1; color:#fff; margin:13px 0 6px; }
.ovr-ev-meta{ font-family:var(--f-body); font-weight:500; font-size:11px; color:var(--ovr-dim); }
.ovr-ev-foot{ margin-top:auto; padding-top:16px; }
.ovr-ev-prog{ height:5px; background:#160c1f; transform:skewX(-14deg); }
.ovr-ev-prog i{ display:block; height:100%; background:linear-gradient(90deg,var(--ovr-live),#FF8A9C); }
.ovr-ev-mini{ display:inline-block; font-family:var(--f-cond); font-size:12px; letter-spacing:.04em; text-transform:uppercase; color:var(--owp-or2); border:1px solid var(--owp-line-or); padding:6px 12px; clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px); }
.ovr-ev-champ{ display:flex; align-items:center; gap:11px; }
.ovr-ev-clogo{ position:relative; overflow:hidden; width:40px; height:40px; flex:0 0 auto; border:1px solid var(--owp-gold); box-shadow:0 0 18px rgba(255,194,75,.2); background:#0d0712; display:flex; align-items:center; justify-content:center; font-family:var(--f-cond); font-size:15px; color:var(--owp-gold); clip-path:polygon(0 0,100% 0,100% 80%,80% 100%,0 100%); }
.ovr-ev-clogo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:5px; }
.ovr-ev-ctxt{ display:flex; flex-direction:column; gap:3px; min-width:0; }
.ovr-ev-ctxt > span{ display:flex; align-items:center; gap:6px; font-family:var(--f-body); font-weight:700; font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--owp-gold); }
.ovr-ev-ctxt b{ font-family:var(--f-cond); font-weight:400; font-size:17px; text-transform:uppercase; color:#fff; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* STATS — números Anton */
.ovr-stats{ position:relative; z-index:1; margin:clamp(4rem,9vh,8rem) 0 0; display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--ovr-line); background:var(--owp-panel); }
.ovr-stat{ position:relative; padding:clamp(30px,5vw,52px) 12px; border-right:1px solid var(--ovr-line); text-align:center; }
.ovr-stat::before{ content:''; position:absolute; top:0; left:0; width:34px; height:3px; background:var(--owp-or); }
.ovr-stat:last-child{ border-right:none; }
.ovr-stat-n{ font-family:var(--f-cond); font-size:clamp(44px,7vw,80px); line-height:.9; color:#fff; }
.ovr-stat-l{ font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--ovr-dim); margin-top:12px; }

/* HIGHLIGHTS CTA */
.ovr-hl{ display:flex; justify-content:space-between; align-items:center; gap:24px; padding:clamp(30px,5vw,52px) clamp(24px,4vw,46px); background:linear-gradient(120deg,var(--owp-panel),var(--ovr-bg2)); border:1px solid var(--ovr-line); border-left:3px solid var(--owp-or); transition:.15s; cursor:pointer; flex-wrap:wrap; clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%); }
.ovr-hl:hover{ border-color:var(--owp-line-or); background:linear-gradient(120deg,var(--owp-panel2),var(--owp-panel)); }
.ovr-hl-t{ font-family:var(--f-disp); font-size:clamp(20px,3.2vw,38px); text-transform:uppercase; letter-spacing:-.01em; color:#fff; -webkit-text-stroke:2px var(--owp-stroke); paint-order:stroke fill; }
.ovr-hl-s{ font-family:var(--f-body); font-size:14px; color:var(--ovr-dim); margin-top:9px; max-width:52ch; }
.ovr-hl-go{ font-family:var(--f-cond); font-size:15px; letter-spacing:.06em; text-transform:uppercase; color:var(--owp-or2); white-space:nowrap; }

/* FOOTER */
.ovr-foot{ margin:clamp(5rem,10vh,9rem) 0 0; padding:clamp(2.5rem,5vw,4rem) 0; border-top:1px solid var(--ovr-line); }
.ovr-foot-brand{ font-family:var(--f-disp); font-size:clamp(2rem,6vw,4.4rem); text-transform:uppercase; letter-spacing:-.01em; line-height:1; color:#fff; -webkit-text-stroke:3px var(--owp-stroke); paint-order:stroke fill; }
.ovr-foot-brand .acc{ color:var(--owp-or); }
.ovr-foot-links{ display:flex; flex-wrap:wrap; gap:24px; margin:26px 0; }
.ovr-foot-links a{ font-family:var(--f-cond); font-size:14px; letter-spacing:.04em; text-transform:uppercase; color:var(--ovr-dim); transition:color .15s; }
.ovr-foot-links a:hover{ color:var(--owp-or2); }
.ovr-foot-cop{ font-family:var(--f-body); font-size:11px; letter-spacing:.05em; color:var(--owp-faint); }

.ovr-empty{ font-family:var(--f-body); font-weight:500; color:var(--ovr-dim); border:1px solid var(--ovr-line); background:var(--owp-panel); padding:30px; text-align:center; letter-spacing:.04em; }

/* RESPONSIVE */
@media(max-width:900px){
  .ovr-row{ grid-template-columns:minmax(44px,80px) 1fr clamp(70px,12vw,100px) 1fr minmax(44px,80px); }
  .ovr-row-meta{ display:none; }
}
@media(max-width:560px){
  .ovr-stats{ grid-template-columns:1fr 1fr; }
  .ovr-stat:nth-child(2){ border-right:none; }
  .ovr-stat:nth-child(1),.ovr-stat:nth-child(2){ border-bottom:1px solid var(--ovr-line); }
  .ovr-prow{ grid-template-columns:38px 36px 1fr 56px; } .ovr-pbar{ display:none; }
  .ovr-feat-name{ font-size:18px; }
  /* linha de partida empilha no mobile: status / time1 / placar / time2 */
  .ovr-row{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px 12px; }
  .ovr-row-team, .ovr-row-team.r{ flex-direction:row; justify-content:center; max-width:100%; padding-left:0; }
  .ovr-row-name{ white-space:normal; text-align:center; }
  .ovr-row-score{ font-size:28px; }
}
@media(prefers-reduced-motion:reduce){ .ovr-livedot{ animation:none; } }

/* ═══════════ VIDA (seções) — shimmer · pulso · sheen ═══════════ */
.ovr-bhead::before{ animation:owppulse 2.4s ease-in-out infinite; }
@keyframes owppulse{ 50%{ filter:drop-shadow(0 0 10px currentColor); } }
.ovr-ev.live::before{ background:linear-gradient(90deg,transparent,var(--ovr-live),transparent); background-size:200% 100%; animation:owpsweep 3s linear infinite; }
.ovr-ev.soon::before{ background:linear-gradient(90deg,transparent,var(--owp-vio2),transparent); background-size:200% 100%; animation:owpsweep 3.4s linear infinite; }
.ovr-ev.done::before{ background:linear-gradient(90deg,transparent,var(--owp-gold) 42%,#FFE7A3 50%,var(--owp-gold) 58%,transparent); background-size:200% 100%; animation:owpsweep 3.6s linear infinite; }
@keyframes owpsweep{ 0%{ background-position:200% 0; } 100%{ background-position:-200% 0; } }
.ovr-ev-prog i{ position:relative; overflow:hidden; }
.ovr-ev-prog i::after{ content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent); transform:translateX(-100%); animation:owpscan 2.2s ease-in-out infinite; }
@keyframes owpscan{ 0%{ transform:translateX(-100%); } 60%,100%{ transform:translateX(200%); } }
.ovr-ev:hover{ box-shadow:0 24px 60px -34px rgba(255,90,31,.5); }
.ovr-hl-go{ transition:transform .2s, color .15s; }
.ovr-hl:hover .ovr-hl-go{ transform:translateX(5px); color:#fff; }

/* ═══════════ PALETA — cores contrastantes por seção/dado ═══════════ */
/* cabeçalhos coloridos (triângulo + número + "mais") */
.ovr-bhead::before{ color:var(--owp-or); border-color:transparent transparent transparent currentColor; }
.ovr-bhead .ovr-bnum, .ovr-bhead .ovr-bmore{ color:var(--owp-or2); }
.ovr-bhead.c-cy::before{ color:var(--owp-cy); } .ovr-bhead.c-cy .ovr-bnum, .ovr-bhead.c-cy .ovr-bmore{ color:var(--owp-cy); }
.ovr-bhead.c-gr::before{ color:var(--ovr-up); } .ovr-bhead.c-gr .ovr-bnum, .ovr-bhead.c-gr .ovr-bmore{ color:var(--ovr-up); }
.ovr-bhead.c-gd::before{ color:var(--owp-gold); } .ovr-bhead.c-gd .ovr-bnum, .ovr-bhead.c-gd .ovr-bmore{ color:var(--owp-gold); }
.ovr-bhead.c-pk::before{ color:var(--owp-pk); } .ovr-bhead.c-pk .ovr-bnum, .ovr-bhead.c-pk .ovr-bmore{ color:var(--owp-pk); }
/* stats — cada card uma cor */
.ovr-stat:nth-child(1)::before{ background:var(--owp-or); } .ovr-stat:nth-child(1) .ovr-stat-n{ color:var(--owp-or2); }
.ovr-stat:nth-child(2)::before{ background:var(--owp-cy); } .ovr-stat:nth-child(2) .ovr-stat-n{ color:var(--owp-cy); }
.ovr-stat:nth-child(3)::before{ background:var(--ovr-up); } .ovr-stat:nth-child(3) .ovr-stat-n{ color:var(--ovr-up); }
.ovr-stat:nth-child(4)::before{ background:var(--owp-gold); } .ovr-stat:nth-child(4) .ovr-stat-n{ color:var(--owp-gold); }
/* ranking — heatmap de rating (barra + nota) + rank do pódio */
.ovr-prow.t-hi .ovr-pbar i{ background:linear-gradient(90deg,var(--ovr-up),#8BF0B4); } .ovr-prow.t-hi .ovr-prt{ color:var(--ovr-up); }
.ovr-prow.t-gd .ovr-pbar i{ background:linear-gradient(90deg,var(--owp-gold),#FFE7A3); } .ovr-prow.t-gd .ovr-prt{ color:var(--owp-gold); }
.ovr-prow.t-or .ovr-pbar i{ background:linear-gradient(90deg,var(--owp-or),var(--owp-or2)); } .ovr-prow.t-or .ovr-prt{ color:var(--owp-or2); }
.ovr-prow.t-lo .ovr-pbar i{ background:linear-gradient(90deg,var(--owp-pk),#FF9CC0); } .ovr-prow.t-lo .ovr-prt{ color:var(--owp-pk); }
.ovr-prow.p1 .ovr-prank{ color:var(--ovr-up); } .ovr-prow.p2 .ovr-prank{ color:var(--owp-cy); } .ovr-prow.p3 .ovr-prank{ color:var(--owp-gold); }
/* vencedores em verde (contraste com o laranja) */
.ovr-row-name.w{ color:var(--ovr-up); }
.ovr-row-score b.w{ color:var(--ovr-up); }
.ovr-mapchip b.w{ color:var(--ovr-up); }
@media(prefers-reduced-motion:reduce){ .ovr-bhead::before, .ovr-ev.live::before, .ovr-ev.soon::before, .ovr-ev.done::before, .ovr-ev-prog i::after{ animation:none; } }
@media(max-width:560px){ .ovr-bhead{ flex-wrap:wrap; } }
`;
