"use client";

import { useState } from "react";
import { Brain, Loader2, Check, AlertCircle } from "lucide-react";

interface BrandAIButtonProps {
  action: string;
  label: string;
  onComplete?: (data: Record<string, unknown>) => void;
  confirmMessage?: string;
  variant?: "default" | "compact";
}

export function BrandAIButton({ action, label, onComplete, confirmMessage, variant = "default" }: BrandAIButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const execute = async () => {
    if (confirmMessage && !confirm(confirmMessage)) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/brand/ai/execute", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Erro" });
      } else {
        setResult({ ok: true, message: data.message || "Concluído" });
        onComplete?.(data);
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Erro de conexão" });
    }

    setLoading(false);
    setTimeout(() => setResult(null), 5000);
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={execute}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/25 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] tracking-wider hover:bg-orbital-purple/20 hover:border-orbital-purple/40 disabled:opacity-40 transition-all"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
          {loading ? "GERANDO..." : label}
        </button>
        {result && (
          <span className={`flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] ${result.ok ? "text-green-400" : "text-red-400"}`}>
            {result.ok ? <Check size={10} /> : <AlertCircle size={10} />}
            {result.message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-orbital-purple/5 border border-orbital-purple/15 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-orbital-purple" />
          <div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-purple">{label}</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/25 mt-0.5">Powered by Claude AI</div>
          </div>
        </div>
        <button
          onClick={execute}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/15 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] hover:bg-orbital-purple/25 hover:border-orbital-purple/50 disabled:opacity-40 transition-all"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          {loading ? "GERANDO..." : "EXECUTAR"}
        </button>
      </div>
      {result && (
        <div className={`mt-3 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[0.55rem] ${result.ok ? "text-green-400" : "text-red-400"}`}>
          {result.ok ? <Check size={12} /> : <AlertCircle size={12} />}
          {result.message}
        </div>
      )}
    </div>
  );
}
