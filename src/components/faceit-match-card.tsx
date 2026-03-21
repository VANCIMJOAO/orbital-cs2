"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import type { MappedMatch } from "@/lib/faceit-mapper";

interface FaceitMatchCardProps {
  match: MappedMatch;
  delay?: number;
}

export function FaceitMatchCard({ match, delay = 0 }: FaceitMatchCardProps) {
  const statusType = match.status === "live" ? "live" : match.status === "finished" ? "finished" : match.status === "cancelled" ? "cancelled" : "upcoming";
  const statusText = match.status === "live" ? "AO VIVO" : match.status === "finished" ? "Finalizada" : match.status === "cancelled" ? "Cancelada" : "Pendente";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link href={`/partidas/faceit/${match.faceit_match_id}`} className="block group">
        <div className={`
          relative bg-orbital-card border border-orbital-border
          hover:border-[#FF5500]/30 transition-all duration-300
          ${statusType === "live" ? "border-l-2 border-l-orbital-live glow-purple-sm" : ""}
        `}>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5500]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`status-dot ${
                  statusType === "live" ? "status-live" :
                  statusType === "upcoming" ? "status-upcoming" :
                  "status-finished"
                }`} />
                <span className={`font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] uppercase ${
                  statusType === "live" ? "text-orbital-live" :
                  statusType === "upcoming" ? "text-orbital-warning" :
                  "text-orbital-text-dim"
                }`}>
                  {statusText}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gamepad2 size={10} className="text-[#FF5500]/50" />
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-[#FF5500]/50">
                  FACEIT
                </span>
              </div>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Gamepad2 size={14} className="text-[#FF5500]/30 shrink-0" />
                <span className={`font-[family-name:var(--font-orbitron)] text-xs sm:text-sm font-semibold tracking-wide truncate ${
                  match.winner === "team1" ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team1_name}
                </span>
              </div>

              <div className="flex items-center gap-3 px-4">
                <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                  match.winner === "team1" ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team1_score}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-text-dim tracking-widest">VS</span>
                <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                  match.winner === "team2" ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team2_score}
                </span>
              </div>

              <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                <span className={`font-[family-name:var(--font-orbitron)] text-xs sm:text-sm font-semibold tracking-wide truncate ${
                  match.winner === "team2" ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team2_name}
                </span>
                <Gamepad2 size={14} className="text-[#FF5500]/30 shrink-0" />
              </div>
            </div>

            {/* Map Scores */}
            {match.maps.length > 0 && (
              <div className="mt-2 flex items-center justify-center gap-3">
                {match.maps.map((ms, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.02] border border-orbital-border/30">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
                      {ms.map_name.replace("de_", "").toUpperCase()}
                    </span>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-bold ${
                      ms.team1_score > ms.team2_score ? "text-orbital-success" : "text-orbital-text-dim"
                    }`}>{ms.team1_score}</span>
                    <span className="text-orbital-text-dim text-[0.5rem]">:</span>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] font-bold ${
                      ms.team2_score > ms.team1_score ? "text-orbital-success" : "text-orbital-text-dim"
                    }`}>{ms.team2_score}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                BO{match.num_maps}
              </span>
              {(match.end_time || match.start_time) && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim/60">
                  {new Date(match.end_time || match.start_time!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
