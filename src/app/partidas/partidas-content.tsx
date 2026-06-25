"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Match, getStatusType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type FilterType = "all" | "live" | "upcoming" | "finished" | "mine";

const filters: { value: FilterType; label: string; color?: string }[] = [
  { value: "all", label: "TODAS" },
  { value: "live", label: "AO VIVO", color: "text-red-500" },
  { value: "upcoming", label: "PENDENTES", color: "text-yellow-500" },
  { value: "finished", label: "FINALIZADAS", color: "text-emerald-500" },
  { value: "mine", label: "MINHAS" },
];

type MapScoresMap = Record<number, { team1_score: number; team2_score: number; map_name: string }[]>;

const PER_PAGE = 8;

export function PartidasContent({ matches, teamsMap, mapScoresMap }: {
  matches: Match[];
  teamsMap?: Record<number, { name: string; logo: string | null }>;
  mapScoresMap?: MapScoresMap;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  const counts: Record<FilterType, number> = {
    all: matches.length,
    live: matches.filter(m => getStatusType(m) === "live").length,
    upcoming: matches.filter(m => getStatusType(m) === "upcoming").length,
    finished: matches.filter(m => getStatusType(m) === "finished").length,
    mine: user ? matches.filter(m => m.user_id === user.id).length : 0,
  };

  const filtered = matches.filter((m) => {
    if (filter === "mine") {
      return !!user && m.user_id === user.id;
    }
    if (filter !== "all") {
      if (getStatusType(m) !== filter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const t1 = (m.team1_string || "").toLowerCase();
      const t2 = (m.team2_string || "").toLowerCase();
      const title = (m.title || "").toLowerCase();
      if (!t1.includes(q) && !t2.includes(q) && !title.includes(q) && !String(m.id).includes(q)) return false;
    }
    return true;
  });

  // Sort by date descending (most recent first), live always on top
  filtered.sort((a, b) => {
    const aLive = getStatusType(a) === "live";
    const bLive = getStatusType(b) === "live";
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
    const aDate = new Date(a.end_time || a.start_time || 0).getTime();
    const bDate = new Date(b.end_time || b.start_time || 0).getTime();
    return bDate - aDate;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  // Stats
  const liveCount = counts.live;
  const finishedCount = counts.finished;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Swords size={22} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-bold tracking-wider text-orbital-text">
            PARTIDAS
          </h1>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/30 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em] text-red-500">
                {liveCount} AO VIVO
              </span>
            </span>
          )}
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {matches.length} partidas registradas — {finishedCount} finalizadas
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2"
      >
        {filters.map((f) => {
          const count = counts[f.value];
          if (f.value === "mine" && !user) return null;
          return (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em]
                border transition-all whitespace-nowrap
                ${filter === f.value
                  ? "bg-orbital-purple/15 border-orbital-purple/50 text-orbital-purple"
                  : "bg-transparent border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                }
              `}
            >
              {f.value === "live" && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {f.label}
              {count > 0 && (
                <span className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] ${
                  filter === f.value ? "text-orbital-purple/70" : "text-orbital-text-dim/50"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orbital-text-dim/50" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por time, título ou ID..."
          className="w-full pl-9 pr-3 py-2 bg-transparent border border-orbital-border focus:border-orbital-purple/50 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder:text-orbital-text-dim/50 outline-none transition-colors"
        />
      </div>

      {/* Match List */}
      {paged.length > 0 ? (
        <div className="space-y-3">
          {paged.map((m, i) => (
            <MatchCard key={`g5-${m.id}`} match={m} teamsMap={teamsMap} mapScores={mapScoresMap?.[m.id]} delay={i * 0.03} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Swords size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Nenhuma partida encontrada
          </p>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center border border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => {
            const p = i + 1;
            // Show first, last, current, and neighbors
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                    page === p
                      ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                      : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                  }`}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return <span key={p} className="text-orbital-text-dim text-xs">...</span>;
            }
            return null;
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center border border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
