"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Match, getStatusText, getStatusType } from "@/lib/api";
import { MAP_IMAGES } from "@/lib/maps";

interface MatchCardProps {
  match: Match;
  delay?: number;
  teamsMap?: Record<number, { name: string; logo: string | null }>;
  mapScores?: { team1_score: number; team2_score: number; map_name: string }[];
}

const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";

function TeamSide({ name, logo, win, right }: { name: string; logo: string | null; win: boolean; right?: boolean }) {
  const logoEl = (
    <span className="relative w-7 h-7 shrink-0 flex items-center justify-center bg-white/[0.04] border border-orbital-border">
      <span className="absolute font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-text-dim">{initial(name)}</span>
      {logo && <Image src={logo} alt="" width={26} height={26} className="relative w-[26px] h-[26px] object-contain" unoptimized />}
    </span>
  );
  const nameEl = (
    <span className={`font-[family-name:var(--font-russo)] text-sm sm:text-base tracking-wide truncate ${win ? "text-orbital-success" : "text-orbital-text"}`}>
      {name}
    </span>
  );
  return (
    <div className={`flex items-center gap-3 min-w-0 ${right ? "flex-row-reverse" : ""}`}>
      {logoEl}
      {nameEl}
    </div>
  );
}

export function MatchCard({ match, delay = 0, teamsMap, mapScores }: MatchCardProps) {
  const team1Logo = teamsMap?.[match.team1_id]?.logo || null;
  const team2Logo = teamsMap?.[match.team2_id]?.logo || null;
  const statusType = getStatusType(match);
  const statusText = getStatusText(match);
  const isLive = statusType === "live";
  const isUpcoming = statusType === "upcoming";
  const mapImg = mapScores && mapScores.length > 0 ? MAP_IMAGES[mapScores[0].map_name] : null;
  const event = match.title && !match.title.includes("{") ? match.title : null;

  const dotColor = isLive ? "bg-orbital-live" : isUpcoming ? "bg-orbital-warning" : "bg-orbital-success";
  const stColor = isLive ? "text-orbital-live" : isUpcoming ? "text-orbital-warning" : "text-orbital-success";

  const team1Name = match.team1_string || `Time ${match.team1_id}`;
  const team2Name = match.team2_string || `Time ${match.team2_id}`;
  const win1 = match.winner === match.team1_id;
  const win2 = match.winner === match.team2_id;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Link
        href={`/partidas/${match.id}`}
        className="relative block group overflow-hidden border border-orbital-border hover:border-orbital-purple/40 transition-colors"
      >
        {/* Fundo: imagem do mapa (ou superfície sólida) */}
        <div className="absolute inset-0">
          {mapImg ? (
            <>
              <img src={mapImg} alt="" className="w-full h-full object-cover opacity-[0.12] group-hover:opacity-[0.18] transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-r from-orbital-bg via-orbital-bg/85 to-orbital-bg/60" />
            </>
          ) : (
            <div className="absolute inset-0 bg-orbital-card" />
          )}
        </div>

        {/* Barra de live */}
        {isLive && <div className="absolute left-0 inset-y-0 w-[3px] bg-orbital-live z-20 shadow-[0_0_10px_rgba(255,59,87,0.6)]" />}

        <div className="relative z-10 p-4 sm:p-5">
          {/* Topo: status + evento */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isLive ? "animate-pulse" : ""}`} />
              <span className={`font-[family-name:var(--font-russo)] text-[0.6rem] tracking-[0.18em] uppercase ${stColor}`}>
                {statusText}
              </span>
            </span>
            {event && (
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wide text-orbital-text-dim/80 truncate max-w-[55%] text-right">
                {event}
              </span>
            )}
          </div>

          {/* Confronto: time 1 — placar — time 2 */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
            <TeamSide name={team1Name} logo={team1Logo} win={win1} />

            <div className="flex items-center gap-2.5 sm:gap-3 px-1">
              {isUpcoming ? (
                <span className="font-[family-name:var(--font-russo)] text-sm text-orbital-text-dim tracking-widest">×</span>
              ) : (
                <>
                  <span className={`font-[family-name:var(--font-russo)] text-2xl sm:text-3xl tabular-nums ${win1 ? "text-orbital-success" : "text-orbital-text-dim"}`}>
                    {match.team1_score}
                  </span>
                  <span className="font-[family-name:var(--font-russo)] text-xs text-orbital-text-dim/50">:</span>
                  <span className={`font-[family-name:var(--font-russo)] text-2xl sm:text-3xl tabular-nums ${win2 ? "text-orbital-success" : "text-orbital-text-dim"}`}>
                    {match.team2_score}
                  </span>
                </>
              )}
            </div>

            <TeamSide name={team2Name} logo={team2Logo} win={win2} right />
          </div>

          {/* Mapas */}
          {mapScores && mapScores.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {mapScores.map((ms, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1 bg-white/[0.03] border border-orbital-border/60">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wider text-orbital-text-dim">
                    {ms.map_name.replace("de_", "").toUpperCase()}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-bold tabular-nums">
                    <span className={ms.team1_score > ms.team2_score ? "text-orbital-success" : "text-orbital-text-dim"}>{ms.team1_score}</span>
                    <span className="text-orbital-text-dim/40 mx-0.5">:</span>
                    <span className={ms.team2_score > ms.team1_score ? "text-orbital-success" : "text-orbital-text-dim"}>{ms.team2_score}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-4 pt-3 border-t border-orbital-border/50 flex items-center justify-between font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/70">
            <span>BO{match.max_maps || match.num_maps || 1}</span>
            {(match.end_time || match.start_time) && (
              <span>
                {new Date(match.end_time || match.start_time!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" })}
              </span>
            )}
            <span className="group-hover:text-orbital-purple transition-colors">#{match.id}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
