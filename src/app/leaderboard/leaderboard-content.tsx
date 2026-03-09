"use client";

import { motion } from "framer-motion";
import { Trophy, Target, Skull, Crosshair, Medal } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { LeaderboardEntry } from "@/lib/api";

export function LeaderboardContent({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            RANKING
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          Classificação geral dos jogadores
        </p>
      </motion.div>

      {sorted.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          {sorted.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd */}
              <PodiumCard player={sorted[1]} rank={2} delay={0.2} />
              {/* 1st */}
              <PodiumCard player={sorted[0]} rank={1} delay={0.1} />
              {/* 3rd */}
              <PodiumCard player={sorted[2]} rank={3} delay={0.3} />
            </div>
          )}

          {/* Full Table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-orbital-card border border-orbital-border overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th><Target size={10} className="inline" /> K</th>
                    <th><Skull size={10} className="inline" /> D</th>
                    <th>K/D</th>
                    <th><Crosshair size={10} className="inline" /> HS%</th>
                    <th>Wins</th>
                    <th>Rounds</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((player, i) => {
                    const kd = (player.deaths || 0) > 0 ? ((player.kills || 0) / player.deaths).toFixed(2) : (player.kills || 0).toFixed(2);
                    const rating = player.average_rating || player.average_rating || 0;
                    return (
                      <tr key={player.steamId}>
                        <td>
                          <span className={`font-bold ${
                            i === 0 ? "text-yellow-400" :
                            i === 1 ? "text-gray-300" :
                            i === 2 ? "text-amber-600" :
                            "text-orbital-text-dim"
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="font-semibold">
                          <Link href={`/perfil/${player.steamId}`} className="hover:text-orbital-purple transition-colors">
                            {player.name}
                          </Link>
                        </td>
                        <td className="text-orbital-success">{player.kills}</td>
                        <td className="text-orbital-danger">{player.deaths}</td>
                        <td>{kd}</td>
                        <td>{Math.round(player.hsp || 0)}%</td>
                        <td>{player.wins}</td>
                        <td>{player.trp}</td>
                        <td>
                          <span className={`font-bold ${
                            rating >= 1.2 ? "text-orbital-success" :
                            rating >= 0.8 ? "text-orbital-text" :
                            "text-orbital-danger"
                          }`}>
                            {rating.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : (
        <HudCard className="text-center py-12">
          <Trophy size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Nenhum dado de ranking disponível
          </p>
        </HudCard>
      )}
    </div>
  );
}

function PodiumCard({ player, rank, delay }: { player: LeaderboardEntry; rank: number; delay: number }) {
  const rating = player.average_rating || player.average_rating || 0;
  const isFirst = rank === 1;

  return (
    <HudCard
      glow={isFirst}
      delay={delay}
      className={`text-center ${isFirst ? "sm:-mt-4" : "sm:mt-4"}`}
    >
      <div className="py-2">
        <Medal
          size={isFirst ? 28 : 22}
          className={
            rank === 1 ? "text-yellow-400 mx-auto mb-2" :
            rank === 2 ? "text-gray-300 mx-auto mb-2" :
            "text-amber-600 mx-auto mb-2"
          }
        />
        <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-1">
          #{rank}
        </div>
        <div className={`font-[family-name:var(--font-orbitron)] ${isFirst ? "text-sm" : "text-xs"} font-bold tracking-wider text-orbital-text mb-2`}>
          {player.name}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-purple">
          {rating.toFixed(2)}
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">
          {player.kills}K / {player.deaths}D
        </div>
      </div>
    </HudCard>
  );
}
