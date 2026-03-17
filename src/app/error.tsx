"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-[family-name:var(--font-orbitron)] text-6xl font-black text-[#A855F7] mb-4">
          ERRO
        </div>
        <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-[#A855F7]/60 to-transparent mb-6" />
        <p className="font-[family-name:var(--font-jetbrains)] text-sm text-[#8a8a8a] mb-8">
          {error.message || "Algo deu errado. Tente novamente."}
        </p>
        <button
          onClick={reset}
          className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] px-6 py-3 border border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 hover:border-[#A855F7]/60 transition-all"
        >
          TENTAR NOVAMENTE
        </button>
      </div>
    </div>
  );
}
