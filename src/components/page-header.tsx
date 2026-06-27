"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageHeaderProps {
  /** Eyebrow / kicker pequeno acima do título (uppercase, violeta) */
  kicker?: string;
  /** Título principal (parte em branco) */
  title: string;
  /** Palavra/trecho final destacado em violeta */
  accent?: string;
  /** Subtítulo opcional abaixo do título */
  sub?: string;
  /** Slot à direita do título (contadores, ações, badge "ao vivo") */
  right?: ReactNode;
  /** Conteúdo abaixo da régua (filtros, busca) */
  children?: ReactNode;
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════════════
   Header editorial padrão das páginas internas — Russo One gigante +
   kicker + régua. Mesma linguagem da home (.ovr), via tokens orbital-*.
   ═══════════════════════════════════════════════════════════════════════ */
export function PageHeader({ kicker, title, accent, sub, right, children, className = "" }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative mb-9 ${className}`}
    >
      {kicker && (
        <div className="font-[family-name:var(--font-chakra)] text-[0.68rem] font-semibold tracking-[0.3em] uppercase text-orbital-purple mb-3">
          {kicker}
        </div>
      )}

      <div className="flex items-end justify-between gap-6 flex-wrap">
        <h1 className="font-[family-name:var(--font-russo)] uppercase leading-[0.88] tracking-[-0.01em] text-[clamp(2.3rem,6.2vw,4.6rem)] text-orbital-text">
          {title}
          {accent && <span className="text-orbital-purple-bright"> {accent}</span>}
        </h1>
        {right && <div className="shrink-0 pb-1">{right}</div>}
      </div>

      {sub && (
        <p className="mt-4 max-w-xl font-[family-name:var(--font-chakra)] text-orbital-text-dim leading-relaxed">
          {sub}
        </p>
      )}

      <div className="mt-6 h-px w-full bg-gradient-to-r from-orbital-border-light via-orbital-border to-transparent" />

      {children && <div className="mt-6">{children}</div>}
    </motion.header>
  );
}
