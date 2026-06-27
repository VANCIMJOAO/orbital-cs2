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
                  <Link href={`/campeonato/${tour.id}`} className={`ovr-ev ${state}`}>
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
              const col = r >= 1.2 ? "var(--ovr-up)" : r >= 0.85 ? "var(--ovr-tx)" : "var(--ovr-down)";
              return (
                <motion.div key={p.steamId} {...fade(i * 0.04)}>
                  <Link href={`/perfil/${p.steamId}`} className={`ovr-prow ${i < 3 ? "top" : ""}`}>
                    <div className="ovr-prank">{String(i + 1).padStart(2, "0")}</div>
                    <div className="ovr-pav"><span>{initial(p.name)}</span><img src={`/api/steam/avatar-image/${p.steamId}`} alt="" onError={onImgErr} /></div>
                    <div className="ovr-pname">{p.name}</div>
                    <div className="ovr-pbar"><i style={{ width: `${pct}%` }} /></div>
                    <div className="ovr-prt" style={{ color: col }}>{r.toFixed(2)}</div>
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
          <Link href="/loja">Loja</Link>
        </div>
        <div className="ovr-foot-cop">© ORBITAL ROXA · plataforma de campeonatos CS2 · orbitalroxa.com.br</div>
      </footer>
    </div>
  );
}

/* ── sub-componentes ──────────────────────────────────────────────── */
function Block({ num, title, href, hrefLabel, children }: { num: string; title: string; href?: string; hrefLabel?: string; children: React.ReactNode }) {
  return (
    <section className="ovr-block">
      <motion.div className="ovr-bhead" {...fade()}>
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
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVal(to); return; }
    const controls = animate(0, to, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(Math.round(v)) });
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
  --ovr-bg:#0A0A0C; --ovr-bg2:#101014; --ovr-line:rgba(255,255,255,.09); --ovr-line2:rgba(255,255,255,.16);
  --ovr-tx:#F4F2F7; --ovr-dim:#86838F; --ovr-acc:#7C5CFF; --ovr-acc2:#A892FF; --ovr-live:#FF3B57;
  --ovr-up:#4ADE80; --ovr-down:#FB7185;
  --f-disp:var(--font-russo), sans-serif; --f-body:var(--font-chakra), sans-serif;
  position:relative; margin-top:-5rem; background:var(--ovr-bg); color:var(--ovr-tx);
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
.ovr-hero-img::before{ content:''; position:absolute; inset:0; z-index:1; background:linear-gradient(180deg, rgba(10,10,12,.55) 0%, rgba(10,10,12,.32) 45%, rgba(10,10,12,.9) 100%); }
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
/* etiqueta do campeonato na linha de partida */
.ovr-row-tour{ color:var(--ovr-acc2); margin-right:10px; }

/* BLOCK */
.ovr-block{ position:relative; z-index:1; padding:clamp(3.5rem,8vh,7rem) 0 0; }
/* duas divs no mesmo bloco (full-width) */
.ovr-2col{ display:grid; grid-template-columns:1fr 1fr; gap:clamp(28px,4vw,64px); align-items:start; }
@media(min-width:1025px){
  .ovr-2col .ovr-row{ grid-template-columns:46px 1fr clamp(70px,8vw,96px) 1fr 46px; }
  .ovr-2col .ovr-row-meta{ display:none; }
  .ovr-2col .ovr-row-team.r{ padding-left:0; }
}
@media(max-width:1024px){ .ovr-2col{ grid-template-columns:1fr; } }
.ovr-bhead{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid var(--ovr-line); padding-bottom:20px; margin-bottom:34px; }
.ovr-bhead-l{ display:flex; align-items:baseline; gap:18px; }
.ovr-bnum{ font-family:var(--f-body); font-weight:600; font-size:14px; letter-spacing:.2em; color:var(--ovr-acc); }
.ovr-btitle{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2rem,5vw,4rem); text-transform:uppercase; letter-spacing:-.02em; line-height:1; }
.ovr-bmore{ font-family:var(--f-body); font-weight:600; font-size:13px; letter-spacing:.12em; text-transform:uppercase; color:var(--ovr-dim); transition:color .2s; white-space:nowrap; }
.ovr-bmore:hover{ color:var(--ovr-tx); }

