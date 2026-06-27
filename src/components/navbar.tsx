"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, LogOut, User, Shield, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/", label: "HOME" },
  { href: "/campeonatos", label: "CAMPEONATOS" },
  { href: "/partidas", label: "PARTIDAS" },
  { href: "/leaderboard", label: "RANKING" },
  { href: "/highlights", label: "HIGHLIGHTS" },
  { href: "/demos", label: "DEMOS" },
  { href: "/inscricao", label: "INSCRIÇÃO" },
  { href: "/loja", label: "LOJA" },
];

const chakra = "font-[family-name:var(--font-chakra)]";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, login, logout, isAdmin } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    function onScroll() { setScrolled(window.scrollY > 24); }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { document.removeEventListener("mousedown", handleClick); window.removeEventListener("scroll", onScroll); };
  }, []);

  if (pathname.startsWith("/admin")) return null;

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={`relative px-2.5 py-2 ${chakra} text-[0.68rem] font-semibold tracking-[0.16em] transition-colors ${
        isActive(href) ? "text-[#F4F2F7]" : "text-[#86838F] hover:text-[#F4F2F7]"
      }`}
    >
      {label}
      {isActive(href) && (
        <motion.div layoutId="nav-ind" className="absolute -bottom-[2px] left-2.5 right-2.5 h-[2px] bg-[#7C5CFF]"
          transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      )}
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || pathname !== "/" ? "bg-[#0A0A0C]/85 backdrop-blur-xl border-b border-white/[0.08]" : "bg-transparent border-b border-transparent"
    }`}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-[clamp(20px,5vw,72px)]">
        <div className="flex items-center justify-between h-[72px] gap-4">

          {/* Links unificados, esticados na largura */}
          <div className="hidden lg:flex flex-1 items-center justify-between mr-10">
            {navLinks.map((l) => <NavLink key={l.href} {...l} />)}
            {isAdmin && (
              <Link href="/admin" className={`flex items-center gap-1.5 px-2.5 py-2 ${chakra} text-[0.68rem] font-semibold tracking-[0.16em] transition-colors ${
                pathname.startsWith("/admin") ? "text-[#F4F2F7]" : "text-[#86838F] hover:text-[#F4F2F7]"
              }`}><Shield size={12} />ADMIN</Link>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 ml-auto">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  aria-label="Menu do usuário" aria-expanded={userMenuOpen} aria-haspopup="true">
                  <Image src={user.small_image || user.medium_image || ""} alt={user.name} width={32} height={32} className="rounded-full border border-white/15" unoptimized />
                  <ChevronDown size={12} className={`text-[#86838F] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-[#101014] border border-white/[0.1] overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/[0.08]">
                        <p className={`${chakra} text-[0.6rem] font-bold tracking-[0.2em] text-[#7C5CFF] uppercase`}>{isAdmin ? "ADMIN" : "JOGADOR"}</p>
                        <p className={`${chakra} text-xs text-[#F4F2F7] mt-0.5 truncate`}>{user.name}</p>
                      </div>
                      <div className="py-1">
                        <Link href={`/perfil/${user.steam_id}`} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[#86838F] hover:text-[#F4F2F7] hover:bg-white/[0.03] transition-colors">
                          <User size={14} /><span className={`${chakra} text-xs`}>Meu Perfil</span>
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-[#86838F] hover:text-[#F4F2F7] hover:bg-white/[0.03] transition-colors lg:hidden">
                            <Shield size={14} /><span className={`${chakra} text-xs`}>Painel Admin</span>
                          </Link>
                        )}
                        <button onClick={() => { setUserMenuOpen(false); logout(); }} className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-[#FB7185]/80 hover:text-[#FB7185] hover:bg-[#FB7185]/[0.06] transition-colors">
                          <LogOut size={14} /><span className={`${chakra} text-xs`}>Sair</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={login} className={`hidden sm:flex items-center gap-1.5 px-4 py-2 border border-[#7C5CFF]/50 text-[#7C5CFF] hover:bg-[#7C5CFF] hover:text-[#0A0A0C] transition-colors ${chakra} text-[0.68rem] font-bold tracking-[0.16em] uppercase whitespace-nowrap`}>
                <LogIn size={12} /><span className="hidden xl:inline">ENTRAR VIA STEAM</span><span className="xl:hidden">LOGIN</span>
              </button>
            )}
            <button className="lg:hidden text-[#F4F2F7] hover:text-[#7C5CFF] transition-colors p-1" onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileOpen}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden bg-[#0A0A0C] border-b border-white/[0.08] px-5 pb-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block px-1 py-3 ${chakra} text-sm font-semibold tracking-[0.14em] border-b border-white/[0.05] ${isActive(link.href) ? "text-[#7C5CFF]" : "text-[#86838F]"}`}>
              {link.label}
            </Link>
          ))}
          {!user && (
            <button onClick={() => { setMobileOpen(false); login(); }} className={`mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-3 border border-[#7C5CFF]/50 text-[#7C5CFF] ${chakra} text-xs font-bold tracking-[0.16em] uppercase`}>
              <LogIn size={14} /> ENTRAR VIA STEAM
            </button>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-1 py-3 ${chakra} text-sm font-semibold tracking-[0.14em] ${pathname.startsWith("/admin") ? "text-[#7C5CFF]" : "text-[#86838F]"}`}>
              <Shield size={16} /> ADMIN
            </Link>
          )}
        </motion.div>
      )}
    </nav>
  );
}
