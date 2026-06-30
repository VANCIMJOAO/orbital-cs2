"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Match, getStatusType, getStatusText } from "@/lib/api";
import { MAP_IMAGES } from "@/lib/maps";
import { useAuth } from "@/lib/auth-context";
import { OWP_CSS } from "@/lib/owp-styles";

type FilterType = "all" | "live" | "upcoming" | "finished" | "mine";
type MapScore = { team1_score: number; team2_score: number; map_name: string };
type MapScoresMap = Record<number, MapScore[]>;
type TourRef = { id: string; name: string; logo?: string | null };
type TeamsMap = Record<number, { name: string; logo: string | null }>;

const PER_PAGE = 12;

const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";
const cleanTitle = (t?: string | null) => (t && !t.includes("{") ? t : "");

function rank(m: Match) { const s = getStatusType(m); return s === "live" ? 0 : s === "upcoming" ? 1 : 2; }
function cmp(a: Match, b: Match) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  const ta = new Date(a.end_time || a.start_time || 0).getTime();
  const tb = new Date(b.end_time || b.start_time || 0).getTime();
  return ra === 1 ? ta - tb : tb - ta;
}
function groupLabel(m: Match) {
  const st = getStatusType(m);
  if (st === "live") return "Ao vivo agora";
  const ts = m.end_time || m.start_time;
  if (!ts) return st === "upcoming" ? "Em breve" : "Sem data";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}
function stageOf(m: Match, tour: TourRef | null) {
  let stage = cleanTitle(m.title);
  if (tour && stage) {
    const parts = stage.split(/[—–-]/);
    if (parts.length > 1) stage = parts[parts.length - 1].trim();
  }
  return stage;
}

