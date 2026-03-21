"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ERROR BOUNDARY]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="font-[family-name:var(--font-orbitron)] text-6xl font-black text-[#A855F7]">
          ERRO
        </div>
        <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent" />
        <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#8a8a8a]">
          Algo deu errado ao carregar esta página. Tente novamente ou volte ao início.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] px-6 py-3 border border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 hover:border-[#A855F7]/60 transition-all"
          >
            TENTAR NOVAMENTE
          </button>
          <Link
            href="/"
            className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] px-6 py-3 border border-[#333] bg-[#111] text-[#8a8a8a] hover:border-[#A855F7]/30 hover:text-white transition-all"
          >
            INÍCIO
          </Link>
        </div>
      </div>
    </div>
  );
}
