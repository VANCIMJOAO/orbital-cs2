"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Swords, ChevronLeft, ChevronRight, Search, Trophy } from "lucide-react";
import { Match, getStatusType, getStatusText } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { MAP_IMAGES } from "@/lib/maps";
import { useAuth } from "@/lib/auth-context";

type FilterType = "all" | "live" | "upcoming" | "finished" | "mine";
type MapScore = { team1_score: number; team2_score: number; map_name: string };
type MapScoresMap = Record<number, MapScore[]>;
type TourRef = { id: string; name: string; logo?: string | null };

const PER_PAGE = 12;

const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };
const cleanTitle = (t?: string | null) => (t && !t.includes("{") ? t : "");

function rank(m: Match) { const s = getStatusType(m); return s === "live" ? 0 : s === "upcoming" ? 1 : 2; }
function cmp(a: Match, b: Match) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  const ta = new Date(a.end_time || a.start_time || 0).getTime();
  const tb = new Date(b.end_time || b.start_time || 0).getTime();
  return ra === 1 ? ta - tb : tb - ta; // próximas: mais cedo primeiro; resto: mais recente primeiro
}
function groupLabel(m: Match) {
  const st = getStatusType(m);
  if (st === "live") return "Ao vivo agora";
  const ts = m.end_time || m.start_time;
  if (!ts) return st === "upcoming" ? "Em breve" : "Sem data";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function PartidasContent({ matches, teamsMap, mapScoresMap, matchTournamentMap }: {
  matches: Match[];
  teamsMap?: Record<number, { name: string; logo: string | null }>;
  mapScoresMap?: MapScoresMap;
  matchTournamentMap?: Record<number, TourRef>;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [champ, setChamp] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  const tourOf = (m: Match): TourRef | null => matchTournamentMap?.[m.id] || null;

  // Lista de campeonatos (pro select)
  const champMap: Record<string, string> = {};
  for (const k in (matchTournamentMap || {})) { const r = matchTournamentMap![k]; champMap[r.id] = r.name; }
  const champs = Object.entries(champMap).map(([id, name]) => ({ id, name }));

  // Pool restrito ao campeonato selecionado
  const pool = champ === "all" ? matches : matches.filter(m => tourOf(m)?.id === champ);

  const counts: Record<FilterType, number> = {
    all: pool.length,
    live: pool.filter(m => getStatusType(m) === "live").length,
    upcoming: pool.filter(m => getStatusType(m) === "upcoming").length,
    finished: pool.filter(m => getStatusType(m) === "finished").length,
    mine: user ? pool.filter(m => m.user_id === user.id).length : 0,
  };

  // Hero = manchete do pool (ao vivo → próxima → mais recente)
  const sortedPool = [...pool].sort(cmp);
  const hero = sortedPool.find(m => getStatusType(m) === "live")
    || sortedPool.find(m => getStatusType(m) === "upcoming")
    || sortedPool.find(m => getStatusType(m) === "finished")
    || sortedPool[0] || null;

  // Lista da grade (filtrada, sem o hero)
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

  // Agrupa a página por data (preserva ordem)
  const groups: { label: string; items: Match[] }[] = [];
  const gIdx: Record<string, number> = {};
  for (const m of paged) {
    const lb = groupLabel(m);
    if (gIdx[lb] == null) { gIdx[lb] = groups.length; groups.push({ label: lb, items: [] }); }
    groups[gIdx[lb]].items.push(m);
  }

  const changeFilter = (f: FilterType) => { setFilter(f); setPage(1); };
  const changeChamp = (c: string) => { setChamp(c); setFilter("all"); setPage(1); };

  const filters: { value: FilterType; label: string; live?: boolean }[] = [
    { value: "all", label: "Todas" },
    { value: "live", label: "Ao vivo", live: true },
    { value: "upcoming", label: "Pendentes" },
    { value: "finished", label: "Finalizadas" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
      <PageHeader
        kicker="CS2 · Resultados & ao vivo"
        title="Todas as"
        accent="Partidas"
        sub={`${matches.length} partidas · ${counts.live} ao vivo · ${counts.finished} finalizadas`}
      />

      {/* HERO em destaque */}
      {hero && <HeroCard m={hero} teamsMap={teamsMap} mapScores={mapScoresMap?.[hero.id]} tour={tourOf(hero)} />}

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2.5 mt-7 mb-7">
        {filters.map(f => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={`flex items-center gap-2 h-[38px] px-4 border transition-all font-[family-name:var(--font-chakra)] font-semibold text-[0.64rem] tracking-[0.12em] uppercase ${
                active ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                       : "bg-transparent border-orbital-border text-orbital-text-dim hover:border-orbital-border-light hover:text-orbital-text"
              }`}
            >
              {f.live && <span className="w-1.5 h-1.5 rounded-full bg-orbital-live animate-pulse" />}
              {f.label}
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] opacity-65">{counts[f.value]}</span>
            </button>
          );
        })}
        {user && (
          <button
            onClick={() => changeFilter("mine")}
            className={`flex items-center gap-2 h-[38px] px-4 border transition-all font-[family-name:var(--font-chakra)] font-semibold text-[0.64rem] tracking-[0.12em] uppercase ${
              filter === "mine" ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                                : "bg-transparent border-orbital-border text-orbital-text-dim hover:border-orbital-border-light hover:text-orbital-text"
            }`}
          >
            Minhas
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] opacity-65">{counts.mine}</span>
          </button>
        )}

        {champs.length > 0 && (
          <select
            value={champ}
            onChange={e => changeChamp(e.target.value)}
            className="h-[38px] px-3 bg-orbital-bg border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-[0.7rem] focus:outline-none focus:border-orbital-purple/50 cursor-pointer"
          >
            <option value="all">Todos os campeonatos</option>
            {champs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <label className="flex-1 min-w-[180px] h-[38px] flex items-center gap-2 px-3 border border-orbital-border focus-within:border-orbital-purple/50 transition-colors">
          <Search size={13} className="text-orbital-text-dim/60 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por time, evento ou ID..."
            className="flex-1 bg-transparent outline-none font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/50"
          />
        </label>
      </div>

      {/* GRADE por data */}
      {groups.length > 0 ? (
        groups.map((g, gi) => (
          <div key={g.label} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-[family-name:var(--font-russo)] text-[0.8rem] tracking-[0.08em] uppercase text-orbital-text">{g.label}</span>
              <span className="h-px flex-1 bg-orbital-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {g.items.map((m, i) => (
                <FullCard key={m.id} m={m} teamsMap={teamsMap} mapScores={mapScoresMap?.[m.id]} tour={tourOf(m)} delay={(gi + i) * 0.02} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-16 border border-dashed border-orbital-border">
          <Swords size={30} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhuma partida encontrada</p>
        </div>
      )}

      {/* PAGINAÇÃO */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center border border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                    page === p ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                               : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                  }`}>{p}</button>
              );
            }
            if (p === page - 2 || p === page + 2) return <span key={p} className="text-orbital-text-dim text-xs">…</span>;
            return null;
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center border border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Selo do campeonato ── */
function ChampBadge({ tour }: { tour: TourRef | null }) {
  if (!tour) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orbital-purple/12 border border-orbital-purple/30 group-hover:border-orbital-purple/55 transition-colors max-w-[66%]">
      <Trophy size={10} className="text-orbital-warning shrink-0" />
      <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] tracking-wide uppercase text-orbital-purple-bright truncate">{tour.name}</span>
    </span>
  );
}

/* ── Logo + nome do time ── */
function TeamSide({ name, logo, win, right }: { name: string; logo: string | null; win: boolean; right?: boolean }) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${right ? "flex-row-reverse" : ""}`}>
      <span className="relative w-7 h-7 shrink-0 flex items-center justify-center bg-white/[0.05] border border-orbital-border">
        <span className="absolute font-[family-name:var(--font-russo)] text-[0.62rem] text-orbital-text-dim">{initial(name)}</span>
        {logo && <Image src={logo} alt="" width={26} height={26} className="relative w-[26px] h-[26px] object-contain" unoptimized />}
      </span>
      <span className={`font-[family-name:var(--font-russo)] text-sm sm:text-base uppercase tracking-wide truncate ${win ? "text-orbital-success" : "text-orbital-text"}`}>{name}</span>
    </div>
  );
}

/* ── Placar ── */
function Score({ m, big }: { m: Match; big?: boolean }) {
  const st = getStatusType(m);
  const size = big ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl";
  if (st === "upcoming") return <span className={`font-[family-name:var(--font-russo)] ${big ? "text-2xl" : "text-base"} text-orbital-text-dim/70`}>×</span>;
  const w1 = m.winner === m.team1_id || (st === "live" && m.team1_score > m.team2_score);
  const w2 = m.winner === m.team2_id || (st === "live" && m.team2_score > m.team1_score);
  const cls = (w: boolean) => (st === "finished" ? (w ? "text-orbital-success" : "text-orbital-text-dim") : (w ? "text-orbital-success" : "text-orbital-text"));
  return (
    <span className="flex items-center gap-2 sm:gap-3">
      <span className={`font-[family-name:var(--font-russo)] tabular-nums ${size} ${cls(w1)}`}>{m.team1_score}</span>
      <span className="font-[family-name:var(--font-russo)] text-xs text-orbital-text-dim/45">:</span>
      <span className={`font-[family-name:var(--font-russo)] tabular-nums ${size} ${cls(w2)}`}>{m.team2_score}</span>
    </span>
  );
}

function MapChips({ mapScores }: { mapScores?: MapScore[] }) {
  if (!mapScores || mapScores.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {mapScores.map((ms, i) => (
        <span key={i} className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.03] border border-orbital-border/60">
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] tracking-wider uppercase text-orbital-text-dim">{ms.map_name.replace("de_", "")}</span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] font-bold tabular-nums">
            <span className={ms.team1_score > ms.team2_score ? "text-orbital-success" : "text-orbital-text-dim"}>{ms.team1_score}</span>
            <span className="text-orbital-text-dim/40 mx-0.5">:</span>
            <span className={ms.team2_score > ms.team1_score ? "text-orbital-success" : "text-orbital-text-dim"}>{ms.team2_score}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

function stageOf(m: Match, tour: TourRef | null) {
  let stage = cleanTitle(m.title);
  if (tour && stage) {
    const parts = stage.split(/[—–-]/);
    if (parts.length > 1) stage = parts[parts.length - 1].trim();
  }
  return stage;
}

/* ── Card com fundo de mapa ── */
function FullCard({ m, teamsMap, mapScores, tour, delay = 0 }: { m: Match; teamsMap?: Record<number, { name: string; logo: string | null }>; mapScores?: MapScore[]; tour: TourRef | null; delay?: number }) {
  const st = getStatusType(m);
  const isLive = st === "live";
  const mapImg = mapScores && mapScores.length ? MAP_IMAGES[mapScores[0].map_name] : null;
  const dotColor = isLive ? "bg-orbital-live" : st === "upcoming" ? "bg-orbital-warning" : "bg-orbital-success";
  const stColor = isLive ? "text-orbital-live" : st === "upcoming" ? "text-orbital-warning" : "text-orbital-success";
  const stage = stageOf(m, tour);
  const w1 = m.winner === m.team1_id;
  const w2 = m.winner === m.team2_id;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Link href={`/partidas/${m.id}`} className={`relative block group overflow-hidden border transition-colors ${isLive ? "border-orbital-live/40" : "border-orbital-border hover:border-orbital-purple/40"}`}>
        <div className="absolute inset-0">
          {mapImg ? (
            <>
              <img src={mapImg} alt="" className="w-full h-full object-cover opacity-[0.4] group-hover:opacity-[0.5] transition-all duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-b from-orbital-bg/55 to-orbital-bg/85" />
            </>
          ) : <div className="absolute inset-0 bg-orbital-card" />}
        </div>
        {isLive && <div className="absolute left-0 inset-y-0 w-[3px] bg-orbital-live z-20 shadow-[0_0_10px_rgba(255,59,87,0.6)]" />}

        <div className="relative z-10 p-4 sm:p-[18px] flex flex-col min-h-[160px]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isLive ? "animate-pulse" : ""}`} />
              <span className={`font-[family-name:var(--font-russo)] text-[0.58rem] tracking-[0.18em] uppercase ${stColor}`}>{getStatusText(m)}</span>
            </span>
            <ChampBadge tour={tour} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 my-4">
            <TeamSide name={m.team1_string || `Time ${m.team1_id}`} logo={teamsMap?.[m.team1_id]?.logo || null} win={w1} />
            <Score m={m} />
            <TeamSide name={m.team2_string || `Time ${m.team2_id}`} logo={teamsMap?.[m.team2_id]?.logo || null} win={w2} right />
          </div>

          <div className="flex items-center justify-between gap-3 mt-auto flex-wrap">
            <MapChips mapScores={mapScores} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/70 ml-auto">
              {[stage, `BO${m.max_maps || m.num_maps || 1}`, `#${m.id}`].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Hero (manchete) ── */
function HeroCard({ m, teamsMap, mapScores, tour }: { m: Match; teamsMap?: Record<number, { name: string; logo: string | null }>; mapScores?: MapScore[]; tour: TourRef | null }) {
  const st = getStatusType(m);
  const isLive = st === "live";
  const mapImg = mapScores && mapScores.length ? MAP_IMAGES[mapScores[0].map_name] : null;
  const dotColor = isLive ? "bg-orbital-live" : st === "upcoming" ? "bg-orbital-warning" : "bg-orbital-success";
  const stColor = isLive ? "text-orbital-live" : st === "upcoming" ? "text-orbital-warning" : "text-orbital-success";
  const stage = stageOf(m, tour);
  const w1 = m.winner === m.team1_id;
  const w2 = m.winner === m.team2_id;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-2">
      <Link href={`/partidas/${m.id}`} className={`relative block group overflow-hidden border transition-colors ${isLive ? "border-orbital-live/40" : "border-orbital-border hover:border-orbital-purple/40"}`}>
        <div className="absolute inset-0">
          {mapImg ? (
            <>
              <img src={mapImg} alt="" className="w-full h-full object-cover opacity-[0.42] group-hover:opacity-[0.5] transition-all duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-b from-orbital-bg/45 to-orbital-bg/85" />
            </>
          ) : <div className="absolute inset-0 bg-orbital-card" />}
        </div>
        {isLive && <div className="absolute left-0 inset-y-0 w-1 bg-orbital-live z-20 shadow-[0_0_14px_rgba(255,59,87,0.7)]" />}

        <div className="relative z-10 px-6 sm:px-9 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-7 flex-wrap">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dotColor} ${isLive ? "animate-pulse" : ""}`} />
              <span className={`font-[family-name:var(--font-russo)] text-[0.62rem] tracking-[0.2em] uppercase ${stColor}`}>{getStatusText(m)}</span>
            </span>
            <ChampBadge tour={tour} />
            {stage && <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-wide text-orbital-text-dim">{stage}</span>}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 sm:gap-8">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <span className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center bg-white/[0.05] border border-orbital-border">
                <span className="absolute font-[family-name:var(--font-russo)] text-base text-orbital-text-dim">{initial(m.team1_string)}</span>
                {teamsMap?.[m.team1_id]?.logo && <Image src={teamsMap[m.team1_id]!.logo!} alt="" width={48} height={48} className="relative w-12 h-12 object-contain" unoptimized />}
              </span>
              <span className={`font-[family-name:var(--font-russo)] text-lg sm:text-2xl uppercase truncate ${w1 ? "text-orbital-success" : "text-orbital-text"}`}>{m.team1_string || `Time ${m.team1_id}`}</span>
            </div>

            <Score m={m} big />

            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-row-reverse">
              <span className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center bg-white/[0.05] border border-orbital-border">
                <span className="absolute font-[family-name:var(--font-russo)] text-base text-orbital-text-dim">{initial(m.team2_string)}</span>
                {teamsMap?.[m.team2_id]?.logo && <Image src={teamsMap[m.team2_id]!.logo!} alt="" width={48} height={48} className="relative w-12 h-12 object-contain" unoptimized />}
              </span>
              <span className={`font-[family-name:var(--font-russo)] text-lg sm:text-2xl uppercase truncate ${w2 ? "text-orbital-success" : "text-orbital-text"}`}>{m.team2_string || `Time ${m.team2_id}`}</span>
            </div>
          </div>

          {mapScores && mapScores.length > 0 && (
            <div className="flex justify-center mt-7">
              <MapChips mapScores={mapScores} />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