const PARTIDAS_CSS = `
.owp .feat{display:block;position:relative;overflow:hidden;border:1px solid var(--line-or);border-top:2px solid var(--or);margin-bottom:30px;clip-path:polygon(0 0,100% 0,100% calc(100% - 20px),calc(100% - 20px) 100%,0 100%);transition:.16s}
.owp .feat:hover{border-color:var(--or)}
.owp .feat.live{border-top-color:var(--live)}
.owp .feat .bg{position:absolute;inset:0;background-size:cover;background-position:center 40%}
.owp .feat .bg::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(27,15,35,.9),rgba(27,15,35,.38) 50%,rgba(27,15,35,.9))}
.owp .feat .ghost{position:absolute;right:2vw;bottom:-2.6vw;z-index:1;font-family:var(--disp);font-size:9rem;line-height:.7;color:transparent;-webkit-text-stroke:2px rgba(255,90,31,.13);text-transform:uppercase;pointer-events:none;letter-spacing:-.02em;user-select:none;white-space:nowrap}
.owp .feat .inner{position:relative;z-index:2;padding:22px clamp(20px,3vw,46px) 24px}
.owp .feat .ftop{display:flex;align-items:center;gap:12px;margin-bottom:22px;flex-wrap:wrap}
.owp .feat .hstat{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.owp .feat .hstat i{width:7px;height:7px;border-radius:50%}
.owp .feat .hstat.fin{color:var(--ok)}.owp .feat .hstat.fin i{background:var(--ok)}
.owp .feat .hstat.liv{color:#FF8A9C}.owp .feat .hstat.liv i{background:var(--live);box-shadow:0 0 8px var(--live);animation:owpblink 1.2s infinite}
.owp .feat .hstat.pend{color:var(--gold)}.owp .feat .hstat.pend i{background:var(--gold)}
.owp .feat .hstage{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.owp .feat .fbody{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:clamp(16px,3vw,48px)}
.owp .feat .team{display:flex;align-items:center;gap:18px;min-width:0}
.owp .feat .team.r{flex-direction:row-reverse;text-align:right}
.owp .feat .tlg{width:72px;height:72px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#0d0712;border:1px solid var(--or);clip-path:polygon(0 0,100% 0,100% 80%,80% 100%,0 100%);box-shadow:0 10px 30px -10px rgba(0,0,0,.8);position:relative;overflow:hidden}
.owp .feat .tlg span{font-family:var(--cond);font-size:40px;color:var(--or2);line-height:1}
.owp .feat .tlg img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:10px}
.owp .feat .tn{min-width:0}
.owp .feat .tn h2{font-family:var(--disp);font-size:clamp(1.4rem,2.4vw,2.4rem);line-height:.86;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .feat .tn h2.win{color:var(--ok)}
.owp .feat .tn .wl{display:inline-block;margin-top:9px;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ok);background:rgba(84,224,138,.12);border:1px solid var(--ok);padding:3px 9px}
.owp .feat .score{display:flex;align-items:center;gap:clamp(10px,1.6vw,26px);font-family:var(--disp)}
.owp .feat .score b{font-size:clamp(2.8rem,5.6vw,4.8rem);line-height:.8;color:#fff;text-shadow:0 0 32px rgba(255,90,31,.35)}
.owp .feat .score b.win{color:var(--ok);text-shadow:0 0 32px rgba(84,224,138,.4)}
.owp .feat .score b.lo{color:#D8CEE6}
.owp .feat .score .vs{font-family:var(--cond);font-size:clamp(1.6rem,3vw,2.6rem);color:var(--faint)}
.owp .feat .score .dash{font-family:var(--cond);font-size:clamp(1.4rem,3vw,2.6rem);color:var(--faint)}
.owp .feat .hmaps{display:flex;justify-content:center;gap:8px;margin-top:24px;flex-wrap:wrap}

.owp .cbadge{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;background:rgba(255,90,31,.1);border:1px solid var(--line-or);font-family:var(--mono);font-size:8.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--or2);max-width:62%}
.owp .cbadge .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.owp .maps{display:flex;flex-wrap:wrap;gap:6px}
.owp .mchip{display:inline-flex;align-items:center;gap:7px;padding:2px 8px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.owp .mchip .mn{font-family:var(--mono);font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:#fff;font-weight:700}
.owp .mchip .ms{font-family:var(--mono);font-size:9.5px;font-weight:700;color:var(--tx)}
.owp .mchip .ms .w{color:var(--ok)}.owp .mchip .ms .l{color:var(--tx)}.owp .mchip .ms .x{color:var(--dim);margin:0 1px}
.owp .mchip.livem{border-color:var(--line-or)}.owp .mchip.livem .mn{color:var(--or2)}

.owp .fbar{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin:26px 0 28px}
.owp .fchip{display:inline-flex;align-items:center;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:8px 14px;cursor:pointer;transition:.15s;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.owp .fchip:hover{color:var(--tx);border-color:var(--line-or)}
.owp .fchip.on{background:var(--or);color:#1a0d06;border-color:var(--or)}
.owp .fchip .ct{margin-left:8px;font-family:var(--mono);font-size:9px;font-weight:700;opacity:.7}
.owp .fchip.lv i{width:6px;height:6px;border-radius:50%;background:var(--live);margin-right:7px;box-shadow:0 0 7px var(--live);animation:owpblink 1.2s infinite}
.owp .fchip.on.lv i{background:#1a0d06;box-shadow:none;animation:none}
.owp .fchip .lk{margin-right:6px;font-size:9px}
.owp .psel{height:38px;padding:0 12px;background:var(--bg2);border:1px solid var(--line);color:var(--tx);font-family:var(--mono);font-size:11px;outline:none;cursor:pointer;transition:.15s}
.owp .psel:focus{border-color:var(--or)}
.owp .psearch{flex:1;min-width:180px;max-width:320px;display:flex;align-items:center;gap:9px;background:var(--bg2);border:1px solid var(--line);padding:0 13px;height:38px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);transition:.15s}
.owp .psearch:focus-within{border-color:var(--or)}
.owp .psearch input{flex:1;background:transparent;border:0;outline:none;color:var(--tx);font-family:var(--mono);font-size:11px;width:100%}
.owp .psearch input::placeholder{color:var(--faint)}

.owp .dhead{display:flex;align-items:center;gap:14px;margin:28px 0 16px;font-family:var(--disp);font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#fff;-webkit-text-stroke:1.5px var(--stroke);paint-order:stroke fill}
.owp .dhead.livehd{color:var(--live);-webkit-text-stroke:0}
.owp .dhead::after{content:'';flex:1;height:1px;background:var(--line)}

.owp .mcard{position:relative;display:block;overflow:hidden;border:1px solid var(--line);border-top:2px solid var(--line-or);transition:.16s;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)}
.owp .mcard:hover{border-color:var(--line-or);border-top-color:var(--or);transform:translateY(-2px)}
.owp .mcard.live{border-top-color:var(--live)}
.owp .mcard.live::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--live);z-index:5;box-shadow:0 0 10px var(--live)}
.owp .mcard .bg{position:absolute;inset:0;background-size:cover;background-position:center 42%}
.owp .mcard .bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(27,15,35,.6),rgba(27,15,35,.82) 55%,rgba(27,15,35,.9))}
.owp .mcard .in{position:relative;z-index:2;padding:15px 20px;min-height:152px;display:flex;flex-direction:column}
.owp .mcard .hd{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.owp .mcard .st{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.owp .mcard .st i{width:6px;height:6px;border-radius:50%}
.owp .mcard .st.fin{color:var(--ok)}.owp .mcard .st.fin i{background:var(--ok)}
.owp .mcard .st.liv{color:#FF8A9C}.owp .mcard .st.liv i{background:var(--live);box-shadow:0 0 7px var(--live);animation:owpblink 1.2s infinite}
.owp .mcard .st.pend{color:var(--gold)}.owp .mcard .st.pend i{background:var(--gold)}
.owp .mcard .hd .cbadge{margin-left:auto}
.owp .mcard .conf{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}
.owp .mcard .tm{display:flex;align-items:center;gap:12px;min-width:0}
.owp .mcard .tm.r{flex-direction:row-reverse;text-align:right}
.owp .mcard .lg{width:34px;height:34px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#0d0712;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% 78%,78% 100%,0 100%);position:relative;overflow:hidden}
.owp .mcard .lg span{font-family:var(--cond);font-size:18px;color:var(--or2);line-height:1}
.owp .mcard .lg img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:5px}
.owp .mcard .nm{font-family:var(--cond);font-size:16px;line-height:1;text-transform:uppercase;letter-spacing:.02em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .mcard .nm.win{color:var(--ok)}
.owp .mcard .sc{display:flex;align-items:center;gap:8px;font-family:var(--cond);font-size:23px}
.owp .mcard .sc b{color:var(--tx)}.owp .mcard .sc b.w{color:var(--ok)}.owp .mcard .sc b.l{color:var(--tx)}
.owp .mcard .sc .x{font-size:14px;color:var(--faint)}
.owp .mcard .sc .vs{font-family:var(--cond);font-size:19px;color:var(--faint)}
.owp .mcard .ft{margin-top:auto;padding-top:13px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.owp .mcard .ft .info{margin-left:auto;font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#E8E0F0}

.owp .pag{display:flex;justify-content:center;align-items:center;gap:9px;padding:40px 0 8px}
.owp .pag button{min-width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-family:var(--cond);font-size:15px;color:var(--dim);background:var(--panel);border:1px solid var(--line);transition:.15s;cursor:pointer;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.owp .pag button:hover:not(:disabled){border-color:var(--line-or);color:var(--tx)}
.owp .pag button.on{background:var(--or);color:#1a0d06;border-color:var(--or)}
.owp .pag button:disabled{opacity:.3;cursor:not-allowed}
.owp .pag .dots{color:var(--faint);font-family:var(--mono)}
.owp .emptybox{text-align:center;padding:60px 20px;border:1px dashed var(--line);font-family:var(--mono);font-size:12.5px;color:var(--dim)}
`;

