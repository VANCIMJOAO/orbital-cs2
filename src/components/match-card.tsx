"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Match, getStatusText, getStatusType } from "@/lib/api";

interface MatchCardProps {
  match: Match;
  delay?: number;
}

export function MatchCard({ match, delay = 0 }: MatchCardProps) {
  const statusType = getStatusType(match);
  const statusText = getStatusText(match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link href={`/partidas/${match.id}`} className="block group">
        <div className={`
          relative bg-orbital-card border border-orbital-border
          hover:border-orbital-purple/30 transition-all duration-300
          ${statusType === "live" ? "border-l-2 border-l-orbital-live glow-purple-sm" : ""}
        `}>
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="p-4">
            {/* Header: status + title */}
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
              {match.title && !match.title.includes("{") && (
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                  {match.title}
                </span>
              )}
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between">
              {/* Team 1 */}
              <div className="flex-1 text-left">
                <span className={`font-[family-name:var(--font-orbitron)] text-sm font-semibold tracking-wide ${
                  match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team1_string || `Time ${match.team1_id}`}
                </span>
              </div>

              {/* Score */}
              <div className="flex items-center gap-3 px-4">
                <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                  match.winner === match.team1_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team1_score}
                </span>
                <span className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-text-dim tracking-widest">VS</span>
                <span className={`font-[family-name:var(--font-jetbrains)] text-2xl font-bold ${
                  match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team2_score}
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex-1 text-right">
                <span className={`font-[family-name:var(--font-orbitron)] text-sm font-semibold tracking-wide ${
                  match.winner === match.team2_id ? "text-orbital-success" : "text-orbital-text"
                }`}>
                  {match.team2_string || `Time ${match.team2_id}`}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                BO{match.max_maps || match.num_maps || 1}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                #{match.id}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
