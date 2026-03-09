"use client";

import { motion } from "framer-motion";
import { Swords, Users, Server, Calendar, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { HudCard } from "@/components/hud-card";
import { useAuth } from "@/lib/auth-context";

const quickLinks = [
  { href: "/admin/partidas", label: "Criar Partida", icon: Swords, desc: "Configurar e iniciar uma nova partida", color: "text-orbital-success" },
  { href: "/admin/times", label: "Gerenciar Times", icon: Users, desc: "Criar, editar ou remover times", color: "text-orbital-purple" },
  { href: "/admin/servidores", label: "Gerenciar Servidores", icon: Server, desc: "Adicionar e configurar servidores CS2", color: "text-orbital-warning" },
  { href: "/admin/seasons", label: "Gerenciar Seasons", icon: Calendar, desc: "Criar e configurar temporadas", color: "text-orbital-live" },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* Welcome */}
      <HudCard label="DASHBOARD" className="mb-6">
        <div className="py-2">
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-orbital-text tracking-wider">
            Olá, {user?.name}
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Gerencie partidas, times, servidores e seasons da ORBITAL ROXA.
          </p>
        </div>
      </HudCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link, i) => {
          const Icon = link.icon;
          return (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link href={link.href} className="block group">
                <div className="relative bg-orbital-card border border-orbital-border hover:border-orbital-purple/30 transition-all duration-300 p-5">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center">
                        <Icon size={18} className={link.color} />
                      </div>
                      <div>
                        <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                          {link.label}
                        </h3>
                        <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-0.5">
                          {link.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-orbital-text-dim group-hover:text-orbital-purple transition-colors mt-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
