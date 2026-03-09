"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Swords, Users, Server, Calendar, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

const adminLinks = [
  { href: "/admin", label: "PAINEL", icon: Shield, exact: true },
  { href: "/admin/partidas", label: "PARTIDAS", icon: Swords },
  { href: "/admin/times", label: "TIMES", icon: Users },
  { href: "/admin/servidores", label: "SERVIDORES", icon: Server },
  { href: "/admin/seasons", label: "SEASONS", icon: Calendar },
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
      {/* Admin Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-4 flex items-center gap-3"
      >
        <Shield size={16} className="text-orbital-purple" />
        <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-orbital-purple">
          PAINEL ADMIN
        </span>
      </motion.div>

      {/* Admin Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 border-b border-orbital-border">
        {adminLinks.map((link) => {
          const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href) && !(link.exact === undefined && pathname === "/admin" && link.href !== "/admin");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-2 px-4 py-2.5 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.12em] whitespace-nowrap transition-colors ${
                isActive
                  ? "text-orbital-purple"
                  : "text-orbital-text-dim hover:text-orbital-text"
              }`}
            >
              <Icon size={13} />
              {link.label}
              {isActive && (
                <motion.div
                  layoutId="admin-tab"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-orbital-purple"
                  style={{ boxShadow: "0 0 8px rgba(168,85,247,0.4)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
