"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Swords, Users, Server, Calendar, ArrowLeft, Trophy, Home, ChevronRight, Gamepad2, Megaphone, Bot, ClipboardList, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

const adminLinks = [
  { href: "/admin", label: "Painel", icon: Home, exact: true },
  { href: "/admin/partidas", label: "Partidas", icon: Swords },
  { href: "/admin/times", label: "Times", icon: Users },
  { href: "/admin/servidores", label: "Servidores", icon: Server },
  { href: "/admin/seasons", label: "Seasons", icon: Calendar },
  { href: "/admin/campeonatos", label: "Campeonatos", icon: Trophy },
  { href: "/admin/inscricoes", label: "Inscrições", icon: ClipboardList },
  { href: "/admin/loja", label: "Loja", icon: ShoppingBag },
  { href: "/admin/faceit", label: "Faceit", icon: Gamepad2 },
  { href: "/admin/brand", label: "Brand", icon: Megaphone },
];

const brandSubLinks = [
  { href: "/admin/brand", label: "Dashboard", icon: Home, exact: true },
  { href: "/admin/brand/cronograma", label: "Cronograma", icon: Calendar },
  { href: "/admin/brand/instagram", label: "Instagram", icon: Megaphone },
  { href: "/admin/brand/patrocinio", label: "Patrocínios", icon: Trophy },
  { href: "/admin/brand/assistente", label: "Assistente IA", icon: Bot },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orbital-card border border-orbital-border p-12 text-center max-w-md"
        >
          <Shield size={48} className="text-orbital-danger/50 mx-auto mb-4" />
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text mb-2">
            ACESSO NEGADO
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim mb-6">
            Você precisa estar logado como administrador.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple"
          >
            <ArrowLeft size={14} /> VOLTAR
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-orbital-border bg-[#080808] sticky top-0 h-screen">
        {/* Logo area */}
        <div className="p-4 border-b border-orbital-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 border border-orbital-purple/40 bg-orbital-purple/10 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-orbital-purple" />
            </div>
            <div>
              <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-purple group-hover:text-orbital-text transition-colors">
                ORBITAL ROXA
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.45rem] text-orbital-text-dim/50">
                ADMIN PANEL
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {adminLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href) && !(link.exact === undefined && pathname === "/admin" && link.href !== "/admin");
            const Icon = link.icon;
            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm transition-all duration-200 group ${
                    isActive
                      ? "bg-orbital-purple/10 border-l-2 border-orbital-purple text-orbital-purple"
                      : "border-l-2 border-transparent text-orbital-text-dim hover:text-orbital-text hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-orbital-purple" : "text-orbital-text-dim/60 group-hover:text-orbital-text-dim"} />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.7rem]">
                    {link.label}
                  </span>
                  {isActive && (
                    <ChevronRight size={10} className="text-orbital-purple/50 ml-auto" />
                  )}
                </Link>
                {/* Brand sub-links */}
                {link.href === "/admin/brand" && pathname.startsWith("/admin/brand") && (
                  <div className="ml-5 mt-0.5 mb-1 space-y-0.5 border-l border-orbital-purple/20 pl-2">
                    {brandSubLinks.map((sub) => {
                      const subActive = sub.exact ? pathname === sub.href : pathname.startsWith(sub.href);
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all duration-200 ${
                            subActive
                              ? "text-orbital-purple"
                              : "text-orbital-text-dim/60 hover:text-orbital-text-dim hover:bg-white/[0.03]"
                          }`}
                        >
                          <SubIcon size={11} />
                          <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                            {sub.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User area */}
        <div className="p-3 border-t border-orbital-border">
          <div className="flex items-center gap-2.5">
            {user?.small_image && (
              <Image
                src={user.small_image}
                alt={user.name}
                width={28}
                height={28}
                className="rounded-full border border-orbital-border shrink-0"
                unoptimized
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">
                {user?.name}
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/50">
                Admin
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 mt-2.5 px-2 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim hover:text-orbital-purple transition-colors rounded-sm hover:bg-white/[0.03]"
          >
            <ArrowLeft size={10} />
            Voltar ao site
          </Link>
        </div>
      </aside>

      {/* ═══ MOBILE HEADER (shown on small screens) ═══ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#080808] border-b border-orbital-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-orbital-purple" />
            <span className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.15em] text-orbital-purple">
              ADMIN
            </span>
          </div>
          <Link href="/" className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
            ← Site
          </Link>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto px-2 pb-1">
          {adminLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href) && !(link.exact === undefined && pathname === "/admin" && link.href !== "/admin");
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] whitespace-nowrap transition-colors ${
                  isActive ? "text-orbital-purple" : "text-orbital-text-dim"
                }`}
              >
                <Icon size={11} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 min-w-0">
        <div className="lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[88px] lg:pt-6 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
