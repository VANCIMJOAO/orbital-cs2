"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Swords, Trophy, Film, Sparkles, Menu, X, LogIn, LogOut, User, Shield, ChevronDown, BarChart3 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/", label: "HOME", icon: Crosshair },
  { href: "/campeonatos", label: "CAMPEONATOS", icon: Trophy },
  { href: "/partidas", label: "PARTIDAS", icon: Swords },
  { href: "/leaderboard", label: "RANKING", icon: BarChart3 },
  { href: "/highlights", label: "HIGHLIGHTS", icon: Sparkles },
  { href: "/demos", label: "DEMOS", icon: Film },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading, login, logout, isAdmin } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-orbital-purple chamfered flex items-center justify-center">
              <span className="font-[family-name:var(--font-orbitron)] text-black text-xs font-black">O</span>
            </div>
            <span className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-wider hidden sm:block">
              <span className="text-orbital-purple">ORBITAL</span>{" "}
              <span className="text-orbital-text">ROXA</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 px-4 py-2 font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em] transition-colors ${
                    isActive
                      ? "text-orbital-purple"
                      : "text-orbital-text-dim hover:text-orbital-text"
                  }`}
                >
                  <Icon size={14} />
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-orbital-purple"
                      style={{ boxShadow: "0 0 10px rgba(168,85,247,0.5)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Admin link */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`relative flex items-center gap-2 px-4 py-2 font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-[0.15em] transition-colors ${
                  pathname.startsWith("/admin")
                    ? "text-orbital-purple"
                    : "text-orbital-text-dim hover:text-orbital-text"
                }`}
              >
                <Shield size={14} />
                ADMIN
                {pathname.startsWith("/admin") && (
                  <motion.div
                    layoutId="nav-indicator-admin"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-orbital-purple"
                    style={{ boxShadow: "0 0 10px rgba(168,85,247,0.5)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            )}
          </div>

          {/* User area */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-orbital-border animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Image
                    src={user.small_image || user.medium_image || ""}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full border border-orbital-border"
                    unoptimized
                  />
                  <span className="hidden sm:block font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                    {user.name}
                  </span>
                  <ChevronDown size={12} className={`text-orbital-text-dim transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-orbital-card border border-orbital-border overflow-hidden z-50"
                      style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-orbital-border bg-[#0D0D0D]">
                        <p className="font-[family-name:var(--font-orbitron)] text-[0.6rem] text-orbital-purple tracking-wider">
                          {isAdmin ? "ADMIN" : "JOGADOR"}
                        </p>
                        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text mt-0.5 truncate">
                          {user.name}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={`/perfil/${user.steam_id}`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-orbital-text-dim hover:text-orbital-text hover:bg-orbital-purple/5 transition-colors"
                        >
                          <User size={14} />
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs">Meu Perfil</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-orbital-text-dim hover:text-orbital-text hover:bg-orbital-purple/5 transition-colors lg:hidden"
                          >
                            <Shield size={14} />
                            <span className="font-[family-name:var(--font-jetbrains)] text-xs">Painel Admin</span>
                          </Link>
                        )}

                        <button
                          onClick={() => { setUserMenuOpen(false); logout(); }}
                          className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-orbital-danger/70 hover:text-orbital-danger hover:bg-orbital-danger/5 transition-colors"
                        >
                          <LogOut size={14} />
                          <span className="font-[family-name:var(--font-jetbrains)] text-xs">Sair</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">ENTRAR VIA STEAM</span>
                <span className="sm:hidden">LOGIN</span>
              </button>
            )}

            {/* Mobile Toggle */}
            <button
              className="lg:hidden text-orbital-text hover:text-orbital-purple transition-colors p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-[#0A0A0A] border-b border-[#1A1A1A] px-4 pb-4"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 font-[family-name:var(--font-orbitron)] text-xs tracking-widest ${
                  isActive ? "text-orbital-purple" : "text-orbital-text-dim"
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 font-[family-name:var(--font-orbitron)] text-xs tracking-widest ${
                pathname.startsWith("/admin") ? "text-orbital-purple" : "text-orbital-text-dim"
              }`}
            >
              <Shield size={16} />
              ADMIN
            </Link>
          )}
        </motion.div>
      )}
    </nav>
  );
}
