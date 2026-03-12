"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Swords, Filter } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Match, getStatusType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type FilterType = "all" | "live" | "upcoming" | "finished" | "mine";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "TODAS" },
  { value: "live", label: "AO VIVO" },
  { value: "upcoming", label: "PENDENTES" },
  { value: "finished", label: "FINALIZADAS" },
  { value: "mine", label: "MINHAS" },
];

type MapScoresMap = Record<number, { team1_score: number; team2_score: number; map_name: string }[]>;

export function PartidasContent({ matches, teamsMap, mapScoresMap }: {
  matches: Match[];
  teamsMap?: Record<number, { name: string; logo: string | null }>;
  mapScoresMap?: MapScoresMap;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const { user } = useAuth();

  // Count per filter
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Swords size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            PARTIDAS
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {matches.length} partidas registradas
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
      >
        <Filter size={14} className="text-orbital-text-dim flex-shrink-0" />
        {filters.map((f) => {
          const count = counts[f.value];
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em]
                border transition-all whitespace-nowrap
                ${filter === f.value
                  ? "bg-orbital-purple/10 border-orbital-purple/50 text-orbital-purple"
                  : "bg-transparent border-orbital-border text-orbital-text-dim hover:border-orbital-border-light"
                }
              `}
            >
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
      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((match, i) => (
            <MatchCard key={match.id} match={match} teamsMap={teamsMap} mapScores={mapScoresMap?.[match.id]} delay={i * 0.05} />
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
    </div>
  );
}
