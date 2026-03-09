"use client";

import { motion } from "framer-motion";
import { Users, Shield, User } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { Team } from "@/lib/api";

export function TimesContent({ teams }: { teams: Team[] }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Users size={20} className="text-orbital-purple" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-bold tracking-wider text-orbital-text">
            TIMES
          </h1>
        </div>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
          {teams.length} times registrados
        </p>
      </motion.div>

      {/* Team Grid */}
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, i) => (
            <TeamCard key={team.id} team={team} delay={i * 0.08} />
          ))}
        </div>
      ) : (
        <HudCard className="text-center py-12">
          <Shield size={32} className="text-orbital-border mx-auto mb-4" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">
            Nenhum time registrado
          </p>
        </HudCard>
      )}
    </div>
  );
}

function TeamCard({ team, delay }: { team: Team; delay: number }) {
  const players = team.auth_name ? Object.entries(team.auth_name).map(([steamId, val]) => [steamId, typeof val === "string" ? val : val.name] as [string, string]) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link href={`/times/${team.id}`} className="block bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all group cursor-pointer">
        {/* Top accent */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-orbital-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="p-5">
          {/* Team header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orbital-border chamfered flex items-center justify-center">
              <Shield size={18} className="text-orbital-purple" />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors">
                {team.name}
              </h3>
              <div className="flex items-center gap-2">
                {team.tag && (
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                    [{team.tag}]
                  </span>
                )}
                {team.flag && (
                  <span className="text-xs">{team.flag}</span>
                )}
              </div>
            </div>
          </div>

          {/* Players */}
          {players.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-purple mb-2">
                ROSTER ({players.length})
              </div>
              {players.map(([steamId, name]) => (
                <div key={steamId} className="flex items-center gap-2 px-2 py-1 bg-[#0A0A0A] border border-orbital-border/50">
                  <User size={10} className="text-orbital-text-dim" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
