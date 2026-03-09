"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HudCardProps {
  children: ReactNode;
  className?: string;
  label?: string;
  glow?: boolean;
  delay?: number;
}

export function HudCard({ children, className = "", label, glow = false, delay = 0 }: HudCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`
        relative bg-orbital-card border border-orbital-border p-5
        ${glow ? "glow-purple-sm" : ""}
        ${className}
      `}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/60 to-transparent" />

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orbital-purple/70" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-orbital-purple/70" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-orbital-purple/70" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orbital-purple/70" />

      {/* Label */}
      {label && (
        <div className="absolute -top-3 left-6 px-2 bg-orbital-card">
          <span className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] text-orbital-purple uppercase">
            {label}
          </span>
        </div>
      )}

      {children}
    </motion.div>
  );
}

export function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-1 uppercase">
        {label}
      </div>
      <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">
        {value}
      </div>
      {sub && (
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}