/* MATCH ROWS */
.ovr-rows{ display:flex; flex-direction:column; }
.ovr-rowwrap{ position:relative; isolation:isolate; display:block; border-bottom:1px solid var(--ovr-line); transition:background .2s, padding-left .2s; cursor:pointer; }
.ovr-rowwrap.has-map::before{ content:''; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background:
    linear-gradient(90deg, #0A0A0C 0%, transparent 34%, transparent 66%, #0A0A0C 100%),
    linear-gradient(180deg, rgba(10,10,12,.82), rgba(10,10,12,.93)),
    var(--map) center 40% / cover no-repeat; }
.ovr-rowwrap.has-map:hover::before{ background:
    linear-gradient(90deg, #0A0A0C 0%, transparent 34%, transparent 66%, #0A0A0C 100%),
    linear-gradient(180deg, rgba(10,10,12,.72), rgba(10,10,12,.88)),
    var(--map) center 40% / cover no-repeat; }
.ovr-rowwrap:hover{ background:rgba(255,255,255,.025); padding-left:18px; }
.ovr-rowwrap.live{ box-shadow:inset 3px 0 0 var(--ovr-live); }
.ovr-row{ display:grid; grid-template-columns:minmax(110px,190px) 1fr clamp(88px,9vw,124px) 1fr minmax(110px,190px); align-items:center; gap:clamp(10px,2vw,28px); padding:18px 8px; }
.ovr-row-maps{ display:flex; flex-wrap:wrap; justify-content:center; gap:18px; padding:0 8px 16px 8px; }
.ovr-mapchip{ display:inline-flex; flex-direction:column; align-items:center; gap:3px; }
.ovr-map-nm{ font-style:normal; font-family:var(--f-body); font-weight:700; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#b8b4c6; }
.ovr-map-sc{ display:inline-flex; align-items:center; gap:5px; }
.ovr-mapchip em{ font-style:normal; color:var(--ovr-dim); }
.ovr-mapchip b{ font-family:var(--f-disp); font-weight:400; font-size:15px; color:var(--ovr-tx); line-height:1; }
.ovr-mapchip b.w{ color:var(--ovr-acc); }
.ovr-row-st{ display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:11px; letter-spacing:.14em; color:var(--ovr-dim); }
.ovr-row-st.live{ color:var(--ovr-live); }
.ovr-row-team{ display:flex; align-items:center; gap:12px; min-width:0; }
.ovr-row-team.r{ justify-content:flex-start; padding-left:clamp(24px,7vw,120px); }
.ovr-row-logo{ position:relative; overflow:hidden; width:30px; height:30px; flex:0 0 auto; border:1px solid var(--ovr-line2); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:12px; color:var(--ovr-dim); }
.ovr-row-logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:3px; }
.ovr-row-name{ font-family:var(--f-disp); font-size:clamp(15px,1.7vw,21px); text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.ovr-row-name.w{ color:var(--ovr-acc); }
.ovr-row-score{ font-family:var(--f-disp); font-size:clamp(18px,2.2vw,26px); display:flex; justify-content:center; gap:9px; white-space:nowrap; font-variant-numeric:tabular-nums; }
.ovr-row-score i{ color:var(--ovr-dim); font-style:normal; } .ovr-row-score i.vs{ font-size:18px; }
.ovr-row-score b{ font-weight:400; } .ovr-row-score b.w{ color:var(--ovr-acc); }
.ovr-row-meta{ font-family:var(--f-body); font-weight:500; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--ovr-dim); text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ovr-upcoming{ margin-top:30px; }
.ovr-mini-label, .ovr-mini-label{ font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--ovr-dim); margin-bottom:10px; }

/* RANKING BOARD */
.ovr-board{ display:flex; flex-direction:column; }
.ovr-prow{ display:grid; grid-template-columns:54px 44px 1fr minmax(80px,260px) 64px; align-items:center; gap:clamp(12px,2vw,26px); padding:16px 8px; border-bottom:1px solid var(--ovr-line); transition:background .2s, padding-left .2s; cursor:pointer; }
.ovr-prow:hover{ background:rgba(255,255,255,.025); padding-left:18px; }
.ovr-prank{ font-family:var(--f-disp); font-size:clamp(20px,2.4vw,30px); color:var(--ovr-dim); }
.ovr-prow.top .ovr-prank{ color:var(--ovr-acc); }
.ovr-pav{ position:relative; overflow:hidden; width:40px; height:40px; border:1px solid var(--ovr-line2); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:14px; color:var(--ovr-dim); }
.ovr-pav img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.ovr-pname{ font-family:var(--f-disp); font-size:clamp(15px,1.7vw,20px); text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ovr-pbar{ height:4px; background:rgba(255,255,255,.07); position:relative; }
.ovr-pbar i{ position:absolute; left:0; top:0; bottom:0; background:var(--ovr-acc); }
.ovr-prt{ font-family:var(--f-disp); font-size:clamp(16px,1.9vw,22px); text-align:right; }

/* TOURNAMENTS */
.ovr-tours{ display:grid; grid-template-columns:repeat(3,1fr); gap:0; border:1px solid var(--ovr-line); }
.ovr-tour{ display:block; padding:clamp(20px,2.5vw,30px); border-right:1px solid var(--ovr-line); border-bottom:1px solid var(--ovr-line); transition:background .2s; cursor:pointer; min-height:180px; }
.ovr-tour:hover{ background:rgba(255,255,255,.03); }
.ovr-tour-st{ display:inline-flex; align-items:center; gap:7px; font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.16em; text-transform:uppercase; }
.ovr-tour-st.live{ color:var(--ovr-live); } .ovr-tour-st.fin{ color:var(--ovr-up); } .ovr-tour-st.soon{ color:var(--ovr-acc2); }
.ovr-tour-name{ font-family:var(--f-disp); font-size:clamp(22px,2.6vw,34px); text-transform:uppercase; letter-spacing:-.01em; margin:14px 0 8px; line-height:1; }
.ovr-tour-meta{ font-family:var(--f-body); font-weight:500; font-size:13px; letter-spacing:.06em; color:var(--ovr-dim); }
.ovr-tour-champ{ display:flex; align-items:center; gap:8px; margin-top:18px; font-family:var(--f-body); font-weight:700; font-size:13px; letter-spacing:.04em; color:var(--ovr-acc2); }

/* esteira de campeonatos (todas as edições) */
.ovr-rail{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; align-items:stretch; }
.ovr-rail > div{ display:flex; }
@media(max-width:1100px){ .ovr-rail{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:560px){ .ovr-rail{ grid-template-columns:1fr; } }
.ovr-ev{ position:relative; flex:1; display:flex; flex-direction:column; min-height:178px; padding:22px; border:1px solid var(--ovr-border); background:linear-gradient(160deg,#16121f,#100c18); transition:transform .15s, border-color .15s; overflow:hidden; }
.ovr-ev:hover{ transform:translateY(-4px); border-color:var(--ovr-acc); }
.ovr-ev.live::before, .ovr-ev.done::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; }
.ovr-ev.live::before{ background:linear-gradient(90deg,transparent,var(--ovr-live),transparent); }
.ovr-ev.done::before{ background:linear-gradient(90deg,transparent,#F5C542,transparent); }
.ovr-ev.soon::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,var(--ovr-acc2),transparent); }
.ovr-ev-glow{ position:absolute; inset:0; z-index:0; pointer-events:none; }
.ovr-ev.done .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 8%, rgba(245,197,66,.14), transparent 70%); }
.ovr-ev.live .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 8%, rgba(255,59,87,.14), transparent 70%); }
.ovr-ev.soon .ovr-ev-glow{ background:radial-gradient(60% 80% at 85% 8%, rgba(124,92,255,.14), transparent 70%); }
.ovr-ev-badge, .ovr-ev-name, .ovr-ev-meta, .ovr-ev-foot{ position:relative; z-index:1; }
.ovr-ev-badge{ display:inline-flex; align-items:center; gap:7px; font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.16em; text-transform:uppercase; }
.ovr-ev.live .ovr-ev-badge{ color:var(--ovr-live); }
.ovr-ev.soon .ovr-ev-badge{ color:var(--ovr-acc2); }
.ovr-ev.done .ovr-ev-badge{ color:var(--ovr-dim); }
.ovr-ev-name{ font-family:var(--f-disp); font-size:clamp(22px,1.9vw,30px); text-transform:uppercase; letter-spacing:-.01em; line-height:1; margin:14px 0 6px; }
.ovr-ev-meta{ font-family:var(--f-body); font-weight:500; font-size:13px; color:var(--ovr-dim); }
.ovr-ev-foot{ margin-top:auto; padding-top:16px; }
.ovr-ev-prog{ height:4px; background:rgba(255,255,255,.08); }
.ovr-ev-prog i{ display:block; height:100%; background:var(--ovr-live); }
.ovr-ev-mini{ display:inline-block; font-family:var(--f-body); font-weight:700; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ovr-acc); border:1px solid rgba(124,92,255,.4); padding:7px 12px; }
.ovr-ev-champ{ display:flex; align-items:center; gap:11px; }
.ovr-ev-clogo{ position:relative; overflow:hidden; width:40px; height:40px; flex:0 0 auto; border:1px solid rgba(245,197,66,.5); box-shadow:0 0 18px rgba(245,197,66,.18); display:flex; align-items:center; justify-content:center; font-family:var(--f-disp); font-size:14px; color:#F5C542; }
.ovr-ev-clogo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:4px; }
.ovr-ev-ctxt{ display:flex; flex-direction:column; gap:3px; min-width:0; }
.ovr-ev-ctxt > span{ display:flex; align-items:center; gap:6px; font-family:var(--f-body); font-weight:700; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:#F5C542; }
.ovr-ev-ctxt b{ font-family:var(--f-disp); font-weight:400; font-size:17px; text-transform:uppercase; color:#fff; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* STATS */
.ovr-stats{ position:relative; z-index:1; margin:clamp(4rem,9vh,8rem) 0 0; display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--ovr-line); }
.ovr-stat{ padding:clamp(32px,5vw,56px) 12px; border-right:1px solid var(--ovr-line); text-align:center; }
.ovr-stat:last-child{ border-right:none; }
.ovr-stat-n{ font-family:var(--f-disp); font-size:clamp(44px,7vw,84px); line-height:.9; }
.ovr-stat-l{ font-family:var(--f-body); font-weight:600; font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:var(--ovr-dim); margin-top:12px; }

/* HIGHLIGHTS CTA */
.ovr-hl{ display:flex; justify-content:space-between; align-items:center; gap:24px; padding:clamp(30px,5vw,56px) clamp(24px,4vw,48px); border:1px solid var(--ovr-line); transition:background .2s, border-color .2s; cursor:pointer; flex-wrap:wrap; }
.ovr-hl:hover{ background:rgba(124,92,255,.06); border-color:var(--ovr-acc); }
.ovr-hl-t{ font-family:var(--f-disp); font-size:clamp(22px,3.4vw,42px); text-transform:uppercase; letter-spacing:-.01em; }
.ovr-hl-s{ font-family:var(--f-body); font-size:14px; color:var(--ovr-dim); margin-top:8px; max-width:50ch; }
.ovr-hl-go{ font-family:var(--f-body); font-weight:700; font-size:14px; letter-spacing:.14em; text-transform:uppercase; color:var(--ovr-acc); white-space:nowrap; }

/* FOOTER */
.ovr-foot{ margin:clamp(5rem,10vh,9rem) 0 0; padding:clamp(2.5rem,5vw,4rem) 0; border-top:1px solid var(--ovr-line); }
.ovr-foot-brand{ font-family:var(--f-disp); font-size:clamp(2rem,6vw,4.5rem); text-transform:uppercase; letter-spacing:-.02em; line-height:1; }
.ovr-foot-links{ display:flex; flex-wrap:wrap; gap:24px; margin:28px 0; }
.ovr-foot-links a{ font-family:var(--f-body); font-weight:600; font-size:13px; letter-spacing:.1em; text-transform:uppercase; color:var(--ovr-dim); transition:color .2s; }
.ovr-foot-links a:hover{ color:var(--ovr-tx); }
.ovr-foot-cop{ font-family:var(--f-body); font-size:12px; letter-spacing:.06em; color:var(--ovr-dim); }

.ovr-empty{ font-family:var(--f-body); font-weight:500; color:var(--ovr-dim); border:1px dashed var(--ovr-line2); padding:36px; text-align:center; letter-spacing:.06em; }

/* RESPONSIVE */
@media(max-width:900px){
  .ovr-tours{ grid-template-columns:1fr 1fr; }
  .ovr-row{ grid-template-columns:minmax(46px,90px) 1fr clamp(74px,12vw,104px) 1fr minmax(46px,90px); }
  .ovr-row-meta{ display:none; }
}
@media(max-width:560px){
  .ovr-tours{ grid-template-columns:1fr; }
  .ovr-stats{ grid-template-columns:1fr 1fr; }
  .ovr-stat:nth-child(2){ border-right:none; }
  .ovr-stat:nth-child(1),.ovr-stat:nth-child(2){ border-bottom:1px solid var(--ovr-line); }
  .ovr-prow{ grid-template-columns:38px 36px 1fr 56px; } .ovr-pbar{ display:none; }
  .ovr-feat-name{ font-size:18px; }
  /* linha de partida empilha no mobile: status / time1 / placar / time2 */
  .ovr-row{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 12px; }
  .ovr-row-team, .ovr-row-team.r{ flex-direction:row; justify-content:center; max-width:100%; padding-left:0; }
  .ovr-row-name{ white-space:normal; text-align:center; }
  .ovr-row-score{ font-size:30px; }
}
@media(prefers-reduced-motion:reduce){ .ovr-livedot{ animation:none; } }
`;