export function PartidasContent({ matches, teamsMap, mapScoresMap, matchTournamentMap }: {
  matches: Match[];
  teamsMap?: TeamsMap;
  mapScoresMap?: MapScoresMap;
  matchTournamentMap?: Record<number, TourRef>;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [champ, setChamp] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  const tourOf = (m: Match): TourRef | null => matchTournamentMap?.[m.id] || null;

  const champMap: Record<string, string> = {};
  for (const k in (matchTournamentMap || {})) { const r = matchTournamentMap![k]; champMap[r.id] = r.name; }
  const champs = Object.entries(champMap).map(([id, name]) => ({ id, name }));

  const pool = champ === "all" ? matches : matches.filter(m => tourOf(m)?.id === champ);

  const counts: Record<FilterType, number> = {
    all: pool.length,
    live: pool.filter(m => getStatusType(m) === "live").length,
    upcoming: pool.filter(m => getStatusType(m) === "upcoming").length,
    finished: pool.filter(m => getStatusType(m) === "finished").length,
    mine: user ? pool.filter(m => m.user_id === user.id).length : 0,
  };

  const sortedPool = [...pool].sort(cmp);
  const hero = sortedPool.find(m => getStatusType(m) === "live")
    || sortedPool.find(m => getStatusType(m) === "upcoming")
    || sortedPool.find(m => getStatusType(m) === "finished")
    || sortedPool[0] || null;

  const q = search.trim().toLowerCase();
  const list = pool.filter(m => {
    if (hero && m.id === hero.id) return false;
    const st = getStatusType(m);
    if (filter === "mine") { if (!(user && m.user_id === user.id)) return false; }
    else if (filter !== "all" && st !== filter) return false;
    if (q) {
      const t1 = (m.team1_string || "").toLowerCase();
      const t2 = (m.team2_string || "").toLowerCase();
      const tt = (m.title || "").toLowerCase();
      const cn = (tourOf(m)?.name || "").toLowerCase();
      if (!t1.includes(q) && !t2.includes(q) && !tt.includes(q) && !cn.includes(q) && !String(m.id).includes(q)) return false;
    }
    return true;
  }).sort(cmp);

  const totalPages = Math.ceil(list.length / PER_PAGE);
  const paged = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const groups: { label: string; items: Match[] }[] = [];
  const gIdx: Record<string, number> = {};
  for (const m of paged) {
    const lb = groupLabel(m);
    if (gIdx[lb] == null) { gIdx[lb] = groups.length; groups.push({ label: lb, items: [] }); }
    groups[gIdx[lb]].items.push(m);
  }

  const changeFilter = (f: FilterType) => { setFilter(f); setPage(1); };
  const changeChamp = (c: string) => { setChamp(c); setFilter("all"); setPage(1); };

  const filterDefs: { value: FilterType; label: string; live?: boolean }[] = [
    { value: "all", label: "Todas" },
    { value: "live", label: "Ao vivo", live: true },
    { value: "upcoming", label: "Pendentes" },
    { value: "finished", label: "Finalizadas" },
  ];

  return (
    <div className="owp">
      <style>{OWP_CSS + PARTIDAS_CSS}</style>

      <header className="pagehead">
        <div className="lbl"><b>CS2 · Resultados &amp; Ao Vivo</b></div>
        <h1>Todas as <span style={{ color: "var(--or)" }}>Partidas</span></h1>
        <p>{matches.length} PARTIDAS · {counts.live} AO VIVO · {counts.finished} FINALIZADAS</p>
      </header>

      <div className="wrap">
        {hero && (
          <section className="sec" style={{ paddingTop: 24, paddingBottom: 0 }}>
            <HeroCard m={hero} teamsMap={teamsMap} mapScores={mapScoresMap?.[hero.id]} tour={tourOf(hero)} />
          </section>
        )}

        <section className="sec" style={{ paddingTop: 6, paddingBottom: 0 }}>
          <div className="fbar">
            {filterDefs.map(f => (
              <span key={f.value} className={`fchip ${f.live ? "lv" : ""} ${filter === f.value ? "on" : ""}`} onClick={() => changeFilter(f.value)}>
                {f.live && <i />}{f.label}<span className="ct">{counts[f.value]}</span>
              </span>
            ))}
            {user && (
              <span className={`fchip ${filter === "mine" ? "on" : ""}`} onClick={() => changeFilter("mine")}>
                Minhas<span className="ct">{counts.mine}</span>
              </span>
            )}
            {champs.length > 0 && (
              <select className="psel" value={champ} onChange={e => changeChamp(e.target.value)}>
                <option value="all">Todos os campeonatos</option>
                {champs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <label className="psearch">
              <span style={{ color: "var(--faint)" }}>⌕</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por time, evento ou ID…" />
            </label>
          </div>

          {groups.length > 0 ? (
            groups.map(g => (
              <div key={g.label}>
                <div className={`dhead ${g.label === "Ao vivo agora" ? "livehd" : ""}`}>{g.label === "Ao vivo agora" ? "● Ao vivo agora" : g.label}</div>
                <div className="grid g2">
                  {g.items.map(m => (
                    <FullCard key={m.id} m={m} teamsMap={teamsMap} mapScores={mapScoresMap?.[m.id]} tour={tourOf(m)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="emptybox">Nenhuma partida encontrada{q || filter !== "all" || champ !== "all" ? " com esses filtros." : "."}</div>
          )}

          {totalPages > 1 && (
            <div className="pag">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                  return <button key={p} className={page === p ? "on" : ""} onClick={() => setPage(p)}>{p}</button>;
                }
                if (p === page - 2 || p === page + 2) return <span key={p} className="dots">…</span>;
                return null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChampBadge({ tour }: { tour: TourRef | null }) {
  if (!tour) return null;
  return <span className="cbadge">🏆 <span className="t">{tour.name}</span></span>;
}

function MapChips({ mapScores, live }: { mapScores?: MapScore[]; live?: boolean }) {
  if (!mapScores || mapScores.length === 0) return null;
  return (
    <span className="maps">
      {mapScores.map((ms, i) => {
        const isLiveMap = live && i === mapScores.length - 1;
        const w1 = ms.team1_score > ms.team2_score, w2 = ms.team2_score > ms.team1_score;
        return (
          <span key={i} className={`mchip ${isLiveMap ? "livem" : ""}`}>
            <span className="mn">{ms.map_name.replace("de_", "")}</span>
            <span className="ms">
              <span className={isLiveMap ? "" : w1 ? "w" : "l"}>{ms.team1_score}</span>
              <span className="x">:</span>
              <span className={isLiveMap ? "" : w2 ? "w" : "l"}>{ms.team2_score}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function TeamLogo({ name, logo, big }: { name?: string | null; logo?: string | null; big?: boolean }) {
  return (
    <span className={big ? "tlg" : "lg"}>
      <span>{initial(name)}</span>
      {logo && <Image src={logo} alt="" width={big ? 64 : 30} height={big ? 64 : 30} className="object-contain" unoptimized />}
    </span>
  );
}

function HeroCard({ m, teamsMap, mapScores, tour }: { m: Match; teamsMap?: TeamsMap; mapScores?: MapScore[]; tour: TourRef | null }) {
  const st = getStatusType(m);
  const isLive = st === "live", isUp = st === "upcoming";
  const mapImg = mapScores && mapScores.length ? MAP_IMAGES[mapScores[0].map_name] : MAP_IMAGES.de_mirage;
  const stage = stageOf(m, tour);
  const w1 = m.winner === m.team1_id || (isLive && m.team1_score > m.team2_score);
  const w2 = m.winner === m.team2_id || (isLive && m.team2_score > m.team1_score);
  const statCls = isLive ? "liv" : isUp ? "pend" : "fin";

  return (
    <Link href={`/partidas/${m.id}`} className={`feat ${isLive ? "live" : ""}`}>
      <div className="bg" style={{ backgroundImage: `url('${mapImg}')` }} />
      <span className="ghost">{(m.team2_string || "VS").slice(0, 7)}</span>
      <div className="inner">
        <div className="ftop">
          <span className={`hstat ${statCls}`}><i />{getStatusText(m)}</span>
          <ChampBadge tour={tour} />
          {stage && <span className="hstage">{stage}{m.max_maps || m.num_maps ? ` · BO${m.max_maps || m.num_maps}` : ""}</span>}
        </div>
        <div className="fbody">
          <div className="team">
            <TeamLogo name={m.team1_string} logo={teamsMap?.[m.team1_id]?.logo} big />
            <div className="tn"><h2 className={w1 ? "win" : ""}>{m.team1_string || `Time ${m.team1_id}`}</h2>{m.winner === m.team1_id && <span className="wl">★ Vencedor</span>}</div>
          </div>
          <div className="score">
            {isUp ? <span className="vs">×</span> : <>
              <b className={w1 ? "win" : st === "finished" ? "lo" : ""}>{m.team1_score}</b>
              <span className="dash">—</span>
              <b className={w2 ? "win" : st === "finished" ? "lo" : ""}>{m.team2_score}</b>
            </>}
          </div>
          <div className="team r">
            <TeamLogo name={m.team2_string} logo={teamsMap?.[m.team2_id]?.logo} big />
            <div className="tn"><h2 className={w2 ? "win" : ""}>{m.team2_string || `Time ${m.team2_id}`}</h2>{m.winner === m.team2_id && <span className="wl">★ Vencedor</span>}</div>
          </div>
        </div>
        {mapScores && mapScores.length > 0 && (
          <div className="hmaps"><MapChips mapScores={mapScores} live={isLive} /></div>
        )}
      </div>
    </Link>
  );
}

function FullCard({ m, teamsMap, mapScores, tour }: { m: Match; teamsMap?: TeamsMap; mapScores?: MapScore[]; tour: TourRef | null }) {
  const st = getStatusType(m);
  const isLive = st === "live", isUp = st === "upcoming";
  const mapImg = mapScores && mapScores.length ? MAP_IMAGES[mapScores[0].map_name] : MAP_IMAGES.de_mirage;
  const stage = stageOf(m, tour);
  const w1 = m.winner === m.team1_id, w2 = m.winner === m.team2_id;
  const statCls = isLive ? "liv" : isUp ? "pend" : "fin";

  return (
    <Link href={`/partidas/${m.id}`} className={`mcard ${isLive ? "live" : ""}`}>
      <div className="bg" style={{ backgroundImage: `url('${mapImg}')` }} />
      <div className="in">
        <div className="hd">
          <span className={`st ${statCls}`}><i />{getStatusText(m)}</span>
          <ChampBadge tour={tour} />
        </div>
        <div className="conf">
          <div className="tm">
            <TeamLogo name={m.team1_string} logo={teamsMap?.[m.team1_id]?.logo} />
            <span className={`nm ${w1 ? "win" : ""}`}>{m.team1_string || `Time ${m.team1_id}`}</span>
          </div>
          <div className="sc">
            {isUp ? <span className="vs">×</span> : <>
              <b className={w1 ? "w" : st === "finished" ? "l" : ""}>{m.team1_score}</b>
              <span className="x">:</span>
              <b className={w2 ? "w" : st === "finished" ? "l" : ""}>{m.team2_score}</b>
            </>}
          </div>
          <div className="tm r">
            <TeamLogo name={m.team2_string} logo={teamsMap?.[m.team2_id]?.logo} />
            <span className={`nm ${w2 ? "win" : ""}`}>{m.team2_string || `Time ${m.team2_id}`}</span>
          </div>
        </div>
        <div className="ft">
          <MapChips mapScores={mapScores} live={isLive} />
          <span className="info">{[stage, `BO${m.max_maps || m.num_maps || 1}`, `#${m.id}`].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
    </Link>
  );
}
