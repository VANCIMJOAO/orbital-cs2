"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, ChevronLeft, ChevronRight } from "lucide-react";
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
    if (filter === "all") return true;
    if (filter === "mine") return user && m.user_id === user.id;
    return getStatusType(m) === filter;
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
              <span className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-[0.15em] text-red-500">
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
                flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em]
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
                <span className={`font-[family-name:var(--font-jetbrains)] text-[0.5rem] ${
                  filter === f.value ? "text-orbital-purple/70" : "text-orbital-text-dim/50"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Match List */}
      {paged.length > 0 ? (
        <div className="space-y-3">
          {paged.map((match, i) => (
            <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.03} />
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
