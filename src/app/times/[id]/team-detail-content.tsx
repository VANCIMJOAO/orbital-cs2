"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Users, Swords, Globe, Tag } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { Team, Match, getStatusText, getStatusType } from "@/lib/api";

interface Props {
  team: Team;
  matches: Match[];
}

export function TeamDetailContent({ team, matches }: Props) {
  const players = Object.entries(team.players || {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
        <Link href="/times" className="inline-flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors font-[family-name:var(--font-jetbrains)] text-xs">
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </motion.div>

      {/* Team Header */}
      <HudCard label={`TIME #${team.id}`} className="mb-6">
        <div className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center">
              {team.logo ? (
                <img src={team.logo} alt={team.name} className="w-12 h-12 object-contain" />
              ) : (
                <Users size={28} className="text-orbital-purple" />
              )}
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold text-orbital-text tracking-wider">
                {team.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                  <Tag size={11} /> [{team.tag}]
                </span>
                {team.flag && (
                  <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                    <Globe size={11} /> {team.flag}
                  </span>
                )}
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50">
                  {team.public_team ? "Público" : "Privado"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </HudCard>

      {/* Players */}
      <HudCard label="JOGADORES" delay={0.1} className="mb-6">
        {players.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Steam ID</th>
                </tr>
              </thead>
              <tbody>
                {players.map(([steamId, name]) => (
                  <tr key={steamId}>
                    <td>
                      <Link
                        href={`/perfil/${steamId}`}
                        className="text-orbital-text hover:text-orbital-purple transition-colors"
                      >
                        {name || steamId}
                      </Link>
                    </td>
                    <td className="text-orbital-text-dim">{steamId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={20} className="text-orbital-border mx-auto mb-2" />
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              Nenhum jogador cadastrado
            </p>
          </div>
        )}
      </HudCard>

      {/* Recent Matches */}
      <HudCard label="PARTIDAS RECENTES" delay={0.2}>
        {matches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time 1</th>
                  <th>Placar</th>
                  <th>Time 2</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const statusType = getStatusType(match);
                  const statusText = getStatusText(match);
                  const isWinner = match.winner === team.id;
                  const isLoser = match.winner !== null && match.winner !== team.id;

                  return (
                    <tr key={match.id}>
                      <td>
                        <Link href={`/partidas/${match.id}`} className="text-orbital-purple hover:underline">
                          {match.id}
                        </Link>
                      </td>
                      <td className={match.team1_id === team.id ? "font-bold text-orbital-text" : "text-orbital-text-dim"}>
                        {match.team1_string || `Time ${match.team1_id}`}
                      </td>
                      <td className="text-center">
                        <span className={isWinner ? "text-orbital-success font-bold" : isLoser ? "text-orbital-danger" : "text-orbital-text"}>
                          {match.team1_score} - {match.team2_score}
                        </span>
                      </td>
                      <td className={match.team2_id === team.id ? "font-bold text-orbital-text" : "text-orbital-text-dim"}>
                        {match.team2_string || `Time ${match.team2_id}`}
                      </td>
                      <td>
                        <span className={`text-[0.65rem] ${
                          statusType === "live" ? "text-orbital-live" :
                          statusType === "upcoming" ? "text-orbital-warning" :
                          statusType === "cancelled" ? "text-orbital-danger" :
                          "text-orbital-text-dim"
                        }`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <Swords size={20} className="text-orbital-border mx-auto mb-2" />
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              Nenhuma partida encontrada
            </p>
          </div>
        )}
      </HudCard>
    </div>
  );
}
