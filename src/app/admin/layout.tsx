"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Swords, Users, Server, Calendar, ArrowLeft, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

const adminLinks = [
  { href: "/admin", label: "PAINEL", icon: Shield, exact: true },
  { href: "/admin/partidas", label: "PARTIDAS", icon: Swords },
  { href: "/admin/times", label: "TIMES", icon: Users },
  { href: "/admin/servidores", label: "SERVIDORES", icon: Server },
  { href: "/admin/seasons", label: "SEASONS", icon: Calendar },
  { href: "/admin/campeonatos", label: "CAMPEONATOS", icon: Trophy },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orbital-card border border-orbital-border p-12 text-center"
        >
          <Shield size={48} className="text-orbital-danger/50 mx-auto mb-4" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text mb-2">
            ACESSO NEGADO
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim mb-6">
            Você precisa estar logado como administrador para acessar esta área.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple"
          >
            <ArrowLeft size={14} />
            VOLTAR
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Admin Header Bar */}
      <div className="relative border-b border-orbital-border bg-[#0A0A0A]">
        <div className="absolute inset-0 bg-gradient-to-r from-orbital-purple/5 via-transparent to-orbital-purple/5" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-orbital-purple/40 bg-orbital-purple/10 flex items-center justify-center">
                <Shield size={14} className="text-orbital-purple" />
              </div>
              <div>
                <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-orbital-purple">
                  MISSION CONTROL
                </span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim ml-3">
                  {user?.name}
                </span>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim hover:text-orbital-purple transition-colors"
            >
              <ArrowLeft size={12} />
              SITE
            </Link>
          </motion.div>

          {/* Admin Navigation */}
          <div className="flex items-center gap-0 overflow-x-auto -mb-[1px]">
            {adminLinks.map((link) => {
              const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href) && !(link.exact === undefined && pathname === "/admin" && link.href !== "/admin");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.12em] whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? "text-orbital-purple border-orbital-purple bg-orbital-purple/5"
                      : "text-orbital-text-dim hover:text-orbital-text border-transparent hover:border-orbital-border"
                  }`}
                >
                  <Icon size={12} className={isActive ? "text-orbital-purple" : ""} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {children}
      </div>
    </div>
  );
}
